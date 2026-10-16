begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b1@courtvault.local', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2@courtvault.local', now(), now());

create temp table tmp_p as
select (select parallel_id from public.current_prices where grade = 'RAW' order by price_cents desc limit 1) as priced;
grant select on tmp_p to anon, authenticated;

insert into public.collection_items (id, user_id, parallel_id, grade, purchase_cents, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', (select priced from tmp_p), 'RAW', 1000, now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', (select priced from tmp_p), 'RAW', null, now() - interval '5 days');

-- Binders: one on the free plan, owner only
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
insert into public.binders (id, name) values ('00000000-0000-0000-0000-0000000000d1', 'PC');
select throws_like($$insert into public.binders (name) values ('For sale')$$, '%LIMIT_REACHED:binders%', 'free plan has one binder');
select lives_ok(
  $$update public.collection_items set binder_id = '00000000-0000-0000-0000-0000000000d1' where id = '00000000-0000-0000-0000-0000000000c1'$$,
  'owner files a card in a binder');
select is((select binder_name from public.collection_items_detailed where id = '00000000-0000-0000-0000-0000000000c1'), 'PC', 'the Vault view shows the binder');
select is((select item_count from public.binder_summaries()), 1, 'binder summary counts its cards');
select is(
  (select total_cents from public.binder_summaries()),
  (select price_cents from public.current_prices where parallel_id = (select priced from tmp_p) and grade = 'RAW')::bigint,
  'binder summary sums the card values');

select tests.clear_auth();
update public.profiles set is_premium = true, premium_until = null where id = '00000000-0000-0000-0000-0000000000b1';
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
select lives_ok($$insert into public.binders (name) values ('For sale')$$, 'premium has unlimited binders');
select throws_like($$insert into public.binders (name) values ('pc ')$$, '%binders_user_name_idx%', 'binder names are unique per collector');

select tests.authenticate_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*) from public.binders), 0::bigint, 'nobody sees another collector''s binders');
insert into public.binders (id, name) values ('00000000-0000-0000-0000-0000000000d2', 'Mine');
insert into public.collection_items (id, user_id, parallel_id, grade) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', (select priced from tmp_p), 'RAW');
select throws_like(
  $$update public.collection_items set binder_id = '00000000-0000-0000-0000-0000000000d1' where id = '00000000-0000-0000-0000-0000000000c3'$$,
  '%BINDER_FORBIDDEN%', 'a card cannot go in someone else''s binder');
select throws_like($$select public.record_sale('00000000-0000-0000-0000-0000000000c1', 5000)$$, '%ITEM_NOT_FOUND%', 'nobody sells another collector''s card');

-- Sales
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
select throws_like($$select public.record_sale('00000000-0000-0000-0000-0000000000c1', -1)$$, '%SALE_INVALID:amount%', 'negative price refused');
select throws_like($$select public.record_sale('00000000-0000-0000-0000-0000000000c1', 100, 0, current_date + 30)$$, '%SALE_INVALID:date%', 'future date refused');

create temp table tmp_sale as select public.record_sale('00000000-0000-0000-0000-0000000000c1', 5000, 400) as r;
grant select on tmp_sale to anon, authenticated;
select is((select count(*) from public.collection_items where id = '00000000-0000-0000-0000-0000000000c1'), 0::bigint, 'a sold card leaves the Vault');
select is((select profit_cents from public.sales_detailed), 3600, 'profit = sold - fees - purchase (premium)');
select is((select sale_count || ' ' || sold_cents || ' ' || profit_cents from public.sales_summary()), '1 5000 3600', 'sales summary');

select tests.clear_auth();
update public.profiles set is_premium = false where id = '00000000-0000-0000-0000-0000000000b1';
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');
select is((select profit_cents from public.sales_detailed), null, 'realized gain is hidden on the free plan');
select is((select profit_cents from public.sales_summary()), null, 'summary gain hidden on the free plan');

select lives_ok($$select public.undo_sale(((select r from tmp_sale) ->> 'sale_id')::uuid)$$, 'a sale can be undone');
select is(
  (select purchase_cents || ' ' || binder_name from public.collection_items_detailed where purchase_cents = 1000),
  '1000 PC', 'the card comes back with its purchase price and binder');

select * from finish();
rollback;
