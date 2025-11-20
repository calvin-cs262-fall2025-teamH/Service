// Check partnerships table structure
const { Client } = require('pg');
require('dotenv').config();

async function checkPartnershipsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'partnerships'
      ORDER BY ordinal_position;
    `);

    console.log('📊 Partnerships table structure:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkPartnershipsTable();
