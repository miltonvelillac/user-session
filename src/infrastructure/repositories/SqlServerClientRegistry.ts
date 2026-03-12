import sql from 'mssql';
import { ClientRegistry } from '../../domain/ports/ClientRegistry';
import { getSqlServerPool } from '../db/sqlServer';

export class SqlServerClientRegistry implements ClientRegistry {
  async isActiveClient(clientId: string): Promise<boolean> {
    const pool = await getSqlServerPool();
    const result = await pool.request()
      .input('clientId', sql.NVarChar(50), clientId)
      .query<{ Exists: number }>(`
        SELECT TOP 1 1 AS [Exists]
        FROM auth.Clients
        WHERE ClientId = @clientId
          AND IsActive = 1;
      `);

    return result.recordset.length > 0;
  }
}
