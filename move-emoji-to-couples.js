// Move emoji from users table to couples table
const { Client } = require('pg');
require('dotenv').config();

async function moveEmojiToCouples() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add emoji column to couples table
    console.log('📝 Adding emoji column to couples table...');
    await client.query(`
      ALTER TABLE couples
      ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '😭'
    `);
    console.log('   ✅ emoji column added to couples\n');

    // Remove emoji column from users table
    console.log('📝 Removing emoji column from users table...');
    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS emoji
    `);
    console.log('   ✅ emoji column removed from users\n');

    // Verify couples table
    const couplesResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'couples' AND column_name = 'emoji'
    `);

    if (couplesResult.rows.length > 0) {
      console.log('✅ Couples table verification:');
      console.table(couplesResult.rows);
    }

    // Verify users table (should not have emoji)
    const usersResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'emoji'
    `);

    if (usersResult.rows.length === 0) {
      console.log('✅ Users table verified - emoji column removed\n');
    }

    console.log('🎉 Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

moveEmojiToCouples();
