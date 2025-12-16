import { pool } from './db';

async function inspect() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reminder_checklist_items';
    `);
    console.log('Columns in reminder_checklist_items:', res.rows);
  } catch (error) {
    console.error('Error inspecting table:', error);
  } finally {
    await pool.end();
  }
}

inspect();
