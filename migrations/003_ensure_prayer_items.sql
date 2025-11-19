-- Ensure prayer_items table exists with correct structure
CREATE TABLE IF NOT EXISTS prayer_items (
  id SERIAL PRIMARY KEY,
  couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_prayer_items_couple_id ON prayer_items(couple_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prayer_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_prayer_items_updated_at ON prayer_items;
CREATE TRIGGER update_prayer_items_updated_at
  BEFORE UPDATE ON prayer_items
  FOR EACH ROW
  EXECUTE FUNCTION update_prayer_items_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON prayer_items TO martinadmin;
GRANT USAGE, SELECT ON SEQUENCE prayer_items_id_seq TO martinadmin;
