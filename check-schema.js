// Check database schema
const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check all tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('📋 Available tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check couples table structure if it exists
    const couplesExists = tables.rows.some(r => r.table_name === 'couples');
    if (couplesExists) {
      const couplesColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'couples'
        ORDER BY ordinal_position;
      `);
      console.log('\n📊 Couples table structure:');
      console.table(couplesColumns.rows);
    }

    // Check prayer_items table if it exists
    const prayersExists = tables.rows.some(r => r.table_name === 'prayer_items');
    if (prayersExists) {
      const prayerColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'prayer_items'
        ORDER BY ordinal_position;
      `);
      console.log('\n🙏 Prayer_items table structure:');
      console.table(prayerColumns.rows);
    } else {
      console.log('\n⚠️  Prayer_items table does NOT exist');
    }

    // Check users table structure
    const usersExists = tables.rows.some(r => r.table_name === 'users');
    if (usersExists) {
      const usersColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      console.log('\n👤 Users table structure:');
      console.table(usersColumns.rows);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
