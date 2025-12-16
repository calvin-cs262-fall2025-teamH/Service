-- Service/migrations/008_fix_reminder_checklist_items.sql

-- Check if the table exists and fix the column structure
DO $$
BEGIN
    -- Drop the table if it exists with wrong structure and recreate it
    DROP TABLE IF EXISTS reminder_checklist_items CASCADE;

    -- Create reminder_checklist_items table with correct structure
    CREATE TABLE reminder_checklist_items (
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
END $$;
