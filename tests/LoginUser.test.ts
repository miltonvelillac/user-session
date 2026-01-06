import { LoginUser } from '../src/application/use-cases/LoginUser';
import { UserRepository } from '../src/domain/ports/UserRepository';
import { PasswordHasher } from '../src/domain/ports/PasswordHasher';
import { TokenSigner } from '../src/domain/ports/TokenSigner';
import { TokenRepository } from '../src/domain/ports/TokenRepository';
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
  sign(payload: { userId: string; username: string }): string {
    return `token:${payload.userId}`;
  }
}

class FakeTokenRepository implements TokenRepository {
  public readonly saved: Array<{ userId: string; token: string }> = [];

  async saveToken(data: { userId: string; token: string }): Promise<{ userId: string; token: string }> {
    this.saved.push(data);
    return data;
  }
}

describe('LoginUser', () => {
  it('returns a token and stores it', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const signer = new FakeTokenSigner();
    const tokenRepo = new FakeTokenRepository();
    const useCase = new LoginUser(repo, hasher, signer, tokenRepo);

    await repo.save(new User({ id: 'u1', username: 'john', passwordHash: 'hashed:super-secret' }));

    const result = await useCase.execute({ username: 'john', password: 'super-secret' });

    expect(result.token).toBe('token:u1');
    expect(tokenRepo.saved).toHaveLength(1);
  });

  it('rejects invalid credentials', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const signer = new FakeTokenSigner();
    const tokenRepo = new FakeTokenRepository();
    const useCase = new LoginUser(repo, hasher, signer, tokenRepo);

    await repo.save(new User({ id: 'u1', username: 'john', passwordHash: 'hashed:super-secret' }));

    await expect(useCase.execute({ username: 'john', password: 'bad' })).rejects.toMatchObject({
      code: ErrorCodes.INVALID_CREDENTIALS
    } as AppError);
  });
});