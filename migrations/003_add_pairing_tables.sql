-- Add missing tables for CoupleBond pairing feature
-- This migration adds tables that are missing from the current database
-- Safe to run - uses IF NOT EXISTS

-- Add pairing_codes table for user.ts partner flow
CREATE TABLE IF NOT EXISTS pairing_codes (
  code VARCHAR(10) PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add couples table if it doesn't exist (different from partnerships)
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  invite_code VARCHAR(255) UNIQUE,
  user1_id INTEGER UNIQUE,
  user2_id INTEGER UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add couple_id column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS couple_id INTEGER;

-- Add activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- Add photo_collages table (different from photos)
CREATE TABLE IF NOT EXISTS photo_collages (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_couple ON users(couple_id);
CREATE INDEX IF NOT EXISTS idx_activities_couple ON activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_photo_collages_activity ON photo_collages(activity_id);

-- Add foreign key constraint from users to couples if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_couple'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_couple
      FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Migration complete! Added missing tables:
--   - pairing_codes
--   - couples (if needed)
--   - activities (if needed)
--   - photo_collages (if needed)
