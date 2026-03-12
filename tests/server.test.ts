type ServerLoadResult = {
  resolveMock: jest.Mock;
  listenMock: jest.Mock;
  buildAppMock: jest.Mock;
  tokens: { AuthController: string };
};

const loadServerModule = (portValue: string | undefined): ServerLoadResult => {
  jest.resetModules();

  if (portValue === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = portValue;
  }

  const resolveMock = jest.fn().mockReturnValue({ id: 'controller' });
  const listenMock = jest.fn((_port: number, callback: () => void) => {
    callback();
  });
  const buildAppMock = jest.fn().mockReturnValue({ listen: listenMock });

  const tokens = { AuthController: 'AuthController' };
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  jest.isolateModules(() => {
    jest.doMock('dotenv/config', () => ({}));

    jest.doMock('../src/adapters/http/app', () => ({
      buildApp: buildAppMock
    }));

    jest.doMock('../src/infrastructure/di/dependencies', () => ({
      container: { resolve: resolveMock },
      TOKENS: tokens
    }));

    require('../src/server');
  });

  consoleSpy.mockRestore();

  return {
    resolveMock,
    listenMock,
    buildAppMock,
    tokens
  };
};

describe('server bootstrap', () => {
  describe('#module execution', () => {
    it('should resolve controller and listen on configured PORT', () => {
      // Arrange
      const { resolveMock, listenMock, buildAppMock, tokens } = loadServerModule('4500');

      // Act
      // Module execution happens during load

      // Assert
      expect(resolveMock).toHaveBeenCalledWith(tokens.AuthController);
      expect(buildAppMock).toHaveBeenCalledWith({ id: 'controller' });
      expect(listenMock).toHaveBeenCalledWith(4500, expect.any(Function));
    });

    it('should fallback to default port 3000 when PORT is missing', () => {
      // Arrange
      const { listenMock } = loadServerModule(undefined);

      // Act
      // Module execution happens during load

      // Assert
      expect(listenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    });
  });
});
