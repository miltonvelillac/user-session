import { CreateUser } from '../src/application/use-cases/CreateUser';
import { UserRepository } from '../src/domain/ports/UserRepository';
import { PasswordHasher } from '../src/domain/ports/PasswordHasher';
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

describe('CreateUser', () => {
  it('creates a new user', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreateUser(repo, hasher);

    const result = await useCase.execute({ username: 'john', password: 'super-secret' });

    expect(result.username).toBe('john');
    const saved = await repo.findByUsername('john');
    expect(saved).not.toBeNull();
  });

  it('rejects duplicate users', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreateUser(repo, hasher);

    await useCase.execute({ username: 'john', password: 'super-secret' });

    await expect(useCase.execute({ username: 'john', password: 'super-secret' })).rejects.toMatchObject({
      code: ErrorCodes.USER_ALREADY_EXISTS
    } as AppError);
  });
});