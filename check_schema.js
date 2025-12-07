const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cs262',
  password: 'Scjywuyanzu2015',
  port: 5432
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'anniversary_reminders' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== Anniversary Reminders Table Schema ===\n');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
