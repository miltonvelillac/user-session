import sql from 'mssql';
import { TokenRepository } from '../../domain/ports/TokenRepository';
import { getSqlServerPool } from '../db/sqlServer';

export class SqlServerTokenRepository implements TokenRepository {
  async saveToken(data: {
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }): Promise<{
    userId: string;
    clientId: string;
    sessionId: string;
    tokenId: string;
    token: string;
  }> {
    const pool = await getSqlServerPool();
    await pool.request()
      .input('sessionId', sql.UniqueIdentifier, data.sessionId)
      .input('tokenId', sql.UniqueIdentifier, data.tokenId)
      .input('userId', sql.UniqueIdentifier, data.userId)
      .input('clientId', sql.NVarChar(50), data.clientId)
      .input('token', sql.NVarChar(sql.MAX), data.token)
      .query(`
        INSERT INTO auth.AuthSessions
          (SessionId, TokenId, UserId, ClientId, AccessToken, IssuedAt, ExpiresAt, RevokedAt, RevokedReason, IpAddress, UserAgent)
        VALUES
          (@sessionId, @tokenId, @userId, @clientId, @token, SYSUTCDATETIME(), NULL, NULL, NULL, NULL, NULL);
      `);

    return data;
  }
}
