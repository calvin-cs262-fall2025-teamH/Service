
DROP TABLE IF EXISTS users CASCADE;

-- citext extension is not available in Azure PostgreSQL
-- Using regular TEXT with LOWER() for case-insensitive email lookups

CREATE TABLE users (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
