// Check user's password hash
const { Client } = require('pg');
require('dotenv').config();

async function checkUserPassword() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const email = 'aaa@calvin.edu';

    // Get user details
    const result = await client.query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    const user = result.rows[0];

    console.log('👤 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Password Hash: ${user.password_hash}`);
    console.log(`   Hash Length: ${user.password_hash.length}`);

    // Check if it looks like a bcrypt hash
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      console.log('\n✅ Password appears to be a valid bcrypt hash');
    } else {
      console.log('\n⚠️  Password hash format may be incorrect');
    }

    // Check partnership
    const partnership = await client.query(
      `SELECT p.id, u1.email as user1, u2.email as user2, p.is_active
       FROM partnerships p
       LEFT JOIN users u1 ON p.user1_id = u1.id
       LEFT JOIN users u2 ON p.user2_id = u2.id
       WHERE p.user1_id = $1 OR p.user2_id = $1`,
      [user.id]
    );

    if (partnership.rows.length > 0) {
      console.log('\n🤝 Partnership:');
      console.table(partnership.rows);
    } else {
      console.log('\n⚠️  No partnership found for this user');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserPassword();
