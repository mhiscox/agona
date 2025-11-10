-- Creates the query_log table expected by app/api/query/route.js
-- Usage:
--   supabase db remote commit --db-url "$SUPABASE_DB_URL" --file scripts/setup_supabase.sql
-- or execute inside the Supabase SQL editor.

create table if not exists public.query_log (
  id bigserial primary key,
  request_id text not null,
  prompt text not null,
  answer text not null,
  model_id text,
  latency_ms integer,
  providers jsonb not null,
  winner text,
  savings_usd numeric,
  savings_pct numeric,
  savings_per_1k_tokens_usd numeric,
  created_at timestamptz not null default now()
);

comment on table public.query_log is 'Stores per-request telemetry for Agona provider bids.';

create index if not exists query_log_request_id_idx on public.query_log (request_id);
create index if not exists query_log_created_at_idx on public.query_log (created_at desc);
