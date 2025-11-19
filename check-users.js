// Check users in the database
require('dotenv/config');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function checkUsers() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to Azure database...');
    const client = await pool.connect();
    console.log('Connected!\n');

    // Get all users
    const result = await client.query('SELECT id, email, created_at FROM users ORDER BY created_at DESC');

    console.log(`Found ${result.rowCount} user(s):\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
