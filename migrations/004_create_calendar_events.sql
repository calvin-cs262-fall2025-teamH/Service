-- Create calendar_events table with actual production schema
-- This matches the existing database structure
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  partnership_id INTEGER NOT NULL,
  added_by_user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  event_type TEXT DEFAULT 'other',
  google_calendar_id TEXT,
  apple_calendar_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partnership_id) REFERENCES couples(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_partnership_date ON calendar_events(partnership_id, event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_added_by ON calendar_events(added_by_user_id);

-- Add check constraint for valid event types
ALTER TABLE calendar_events
DROP CONSTRAINT IF EXISTS check_valid_event_type;

ALTER TABLE calendar_events
ADD CONSTRAINT check_valid_event_type
CHECK (event_type IN ('anniversary', 'work', 'life', 'personal', 'important', 'other'));

-- Comments for documentation
COMMENT ON TABLE calendar_events IS 'Shared calendar events for couples';
COMMENT ON COLUMN calendar_events.partnership_id IS 'Reference to the couple who owns this event';
COMMENT ON COLUMN calendar_events.added_by_user_id IS 'User who created this event';
COMMENT ON COLUMN calendar_events.event_date IS 'Date of the event';
COMMENT ON COLUMN calendar_events.event_time IS 'Time of the event (NULL for all-day events)';
COMMENT ON COLUMN calendar_events.is_all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN calendar_events.event_type IS 'Category: anniversary, work, life, personal, important, other';
