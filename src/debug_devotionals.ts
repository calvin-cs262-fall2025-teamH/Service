import { query, pool } from './db';

async function debugDevotionals() {
  try {
    console.log('--- Users ---');
    const users = await query('SELECT id, email, couple_id FROM users');
    console.table(users.rows);

    console.log('--- Couples ---');
    const couples = await query('SELECT * FROM couples');
    console.table(couples.rows);

    console.log('--- Devotional Plans (Year) ---');
    const plans = await query("SELECT id, category, title, couple_id FROM devotional_plans WHERE category = 'year' ORDER BY id");
    console.table(plans.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugDevotionals();
