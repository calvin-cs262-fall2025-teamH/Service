// Setup Azure Database
require('dotenv/config');
const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

async function setupDatabase() {
  const pool = new Pool({ connectionString });

  try {
    console.log('Connecting to Azure database...');
    const client = await pool.connect();
    console.log('Connected!');

    // Read the SQL file
    const sql = fs.readFileSync('./auth.sql', 'utf8');
    console.log('Running auth.sql...');

    await client.query(sql);
    console.log('✓ Database setup complete!');

    client.release();
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();
