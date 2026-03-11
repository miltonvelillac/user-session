import { LoginUser } from '../src/application/use-cases/LoginUser';
import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type LoginDependencies = {
  userRepository: { findByUsername: jest.Mock };
  passwordHasher: { compare: jest.Mock };
  clientRegistry: { isActiveClient: jest.Mock };
  userClientAccessRepository: { hasAccessToClientId: jest.Mock };
  tokenSigner: { sign: jest.Mock };
  tokenRepository: { saveToken: jest.Mock };
};

const buildUseCase = (): { useCase: LoginUser; deps: LoginDependencies } => {
  const deps: LoginDependencies = {
    userRepository: { findByUsername: jest.fn() },
    passwordHasher: { compare: jest.fn() },
    clientRegistry: { isActiveClient: jest.fn() },
    userClientAccessRepository: { hasAccessToClientId: jest.fn() },
    tokenSigner: { sign: jest.fn() },
    tokenRepository: { saveToken: jest.fn() }
  };

  const useCase = new LoginUser(
    deps.userRepository as never,
    deps.passwordHasher as never,
    deps.clientRegistry as never,
    deps.userClientAccessRepository as never,
    deps.tokenSigner as never,
    deps.tokenRepository as never
  );

  return { useCase, deps };
};

const validUser = new User({
  id: 'u1',
  username: 'john',
  passwordHash: 'hashed:super-secret',
  roles: ['admin']
});

describe('LoginUser', () => {
  describe('#execute', () => {
    it('should return token and sessionId when all checks pass', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.clientRegistry.isActiveClient.mockResolvedValue(true);
      deps.userRepository.findByUsername.mockResolvedValue(validUser);
      deps.passwordHasher.compare.mockResolvedValue(true);
      deps.userClientAccessRepository.hasAccessToClientId.mockResolvedValue(true);
      deps.tokenSigner.sign.mockReturnValue('signed-token');
      deps.tokenRepository.saveToken.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute({
        username: 'john',
        password: 'super-secret',
        clientId: 'web-app'
      });

      // Assert
      expect(result.token).toBe('signed-token');
      expect(result.sessionId).toBeTruthy();
      expect(deps.tokenSigner.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          username: 'john',
          roles: ['admin'],
          clientId: 'web-app'
        })
      );
      expect(deps.tokenRepository.saveToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          clientId: 'web-app',
          token: 'signed-token'
        })
      );
    });

    it('should throw INVALID_CLIENT when client is not active', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.clientRegistry.isActiveClient.mockResolvedValue(false);

      // Act
      const execution = useCase.execute({
        username: 'john',
        password: 'super-secret',
        clientId: 'invalid-client'
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CLIENT,
        status: 401
      });
      expect(deps.userRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CREDENTIALS when user is not found', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.clientRegistry.isActiveClient.mockResolvedValue(true);
      deps.userRepository.findByUsername.mockResolvedValue(null);

      // Act
      const execution = useCase.execute({
        username: 'missing',
        password: 'super-secret',
        clientId: 'web-app'
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CREDENTIALS,
        status: 401
      });
      expect(deps.passwordHasher.compare).not.toHaveBeenCalled();
    });

    it('should throw INVALID_CREDENTIALS when password is invalid', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.clientRegistry.isActiveClient.mockResolvedValue(true);
      deps.userRepository.findByUsername.mockResolvedValue(validUser);
      deps.passwordHasher.compare.mockResolvedValue(false);

      // Act
      const execution = useCase.execute({
        username: 'john',
        password: 'wrong-password',
        clientId: 'web-app'
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.INVALID_CREDENTIALS,
        status: 401
      });
      expect(deps.userClientAccessRepository.hasAccessToClientId).not.toHaveBeenCalled();
    });

    it('should throw CLIENT_ACCESS_DENIED when user has no access to client', async () => {
      // Arrange
      const { useCase, deps } = buildUseCase();
      deps.clientRegistry.isActiveClient.mockResolvedValue(true);
      deps.userRepository.findByUsername.mockResolvedValue(validUser);
      deps.passwordHasher.compare.mockResolvedValue(true);
      deps.userClientAccessRepository.hasAccessToClientId.mockResolvedValue(false);

      // Act
      const execution = useCase.execute({
        username: 'john',
        password: 'super-secret',
        clientId: 'web-app'
      });

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.CLIENT_ACCESS_DENIED,
        status: 403
      });
      expect(deps.tokenSigner.sign).not.toHaveBeenCalled();
    });
  });
});
