"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function checkProfiles() {
    try {
        // First, check what columns actually exist in the users table
        const columnsResult = await db_1.pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
        console.log('\n=== USERS TABLE STRUCTURE ===');
        columnsResult.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type}`);
        });
        // Now get the actual users
        const result = await db_1.pool.query(`
      SELECT *
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
        console.log('\n=== RECENT USERS ===');
        console.log(`Found ${result.rows.length} users:\n`);
        result.rows.forEach((user, index) => {
            console.log(`${index + 1}. User ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Created: ${user.created_at}`);
            console.log('');
        });
        await db_1.pool.end();
    }
    catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}
checkProfiles();
