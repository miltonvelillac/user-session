import { CreateUser } from '../src/application/use-cases/CreateUser';
import { UserRepository } from '../src/domain/ports/UserRepository';
import { PasswordHasher } from '../src/domain/ports/PasswordHasher';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

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

    const result = await useCase.execute({ username: 'john', password: 'super-secret', roles: ['admin', 'admin'] });

    expect(result.username).toBe('john');
    expect(result.roles).toEqual(['admin']);
    const saved = await repo.findByUsername('john');
    expect(saved).not.toBeNull();
    expect(saved?.roles).toEqual(['admin']);
  });

  it('rejects duplicate users', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreateUser(repo, hasher);

    await useCase.execute({ username: 'john', password: 'super-secret', roles: ['admin'] });

    await expect(useCase.execute({ username: 'john', password: 'super-secret', roles: ['admin'] })).rejects.toMatchObject({
      code: ErrorCodes.USER_ALREADY_EXISTS
    });
  });

  it('rejects empty roles', async () => {
    const repo = new FakeUserRepository();
    const hasher = new FakePasswordHasher();
    const useCase = new CreateUser(repo, hasher);

    await expect(useCase.execute({ username: 'john', password: 'super-secret', roles: [] })).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR
    });
  });
});
