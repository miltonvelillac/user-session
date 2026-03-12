import { ErrorCodes } from '../src/shared/errors/AppError';

type ModuleResult = {
  SqlServerUserRoleRepository: new () => {
    getRoles(userId: string): Promise<string[]>;
    addRoles(userId: string, roles: string[]): Promise<string[]>;
    removeRoles(userId: string, roles: string[]): Promise<string[]>;
  };
  getSqlServerPool: jest.Mock;
  transactionMock: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  poolQueryMock: jest.Mock;
  transactionQueryMock: jest.Mock;
};

const loadModule = (): ModuleResult => {
  jest.resetModules();

  const getSqlServerPool = jest.fn();

  const poolQueryMock = jest.fn().mockResolvedValue({ recordset: [] });
  const poolInputMock = jest.fn().mockReturnThis();
  const poolRequestInstance = { input: poolInputMock, query: poolQueryMock };
  const pool = { request: jest.fn().mockReturnValue(poolRequestInstance) };
  getSqlServerPool.mockResolvedValue(pool);

  const transactionMock = {
    begin: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };

  const transactionQueryMock = jest.fn().mockResolvedValue({ recordset: [] });
  const transactionInputMock = jest.fn().mockReturnThis();
  const transactionRequestInstance = { input: transactionInputMock, query: transactionQueryMock };

  let SqlServerUserRoleRepository: ModuleResult['SqlServerUserRoleRepository'] | undefined;

  jest.isolateModules(() => {
    jest.doMock('../src/infrastructure/db/sqlServer', () => ({
      getSqlServerPool
    }));

    jest.doMock('mssql', () => ({
      __esModule: true,
      default: {
        Transaction: jest.fn().mockImplementation(() => transactionMock),
        Request: jest.fn().mockImplementation(() => transactionRequestInstance),
        NVarChar: jest.fn((size: number) => `NVarChar(${size})`),
        UniqueIdentifier: 'UniqueIdentifierType',
        Int: 'IntType'
      }
    }));

    ({ SqlServerUserRoleRepository } = require('../src/infrastructure/repositories/SqlServerUserRoleRepository'));
  });

  return {
    SqlServerUserRoleRepository: SqlServerUserRoleRepository!,
    getSqlServerPool,
    transactionMock,
    poolQueryMock,
    transactionQueryMock
  };
};

describe('SqlServerUserRoleRepository', () => {
  describe('#getRoles', () => {
    it('should return unique roles from query results', async () => {
      // Arrange
      const { SqlServerUserRoleRepository, poolQueryMock } = loadModule();
      poolQueryMock.mockResolvedValue({
        recordset: [{ RoleName: 'admin' }, { RoleName: 'admin' }, { RoleName: 'operator' }]
      });
      const repository = new SqlServerUserRoleRepository();

      // Act
      const result = await repository.getRoles('u1');

      // Assert
      expect(result).toEqual(['admin', 'operator']);
    });
  });

  describe('#addRoles', () => {
    it('should add unique roles and return updated roles after commit', async () => {
      // Arrange
      const { SqlServerUserRoleRepository, transactionMock, transactionQueryMock } = loadModule();
      transactionQueryMock
        .mockResolvedValueOnce({ recordset: [{ RoleId: 1 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [{ RoleId: 2 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [{ RoleName: 'admin' }, { RoleName: 'operator' }] });

      const repository = new SqlServerUserRoleRepository();

      // Act
      const result = await repository.addRoles('u1', ['admin', 'admin', 'operator']);

      // Assert
      expect(result).toEqual(['admin', 'operator']);
      expect(transactionMock.begin).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(transactionMock.rollback).not.toHaveBeenCalled();
    });

    it('should rollback when role does not exist', async () => {
      // Arrange
      const { SqlServerUserRoleRepository, transactionMock, transactionQueryMock } = loadModule();
      transactionQueryMock.mockResolvedValueOnce({ recordset: [] });

      const repository = new SqlServerUserRoleRepository();

      // Act
      const execution = repository.addRoles('u1', ['missing-role']);

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
        status: 400
      });
      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });
  });

  describe('#removeRoles', () => {
    it('should remove roles and return updated roles after commit', async () => {
      // Arrange
      const { SqlServerUserRoleRepository, transactionMock, transactionQueryMock } = loadModule();
      transactionQueryMock
        .mockResolvedValueOnce({ recordset: [{ RoleId: 2 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [{ RoleName: 'admin' }] });

      const repository = new SqlServerUserRoleRepository();

      // Act
      const result = await repository.removeRoles('u1', ['operator']);

      // Assert
      expect(result).toEqual(['admin']);
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(transactionMock.rollback).not.toHaveBeenCalled();
    });

    it('should rollback and rethrow when delete fails', async () => {
      // Arrange
      const { SqlServerUserRoleRepository, transactionMock, transactionQueryMock } = loadModule();
      transactionQueryMock
        .mockResolvedValueOnce({ recordset: [{ RoleId: 2 }] })
        .mockRejectedValueOnce(new Error('delete failed'));

      const repository = new SqlServerUserRoleRepository();

      // Act
      const execution = repository.removeRoles('u1', ['operator']);

      // Assert
      await expect(execution).rejects.toThrow('delete failed');
      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });
  });
});
