import crypto from 'crypto';
import { UserRepository } from '../../domain/ports/UserRepository';
import { PasswordHasher } from '../../domain/ports/PasswordHasher';
import { TokenSigner } from '../../domain/ports/TokenSigner';
import { TokenRepository } from '../../domain/ports/TokenRepository';
import { ClientRegistry } from '../../domain/ports/ClientRegistry';
import { UserClientAccessRepository } from '../../domain/ports/UserClientAccessRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class LoginUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly clientRegistry: ClientRegistry,
    private readonly userClientAccessRepository: UserClientAccessRepository,
    private readonly tokenSigner: TokenSigner,
    private readonly tokenRepository: TokenRepository
  ) {}

  async execute({
    username,
    password,
    clientId
  }: {
    username: string;
    password: string;
    clientId: string;
  }): Promise<{ token: string; sessionId: string }> {
    const isActiveClient = await this.clientRegistry.isActiveClient(clientId);
    if (!isActiveClient) {
      throw new AppError({
        code: ErrorCodes.INVALID_CLIENT,
        message: 'Invalid client',
        status: 401
      });
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new AppError({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        status: 401
      });
    }

    const ok = await this.passwordHasher.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        status: 401
      });
    }

    const hasAccess = await this.userClientAccessRepository.hasAccessToClientId(user.id, clientId);
    if (!hasAccess) {
      throw new AppError({
        code: ErrorCodes.CLIENT_ACCESS_DENIED,
        message: 'Client access denied for this user',
        status: 403
      });
    }

    const sessionId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const token = this.tokenSigner.sign({
      userId: user.id,
      username: user.username,
      roles: user.roles,
      clientId,
      sessionId,
      tokenId
    });

    await this.tokenRepository.saveToken({
      userId: user.id,
      clientId,
      sessionId,
      tokenId,
      token
    });

    return { token, sessionId };
  }
}
