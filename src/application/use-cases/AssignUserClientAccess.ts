import { UserRepository } from '../../domain/ports/UserRepository';
import { ClientRegistry } from '../../domain/ports/ClientRegistry';
import { UserClientAccessRepository } from '../../domain/ports/UserClientAccessRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';

type AssignmentInput = {
  username: string;
  clientIds: string[];
};

type AssignmentResult = {
  userId: string;
  username: string;
  clientIds: string[];
};

export class AssignUserClientAccess {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly clientRegistry: ClientRegistry,
    private readonly userClientAccessRepository: UserClientAccessRepository
  ) {}

  async execute({ users }: { users: AssignmentInput[] }): Promise<{ assignments: AssignmentResult[] }> {
    const assignments: AssignmentResult[] = [];

    for (const entry of users) {
      const user = await this.userRepository.findByUsername(entry.username);
      if (!user) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: `User not found: ${entry.username}`,
          status: 404
        });
      }

      for (const clientId of entry.clientIds) {
        const isActiveClient = await this.clientRegistry.isActiveClient(clientId);
        if (!isActiveClient) {
          throw new AppError({
            code: ErrorCodes.INVALID_CLIENT,
            message: `Invalid client: ${clientId}`,
            status: 400,
            details: { username: entry.username, clientId }
          });
        }
      }

      const allowedClientIds = await this.userClientAccessRepository.setAllowedClientIds(user.id, entry.clientIds);
      assignments.push({ userId: user.id, username: user.username, clientIds: allowedClientIds });
    }

    return { assignments };
  }
}
