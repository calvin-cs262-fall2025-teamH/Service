-- Query to check all users in the database
-- Run this in PostgreSQL Explorer or any PostgreSQL client

-- View all users
SELECT id, email, created_at
FROM users
ORDER BY created_at DESC;

-- Count total users
SELECT COUNT(*) as total_users
FROM users;

-- View a specific user by email
SELECT id, email, created_at
FROM users
WHERE email = 'aaa@calvin.edu';

-- View all user data (including password hash for verification)
SELECT *
FROM users
ORDER BY created_at DESC;
