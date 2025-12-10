import { pool } from '../src/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    console.log('Running migration: Enhance custom plans...');
    const sqlPath = path.join(__dirname, '../migrations/006_enhance_custom_plans.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
