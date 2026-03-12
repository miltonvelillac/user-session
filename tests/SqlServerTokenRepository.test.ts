type TokenRepositoryLoadResult = {
  SqlServerTokenRepository: new () => { saveToken(data: { userId: string; clientId: string; sessionId: string; tokenId: string; token: string }): Promise<{ userId: string; clientId: string; sessionId: string; tokenId: string; token: string }> };
  getSqlServerPool: jest.Mock;
  uniqueIdentifierMock: string;
  nVarCharMock: jest.Mock;
  maxValue: string;
};

const loadTokenRepositoryModule = (): TokenRepositoryLoadResult => {
  jest.resetModules();

  const getSqlServerPool = jest.fn();
  const uniqueIdentifierMock = 'UniqueIdentifierType';
  const maxValue = 'MAX_VALUE';
  const nVarCharMock = jest.fn((size: number | string) => `NVarChar(${size})`);
  let SqlServerTokenRepository: TokenRepositoryLoadResult['SqlServerTokenRepository'] | undefined;

  jest.isolateModules(() => {
    jest.doMock('../src/infrastructure/db/sqlServer', () => ({
      getSqlServerPool
    }));

    jest.doMock('mssql', () => ({
      __esModule: true,
      default: {
        UniqueIdentifier: uniqueIdentifierMock,
        NVarChar: nVarCharMock,
        MAX: maxValue
      }
    }));

    ({ SqlServerTokenRepository } = require('../src/infrastructure/repositories/SqlServerTokenRepository'));
  });

  return {
    SqlServerTokenRepository: SqlServerTokenRepository!,
    getSqlServerPool,
    uniqueIdentifierMock,
    nVarCharMock,
    maxValue
  };
};

describe('SqlServerTokenRepository', () => {
  describe('#saveToken', () => {
    it('should persist token session data and return the same payload', async () => {
      // Arrange
      const {
        SqlServerTokenRepository,
        getSqlServerPool,
        uniqueIdentifierMock,
        nVarCharMock,
        maxValue
      } = loadTokenRepositoryModule();

      const queryMock = jest.fn().mockResolvedValue({});
      const inputMock = jest.fn().mockReturnThis();
      const requestMock = { input: inputMock, query: queryMock };
      const poolMock = { request: jest.fn().mockReturnValue(requestMock) };
      getSqlServerPool.mockResolvedValue(poolMock);

      const repository = new SqlServerTokenRepository();
      const data = {
        userId: 'user-1',
        clientId: 'testapp',
        sessionId: 'session-1',
        tokenId: 'token-1',
        token: 'jwt-token'
      };

      // Act
      const result = await repository.saveToken(data);

      // Assert
      expect(result).toEqual(data);
      expect(inputMock).toHaveBeenNthCalledWith(1, 'sessionId', uniqueIdentifierMock, 'session-1');
      expect(inputMock).toHaveBeenNthCalledWith(2, 'tokenId', uniqueIdentifierMock, 'token-1');
      expect(inputMock).toHaveBeenNthCalledWith(3, 'userId', uniqueIdentifierMock, 'user-1');
      expect(inputMock).toHaveBeenNthCalledWith(4, 'clientId', 'NVarChar(50)', 'testapp');
      expect(inputMock).toHaveBeenNthCalledWith(5, 'token', `NVarChar(${maxValue})`, 'jwt-token');
      expect(nVarCharMock).toHaveBeenCalledWith(50);
      expect(nVarCharMock).toHaveBeenCalledWith(maxValue);
      expect(queryMock).toHaveBeenCalledTimes(1);
    });
  });
});
