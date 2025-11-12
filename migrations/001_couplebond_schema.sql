-- CoupleBond Complete Database Schema
-- This is the consolidated, production-ready schema for CoupleBond
-- Run this on a fresh database: psql -U postgres -d your_database -f migrations/001_couplebond_schema.sql

-- ============================================================================
-- STEP 1: Create users table first (no foreign keys yet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  couple_id INTEGER,  -- NOT UNIQUE - multiple users can reference same couple
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: Create couples table
-- ============================================================================
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  invite_code VARCHAR(255) UNIQUE,  -- Used by couple.ts for join flow
  user1_id INTEGER UNIQUE,  -- Each user can only be in one position
  user2_id INTEGER UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 3: Add foreign key constraint from users to couples
-- ============================================================================
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_couple;

ALTER TABLE users
  ADD CONSTRAINT fk_users_couple
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Create pairing_codes table (used by user.ts partner flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pairing_codes (
  code VARCHAR(10) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 5: Create activities table
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),  -- Required by activities routes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 6: Create photo_collages table (matches activities.ts queries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS photo_collages (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 7: Create calendar_events table
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  date TIMESTAMP NOT NULL,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 8: Create prayer_items table with all required columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS prayer_items (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,  -- For toggle-answered functionality
  answered_at TIMESTAMP,              -- Track when prayer was answered
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 9: Create indexes for performance
-- ============================================================================
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

-- ============================================================================
-- STEP 10: Create trigger function for updated_at columns
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 11: Create triggers for all tables with updated_at
-- ============================================================================
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

-- ============================================================================
-- DONE! Schema is ready for CoupleBond application
-- ============================================================================
