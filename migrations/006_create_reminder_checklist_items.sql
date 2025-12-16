-- Service/migrations/006_create_reminder_checklist_items.sql

-- Create reminder_checklist_items table
CREATE TABLE IF NOT EXISTS reminder_checklist_items (
  id SERIAL PRIMARY KEY,
  reminder_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_reminder_checklist_reminder
    FOREIGN KEY (reminder_id)
    REFERENCES anniversary_reminders(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_reminder_checklist_items_reminder_id ON reminder_checklist_items(reminder_id);
CREATE INDEX idx_reminder_checklist_items_completed ON reminder_checklist_items(is_completed);

-- Add comment to table
COMMENT ON TABLE reminder_checklist_items IS 'Stores checklist items for anniversary reminders';
COMMENT ON COLUMN reminder_checklist_items.is_completed IS 'Whether the checklist item has been completed';
