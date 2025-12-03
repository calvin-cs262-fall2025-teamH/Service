// src/initDb.ts
import 'dotenv/config';
import { Pool } from 'pg';

const ADMIN_DB = 'postgres';           
const TARGET_DB = 'cs262_login';        

const admin = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: ADMIN_DB,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { require: true, rejectUnauthorized: false },
});

async function main() {
  console.log('[ENV]', {
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGDATABASE: process.env.PGDATABASE, 
    PGUSER: process.env.PGUSER,
  });

  try {

    const { rows } = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TARGET_DB]
    );
    if (rows.length > 0) {
      console.log(`ℹ️  Database "${TARGET_DB}" already exists. Skipping creation.`);
      return;
    }

    await admin.query(`CREATE DATABASE ${TARGET_DB}`);
    console.log(`✅  Created database "${TARGET_DB}" successfully.`);
  } catch (e: unknown) {
    const error = e as { code?: string };

    if (error?.code === '42P04') {
      console.log(`ℹ️  Database "${TARGET_DB}" already exists (42P04).`);
    } else {
      console.error('❌  Failed to create database:', e);
      process.exit(1);
    }
  } finally {
    await admin.end();
  }
}

main();
