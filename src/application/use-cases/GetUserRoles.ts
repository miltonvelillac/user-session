import { UserRepository } from '../../domain/ports/UserRepository';
import { UserRoleRepository } from '../../domain/ports/UserRoleRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

export class GetUserRoles {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository
  ) {}

  async execute({
    username
  }: {
    username: string;
  }): Promise<{ userId: string; username: string; roles: string[] }> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: `User not found: ${username}`,
        status: 404
      });
    }

    const roles = await this.userRoleRepository.getRoles(user.id);
    return {
      userId: user.id,
      username: user.username,
      roles
    };
  }
}
