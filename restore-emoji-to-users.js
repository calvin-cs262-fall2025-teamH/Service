// Restore emoji to users table (each user has their own emoji)
const { Client } = require('pg');
require('dotenv').config();

async function restoreEmojiToUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Add emoji column back to users table
    console.log('📝 Adding emoji column to users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '😭'
    `);
    console.log('   ✅ emoji column added to users\n');

    // Remove emoji column from couples table
    console.log('📝 Removing emoji column from couples table...');
    await client.query(`
      ALTER TABLE couples
      DROP COLUMN IF EXISTS emoji
    `);
    console.log('   ✅ emoji column removed from couples\n');

    // Verify users table
    const usersResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'emoji'
    `);

    if (usersResult.rows.length > 0) {
      console.log('✅ Users table verification:');
      console.table(usersResult.rows);
    }

    // Verify couples table (should not have emoji)
    const couplesResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'couples' AND column_name = 'emoji'
    `);

    if (couplesResult.rows.length === 0) {
      console.log('✅ Confirmed: emoji column removed from couples table\n');
    } else {
      console.log('⚠️  Warning: emoji column still exists in couples table\n');
    }

    console.log('✅ Migration complete!');
    console.log('\nNow each user has their own emoji in the users table.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

restoreEmojiToUsers();
