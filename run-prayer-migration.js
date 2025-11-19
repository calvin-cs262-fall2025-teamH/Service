// Run prayer_items migration
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, 'migrations', '003_ensure_prayer_items.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running prayer_items migration...');
    await client.query(sql);
    console.log('✅ Prayer items table migration completed successfully');

    // Verify table exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'prayer_items'
      ORDER BY ordinal_position;
    `);

    console.log('\nTable structure:');
    console.table(result.rows);

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
