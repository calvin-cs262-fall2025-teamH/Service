-- Service/migrations/005_create_anniversary_reminders.sql

-- Create anniversary_reminders table
CREATE TABLE IF NOT EXISTS anniversary_reminders (
  id SERIAL PRIMARY KEY,
  couple_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  anniversary_date DATE NOT NULL,
  reminder_days_before INT NOT NULL DEFAULT 7,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_anniversary_reminders_couple
    FOREIGN KEY (couple_id)
    REFERENCES couples(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_anniversary_reminders_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_anniversary_reminders_couple_id ON anniversary_reminders(couple_id);
CREATE INDEX idx_anniversary_reminders_user_id ON anniversary_reminders(user_id);
CREATE INDEX idx_anniversary_reminders_date ON anniversary_reminders(anniversary_date);
CREATE INDEX idx_anniversary_reminders_enabled ON anniversary_reminders(is_enabled);

-- Add comment to table
COMMENT ON TABLE anniversary_reminders IS 'Stores anniversary reminders for couples';
COMMENT ON COLUMN anniversary_reminders.reminder_days_before IS 'Number of days before the anniversary to send reminder';
COMMENT ON COLUMN anniversary_reminders.is_recurring IS 'Whether reminder repeats every year';
COMMENT ON COLUMN anniversary_reminders.is_enabled IS 'Whether reminder is active';
