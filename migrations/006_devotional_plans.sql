-- Create devotional_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS devotional_plans (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL, -- 'couple', 'year', 'custom'
  day_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  reference VARCHAR(255) NOT NULL,
  scripture_text TEXT,
  reflection_question TEXT,
  couple_id INTEGER, -- Null for global plans, set for custom plans
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- Create couple_devotional_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS couple_devotional_progress (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  completed_by_user_id INTEGER,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES devotional_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(couple_id, plan_id)
);

-- Create custom_reading_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_reading_plans (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER UNIQUE NOT NULL,
  start_book VARCHAR(50) NOT NULL,
  start_chapter INTEGER NOT NULL,
  chapters_per_day INTEGER NOT NULL,
  days_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
);

-- Add couple_id to devotional_plans if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devotional_plans' AND column_name = 'couple_id') THEN
        ALTER TABLE devotional_plans ADD COLUMN couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE;
    END IF;
END $$;
