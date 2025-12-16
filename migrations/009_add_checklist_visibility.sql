
-- Service/migrations/009_add_checklist_visibility.sql

DO $$
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_checklist_items' AND column_name = 'created_by') THEN
        ALTER TABLE reminder_checklist_items ADD COLUMN created_by INT;
    END IF;

    -- Add is_shared column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_checklist_items' AND column_name = 'is_shared') THEN
        ALTER TABLE reminder_checklist_items ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;
