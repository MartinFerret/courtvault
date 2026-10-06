begin;
select plan(7);
select tests.clear_auth();

select ok((select count(*) from public.showcase_pairs()) > 0, 'showcase produces pairs');
select ok((select bool_and(n <= 4) from (select count(*) as n from public.showcase_pairs() group by parallel_id) t), 'at most one row per parallel and grade');
select ok((
  select max(n) <= 3 from (
    select par.card_id, count(distinct sp.parallel_id) as n
    from public.showcase_pairs() sp join public.parallels par on par.id = sp.parallel_id group by par.card_id
  ) t), 'at most parallels_per_card parallels per card');
select ok((select count(*) filter (where grade = 'PSA10') from public.showcase_pairs()) > 0, 'rookie base cards also get PSA10');
select ok((select min(priority) from public.showcase_pairs()) = 1, 'players who played last night come first');
select ok((select count(*) from public.parallels_to_price() where priority = 0) > 0, 'user pairs keep priority 0');

update public.app_settings set value = jsonb_set(value, '{enabled}', 'false') where key = 'showcase';
select is((select count(*) from public.showcase_pairs()), 0::bigint, 'showcase can be switched off');

select * from finish();
rollback;
