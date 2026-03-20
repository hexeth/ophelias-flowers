CREATE TABLE IF NOT EXISTS varieties (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  sale_price_cents INTEGER,
  stock TEXT NOT NULL CHECK (stock IN ('available', 'low', 'sold-out')),
  category TEXT NOT NULL CHECK (category IN (
    'dinnerplate',
    'ball',
    'pompon',
    'cactus',
    'decorative',
    'waterlily',
    'collarette',
    'anemone',
    'stellar',
    'single'
  )),
  color_json TEXT NOT NULL,
  bloom_size TEXT NOT NULL,
  height TEXT NOT NULL,
  image_url TEXT,
  image_key TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_varieties_hidden_name
  ON varieties(hidden, name);

CREATE INDEX IF NOT EXISTS idx_varieties_deleted_at
  ON varieties(deleted_at);

CREATE INDEX IF NOT EXISTS idx_varieties_slug
  ON varieties(slug);
