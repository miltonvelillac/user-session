type SqlServerModule = {
  getSqlServerPool: () => Promise<unknown>;
  closeSqlServerPool: () => Promise<void>;
};

type SqlServerLoadResult = {
  module: SqlServerModule;
  connectionPoolCtor: jest.Mock;
  connectMock: jest.Mock;
  closeMock: jest.Mock;
  getSqlPassword: jest.Mock;
};

const loadSqlServerModule = (
  connectImplementation?: () => Promise<unknown>
): SqlServerLoadResult => {
  jest.resetModules();

  const closeMock = jest.fn().mockResolvedValue(undefined);
  const connectedPool = { close: closeMock };

  const connectMock = jest.fn();
  if (connectImplementation) {
    connectMock.mockImplementation(connectImplementation);
  } else {
    connectMock.mockResolvedValue(connectedPool);
  }

  const connectionPoolCtor = jest.fn().mockImplementation(() => ({ connect: connectMock }));
  const getSqlPassword = jest.fn().mockReturnValue('decrypted-password');

  let module: SqlServerModule | undefined;

  jest.isolateModules(() => {
    jest.doMock('mssql', () => ({
      __esModule: true,
      default: {
        ConnectionPool: connectionPoolCtor
      },
      ConnectionPool: connectionPoolCtor
    }));

    jest.doMock('../src/shared/utils/encrypt/encrypt', () => ({
      getSqlPassword
    }));

    module = require('../src/infrastructure/db/sqlServer');
  });

  return {
    module: module!,
    connectionPoolCtor,
    connectMock,
    closeMock,
    getSqlPassword
  };
};

describe('sqlServer db module', () => {
  describe('#getSqlServerPool', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
      jest.restoreAllMocks();
    });

    it('should build pool config from env and connect once', async () => {
      // Arrange
      process.env.DB_HOST = '192.168.1.10';
      process.env.DB_PORT = '1433';
      process.env.DB_NAME = 'CP_LOGIN_TEST';
      process.env.DB_USER = 'sa';
      process.env.DB_ENCRYPT = 'true';
      process.env.DB_TRUST_SERVER_CERTIFICATE = 'false';

      const { module, connectionPoolCtor, connectMock, getSqlPassword } = loadSqlServerModule();

      // Act
      const pool1 = await module.getSqlServerPool();
      const pool2 = await module.getSqlServerPool();

      // Assert
      expect(pool1).toBe(pool2);
      expect(getSqlPassword).toHaveBeenCalledTimes(1);
      expect(connectionPoolCtor).toHaveBeenCalledTimes(1);
      expect(connectMock).toHaveBeenCalledTimes(1);
      expect(connectionPoolCtor).toHaveBeenCalledWith(expect.objectContaining({
        server: '192.168.1.10',
        port: 1433,
        database: 'CP_LOGIN_TEST',
        user: 'sa',
        password: 'decrypted-password',
        options: {
          encrypt: true,
          trustServerCertificate: false
        }
      }));
    });

    it('should reset cached promise when connection fails and allow retry', async () => {
      // Arrange
      const firstError = new Error('connection failed');
      const secondPool = { close: jest.fn().mockResolvedValue(undefined) };
      const connectSequence = jest
        .fn()
        .mockRejectedValueOnce(firstError)
        .mockResolvedValueOnce(secondPool);
      const { module, connectionPoolCtor } = loadSqlServerModule(() => connectSequence());

      // Act
      const firstAttempt = module.getSqlServerPool();
      await expect(firstAttempt).rejects.toThrow('connection failed');
      const secondAttempt = await module.getSqlServerPool();

      // Assert
      expect(secondAttempt).toBe(secondPool);
      expect(connectionPoolCtor).toHaveBeenCalledTimes(2);
    });
  });

  describe('#closeSqlServerPool', () => {
    it('should do nothing when pool was never created', async () => {
      // Arrange
      const { module, closeMock } = loadSqlServerModule();

      // Act
      await module.closeSqlServerPool();

      // Assert
      expect(closeMock).not.toHaveBeenCalled();
    });

    it('should close current pool and allow future reconnect', async () => {
      // Arrange
      const reconnectPool = { close: jest.fn().mockResolvedValue(undefined) };
      let callCount = 0;
      const { module, connectionPoolCtor, closeMock } = loadSqlServerModule(async () => {
        callCount += 1;
        if (callCount === 1) {
          return { close: closeMock };
        }
        return reconnectPool;
      });

      // Act
      await module.getSqlServerPool();
      await module.closeSqlServerPool();
      await module.getSqlServerPool();

      // Assert
      expect(closeMock).toHaveBeenCalledTimes(1);
      expect(connectionPoolCtor).toHaveBeenCalledTimes(2);
    });
  });
});
