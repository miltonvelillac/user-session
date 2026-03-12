import { AddUserRoles } from '../src/application/use-cases/AddUserRoles';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type Dependencies = {
  userRepository: { findByUsername: jest.Mock };
  userRoleRepository: { addRoles: jest.Mock };
};

const buildUseCase = (): { useCase: AddUserRoles; deps: Dependencies } => {
  const deps: Dependencies = {
    userRepository: { findByUsername: jest.fn() },
    userRoleRepository: { addRoles: jest.fn() }
  };

  return {
    useCase: new AddUserRoles(deps.userRepository as never, deps.userRoleRepository as never),
    deps
  };
};

describe('AddUserRoles', () => {
  describe('#execute', () => {
    it('should add roles and return updated role list', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.userRepository.findByUsername.mockResolvedValue(
        new User({ id: 'u1', username: 'john', passwordHash: 'hash', roles: ['admin'] })
      );
      deps.userRoleRepository.addRoles.mockResolvedValue(['admin', 'operator']);

      // Act
      const result = await useCase.execute({ username: 'john', roles: ['operator'] });

      // Assert
      expect(deps.userRoleRepository.addRoles).toHaveBeenCalledWith('u1', ['operator']);
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
      const execution = useCase.execute({ username: 'missing', roles: ['operator'] });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: 'User not found: missing'
      });
      expect(deps.userRoleRepository.addRoles).not.toHaveBeenCalled();
    });
  });
});
