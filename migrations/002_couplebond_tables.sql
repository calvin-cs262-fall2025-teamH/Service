-- CoupleBond Database Migration
-- Run this after your existing users table is set up
-- Usage: psql -U postgres -d your_database < Service/migrations/002_couplebond_tables.sql

-- Add couple_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS couple_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Couples table
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id),
  UNIQUE(user2_id)
);

-- Pairing codes table
CREATE TABLE IF NOT EXISTS pairing_codes (
  code VARCHAR(10) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prayer items table
CREATE TABLE IF NOT EXISTS prayer_items (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  is_answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_couple_id ON users(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_users ON couples(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_couple ON activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_photos_activity ON photos(activity_id);
CREATE INDEX IF NOT EXISTS idx_prayers_couple ON prayer_items(couple_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prayers_updated_at ON prayer_items;
CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON prayer_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint for couple_id in users
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_couple;

ALTER TABLE users
  ADD CONSTRAINT fk_users_couple
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;
