// Run migration to add missing pairing tables
require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    // Read the migration SQL file
    const sql = fs.readFileSync('./migrations/003_add_pairing_tables.sql', 'utf8');
    console.log('Running migration to add pairing tables...\n');

    await client.query(sql);

    console.log('✅ Migration complete!');
    console.log('\nAdded tables (IF NOT EXISTS):');
    console.log('  - pairing_codes');
    console.log('  - couples');
    console.log('  - activities');
    console.log('  - photo_collages');
    console.log('\nAdded column:');
    console.log('  - users.couple_id');
    console.log('\nAdded indexes for performance');

    // Verify pairing_codes table now exists
    const check = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pairing_codes';
    `);

    if (check.rows.length > 0) {
      console.log('\n✅ Verified: pairing_codes table now exists!');
    } else {
      console.log('\n⚠️  Warning: pairing_codes table still not found');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
