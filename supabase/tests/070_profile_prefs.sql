begin;
select plan(6);

select tests.authenticate_as('00000000-0000-0000-0000-000000000002');
select lives_ok(
  $$update public.profiles set marketing_consent_at = now(), marketing_consent_source = 'web' where id = '00000000-0000-0000-0000-000000000002'$$,
  'a user can record their own marketing consent');
select lives_ok(
  $$update public.profiles set digest_frequency = 'weekly' where id = '00000000-0000-0000-0000-000000000002'$$,
  'a user can change their digest frequency');
select throws_ok(
  $$update public.profiles set digest_frequency = 'hourly' where id = '00000000-0000-0000-0000-000000000002'$$,
  '23514', null, 'digest frequency is constrained');
select throws_ok(
  $$update public.profiles set unsubscribe_token = gen_random_uuid() where id = '00000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'a user cannot rewrite their unsubscribe token');
select throws_ok(
  $$select public.unsubscribe_by_token((select unsubscribe_token from public.profiles limit 1))$$,
  '42501', null, 'users cannot call the unsubscribe function');

select tests.clear_auth();
select is(
  public.unsubscribe_by_token((select unsubscribe_token from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'digest'),
  true,
  'the service role unsubscribes by token');

select * from finish();
rollback;
