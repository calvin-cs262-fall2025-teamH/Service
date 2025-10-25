import 'dotenv/config';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:YOUR_PASSWORD@localhost:5432/cs262_login';

export const pool = new Pool({
  connectionString,
  max: 10,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function pingDb() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('[db] connected');
  } finally {
    client.release();
  }
}
