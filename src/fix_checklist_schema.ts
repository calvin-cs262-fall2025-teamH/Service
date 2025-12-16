import { pool } from './db';

async function fixSchema() {
  try {
    console.log('Renaming title to content in reminder_checklist_items...');
    await pool.query(`
      ALTER TABLE reminder_checklist_items 
      RENAME COLUMN title TO content;
    `);
    console.log('Successfully renamed title to content.');
  } catch (error) {
    console.error('Error renaming column:', error);
  } finally {
    await pool.end();
  }
}

fixSchema();
