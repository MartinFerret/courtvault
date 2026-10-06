-- Seed: plan limits (required everywhere) + local Vault secrets + demo data for development.
-- Runs on `supabase db reset` / `supabase start`. Demo data mirrors data/checklists/DEMO-*.csv
-- and generates consistent mock prices and games so "Last night" renders locally.
-- DEMO DATA: card numbers, parallels and stat lines are invented for development.

-- ---------------------------------------------------------------------------
-- Plan limits (production data). premium_value null = unlimited.
-- ---------------------------------------------------------------------------
insert into public.plan_limits (key, free_value, premium_value, description) values
  ('cards', 300, null, 'Cards in collection'),
  ('followed_players', 3, null, 'Players followed in "Last night"'),
  ('price_alerts', 2, null, 'Price alerts'),
  ('checklist_follows', 1, null, 'Followed checklists'),
  ('price_history_days', 30, null, 'Days of price history visible'),
  ('photos', 300, 1000, 'Card photos stored (storage budget)')
on conflict (key) do update
  set free_value = excluded.free_value,
      premium_value = excluded.premium_value,
      description = excluded.description;

-- ---------------------------------------------------------------------------
-- Local Vault secrets used by pg_cron to call the edge functions.
-- In the cloud project, set them once with the same two statements (see README).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'functions_url') then
    perform vault.create_secret('http://supabase_kong_courtvault:8000/functions/v1', 'functions_url', 'Base URL of the edge functions, as seen from the database');
  end if;
  if not exists (select 1 from vault.secrets where name = 'job_secret') then
    perform vault.create_secret('local-job-secret', 'job_secret', 'Shared secret sent as x-job-secret to job functions');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Demo catalog: a few real 2025-26 cards (numbers from the official checklists) plus the
-- 2026-27 demo set. `pnpm db:reset` then imports the full official CSVs on top of it.
-- ---------------------------------------------------------------------------
insert into public.players (slug, name, team) values
  ('victor-wembanyama', 'Victor Wembanyama', 'San Antonio Spurs'),
  ('dylan-harper', 'Dylan Harper', 'San Antonio Spurs'),
  ('cooper-flagg', 'Cooper Flagg', 'Dallas Mavericks'),
  ('ace-bailey', 'Ace Bailey', 'Utah Jazz'),
  ('vj-edgecombe', 'VJ Edgecombe', 'Philadelphia 76ers'),
  ('stephen-curry', 'Stephen Curry', 'Golden State Warriors'),
  ('nikola-jokic', 'Nikola Jokić', 'Denver Nuggets'),
  ('shai-gilgeous-alexander', 'Shai Gilgeous-Alexander', 'Oklahoma City Thunder'),
  ('anthony-edwards', 'Anthony Edwards', 'Minnesota Timberwolves'),
  ('jayson-tatum', 'Jayson Tatum', 'Boston Celtics'),
  ('aj-dybantsa', 'AJ Dybantsa', null),
  ('cameron-boozer', 'Cameron Boozer', null),
  ('darryn-peterson', 'Darryn Peterson', null)
on conflict (slug) do nothing;

insert into public.card_sets (slug, name, season, release_date) values
  ('2025-26-topps-chrome', 'Topps Chrome', '2025-26', '2026-02-11'),
  ('2025-26-topps-basketball', 'Topps Basketball', '2025-26', '2025-11-19'),
  ('2026-27-topps-basketball', 'Topps Basketball', '2026-27', '2026-11-18')
on conflict (slug) do nothing;

-- cards + parallels from a compact definition
do $$
declare
  rec record;
  v_set_id uuid;
  v_player_id uuid;
  v_card_id uuid;
  par text;
  par_name text;
  par_run integer;
