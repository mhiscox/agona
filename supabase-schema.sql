-- Supabase query_log table schema
-- Run this SQL in your Supabase SQL Editor to create the required table

CREATE TABLE IF NOT EXISTS query_log (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT,
  model_id TEXT,
  latency_ms INTEGER,
  providers JSONB,
  winner TEXT,
  savings_usd NUMERIC(10, 6),
  savings_pct NUMERIC(5, 2),
  savings_per_1k_tokens_usd NUMERIC(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on request_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_query_log_request_id ON query_log(request_id);

-- Create an index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_query_log_created_at ON query_log(created_at);

-- Optional: Enable Row Level Security (RLS) if needed
-- ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;

-- Optional: Create a policy to allow service role to insert (if using RLS)
-- CREATE POLICY "Allow service role to insert" ON query_log
--   FOR INSERT
--   TO service_role
--   WITH CHECK (true);

