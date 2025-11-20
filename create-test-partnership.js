// Create test partnership for prayer testing
const { Client } = require('pg');
require('dotenv').config();

async function createTestPartnership() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get first two users
    const users = await client.query('SELECT id, email FROM users ORDER BY id LIMIT 2');

    if (users.rows.length < 2) {
      console.log('❌ Need at least 2 users to create a partnership');
      return;
    }

    const user1 = users.rows[0];
    const user2 = users.rows[1];

    console.log(`Creating partnership between:`);
    console.log(`  User 1: ${user1.email} (ID: ${user1.id})`);
    console.log(`  User 2: ${user2.email} (ID: ${user2.id})\n`);

    // Check if partnership already exists
    const existing = await client.query(
      `SELECT id FROM partnerships
       WHERE (user1_id = $1 AND user2_id = $2)
       OR (user1_id = $2 AND user2_id = $1)`,
      [user1.id, user2.id]
    );

    if (existing.rows.length > 0) {
      console.log(`✅ Partnership already exists with ID: ${existing.rows[0].id}`);
      return;
    }

    // Create partnership
    const result = await client.query(
      `INSERT INTO partnerships (user1_id, user2_id, connected_at, is_active)
       VALUES ($1, $2, NOW(), true)
       RETURNING id`,
      [user1.id, user2.id]
    );

    console.log(`✅ Partnership created successfully with ID: ${result.rows[0].id}\n`);

    // Verify
    const verify = await client.query(
      `SELECT p.id, u1.email as user1, u2.email as user2
       FROM partnerships p
       JOIN users u1 ON p.user1_id = u1.id
       JOIN users u2 ON p.user2_id = u2.id
       WHERE p.id = $1`,
      [result.rows[0].id]
    );

    console.log('Partnership details:');
    console.table(verify.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createTestPartnership();
