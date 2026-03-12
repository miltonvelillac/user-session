type ClientRegistryLoadResult = {
  SqlServerClientRegistry: new () => { isActiveClient(clientId: string): Promise<boolean> };
  getSqlServerPool: jest.Mock;
  nVarCharMock: jest.Mock;
};

const loadClientRegistryModule = (): ClientRegistryLoadResult => {
  jest.resetModules();

  const getSqlServerPool = jest.fn();
  const nVarCharMock = jest.fn((size: number) => `NVarChar(${size})`);
  let SqlServerClientRegistry: ClientRegistryLoadResult['SqlServerClientRegistry'] | undefined;

  jest.isolateModules(() => {
    jest.doMock('../src/infrastructure/db/sqlServer', () => ({
      getSqlServerPool
    }));

    jest.doMock('mssql', () => ({
      __esModule: true,
      default: {
        NVarChar: nVarCharMock
      }
    }));

    ({ SqlServerClientRegistry } = require('../src/infrastructure/repositories/SqlServerClientRegistry'));
  });

  return {
    SqlServerClientRegistry: SqlServerClientRegistry!,
    getSqlServerPool,
    nVarCharMock
  };
};

describe('SqlServerClientRegistry', () => {
  describe('#isActiveClient', () => {
    it('should return true when query finds an active client', async () => {
      // Arrange
      const { SqlServerClientRegistry, getSqlServerPool, nVarCharMock } = loadClientRegistryModule();
      const queryMock = jest.fn().mockResolvedValue({ recordset: [{ Exists: 1 }] });
      const inputMock = jest.fn().mockReturnThis();
      const requestMock = { input: inputMock, query: queryMock };
      const poolMock = { request: jest.fn().mockReturnValue(requestMock) };
      getSqlServerPool.mockResolvedValue(poolMock);
      const repository = new SqlServerClientRegistry();

      // Act
      const result = await repository.isActiveClient('testapp');

      // Assert
      expect(result).toBe(true);
      expect(getSqlServerPool).toHaveBeenCalledTimes(1);
      expect(nVarCharMock).toHaveBeenCalledWith(50);
      expect(inputMock).toHaveBeenCalledWith('clientId', 'NVarChar(50)', 'testapp');
      expect(queryMock).toHaveBeenCalled();
    });

    it('should return false when query does not find an active client', async () => {
      // Arrange
      const { SqlServerClientRegistry, getSqlServerPool } = loadClientRegistryModule();
      const queryMock = jest.fn().mockResolvedValue({ recordset: [] });
      const inputMock = jest.fn().mockReturnThis();
      const requestMock = { input: inputMock, query: queryMock };
      const poolMock = { request: jest.fn().mockReturnValue(requestMock) };
      getSqlServerPool.mockResolvedValue(poolMock);
      const repository = new SqlServerClientRegistry();

      // Act
      const result = await repository.isActiveClient('missing-client');

      // Assert
      expect(result).toBe(false);
    });
  });
});
