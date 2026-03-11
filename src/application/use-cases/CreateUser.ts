import crypto from 'crypto';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { PasswordHasher } from '../../domain/ports/PasswordHasher';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class CreateUser {
  constructor(private readonly userRepository: UserRepository, private readonly passwordHasher: PasswordHasher) {}

  async execute({
    username,
    password,
    roles
  }: {
    username: string;
    password: string;
    roles: string[];
  }): Promise<{ id: string; username: string; roles: string[] }> {
    const existing = await this.userRepository.findByUsername(username);
    if (existing) {
      throw new AppError({
        code: ErrorCodes.USER_ALREADY_EXISTS,
        message: 'User already exists',
        status: 409
      });
    }

    const normalizedRoles = Array.from(new Set(roles.map(role => role.trim())));
    if (normalizedRoles.length === 0) {
      throw new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation error',
        status: 400,
        details: [{ field: 'roles', message: 'At least one role is required' }]
      });
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user = new User({
      id: crypto.randomUUID(),
      username,
      passwordHash,
      roles: normalizedRoles
    });

    await this.userRepository.save(user);

    return { id: user.id, username: user.username, roles: user.roles };
  }
}
