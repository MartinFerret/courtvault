begin;
select plan(11);
select tests.clear_auth();

-- The seed has games for last night with priced cards of the players who played.
select ok((select (public.public_last_night()->>'day') is not null), 'latest night resolves');
select is((select jsonb_array_length(public.public_last_night()->'games')), 4, 'last night has 4 seeded games');
select ok((select jsonb_array_length(public.public_last_night()->'performances') between 1 and 10), 'performances listed');
select ok((select jsonb_array_length(public.public_last_night()->'gainers') + jsonb_array_length(public.public_last_night()->'losers') > 0), 'movers listed with default thresholds');

-- Thresholds: a huge minimum sample size removes every mover and every top card.
select is((select jsonb_array_length(public.public_last_night(null, 10000, 500)->'gainers')), 0, 'sample threshold filters movers');
select is((select jsonb_array_length(public.public_last_night(null, 10000, 500)->'performances'->0->'top_cards')), 0, 'sample threshold filters top cards');
select is((select jsonb_array_length(public.public_last_night(null, 0, 100000000)->'losers')), 0, 'price threshold filters movers');

-- Ranking: gainers sorted by percent change descending, losers ascending.
select ok((
  select bool_and(ok) from (
    select ((g->>'change_pct')::numeric >= coalesce((lead(g) over ())->>'change_pct', '-1e9')::numeric) as ok
    from jsonb_array_elements(public.public_last_night()->'gainers') g
  ) t), 'gainers sorted by percent change');

-- At most 3 cards per player in a movers list
select ok((
  select coalesce(max(n), 0) <= 3 from (
    select count(*) as n from jsonb_array_elements(public.public_last_night()->'gainers') g group by g->>'player_slug'
  ) t), 'no more than 3 cards per player among gainers');

-- Off days and archive
select is(public.public_last_night('1999-01-01'::date), null, 'unknown archive day returns null');
select ok((select (public.public_last_night()->>'latest_day')::date = (select max(game_day) from public.games)), 'latest_day is the newest game night');

select * from finish();
rollback;
