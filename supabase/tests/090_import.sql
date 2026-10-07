begin;
select plan(9);

select tests.authenticate_as('00000000-0000-0000-0000-000000000002');

-- Matching: a clean row, a noisy one, a parallel with a print run, an unknown player.
select is(
  (select status from public.match_import_rows('[{"player":"Cooper Flagg","set":"Topps Chrome","season":"2025-26","number":"251","parallel":"Base"}]') limit 1),
  'matched', 'clean row matches');
select is(
  (select card_number from public.match_import_rows('[{"player":"Cooper Flagg","set":"Topps Chrome","season":"2025-26","number":"251"}]') limit 1),
  '251', 'the card number wins');
select is(
  (select parallel_name from public.match_import_rows('[{"player":"cooper flag","set":"chrome","number":"251","parallel":"Gold Refractor /50"}]') limit 1),
  'Gold Refractor', 'noisy name and parallel with print run resolve');
select is(
  (select serial_run from public.match_import_rows('[{"player":"Cooper Flagg","set":"Topps Chrome","number":"251","parallel":"gold /50"}]') limit 1),
  50, 'print run picks the right parallel');
select is(
  (select status from public.match_import_rows('[{"player":"Nobody Realname","set":"Topps","number":"1"}]') limit 1),
  'unmatched', 'unknown player is unmatched');
select is(
  (select count(*) from public.match_import_rows('[{"player":"Cooper Flagg"},{"player":"Dylan Harper","number":"252"}]')),
  2::bigint, 'one result per row, in order');

-- Insert within the limit, stop at the limit, keep reviews.
select tests.clear_auth();
update public.plan_limits set free_value = 2 where key = 'cards';
select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select results_eq(
  $$select inserted, skipped, limit_reached, reviews_saved from public.import_collection(
      (select jsonb_agg(jsonb_build_object('parallel_id', id, 'grade', 'RAW')) from (select id from public.parallels order by created_at limit 3) p),
      '[{"raw":{"player":"Nobody"},"reason":"unmatched"}]')$$,
  $$values (1, 2, true, 1)$$,
  'inserts up to the free limit (other user already has 1 card), skips the rest, saves the review');
select is((select count(*) from public.import_reviews), 1::bigint, 'review row visible to its owner');
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select is((select count(*) from public.import_reviews), 0::bigint, 'review rows are private');

select * from finish();
rollback;
