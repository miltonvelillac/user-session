type ModuleContext = {
  dependenciesModule: {
    TOKENS: Record<string, string>;
    container: { register: jest.Mock };
  };
  register: jest.Mock;
  getAuthClientIds: jest.Mock;
  constructors: Record<string, jest.Mock>;
};

const loadDependenciesModule = (jwtSecret?: string): ModuleContext => {
  jest.resetModules();

  const register = jest.fn();
  const containerInstance = { register };
  const Container = jest.fn(() => containerInstance);

  const InMemoryUserRepository = jest.fn();
  const InMemoryTokenRepository = jest.fn();
  const InMemoryClientRegistry = jest.fn();
  const InMemoryUserClientAccessRepository = jest.fn();
  const SimplePasswordHasher = jest.fn();
  const JwtTokenSigner = jest.fn();
  const CreateUser = jest.fn();
  const AssignUserClientAccess = jest.fn();
  const LoginUser = jest.fn();
  const AuthController = jest.fn();
  const getAuthClientIds = jest.fn(() => ['web-app', 'mobile-app']);

  if (jwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = jwtSecret;
  }

  let dependenciesModule: ModuleContext['dependenciesModule'];

  jest.isolateModules(() => {
    jest.doMock('../src/infrastructure/di/Container', () => ({ Container }));
    jest.doMock('../src/infrastructure/repositories/InMemoryUserRepository', () => ({ InMemoryUserRepository }));
    jest.doMock('../src/infrastructure/repositories/InMemoryTokenRepository', () => ({ InMemoryTokenRepository }));
    jest.doMock('../src/infrastructure/repositories/InMemoryClientRegistry', () => ({ InMemoryClientRegistry }));
    jest.doMock('../src/infrastructure/repositories/InMemoryUserClientAccessRepository', () => ({ InMemoryUserClientAccessRepository }));
    jest.doMock('../src/infrastructure/security/SimplePasswordHasher', () => ({ SimplePasswordHasher }));
    jest.doMock('../src/infrastructure/security/JwtTokenSigner', () => ({ JwtTokenSigner }));
    jest.doMock('../src/infrastructure/config/authClients', () => ({ getAuthClientIds }));
    jest.doMock('../src/application/use-cases/CreateUser', () => ({ CreateUser }));
    jest.doMock('../src/application/use-cases/AssignUserClientAccess', () => ({ AssignUserClientAccess }));
    jest.doMock('../src/application/use-cases/LoginUser', () => ({ LoginUser }));
    jest.doMock('../src/adapters/http/controllers/AuthController', () => ({ AuthController }));

    dependenciesModule = require('../src/infrastructure/di/dependencies');
  });

  return {
    dependenciesModule: dependenciesModule!,
    register,
    getAuthClientIds,
    constructors: {
      InMemoryUserRepository,
      InMemoryTokenRepository,
      InMemoryClientRegistry,
      InMemoryUserClientAccessRepository,
      SimplePasswordHasher,
      JwtTokenSigner,
      CreateUser,
      AssignUserClientAccess,
      LoginUser,
      AuthController
    }
  };
};

const getFactoryFromRegisterCalls = (register: jest.Mock, token: string): ((container: { resolve: jest.Mock }) => unknown) => {
  const call = register.mock.calls.find(([registeredToken]) => registeredToken === token);
  if (!call) {
    throw new Error(`Factory not found for token ${token}`);
  }

  return call[1];
};

