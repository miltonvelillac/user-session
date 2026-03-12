import { ErrorCodes } from '../src/shared/errors/AppError';

type AccessRepositoryLoadResult = {
  SqlServerUserClientAccessRepository: new () => {
    setAllowedClientIds(userId: string, clientIds: string[]): Promise<string[]>;
    hasAccessToClientId(userId: string, clientId: string): Promise<boolean>;
  };
  getSqlServerPool: jest.Mock;
  transactionMock: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  queryMock: jest.Mock;
  inputMock: jest.Mock;
  poolRequestQueryMock: jest.Mock;
};

const loadAccessRepositoryModule = (): AccessRepositoryLoadResult => {
  jest.resetModules();

  const getSqlServerPool = jest.fn();
  const transactionMock = {
    begin: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };

  const queryMock = jest.fn().mockResolvedValue({});
  const inputMock = jest.fn().mockReturnThis();
  const requestInstance = { input: inputMock, query: queryMock };

  const poolRequestQueryMock = jest.fn().mockResolvedValue({ recordset: [] });
  const poolRequestInputMock = jest.fn().mockReturnThis();
  const poolRequestInstance = { input: poolRequestInputMock, query: poolRequestQueryMock };

  const pool = {
    request: jest.fn().mockReturnValue(poolRequestInstance)
  };
  getSqlServerPool.mockResolvedValue(pool);

  let SqlServerUserClientAccessRepository: AccessRepositoryLoadResult['SqlServerUserClientAccessRepository'] | undefined;

  jest.isolateModules(() => {
    jest.doMock('../src/infrastructure/db/sqlServer', () => ({
      getSqlServerPool
    }));

    jest.doMock('mssql', () => ({
      __esModule: true,
      default: {
        Transaction: jest.fn().mockImplementation(() => transactionMock),
        Request: jest.fn().mockImplementation(() => requestInstance),
        UniqueIdentifier: 'UniqueIdentifierType',
        NVarChar: jest.fn((size: number) => `NVarChar(${size})`)
      }
    }));

    ({ SqlServerUserClientAccessRepository } = require('../src/infrastructure/repositories/SqlServerUserClientAccessRepository'));
  });

  return {
    SqlServerUserClientAccessRepository: SqlServerUserClientAccessRepository!,
    getSqlServerPool,
    transactionMock,
    queryMock,
    inputMock,
    poolRequestQueryMock
  };
};

describe('SqlServerUserClientAccessRepository', () => {
  describe('#setAllowedClientIds', () => {
    it('should replace existing access list, insert unique clients, and commit transaction', async () => {
      // Arrange
      const {
        SqlServerUserClientAccessRepository,
        transactionMock,
        queryMock
      } = loadAccessRepositoryModule();
      const repository = new SqlServerUserClientAccessRepository();

      // Act
      const result = await repository.setAllowedClientIds('user-1', ['testapp', 'testapp', 'mobile-app']);

      // Assert
      expect(result).toEqual(['testapp', 'mobile-app']);
      expect(transactionMock.begin).toHaveBeenCalledTimes(1);
      expect(queryMock).toHaveBeenCalledTimes(3);
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(transactionMock.rollback).not.toHaveBeenCalled();
    });

    it('should rollback and rethrow when any query fails', async () => {
      // Arrange
      const {
        SqlServerUserClientAccessRepository,
        transactionMock,
        queryMock
      } = loadAccessRepositoryModule();
      queryMock
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('insert failed'));
      const repository = new SqlServerUserClientAccessRepository();

      // Act
      const execution = repository.setAllowedClientIds('user-1', ['testapp']);

      // Assert
      await expect(execution).rejects.toThrow('insert failed');
      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });
  });

  describe('#hasAccessToClientId', () => {
    it('should return true when query finds client access', async () => {
      // Arrange
      const {
        SqlServerUserClientAccessRepository,
        poolRequestQueryMock
      } = loadAccessRepositoryModule();
      poolRequestQueryMock.mockResolvedValue({ recordset: [{ Exists: 1 }] });
      const repository = new SqlServerUserClientAccessRepository();

      // Act
      const result = await repository.hasAccessToClientId('user-1', 'testapp');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when query does not find client access', async () => {
      // Arrange
      const {
        SqlServerUserClientAccessRepository,
        poolRequestQueryMock
      } = loadAccessRepositoryModule();
      poolRequestQueryMock.mockResolvedValue({ recordset: [] });
      const repository = new SqlServerUserClientAccessRepository();

      // Act
      const result = await repository.hasAccessToClientId('user-1', 'missing');

      // Assert
      expect(result).toBe(false);
    });
  });
});
