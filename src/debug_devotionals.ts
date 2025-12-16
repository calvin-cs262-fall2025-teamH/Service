import { query, pool } from './db';

async function debugDevotionals() {
  try {
    console.log('Fetching devotional plans...');
    const res = await query('SELECT id, category, title, couple_id FROM devotional_plans ORDER BY id');
    console.table(res.rows);

    console.log('Fetching users...');
    const users = await query('SELECT id, email, couple_id FROM users');
    console.table(users.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugDevotionals();
