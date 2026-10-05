-- Core schema: extensions, enum, catalog, user tables, market data, jobs.
-- Conventions: snake_case, money in integer cents, game days in US Eastern, uuid ids.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;


-- Certified condition grades supported by the MVP.
create type public.grade as enum ('RAW', 'PSA9', 'PSA10');

-- ---------------------------------------------------------------------------
-- Catalog (public read, written only by the import script with the service role)
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  team text,
  highlightly_id integer unique,
  created_at timestamptz not null default now()
);
create index players_name_trgm_idx on public.players using gin (name extensions.gin_trgm_ops);

create table public.card_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  season text not null check (season ~ '^20[0-9]{2}-[0-9]{2}$'),
  release_date date,
  created_at timestamptz not null default now()
);
create index card_sets_season_idx on public.card_sets (season);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  set_id uuid not null references public.card_sets (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete restrict,
  number text not null,
  is_rookie boolean not null default false,
  created_at timestamptz not null default now(),
  unique (set_id, number)
);
create index cards_player_id_idx on public.cards (player_id);
create index cards_set_id_idx on public.cards (set_id);
create index cards_rookie_idx on public.cards (is_rookie) where is_rookie;

create table public.parallels (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  name text not null,
  serial_run integer check (serial_run is null or serial_run > 0),
  created_at timestamptz not null default now(),
  unique (card_id, name)
);
create index parallels_card_id_idx on public.parallels (card_id);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_premium boolean not null default false,
  premium_until timestamptz,
  push_token text,
  created_at timestamptz not null default now()
);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parallel_id uuid not null references public.parallels (id) on delete restrict,
  grade public.grade not null default 'RAW',
  serial_number integer check (serial_number is null or serial_number > 0),
  purchase_cents integer check (purchase_cents is null or purchase_cents >= 0),
  photo_path text,
  created_at timestamptz not null default now()
);
create index collection_items_user_id_idx on public.collection_items (user_id);
create index collection_items_parallel_id_idx on public.collection_items (parallel_id);

create table public.followed_players (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

create table public.checklist_follows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_id uuid not null references public.card_sets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, set_id)
);

create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parallel_id uuid not null references public.parallels (id) on delete cascade,
  grade public.grade not null default 'RAW',
  below_cents integer not null check (below_cents > 0),
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index price_alerts_user_id_idx on public.price_alerts (user_id);
create index price_alerts_pending_idx on public.price_alerts (parallel_id, grade) where triggered_at is null;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text,
  created_at timestamptz not null default now()
);
create unique index waitlist_email_idx on public.waitlist (lower(email));

-- ---------------------------------------------------------------------------
-- Market data
-- ---------------------------------------------------------------------------

-- Compact history: one row per actual price change (see record_price()).
-- buy_url lives in current_prices only, to keep history rows small.
-- No surrogate key: the composite primary key doubles as the lookup index, keeping the
-- table (the only one that grows every day) as small as possible on the free plan.
create table public.price_points (
  parallel_id uuid not null references public.parallels (id) on delete cascade,
  grade public.grade not null,
  captured_at timestamptz not null default now(),
  price_cents integer not null check (price_cents >= 0),
  sample_size integer not null default 0 check (sample_size >= 0),
  source text not null,
  primary key (parallel_id, grade, captured_at)
);

-- Last known price per parallel and grade, maintained by record_price().
create table public.current_prices (
  parallel_id uuid not null references public.parallels (id) on delete cascade,
  grade public.grade not null,
  source text not null,
  price_cents integer not null check (price_cents >= 0),
  sample_size integer not null default 0,
  buy_url text,
  captured_at timestamptz not null,
  checked_at timestamptz not null default now(),
  primary key (parallel_id, grade)
);

-- ---------------------------------------------------------------------------
-- Games and stat lines
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  game_day date not null,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled',
  starts_at timestamptz,
  created_at timestamptz not null default now()
);
create index games_game_day_idx on public.games (game_day);

create table public.player_game_lines (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  minutes numeric(5, 1),
  points integer,
  rebounds integer,
  assists integer,
  steals integer,
  blocks integer,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (game_id, player_id)
);
create index player_game_lines_player_id_idx on public.player_game_lines (player_id);

-- ---------------------------------------------------------------------------
-- Plan limits and jobs
-- ---------------------------------------------------------------------------

-- premium_value null = unlimited. Enforced by enforce_plan_limit() triggers and storage policies.
create table public.plan_limits (
  key text primary key,
  free_value integer,
  premium_value integer,
  description text
);

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  run_key text not null,
  status text not null check (status in ('running', 'success', 'error', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  details jsonb,
  unique (job, run_key)
);
