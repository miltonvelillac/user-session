import { LoginUser } from '../src/application/use-cases/LoginUser';
import { UserRepository } from '../src/domain/ports/UserRepository';
import { PasswordHasher } from '../src/domain/ports/PasswordHasher';
import { TokenSigner } from '../src/domain/ports/TokenSigner';
import { TokenRepository } from '../src/domain/ports/TokenRepository';
import { ClientRegistry } from '../src/domain/ports/ClientRegistry';
import { User } from '../src/domain/entities/User';
import { AppError, ErrorCodes } from '../src/shared/errors/AppError';

class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByUsername(username: string): Promise<User | null> {
    return this.users.get(username) || null;
  }

  async save(user: User): Promise<User> {
    this.users.set(user.username, user);
    return user;
  }
}

class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

class FakeTokenSigner implements TokenSigner {
  sign(payload: { userId: string; username: string; clientId: string; sessionId: string; tokenId: string }): string {
    return `token:${payload.userId}:${payload.clientId}:${payload.sessionId}`;
  }
}

class FakeTokenRepository implements TokenRepository {
  public readonly saved: Array<{
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }> = [];

  async saveToken(data: {
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }): Promise<{
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }> {
    this.saved.push(data);
    return data;
  }
}

class FakeClientRegistry implements ClientRegistry {
  constructor(private readonly validClientIds: string[]) {}

  async isActiveClient(clientId: string): Promise<boolean> {
    return this.validClientIds.includes(clientId);
  }
}

describe('LoginUser', () => {
  it('returns a token and stores it', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const clientRegistry = new FakeClientRegistry(['web-app']);
    const signer = new FakeTokenSigner();
    const tokenRepo = new FakeTokenRepository();
    const useCase = new LoginUser(repo, hasher, clientRegistry, signer, tokenRepo);

    await repo.save(new User({ id: 'u1', username: 'john', passwordHash: 'hashed:super-secret' }));

    const result = await useCase.execute({ username: 'john', password: 'super-secret', clientId: 'web-app' });

    expect(result.token).toContain('token:u1:web-app:');
    expect(result.sessionId).toBeTruthy();
    expect(tokenRepo.saved).toHaveLength(1);
    expect(tokenRepo.saved[0].clientId).toBe('web-app');
    expect(tokenRepo.saved[0].sessionId).toBe(result.sessionId);
  });

  it('rejects invalid credentials', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const clientRegistry = new FakeClientRegistry(['web-app']);
    const signer = new FakeTokenSigner();
    const tokenRepo = new FakeTokenRepository();
    const useCase = new LoginUser(repo, hasher, clientRegistry, signer, tokenRepo);

    await repo.save(new User({ id: 'u1', username: 'john', passwordHash: 'hashed:super-secret' }));

    await expect(useCase.execute({ username: 'john', password: 'bad', clientId: 'web-app' })).rejects.toMatchObject({
      code: ErrorCodes.INVALID_CREDENTIALS
    } as AppError);
  });

  it('rejects invalid client', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const clientRegistry = new FakeClientRegistry(['mobile-app']);
    const signer = new FakeTokenSigner();
    const tokenRepo = new FakeTokenRepository();
    const useCase = new LoginUser(repo, hasher, clientRegistry, signer, tokenRepo);

    await repo.save(new User({ id: 'u1', username: 'john', passwordHash: 'hashed:super-secret' }));

    await expect(useCase.execute({ username: 'john', password: 'super-secret', clientId: 'web-app' })).rejects.toMatchObject({
      code: ErrorCodes.INVALID_CLIENT
    } as AppError);
  });
});
