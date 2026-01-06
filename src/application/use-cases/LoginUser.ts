import { UserRepository } from '../../domain/ports/UserRepository';
import { PasswordHasher } from '../../domain/ports/PasswordHasher';
import { TokenSigner } from '../../domain/ports/TokenSigner';
import { TokenRepository } from '../../domain/ports/TokenRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class LoginUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenSigner: TokenSigner,
    private readonly tokenRepository: TokenRepository
  ) {}

  async execute({ username, password }: { username: string; password: string }): Promise<{ token: string }> {
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

    const token = this.tokenSigner.sign({ userId: user.id, username: user.username });
    await this.tokenRepository.saveToken({ userId: user.id, token });

    return { token };
  }
}