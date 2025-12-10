
-- Add scripture_text column to custom_plan_days
ALTER TABLE custom_plan_days ADD COLUMN IF NOT EXISTS scripture_text TEXT;
