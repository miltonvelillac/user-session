import sql from 'mssql';
import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AppError, ErrorCodes } from '../../shared/errors/AppError';
import { getSqlServerPool } from '../db/sqlServer';

type UserWithRoleRecord = {
  UserId: string;
  Username: string;
  PasswordHash: string;
  RoleName: string | null;
};

export class SqlServerUserRepository implements UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const pool = await getSqlServerPool();
    const result = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query<UserWithRoleRecord>(`
        SELECT
          u.UserId,
          u.Username,
          u.PasswordHash,
          r.RoleName
        FROM auth.Users u
        LEFT JOIN auth.UserRoles ur ON ur.UserId = u.UserId
        LEFT JOIN auth.Roles r ON r.RoleId = ur.RoleId AND r.IsActive = 1
        WHERE u.Username = @username
          AND u.IsActive = 1;
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const first = result.recordset[0];
    const roles = Array.from(new Set(
      result.recordset
        .map(record => record.RoleName)
        .filter((role): role is string => typeof role === 'string')
    ));

    return new User({
      id: first.UserId,
      username: first.Username,
      passwordHash: first.PasswordHash,
      roles
    });
  }

  async save(user: User): Promise<User> {
    const pool = await getSqlServerPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('userId', sql.UniqueIdentifier, user.id)
        .input('username', sql.NVarChar(100), user.username)
        .input('passwordHash', sql.NVarChar(255), user.passwordHash)
        .query(`
          INSERT INTO auth.Users (UserId, Username, PasswordHash, IsActive, CreatedAt, UpdatedAt)
          VALUES (@userId, @username, @passwordHash, 1, SYSUTCDATETIME(), NULL);
        `);

      for (const roleName of user.roles) {
        const roleResult = await new sql.Request(transaction)
          .input('roleName', sql.NVarChar(50), roleName)
          .query<{ RoleId: number }>(`
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

        await new sql.Request(transaction)
          .input('userId', sql.UniqueIdentifier, user.id)
          .input('roleId', sql.Int, roleResult.recordset[0].RoleId)
          .query(`
            INSERT INTO auth.UserRoles (UserId, RoleId, AssignedAt, AssignedBy)
            VALUES (@userId, @roleId, SYSUTCDATETIME(), @userId);
          `);
      }

      await transaction.commit();
      return user;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
