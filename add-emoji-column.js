// Add emoji column to users table
const { Client } = require('pg');
require('dotenv').config();

async function addEmojiColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add emoji column
    console.log('📝 Adding emoji column to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '😭'
    `);
    console.log('   ✅ emoji column added\n');

    // Verify
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'emoji'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification:');
      console.table(result.rows);
    }

    console.log('\n🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

addEmojiColumn();
