import { UserRepository } from '../../domain/ports/UserRepository';
import { UserRoleRepository } from '../../domain/ports/UserRoleRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class RemoveUserRoles {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository
  ) {}

  async execute({
    username,
    roles
  }: {
    username: string;
    roles: string[];
  }): Promise<{ userId: string; username: string; roles: string[] }> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: `User not found: ${username}`,
        status: 404
      });
    }

    const currentRoles = await this.userRoleRepository.getRoles(user.id);
    const rolesToRemove = new Set(roles);
    const remainingRoles = currentRoles.filter(role => !rolesToRemove.has(role));

    if (remainingRoles.length === 0) {
      throw new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation error',
        status: 400,
        details: [{ field: 'roles', message: 'A user must have at least one role' }]
      });
    }

    const updatedRoles = await this.userRoleRepository.removeRoles(user.id, roles);
    return {
      userId: user.id,
      username: user.username,
      roles: updatedRoles
    };
  }
}
