// Check what tables exist in the database
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkTables() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    // Query to get all tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📊 Tables in database:');
    console.log('======================');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    console.log(`\nTotal: ${result.rows.length} tables\n`);

    // Check specifically for pairing_codes
    const pairingCheck = result.rows.find(row => row.table_name === 'pairing_codes');
    if (pairingCheck) {
      console.log('✅ pairing_codes table EXISTS');

      // Get column info
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'pairing_codes'
        ORDER BY ordinal_position;
      `);

      console.log('\nColumns in pairing_codes:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ pairing_codes table MISSING!');
      console.log('\n🔧 Run this to create it:');
      console.log('   node run-migration.js');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
