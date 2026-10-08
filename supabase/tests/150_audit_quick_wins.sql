begin;
select plan(5);

select ok((select count(*) from public.page_index_status where kind = 'card' and indexable) >= (select count(*) from public.cards where is_rookie), 'every rookie card is indexable');
select ok(exists (select 1 from public.page_index_status s join public.cards c on c.public_slug = s.public_slug where s.kind = 'card' and not c.is_rookie and not s.indexable), 'an unpriced non-rookie card stays out');
select ok((public.public_movers_window(7, 5, 500, 10)->'nights') is not null, 'movers window reports the nights');
select ok(jsonb_typeof(public.public_movers_window(7, 5, 500, 10)->'gainers') = 'array', 'movers window returns gainers');
select ok(public.player_current_team((select id from public.players where slug = 'cooper-flagg')) is not null, 'current team resolves from lines or the card');

select * from finish();
rollback;
