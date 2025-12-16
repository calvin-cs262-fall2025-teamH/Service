-- Create reminder_checklist_items table
CREATE TABLE IF NOT EXISTS reminder_checklist_items (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER NOT NULL,
  content VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reminder_id) REFERENCES anniversary_reminders(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reminder_checklist_items_reminder_id ON reminder_checklist_items(reminder_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_reminder_checklist_items_updated_at ON reminder_checklist_items;
CREATE TRIGGER update_reminder_checklist_items_updated_at
  BEFORE UPDATE ON reminder_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
