import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';

export class InMemoryUserRepository implements UserRepository {
  private readonly usersByUsername = new Map<string, User>();

  async findByUsername(username: string): Promise<User | null> {
    return this.usersByUsername.get(username) || null;
  }

  async save(user: User): Promise<User> {
    this.usersByUsername.set(user.username, user);
    return user;
  }
}