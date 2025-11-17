# Migration Guide - Old Schema to New Schema

If you have an existing database with the old migrations (001_initial_schema.sql and 002_couplebond_tables.sql), follow this guide to migrate to the new consolidated schema.

## Option 1: Fresh Start (Recommended for Development)

**Best for:** Development environments where you can afford to lose existing data.

```bash
# Drop and recreate database
dropdb cs262_couplebond
createdb cs262_couplebond

# Run new consolidated migration
psql -U postgres -d cs262_couplebond -f Service/migrations/001_couplebond_schema.sql
```

## Option 2: Incremental Migration (For Production)

**Best for:** Production environments with existing data you need to preserve.

### Step 1: Backup Your Data

```bash
pg_dump -U postgres cs262_couplebond > backup_before_migration.sql
```

### Step 2: Check What You Have

```sql
-- Connect to database
psql -U postgres -d cs262_couplebond

-- Check existing tables
\dt

-- Check users table structure
\d users

-- Check if photo_collages or photos table exists
\d photo_collages
\d photos
```

### Step 3: Apply Fixes

Create and run this migration script (`Service/migrations/002_fix_schema.sql`):

```sql
-- Fix 1: Rename photos to photo_collages if needed
ALTER TABLE IF EXISTS photos RENAME TO photo_collages;

-- Fix 2: Add missing columns to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Fix 3: Add missing columns to prayer_items
ALTER TABLE prayer_items ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT FALSE;
ALTER TABLE prayer_items ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP;

-- Fix 4: Remove UNIQUE constraint from users.couple_id if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_couple_id_key;

-- Fix 5: Add invite_code to couples if missing
ALTER TABLE couples ADD COLUMN IF NOT EXISTS invite_code VARCHAR(255) UNIQUE;

-- Fix 6: Ensure pairing_codes table exists
CREATE TABLE IF NOT EXISTS pairing_codes (
  code VARCHAR(10) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fix 7: Add missing indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_couple_id ON users(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_couples_users ON couples(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_activities_couple_id ON activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_photo_collages_activity_id ON photo_collages(activity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_activity_id ON calendar_events(activity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_prayer_items_couple_id ON prayer_items(couple_id);

-- Fix 8: Ensure updated_at triggers exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_couples_updated_at ON couples;
CREATE TRIGGER update_couples_updated_at
  BEFORE UPDATE ON couples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prayer_items_updated_at ON prayer_items;
CREATE TRIGGER update_prayer_items_updated_at
  BEFORE UPDATE ON prayer_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Run the fix:

```bash
psql -U postgres -d cs262_couplebond -f Service/migrations/002_fix_schema.sql
```

### Step 4: Verify Migration

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- activities
-- calendar_events
-- couples
-- pairing_codes
-- photo_collages
-- prayer_items
-- users

-- Check photo_collages structure
\d photo_collages

-- Check activities has location
\d activities

-- Check prayer_items has is_answered and answered_at
\d prayer_items

-- Check indexes
\di

-- Check foreign keys are correct
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### Step 5: Test Your Application

```bash
# Start server
cd Service
npm run dev

# Test health endpoint
curl http://localhost:4000/api/health

# Test login (if you have existing users)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@user.com","password":"their_password"}'
```

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup
psql -U postgres -d cs262_couplebond < backup_before_migration.sql
```

## Common Issues and Solutions

### Issue: "relation photos does not exist"
**Solution:** Run the rename command:
```sql
ALTER TABLE IF EXISTS photos RENAME TO photo_collages;
```

### Issue: "column location does not exist"
**Solution:** Add the missing column:
```sql
ALTER TABLE activities ADD COLUMN IF NOT EXISTS location VARCHAR(255);
```

### Issue: "duplicate key value violates unique constraint users_couple_id_key"
**Solution:** Remove the UNIQUE constraint:
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_couple_id_key;
```

### Issue: Old triggers not working
**Solution:** Recreate all triggers using the script in Step 3.

## Migration Checklist

- [ ] Backup database
- [ ] Check current schema
- [ ] Run fix script
- [ ] Verify all tables exist
- [ ] Verify all columns exist
- [ ] Verify indexes created
- [ ] Verify foreign keys correct
- [ ] Test application endpoints
- [ ] Check logs for errors
- [ ] Test partner pairing flow
- [ ] Test activities and photos
- [ ] Test prayers (including toggle-answered)
- [ ] Test calendar events

## After Migration

Update your environment variables if needed:

```env
# Service/.env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/cs262_couplebond
JWT_SECRET=your_secure_secret_here
PORT=4000
```

Restart your server:

```bash
cd Service
npm run dev
```

Your backend is now running with the improved, debugged schema! 🎉
