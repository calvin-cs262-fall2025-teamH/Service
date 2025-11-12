-- CoupleBond Database Schema Migration
-- Run this to create all tables for the app

-- Users table (updated)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  couple_id INTEGER UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Couples table
CREATE TABLE IF NOT EXISTS couples (
  id SERIAL PRIMARY KEY,
  invite_code VARCHAR(255) UNIQUE NOT NULL,
  user1_id INTEGER UNIQUE,
  user2_id INTEGER UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add foreign key to users table for couple_id
ALTER TABLE users
ADD CONSTRAINT fk_users_couple
FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL;

-- Activities table
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

-- Photo Collage table
CREATE TABLE IF NOT EXISTS photo_collages (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER UNIQUE NOT NULL,
  date TIMESTAMP NOT NULL,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Prayer Items table
CREATE TABLE IF NOT EXISTS prayer_items (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_couple_id ON users(couple_id);
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_activities_couple_id ON activities(couple_id);
CREATE INDEX IF NOT EXISTS idx_photo_collages_activity_id ON photo_collages(activity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_activity_id ON calendar_events(activity_id);
CREATE INDEX IF NOT EXISTS idx_prayer_items_couple_id ON prayer_items(couple_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON couples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_items_updated_at BEFORE UPDATE ON prayer_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
