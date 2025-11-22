import 'dotenv/config';
import { Pool, PoolClient, QueryResult } from 'pg';

// Build connection string. Prefer DATABASE_URL, otherwise build from DB_* env vars.
function buildConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_SERVER || process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'password';
  const database = process.env.DB_DATABASE || 'cs262_login';

  // If DB_SSLMODE is set to require, append it
  const sslmode = process.env.DB_SSLMODE || '';
  const qs = sslmode ? `?sslmode=${encodeURIComponent(sslmode)}` : '';

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}${qs}`;
}

const connectionString = buildConnectionString();

// When connecting to managed Postgres (e.g., Azure), sslmode=require is commonly used.
// The node-postgres Pool accepts an `ssl` option. If the connection string contains
// sslmode=require, enable ssl with `rejectUnauthorized: false` to allow connections
// when a CA is not provided (common for Azure App Service setups).
const needSsl = /sslmode=.?require/i.test(connectionString) || process.env.DB_SSL === 'true' || process.env.DB_REQUIRE_SSL === 'true';

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(needSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

export { pool };

/**
 * Execute a single query
 */
export const query = (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

/**
 * Execute multiple queries in a transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 *
 * @param callback - Function that receives a client and executes queries
 * @returns The result from the callback function
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO couples ...');
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health check - verifies database connectivity
 */
export async function pingDb(): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT 1');
    console.log('[db] Database connected successfully');
    return res.rows && res.rows.length ? undefined : undefined;
  } catch (error) {
    console.error('[db] Database connection failed. Connection string host info (obscured):',
      // show host/port for debugging without revealing credentials
      { host: extractHostPort(connectionString) },
      error);
    throw error;
  } finally {
    client.release();
  }
}

function extractHostPort(connStr: string) {
  try {
    // match user:pass@host:port/db
    const m = connStr.match(/@([^/]+)\//);
    if (!m || !m[1]) return null;
    return m[1];
  } catch (e) {
    return null;
  }
}

/**
 * Graceful shutdown - closes all database connections
 */
export async function closeDb(): Promise<void> {
  await pool.end();
  console.log('[db] Database connections closed');
}
