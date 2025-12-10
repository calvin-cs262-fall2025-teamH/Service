import { pool } from '../src/db';

async function migrate() {
  try {
    console.log('Running migration: Add relationship_start_date to couples table...');
    await pool.query(`
      ALTER TABLE couples
      ADD COLUMN IF NOT EXISTS relationship_start_date TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
