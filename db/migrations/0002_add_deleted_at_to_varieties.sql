ALTER TABLE varieties ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_varieties_deleted_at
  ON varieties(deleted_at);
