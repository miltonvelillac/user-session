import sql from 'mssql';
import { UserRoleRepository } from '../../domain/ports/UserRoleRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';
import { getSqlServerPool } from '../db/sqlServer';

type RoleRecord = {
  RoleName: string;
};

type RoleIdRecord = {
  RoleId: number;
};

export class SqlServerUserRoleRepository implements UserRoleRepository {
  async getRoles(userId: string): Promise<string[]> {
    const pool = await getSqlServerPool();
    const result = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query<RoleRecord>(`
        SELECT r.RoleName
        FROM auth.UserRoles ur
        INNER JOIN auth.Roles r ON r.RoleId = ur.RoleId
        WHERE ur.UserId = @userId
          AND r.IsActive = 1;
      `);

    return Array.from(new Set(result.recordset.map(record => record.RoleName)));
  }

  async addRoles(userId: string, roles: string[]): Promise<string[]> {
    const uniqueRoles = Array.from(new Set(roles));
    const pool = await getSqlServerPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const roleName of uniqueRoles) {
        const roleId = await this.getRoleId(transaction, roleName);
        await new sql.Request(transaction)
          .input('userId', sql.UniqueIdentifier, userId)
          .input('roleId', sql.Int, roleId)
          .query(`
            IF NOT EXISTS (
              SELECT 1
              FROM auth.UserRoles
              WHERE UserId = @userId
                AND RoleId = @roleId
            )
            BEGIN
              INSERT INTO auth.UserRoles (UserId, RoleId, AssignedAt, AssignedBy)
              VALUES (@userId, @roleId, SYSUTCDATETIME(), @userId);
            END
          `);
      }

      const rolesAfterInsert = await this.getRolesWithTransaction(transaction, userId);
      await transaction.commit();
      return rolesAfterInsert;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeRoles(userId: string, roles: string[]): Promise<string[]> {
    const uniqueRoles = Array.from(new Set(roles));
    const pool = await getSqlServerPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const roleName of uniqueRoles) {
        const roleId = await this.getRoleId(transaction, roleName);
        await new sql.Request(transaction)
          .input('userId', sql.UniqueIdentifier, userId)
          .input('roleId', sql.Int, roleId)
          .query(`
            DELETE FROM auth.UserRoles
            WHERE UserId = @userId
              AND RoleId = @roleId;
          `);
      }

      const rolesAfterDelete = await this.getRolesWithTransaction(transaction, userId);
      await transaction.commit();
      return rolesAfterDelete;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async getRoleId(transaction: sql.Transaction, roleName: string): Promise<number> {
    const roleResult = await new sql.Request(transaction)
      .input('roleName', sql.NVarChar(50), roleName)
      .query<RoleIdRecord>(`
        SELECT RoleId
        FROM auth.Roles
        WHERE RoleName = @roleName
          AND IsActive = 1;
      `);

    if (roleResult.recordset.length === 0) {
      throw new AppError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation error',
        status: 400,
        details: [{ field: 'roles', message: `Role does not exist or is inactive: ${roleName}` }]
      });
    }

    return roleResult.recordset[0].RoleId;
  }

  private async getRolesWithTransaction(transaction: sql.Transaction, userId: string): Promise<string[]> {
    const rolesResult = await new sql.Request(transaction)
      .input('userId', sql.UniqueIdentifier, userId)
      .query<RoleRecord>(`
        SELECT r.RoleName
        FROM auth.UserRoles ur
        INNER JOIN auth.Roles r ON r.RoleId = ur.RoleId
        WHERE ur.UserId = @userId
          AND r.IsActive = 1;
      `);

    return Array.from(new Set(rolesResult.recordset.map(record => record.RoleName)));
  }
}