begin
  for rec in
    select * from (values
      ('2025-26-topps-chrome', '221', 'victor-wembanyama', false, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '252', 'dylan-harper', true, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '251', 'cooper-flagg', true, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '255', 'ace-bailey', true, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '253', 'vj-edgecombe', true, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '201', 'stephen-curry', false, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-chrome', '25', 'nikola-jokic', false, 'Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1'),
      ('2025-26-topps-basketball', '201', 'cooper-flagg', true, 'Base|Rainbow Foilboard|Gold/2025|Gold Rainbow/50|FoilFractor/1'),
      ('2025-26-topps-basketball', '101', 'nikola-jokic', false, 'Base|Rainbow Foilboard|Gold/2025|Gold Rainbow/50|FoilFractor/1'),
      ('2025-26-topps-basketball', '115', 'shai-gilgeous-alexander', false, 'Base|Rainbow Foilboard|Gold/2025|Gold Rainbow/50|FoilFractor/1'),
      ('2025-26-topps-basketball', '108', 'anthony-edwards', false, 'Base|Rainbow Foilboard|Gold/2025|Gold Rainbow/50|FoilFractor/1'),
      ('2025-26-topps-basketball', '1', 'jayson-tatum', false, 'Base|Rainbow Foilboard|Gold/2025|Gold Rainbow/50|FoilFractor/1'),
      ('2026-27-topps-basketball', '1', 'aj-dybantsa', true, 'Base|Rainbow Foil|Gold/50|Platinum/1'),
      ('2026-27-topps-basketball', '2', 'cameron-boozer', true, 'Base|Rainbow Foil|Gold/50|Platinum/1'),
      ('2026-27-topps-basketball', '3', 'darryn-peterson', true, 'Base|Rainbow Foil|Gold/50|Platinum/1'),
      ('2026-27-topps-basketball', '50', 'cooper-flagg', false, 'Base|Rainbow Foil|Gold/50|Platinum/1')
    ) as t(set_slug, number, player_slug, is_rookie, parallels)
  loop
    select id into v_set_id from public.card_sets where slug = rec.set_slug;
    select id into v_player_id from public.players where slug = rec.player_slug;

    insert into public.cards (slug, set_id, player_id, number, is_rookie)
    values (rec.set_slug || '-' || rec.number || '-' || rec.player_slug, v_set_id, v_player_id, rec.number, rec.is_rookie)
    on conflict (set_id, number) do update set is_rookie = excluded.is_rookie
    returning id into v_card_id;

    foreach par in array string_to_array(rec.parallels, '|') loop
      if par ~ '/\d+$' then
        par_name := trim(regexp_replace(par, '/\d+$', ''));
        par_run := (regexp_match(par, '/(\d+)$'))[1]::integer;
      else
        par_name := trim(par);
        par_run := null;
      end if;
      insert into public.parallels (card_id, name, serial_run)
      values (v_card_id, par_name, par_run)
      on conflict (card_id, name) do nothing;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Demo users. Email OTP works for any address locally (codes land in Mailpit, port 54324).
-- demo@courtvault.local owns a collection; other@courtvault.local exists for RLS tests.
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'demo@courtvault.local', extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now() - interval '30 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'other@courtvault.local', extensions.crypt('other-password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now() - interval '30 days', now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u
where u.email in ('demo@courtvault.local', 'other@courtvault.local')
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- Mock prices: 60 days of daily history per parallel and grade, deterministic random walk.
-- Written through record_price() so history only stores actual changes.
-- Players who had a big game last night (see games below) get a bump on the last day.
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
  g public.grade;
  day_offset integer;
  base_cents numeric;
  price numeric;
  step numeric;
  captured timestamptz;
  last_bump numeric;
begin
  for p in
    select par.id as parallel_id, par.name as parallel_name, par.serial_run, c.is_rookie, pl.slug as player_slug, s.season
    from public.parallels par
    join public.cards c on c.id = par.card_id
    join public.players pl on pl.id = c.player_id
    join public.card_sets s on s.id = c.set_id
  loop
    -- Base RAW price by player tier (demo values)
    base_cents := case p.player_slug
      when 'cooper-flagg' then 4200
      when 'victor-wembanyama' then 2500
      when 'stephen-curry' then 1500
      when 'nikola-jokic' then 1200
      when 'shai-gilgeous-alexander' then 1100
      when 'anthony-edwards' then 900
      when 'jayson-tatum' then 700
      when 'dylan-harper' then 1500
      when 'ace-bailey' then 900
      when 'vj-edgecombe' then 800
      when 'aj-dybantsa' then 3500
      when 'cameron-boozer' then 2000
      when 'darryn-peterson' then 1800
      else 500 end;

    -- Parallel multiplier
    base_cents := base_cents * case
      when p.serial_run = 1 then 800
      when p.serial_run = 5 then 120
      when p.serial_run = 10 then 70
      when p.serial_run = 25 then 45
      when p.serial_run = 50 then 25
      when p.serial_run = 2025 then 2
      when p.parallel_name in ('Refractor', 'Rainbow Foil', 'Rainbow Foilboard') then 3
      else 1 end;

    last_bump := case p.player_slug
      when 'cooper-flagg' then 1.08
      when 'victor-wembanyama' then 1.03
      when 'anthony-edwards' then 1.05
      when 'jayson-tatum' then 0.97
      when 'stephen-curry' then 0.98
      else 1.0 end;

    foreach g in array array['RAW'::public.grade, 'PSA9', 'PSA10'] loop
      price := base_cents * case g when 'RAW' then 1 when 'PSA9' then 2.2 else 5 end;
      for day_offset in reverse 59 .. 0 loop
        -- deterministic pseudo-random step in [-3%, +3%]
        step := ((abs(hashtext(p.parallel_id::text || g::text || day_offset::text)) % 601) - 300) / 10000.0;
        price := greatest(100, price * (1 + step));
        if day_offset = 0 then
          price := price * last_bump;
        end if;
        -- captured at 5:30 AM New York time, the price job's slot
        captured := ((current_date - day_offset)::timestamp + interval '5 hours 30 minutes') at time zone 'America/New_York';
        -- round to whole dollars above $20 so unchanged days happen and history stays compact
        perform public.record_price(
          p.parallel_id, g, 'mock',
          case when price >= 2000 then (round(price / 100) * 100)::integer else round(price)::integer end,
          8 + abs(hashtext(p.parallel_id::text || g::text)) % 20,
          'https://www.ebay.com/sch/i.html?_nkw=' || replace(p.season || ' ' || p.player_slug || ' ' || p.parallel_name, ' ', '+'),
          captured
        );
      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Mock games: last night (US Eastern yesterday) and the night before, with stat lines.
-- ---------------------------------------------------------------------------
do $$
declare
  last_night date := (now() at time zone 'America/New_York')::date - 1;
  g record;
  game_ids jsonb := '{}'::jsonb;
  v_game_id uuid;
begin
  for g in
    select * from (values
      ('demo-' || to_char(last_night, 'YYYYMMDD') || '-sas-dal', last_night, 'San Antonio Spurs', 'Dallas Mavericks', 112, 118),
      ('demo-' || to_char(last_night, 'YYYYMMDD') || '-lal-gsw', last_night, 'Los Angeles Lakers', 'Golden State Warriors', 121, 109),
      ('demo-' || to_char(last_night, 'YYYYMMDD') || '-min-bos', last_night, 'Minnesota Timberwolves', 'Boston Celtics', 104, 99),
      ('demo-' || to_char(last_night, 'YYYYMMDD') || '-okc-den', last_night, 'Oklahoma City Thunder', 'Denver Nuggets', 117, 120),
      ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-dal-uta', last_night - 1, 'Dallas Mavericks', 'Utah Jazz', 109, 101),
      ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-phi-sas', last_night - 1, 'Philadelphia 76ers', 'San Antonio Spurs', 98, 115)
    ) as t(external_id, game_day, home_team, away_team, home_score, away_score)
  loop
    insert into public.games (external_id, game_day, home_team, away_team, home_score, away_score, status, starts_at)
    values (g.external_id, g.game_day, g.home_team, g.away_team, g.home_score, g.away_score, 'final',
            (g.game_day::timestamp + interval '19 hours 30 minutes') at time zone 'America/New_York')
    on conflict (external_id) do update set home_score = excluded.home_score, away_score = excluded.away_score, status = excluded.status
    returning id into v_game_id;
    game_ids := game_ids || jsonb_build_object(g.external_id, v_game_id);
  end loop;

  insert into public.player_game_lines (game_id, player_id, minutes, points, rebounds, assists, steals, blocks, raw)
  select (game_ids ->> l.ext)::uuid, pl.id, l.minutes, l.points, l.rebounds, l.assists, l.steals, l.blocks, '{"source":"mock"}'::jsonb
  from (values
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-sas-dal', 'cooper-flagg', 36.5, 32, 9, 5, 2, 1),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-sas-dal', 'victor-wembanyama', 34.0, 27, 14, 3, 1, 5),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-sas-dal', 'dylan-harper', 28.2, 14, 4, 6, 1, 0),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-lal-gsw', 'stephen-curry', 33.4, 18, 3, 6, 1, 0),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-min-bos', 'anthony-edwards', 38.0, 35, 6, 4, 2, 1),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-min-bos', 'jayson-tatum', 36.2, 16, 7, 5, 0, 1),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-okc-den', 'shai-gilgeous-alexander', 35.6, 31, 5, 7, 2, 0),
    ('demo-' || to_char(last_night, 'YYYYMMDD') || '-okc-den', 'nikola-jokic', 36.8, 24, 15, 12, 1, 1),
    ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-dal-uta', 'cooper-flagg', 34.0, 21, 7, 4, 1, 2),
    ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-dal-uta', 'ace-bailey', 30.5, 19, 5, 2, 1, 0),
    ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-phi-sas', 'vj-edgecombe', 29.0, 15, 4, 3, 2, 0),
    ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-phi-sas', 'victor-wembanyama', 33.0, 30, 11, 4, 0, 4),
    ('demo-' || to_char(last_night - 1, 'YYYYMMDD') || '-phi-sas', 'dylan-harper', 27.5, 12, 3, 5, 1, 0)
  ) as l(ext, player_slug, minutes, points, rebounds, assists, steals, blocks)
  join public.players pl on pl.slug = l.player_slug
  on conflict (game_id, player_id) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Demo collection, follows and alerts for demo@courtvault.local