describe('dependencies.ts', () => {
  describe('#module initialization', () => {
    it('should register all dependencies in the container', () => {
      // Arrange
      const { dependenciesModule, register } = loadDependenciesModule('secret-1');

      // Act
      const registeredTokens = register.mock.calls.map(([token]) => token);

      // Assert
      expect(registeredTokens).toEqual([
        dependenciesModule.TOKENS.UserRepository,
        dependenciesModule.TOKENS.TokenRepository,
        dependenciesModule.TOKENS.ClientRegistry,
        dependenciesModule.TOKENS.UserClientAccessRepository,
        dependenciesModule.TOKENS.PasswordHasher,
        dependenciesModule.TOKENS.TokenSigner,
        dependenciesModule.TOKENS.CreateUser,
        dependenciesModule.TOKENS.AssignUserClientAccess,
        dependenciesModule.TOKENS.LoginUser,
        dependenciesModule.TOKENS.AuthController
      ]);
    });
  });

  describe('#TokenSigner factory', () => {
    it('should use default JWT secret when env is missing', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule(undefined);
      const tokenSignerFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.TokenSigner);

      // Act
      tokenSignerFactory({ resolve: jest.fn() } as unknown as { resolve: jest.Mock });

      // Assert
      expect(constructors.JwtTokenSigner).toHaveBeenCalledWith('dev-secret');
    });

    it('should use JWT secret from environment when present', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule('env-secret');
      const tokenSignerFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.TokenSigner);

      // Act
      tokenSignerFactory({ resolve: jest.fn() } as unknown as { resolve: jest.Mock });

      // Assert
      expect(constructors.JwtTokenSigner).toHaveBeenCalledWith('env-secret');
    });
  });

  describe('#ClientRegistry factory', () => {
    it('should pass configured client IDs to client registry constructor', () => {
      // Arrange
      const { dependenciesModule, register, getAuthClientIds, constructors } = loadDependenciesModule();
      const clientRegistryFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.ClientRegistry);

      // Act
      clientRegistryFactory({ resolve: jest.fn() } as unknown as { resolve: jest.Mock });

      // Assert
      expect(getAuthClientIds).toHaveBeenCalledTimes(1);
      expect(constructors.InMemoryClientRegistry).toHaveBeenCalledWith(['web-app', 'mobile-app']);
    });
  });

  describe('#CreateUser factory', () => {
    it('should resolve and inject repository and hasher', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule();
      const createUserFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.CreateUser);
      const userRepository = { name: 'user-repo' };
      const passwordHasher = { name: 'hasher' };
      const resolve = jest
        .fn()
        .mockReturnValueOnce(userRepository)
        .mockReturnValueOnce(passwordHasher);

      // Act
      createUserFactory({ resolve } as unknown as { resolve: jest.Mock });

      // Assert
      expect(resolve).toHaveBeenNthCalledWith(1, dependenciesModule.TOKENS.UserRepository);
      expect(resolve).toHaveBeenNthCalledWith(2, dependenciesModule.TOKENS.PasswordHasher);
      expect(constructors.CreateUser).toHaveBeenCalledWith(userRepository, passwordHasher);
    });
  });

  describe('#AssignUserClientAccess factory', () => {
    it('should resolve and inject required dependencies', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule();
      const assignFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.AssignUserClientAccess);
      const userRepository = { name: 'user-repo' };
      const clientRegistry = { name: 'client-registry' };
      const userClientAccessRepository = { name: 'access-repo' };
      const resolve = jest
        .fn()
        .mockReturnValueOnce(userRepository)
        .mockReturnValueOnce(clientRegistry)
        .mockReturnValueOnce(userClientAccessRepository);

      // Act
      assignFactory({ resolve } as unknown as { resolve: jest.Mock });

      // Assert
      expect(resolve).toHaveBeenNthCalledWith(1, dependenciesModule.TOKENS.UserRepository);
      expect(resolve).toHaveBeenNthCalledWith(2, dependenciesModule.TOKENS.ClientRegistry);
      expect(resolve).toHaveBeenNthCalledWith(3, dependenciesModule.TOKENS.UserClientAccessRepository);
      expect(constructors.AssignUserClientAccess).toHaveBeenCalledWith(
        userRepository,
        clientRegistry,
        userClientAccessRepository
      );
    });
  });

  describe('#LoginUser factory', () => {
    it('should resolve and inject required dependencies', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule();
      const loginFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.LoginUser);
      const userRepository = { name: 'user-repo' };
      const passwordHasher = { name: 'hasher' };
      const clientRegistry = { name: 'client-registry' };
      const userClientAccessRepository = { name: 'access-repo' };
      const tokenSigner = { name: 'token-signer' };
      const tokenRepository = { name: 'token-repo' };
      const resolve = jest
        .fn()
        .mockReturnValueOnce(userRepository)
        .mockReturnValueOnce(passwordHasher)
        .mockReturnValueOnce(clientRegistry)
        .mockReturnValueOnce(userClientAccessRepository)
        .mockReturnValueOnce(tokenSigner)
        .mockReturnValueOnce(tokenRepository);

      // Act
      loginFactory({ resolve } as unknown as { resolve: jest.Mock });

      // Assert
      expect(constructors.LoginUser).toHaveBeenCalledWith(
        userRepository,
        passwordHasher,
        clientRegistry,
        userClientAccessRepository,
        tokenSigner,
        tokenRepository
      );
    });
  });

  describe('#AuthController factory', () => {
    it('should resolve and inject use-cases', () => {
      // Arrange
      const { dependenciesModule, register, constructors } = loadDependenciesModule();
      const authControllerFactory = getFactoryFromRegisterCalls(register, dependenciesModule.TOKENS.AuthController);
      const createUser = { name: 'create-user' };
      const loginUser = { name: 'login-user' };
      const assignUserClientAccess = { name: 'assign-user-client-access' };
      const resolve = jest
        .fn()
        .mockReturnValueOnce(createUser)
        .mockReturnValueOnce(loginUser)
        .mockReturnValueOnce(assignUserClientAccess);

      // Act
      authControllerFactory({ resolve } as unknown as { resolve: jest.Mock });

      // Assert
      expect(resolve).toHaveBeenNthCalledWith(1, dependenciesModule.TOKENS.CreateUser);
      expect(resolve).toHaveBeenNthCalledWith(2, dependenciesModule.TOKENS.LoginUser);
      expect(resolve).toHaveBeenNthCalledWith(3, dependenciesModule.TOKENS.AssignUserClientAccess);
      expect(constructors.AuthController).toHaveBeenCalledWith(createUser, loginUser, assignUserClientAccess);
    });
  });
});
