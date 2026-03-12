import { GetUserRoles } from '../src/application/use-cases/GetUserRoles';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type Dependencies = {
  userRepository: { findByUsername: jest.Mock };
  userRoleRepository: { getRoles: jest.Mock };
};

const buildUseCase = (): { useCase: GetUserRoles; deps: Dependencies } => {
  const deps: Dependencies = {
    userRepository: { findByUsername: jest.fn() },
    userRoleRepository: { getRoles: jest.fn() }
  };

  return {
    useCase: new GetUserRoles(deps.userRepository as never, deps.userRoleRepository as never),
    deps
  };
};

describe('GetUserRoles', () => {
  describe('#execute', () => {
    it('should return current roles for an existing user', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(
        new User({ id: 'u1', username: 'john', passwordHash: 'hash', roles: ['admin'] })
      );
      deps.userRoleRepository.getRoles.mockResolvedValue(['admin', 'operator']);

      // Act
      const result = await useCase.execute({ username: 'john' });

      // Assert
      expect(deps.userRoleRepository.getRoles).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        userId: 'u1',
        username: 'john',
        roles: ['admin', 'operator']
      });
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(null);

      // Act
      const execution = useCase.execute({ username: 'missing' });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: 'User not found: missing'
      });
      expect(deps.userRoleRepository.getRoles).not.toHaveBeenCalled();
    });
  });
});
