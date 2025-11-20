// Check user partnerships
const { Client } = require('pg');
require('dotenv').config();

async function checkUserPartnerships() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check users
    console.log('👥 USERS:');
    const users = await client.query('SELECT id, email, name FROM users ORDER BY id LIMIT 10');
    console.table(users.rows);

    // Check partnerships
    console.log('\n🤝 PARTNERSHIPS:');
    const partnerships = await client.query(`
      SELECT
        p.id,
        p.user1_id,
        p.user2_id,
        u1.email as user1_email,
        u2.email as user2_email
      FROM partnerships p
      LEFT JOIN users u1 ON p.user1_id = u1.id
      LEFT JOIN users u2 ON p.user2_id = u2.id
      ORDER BY p.id
      LIMIT 10
    `);
    console.table(partnerships.rows);

    // Check prayer items
    console.log('\n🙏 PRAYER ITEMS:');
    const prayers = await client.query(`
      SELECT
        pi.id,
        pi.partnership_id,
        pi.added_by_user_id,
        pi.title,
        pi.is_answered,
        u.email as added_by
      FROM prayer_items pi
      LEFT JOIN users u ON pi.added_by_user_id = u.id
      ORDER BY pi.id
      LIMIT 10
    `);
    console.table(prayers.rows);

    // Test getUserPartnershipId function
    if (users.rows.length > 0) {
      const testUserId = users.rows[0].id;
      console.log(`\n🔍 Testing getUserPartnershipId for user ${testUserId} (${users.rows[0].email}):`);

      const partnershipResult = await client.query(`
        SELECT id FROM partnerships
        WHERE (user1_id = $1 OR user2_id = $1)
        LIMIT 1
      `, [testUserId]);

      if (partnershipResult.rows.length > 0) {
        console.log(`   ✅ Found partnership: ${partnershipResult.rows[0].id}`);
      } else {
        console.log(`   ⚠️  No active partnership found for this user`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserPartnerships();
