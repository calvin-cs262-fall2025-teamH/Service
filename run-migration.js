// Run CoupleBond migration on Azure
require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to Azure database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    // Read the migration SQL file
    const sql = fs.readFileSync('./migrations/002_couplebond_tables.sql', 'utf8');
    console.log('Running 002_couplebond_tables.sql migration...\n');

    await client.query(sql);

    console.log('✅ Migration complete!');
    console.log('\nCreated tables:');
    console.log('  - couples');
    console.log('  - pairing_codes');
    console.log('  - activities');
    console.log('  - photos');
    console.log('  - prayer_items');
    console.log('\nAltered tables:');
    console.log('  - users (added couple_id and name columns)');

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
