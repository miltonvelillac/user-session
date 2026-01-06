import crypto from 'crypto';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { PasswordHasher } from '../../domain/ports/PasswordHasher';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class CreateUser {
  constructor(private readonly userRepository: UserRepository, private readonly passwordHasher: PasswordHasher) {}

  async execute({ username, password }: { username: string; password: string }): Promise<{ id: string; username: string }> {
    const existing = await this.userRepository.findByUsername(username);
    if (existing) {
      throw new AppError({
        code: ErrorCodes.USER_ALREADY_EXISTS,
        message: 'User already exists',
        status: 409
      });
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user = new User({
      id: crypto.randomUUID(),
      username,
      passwordHash
    });

    await this.userRepository.save(user);

    return { id: user.id, username: user.username };
  }
}