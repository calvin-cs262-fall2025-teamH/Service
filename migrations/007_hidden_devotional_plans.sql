CREATE TABLE IF NOT EXISTS hidden_devotional_plans (
  couple_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (couple_id, plan_id),
  FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES devotional_plans(id) ON DELETE CASCADE
);
