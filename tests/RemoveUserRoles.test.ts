import { RemoveUserRoles } from '../src/application/use-cases/RemoveUserRoles';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type Dependencies = {
  userRepository: { findByUsername: jest.Mock };
  userRoleRepository: { getRoles: jest.Mock; removeRoles: jest.Mock };
};

const buildUseCase = (): { useCase: RemoveUserRoles; deps: Dependencies } => {
  const deps: Dependencies = {
    userRepository: { findByUsername: jest.fn() },
    userRoleRepository: { getRoles: jest.fn(), removeRoles: jest.fn() }
  };

  return {
    useCase: new RemoveUserRoles(deps.userRepository as never, deps.userRoleRepository as never),
    deps
  };
};

describe('RemoveUserRoles', () => {
  describe('#execute', () => {
    it('should remove roles and return updated role list', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(
        new User({ id: 'u1', username: 'john', passwordHash: 'hash', roles: ['admin', 'operator'] })
      );
      deps.userRoleRepository.getRoles.mockResolvedValue(['admin', 'operator']);
      deps.userRoleRepository.removeRoles.mockResolvedValue(['admin']);

      // Act
      const result = await useCase.execute({ username: 'john', roles: ['operator'] });

      // Assert
      expect(deps.userRoleRepository.removeRoles).toHaveBeenCalledWith('u1', ['operator']);
      expect(result).toEqual({
        userId: 'u1',
        username: 'john',
        roles: ['admin']
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(null);

      // Act
      const execution = useCase.execute({ username: 'missing', roles: ['operator'] });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: 'User not found: missing'
      });
      expect(deps.userRoleRepository.getRoles).not.toHaveBeenCalled();
    });

    it('should throw VALIDATION_ERROR when removal leaves user without roles', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(
        new User({ id: 'u1', username: 'john', passwordHash: 'hash', roles: ['admin'] })
      );
      deps.userRoleRepository.getRoles.mockResolvedValue(['admin']);

      // Act
      const execution = useCase.execute({ username: 'john', roles: ['admin'] });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
        status: 400
      });
      expect(deps.userRoleRepository.removeRoles).not.toHaveBeenCalled();
    });
  });
});
