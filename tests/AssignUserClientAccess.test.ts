import { AssignUserClientAccess } from '../src/application/use-cases/AssignUserClientAccess';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type AssignDependencies = {
  userRepository: { findByUsername: jest.Mock };
  clientRegistry: { isActiveClient: jest.Mock };
  userClientAccessRepository: { setAllowedClientIds: jest.Mock };
};

const buildUseCase = (): { useCase: AssignUserClientAccess; deps: AssignDependencies } => {
  const deps: AssignDependencies = {
    userRepository: { findByUsername: jest.fn() },
    clientRegistry: { isActiveClient: jest.fn() },
    userClientAccessRepository: { setAllowedClientIds: jest.fn() }
  };

  const useCase = new AssignUserClientAccess(
    deps.userRepository as never,
    deps.clientRegistry as never,
    deps.userClientAccessRepository as never
  );

  return { useCase, deps };
};

describe('AssignUserClientAccess', () => {
  describe('#execute', () => {
    it('should assign allowed clients for each user and return normalized response', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername
        .mockResolvedValueOnce(new User({ id: 'u1', username: 'john', passwordHash: 'hash-1', roles: ['admin'] }))
        .mockResolvedValueOnce(new User({ id: 'u2', username: 'ana', passwordHash: 'hash-2', roles: ['seller'] }));
      deps.clientRegistry.isActiveClient.mockResolvedValue(true);
      deps.userClientAccessRepository.setAllowedClientIds
        .mockResolvedValueOnce(['web-app', 'mobile-app'])
        .mockResolvedValueOnce(['admin-portal']);

      // Act
      const result = await useCase.execute({
        users: [
          { username: 'john', clientIds: ['web-app', 'mobile-app'] },
          { username: 'ana', clientIds: ['admin-portal'] }
        ]
      });

      // Assert
      expect(result).toEqual({
        assignments: [
          { userId: 'u1', username: 'john', clientIds: ['web-app', 'mobile-app'] },
          { userId: 'u2', username: 'ana', clientIds: ['admin-portal'] }
        ]
      });
      expect(deps.userClientAccessRepository.setAllowedClientIds).toHaveBeenNthCalledWith(1, 'u1', ['web-app', 'mobile-app']);
      expect(deps.userClientAccessRepository.setAllowedClientIds).toHaveBeenNthCalledWith(2, 'u2', ['admin-portal']);
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(null);

      // Act
      const execution = useCase.execute({
        users: [{ username: 'missing-user', clientIds: ['web-app'] }]
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: 'User not found: missing-user'
      });
      expect(deps.clientRegistry.isActiveClient).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CLIENT when any clientId is invalid', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(new User({ id: 'u1', username: 'john', passwordHash: 'hash-1', roles: ['admin'] }));
      deps.clientRegistry.isActiveClient.mockResolvedValue(false);

      // Act
      const execution = useCase.execute({
        users: [{ username: 'john', clientIds: ['unknown-client'] }]
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CLIENT,
        status: 400,
        message: 'Invalid client: unknown-client',
        details: { username: 'john', clientId: 'unknown-client' }
      });
      expect(deps.userClientAccessRepository.setAllowedClientIds).not.toHaveBeenCalled();
    });
  });
});
