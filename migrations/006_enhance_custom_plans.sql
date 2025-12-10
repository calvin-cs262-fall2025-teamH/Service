
-- Add end_book and end_chapter to custom_reading_plans
ALTER TABLE custom_reading_plans ADD COLUMN IF NOT EXISTS end_book VARCHAR(50);
ALTER TABLE custom_reading_plans ADD COLUMN IF NOT EXISTS end_chapter INTEGER;

-- Create a table to store the generated days for custom plans
CREATE TABLE IF NOT EXISTS custom_plan_days (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES custom_reading_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    reference VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE(plan_id, day_number)
);
