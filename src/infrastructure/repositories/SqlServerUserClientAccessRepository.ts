import sql from 'mssql';
import { UserClientAccessRepository } from '../../domain/ports/UserClientAccessRepository';
import { getSqlServerPool } from '../db/sqlServer';

export class SqlServerUserClientAccessRepository implements UserClientAccessRepository {
  async setAllowedClientIds(userId: string, clientIds: string[]): Promise<string[]> {
    const uniqueClientIds = Array.from(new Set(clientIds));
    const pool = await getSqlServerPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          DELETE FROM auth.UserClientAccess
          WHERE UserId = @userId;
        `);

      for (const clientId of uniqueClientIds) {
        await new sql.Request(transaction)
          .input('userId', sql.UniqueIdentifier, userId)
          .input('clientId', sql.NVarChar(50), clientId)
          .query(`
            INSERT INTO auth.UserClientAccess (UserId, ClientId, GrantedAt, GrantedBy)
            VALUES (@userId, @clientId, SYSUTCDATETIME(), NULL);
          `);
      }

      await transaction.commit();
      return uniqueClientIds;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async hasAccessToClientId(userId: string, clientId: string): Promise<boolean> {
    const pool = await getSqlServerPool();
    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('clientId', sql.NVarChar(50), clientId)
      .query<{ Exists: number }>(`
        SELECT TOP 1 1 AS [Exists]
        FROM auth.UserClientAccess uca
        INNER JOIN auth.Clients c ON c.ClientId = uca.ClientId
        WHERE uca.UserId = @userId
          AND uca.ClientId = @clientId
          AND c.IsActive = 1;
      `);

    return result.recordset.length > 0;
  }
}