-- ---------------------------------------------------------------------------
do $$
declare
  demo_uid uuid := '00000000-0000-0000-0000-000000000001';
  other_uid uuid := '00000000-0000-0000-0000-000000000002';
  item record;
begin
  for item in
    select * from (values
      ('2025-26-topps-chrome', '251', 'Base', 'RAW', null::integer, 3500, interval '20 days'),
      ('2025-26-topps-chrome', '251', 'Refractor', 'PSA10', null, 52000, interval '15 days'),
      ('2025-26-topps-chrome', '221', 'Base', 'RAW', null, 2200, interval '12 days'),
      ('2025-26-topps-chrome', '25', 'Gold Refractor', 'RAW', 12, 40000, interval '10 days'),
      ('2025-26-topps-chrome', '252', 'Base', 'PSA9', null, 2900, interval '8 days'),
      ('2025-26-topps-chrome', '201', 'Base', 'RAW', null, null, interval '5 days'),
      ('2025-26-topps-basketball', '108', 'Base', 'RAW', null, 800, interval '3 days'),
      ('2025-26-topps-basketball', '201', 'Rainbow Foilboard', 'RAW', null, 11000, interval '2 hours')
    ) as t(set_slug, number, parallel_name, grade, serial_number, purchase_cents, age)
  loop
    insert into public.collection_items (user_id, parallel_id, grade, serial_number, purchase_cents, created_at)
    select demo_uid, par.id, item.grade::public.grade, item.serial_number, item.purchase_cents, now() - item.age
    from public.parallels par
    join public.cards c on c.id = par.card_id
    join public.card_sets s on s.id = c.set_id
    where s.slug = item.set_slug and c.number = item.number and par.name = item.parallel_name;
  end loop;

  insert into public.followed_players (user_id, player_id)
  select demo_uid, id from public.players where slug in ('cooper-flagg', 'victor-wembanyama', 'nikola-jokic')
  on conflict do nothing;

  -- A fake push token so job-morning has a recipient locally (PUSH_PROVIDER=log prints it).
  update public.profiles set push_token = 'demo-device-token' where id = demo_uid;

  insert into public.checklist_follows (user_id, set_id)
  select demo_uid, id from public.card_sets where slug = '2025-26-topps-chrome'
  on conflict do nothing;

  insert into public.price_alerts (user_id, parallel_id, grade, below_cents)
  select demo_uid, par.id, 'RAW', 3000
  from public.parallels par join public.cards c on c.id = par.card_id join public.card_sets s on s.id = c.set_id
  where s.slug = '2025-26-topps-chrome' and c.number = '252' and par.name = 'Base';

  -- The other user owns one card, used by RLS tests.
  insert into public.collection_items (user_id, parallel_id, grade, purchase_cents, created_at)
  select other_uid, par.id, 'RAW', 1000, now() - interval '3 days'
  from public.parallels par join public.cards c on c.id = par.card_id join public.card_sets s on s.id = c.set_id
  where s.slug = '2025-26-topps-chrome' and c.number = '255' and par.name = 'Base';
end $$;

insert into public.waitlist (email, source) values ('early-bird@example.com', 'seed') on conflict do nothing;
