import { User } from '../src/domain/entities/User';
import { ErrorCodes } from '../src/shared/errors/AppError';

type UserRepositoryLoadResult = {
  SqlServerUserRepository: new () => {
    findByUsername(username: string): Promise<User | null>;
    save(user: User): Promise<User>;
  };
  getSqlServerPool: jest.Mock;
  transactionMock: { begin: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  transactionQueryMock: jest.Mock;
  poolQueryMock: jest.Mock;
};

const loadUserRepositoryModule = (): UserRepositoryLoadResult => {
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

  const transactionQueryMock = jest.fn().mockResolvedValue({});
  const transactionInputMock = jest.fn().mockReturnThis();
  const transactionRequestInstance = { input: transactionInputMock, query: transactionQueryMock };

  let SqlServerUserRepository: UserRepositoryLoadResult['SqlServerUserRepository'] | undefined;

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

    ({ SqlServerUserRepository } = require('../src/infrastructure/repositories/SqlServerUserRepository'));
  });

  return {
    SqlServerUserRepository: SqlServerUserRepository!,
    getSqlServerPool,
    transactionMock,
    transactionQueryMock,
    poolQueryMock
  };
};

describe('SqlServerUserRepository', () => {
  describe('#findByUsername', () => {
    it('should return null when user is not found', async () => {
      // Arrange
      const { SqlServerUserRepository, poolQueryMock } = loadUserRepositoryModule();
      poolQueryMock.mockResolvedValue({ recordset: [] });
      const repository = new SqlServerUserRepository();

      // Act
      const result = await repository.findByUsername('missing');

      // Assert
      expect(result).toBeNull();
    });

    it('should return user with distinct roles when user exists', async () => {
      // Arrange
      const { SqlServerUserRepository, poolQueryMock } = loadUserRepositoryModule();
      poolQueryMock.mockResolvedValue({
        recordset: [
          { UserId: 'u1', Username: 'john', PasswordHash: 'hash', RoleName: 'admin' },
          { UserId: 'u1', Username: 'john', PasswordHash: 'hash', RoleName: 'admin' },
          { UserId: 'u1', Username: 'john', PasswordHash: 'hash', RoleName: 'operator' },
          { UserId: 'u1', Username: 'john', PasswordHash: 'hash', RoleName: null }
        ]
      });
      const repository = new SqlServerUserRepository();

      // Act
      const result = await repository.findByUsername('john');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('u1');
      expect(result?.username).toBe('john');
      expect(result?.passwordHash).toBe('hash');
      expect(result?.roles).toEqual(['admin', 'operator']);
    });
  });

  describe('#save', () => {
    it('should insert user and user roles then commit transaction', async () => {
      // Arrange
      const { SqlServerUserRepository, transactionMock, transactionQueryMock } = loadUserRepositoryModule();
      transactionQueryMock
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [{ RoleId: 1 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [{ RoleId: 2 }] })
        .mockResolvedValueOnce({});

      const repository = new SqlServerUserRepository();
      const user = new User({
        id: 'u1',
        username: 'john',
        passwordHash: 'hash',
        roles: ['admin', 'operator']
      });

      // Act
      const result = await repository.save(user);

      // Assert
      expect(result).toBe(user);
      expect(transactionMock.begin).toHaveBeenCalledTimes(1);
      expect(transactionQueryMock).toHaveBeenCalledTimes(5);
      expect(transactionMock.commit).toHaveBeenCalledTimes(1);
      expect(transactionMock.rollback).not.toHaveBeenCalled();
    });

    it('should throw validation error and rollback when role is missing or inactive', async () => {
      // Arrange
      const { SqlServerUserRepository, transactionMock, transactionQueryMock } = loadUserRepositoryModule();
      transactionQueryMock
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ recordset: [] });

      const repository = new SqlServerUserRepository();
      const user = new User({
        id: 'u1',
        username: 'john',
        passwordHash: 'hash',
        roles: ['unknown-role']
      });

      // Act
      const execution = repository.save(user);

      // Assert
      await expect(execution).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
        status: 400
      });
      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });

    it('should rollback and rethrow unknown errors', async () => {
      // Arrange
      const { SqlServerUserRepository, transactionMock, transactionQueryMock } = loadUserRepositoryModule();
      transactionQueryMock.mockRejectedValueOnce(new Error('insert failed'));

      const repository = new SqlServerUserRepository();
      const user = new User({
        id: 'u1',
        username: 'john',
        passwordHash: 'hash',
        roles: ['admin']
      });

      // Act
      const execution = repository.save(user);

      // Assert
      await expect(execution).rejects.toThrow('insert failed');
      expect(transactionMock.rollback).toHaveBeenCalledTimes(1);
      expect(transactionMock.commit).not.toHaveBeenCalled();
    });
  });
});
