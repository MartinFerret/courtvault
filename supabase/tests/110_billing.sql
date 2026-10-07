begin;
select plan(7);

select results_eq(
  $$select enabled, cap, sold, remaining, available from public.founders_lifetime_status()$$,
  $$values (true, 500, 0, 500, true)$$,
  'founders offer open with the full cap');

select is(public.grant_lifetime('00000000-0000-0000-0000-000000000002', 'web', 'cs_test_1', 14900), true, 'grant records the purchase');
select is(public.grant_lifetime('00000000-0000-0000-0000-000000000002', 'web', 'cs_test_1', 14900), true, 'grant is idempotent on the reference');
select results_eq(
  $$select is_premium, premium_until, premium_source from public.profiles where id = '00000000-0000-0000-0000-000000000002'$$,
  $$values (true, null::timestamptz, 'lifetime')$$,
  'lifetime buyer is premium without expiry');
select is((select sold from public.founders_lifetime_status()), 1, 'sold counts real purchases');

update public.app_settings set value = jsonb_build_object('enabled', true, 'ends_at', null, 'cap', 1) where key = 'founders_lifetime';
select is((select available from public.founders_lifetime_status()), false, 'offer closes at the cap');

select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select throws_ok(
  $$update public.profiles set stripe_customer_id = 'cus_x' where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'users cannot write Stripe columns');

select * from finish();
rollback;
