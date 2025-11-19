import 'dotenv/config';
import { Pool, PoolClient, QueryResult } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:YOUR_PASSWORD@localhost:5432/cs262_login';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

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
    await client.query('SELECT 1');
    console.log('[db] Database connected successfully');
  } catch (error) {
    console.error('[db] Database connection failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown - closes all database connections
 */
export async function closeDb(): Promise<void> {
  await pool.end();
  console.log('[db] Database connections closed');
}
