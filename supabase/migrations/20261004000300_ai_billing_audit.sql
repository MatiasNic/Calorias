-- AI usage, quotas, subscriptions (server source of truth) and audit trail.

create table public.ai_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('photo', 'text', 'label', 'menu', 'fridge', 'coach', 'meal_plan', 'recipe')),
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  latency_ms integer,
  status text not null check (status in ('ok', 'error', 'not_food', 'cached', 'invalid_response', 'timeout')),
  error text,
  image_sha256 text,
  result jsonb,
  created_at timestamptz not null default now()
);
create index ai_scans_user_hash_idx on public.ai_scans (user_id, image_sha256) where image_sha256 is not null;
create index ai_scans_created_idx on public.ai_scans (created_at);

-- User-reported corrections ("Reportar error") used to improve prompts.
create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_id uuid references public.ai_scans (id) on delete set null,
  original jsonb not null,
  corrected jsonb,
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

-- Daily counters (day = user's local date).
create table public.usage_quotas (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  photo_scans integer not null default 0,
  text_queries integer not null default 0,
  coach_messages integer not null default 0,
  primary key (user_id, day)
);

-- Lifetime counters and purchased credits.
create table public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bonus_photo_scans integer not null default 0 check (bonus_photo_scans >= 0),
  lifetime_coach_messages integer not null default 0,
  lifetime_photo_scans integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entitlement text not null default 'premium',
  product_id text,
  platform text check (platform in ('android', 'ios', 'stripe', 'promotional', 'mock')),
  status text not null check (status in ('active', 'trialing', 'grace_period', 'billing_issue', 'cancelled', 'expired')),
  expires_at timestamptz,
  is_trial boolean not null default false,
  will_renew boolean not null default true,
  original_transaction_id text,
  environment text check (environment in ('SANDBOX', 'PRODUCTION')),
  last_event_type text,
  last_event_at timestamptz,
  updated_by_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Idempotency log for RevenueCat webhook events.
create table public.revenuecat_events (
  id text primary key,
  app_user_id text,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Sensitive actions (no FK: must survive account deletion).
create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid,
  event text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_events_user_idx on public.audit_events (user_id, created_at);

-- Fixed-window rate limiting for Edge Functions.
create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
