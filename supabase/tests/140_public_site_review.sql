begin;
select plan(5);

select is((select value->>0 from public.app_settings where key = 'season_start'), '2026-10-20', 'season start comes from the setting');
select ok((public.public_last_night(null, 5, 500, 10)->>'is_preseason') is not null, 'the night knows whether it is preseason');
select ok((public.public_last_night(null, 5, 500, 10)->'performances'->0) ? 'is_rookie', 'performances carry the rookie flag');
select ok((select count(*) from public.public_price_history('2025-26-topps-basketball-cooper-flagg-rookie-card-201', 90)) > 0, 'the seeded card has public history');
select is((select count(*) from public.public_price_history('nope-card', 90)), 0::bigint, 'unknown card: empty history');

select * from finish();
rollback;
