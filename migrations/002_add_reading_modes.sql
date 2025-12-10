-- Drop the old unique constraint on day_number so we can have Day 1 for multiple categories
ALTER TABLE devotional_plans DROP CONSTRAINT IF EXISTS devotional_plans_day_number_key;

-- Add category column if it doesn't exist
ALTER TABLE devotional_plans ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'couple';

-- Add new composite unique constraint
ALTER TABLE devotional_plans ADD CONSTRAINT devotional_plans_day_category_key UNIQUE (day_number, category);

-- Update existing rows to be 'couple' category
UPDATE devotional_plans SET category = 'couple' WHERE category IS NULL;

-- Create Custom Plans table for the 3rd mode
CREATE TABLE IF NOT EXISTS custom_reading_plans (
    id SERIAL PRIMARY KEY,
    couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
    plan_name VARCHAR(255) DEFAULT 'Custom Plan',
    start_book VARCHAR(50) NOT NULL,
    start_chapter INTEGER NOT NULL DEFAULT 1,
    chapters_per_day INTEGER NOT NULL DEFAULT 1,
    days_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(couple_id)
);

-- Seed sample data for "Bible in a Year" (Mode 1)
INSERT INTO devotional_plans (day_number, title, reference, scripture_text, category) VALUES
(1, 'Creation & Fall', 'Genesis 1-3', 'In the beginning God created the heavens and the earth...', 'year'),
(2, 'Cain, Abel & Noah', 'Genesis 4-7', 'Adam made love to his wife Eve, and she became pregnant and gave birth to Cain...', 'year'),
(3, 'The Flood', 'Genesis 8-11', 'But God remembered Noah and all the wild animals and the livestock that were with him in the ark...', 'year'),
(4, 'Call of Abram', 'Genesis 12-15', 'The Lord had said to Abram, "Go from your country, your people and your father''s household to the land I will show you."', 'year'),
(5, 'Hagar & Ishmael', 'Genesis 16-18', 'Now Sarai, Abram''s wife, had borne him no children...', 'year')
ON CONFLICT (day_number, category) DO NOTHING;
