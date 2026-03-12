import sql, { config as SqlConfig, ConnectionPool } from 'mssql';
import { getSqlPassword } from '../../shared/utils/encrypt/encrypt';

const toBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const buildSqlConfig = (): SqlConfig => {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 0,
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: getSqlPassword(),
    options: {
      encrypt: toBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true)
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000
    }
  };
};

let poolPromise: Promise<ConnectionPool> | null = null;

export const getSqlServerPool = async (): Promise<ConnectionPool> => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(buildSqlConfig())
      .connect()
      .catch(error => {
        poolPromise = null;
        throw error;
      });
  }

  return poolPromise;
};

export const closeSqlServerPool = async (): Promise<void> => {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
};
