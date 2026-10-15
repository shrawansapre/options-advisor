CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ticker TEXT NOT NULL DEFAULT '',
  strategy TEXT NOT NULL DEFAULT '',
  strategy_type TEXT NOT NULL DEFAULT 'neutral',
  result_json TEXT,
  created_at TEXT NOT NULL,
  feedback TEXT,
  reported INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_created
  ON analyses (user_id, created_at DESC);
