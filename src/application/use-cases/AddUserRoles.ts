import { UserRepository } from '../../domain/ports/UserRepository';
import { UserRoleRepository } from '../../domain/ports/UserRoleRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class AddUserRoles {
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

    const updatedRoles = await this.userRoleRepository.addRoles(user.id, roles);
    return {
      userId: user.id,
      username: user.username,
      roles: updatedRoles
    };
  }
}
