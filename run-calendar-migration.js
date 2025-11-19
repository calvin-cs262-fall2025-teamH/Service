// Run Calendar migration
require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '004_create_calendar_events.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running 004_create_calendar_events.sql migration...\n');

    await client.query(sql);

    console.log('✅ Migration complete!');
    console.log('\nCreated tables:');
    console.log('  - calendar_events');

    client.release();
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
