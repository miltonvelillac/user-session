import { User } from '../entities/User';

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<User>;
}