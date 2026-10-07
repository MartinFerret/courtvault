begin;
select plan(5);

-- The demo user owns cards of players who played last night (seed).
select is(
  (select effective_frequency from public.morning_email_recipients() where user_id = '00000000-0000-0000-0000-000000000001'),
  'weekly', 'a free user is downgraded to the weekly digest');
update public.profiles set is_premium = true where id = '00000000-0000-0000-0000-000000000001';
select is(
  (select effective_frequency from public.morning_email_recipients() where user_id = '00000000-0000-0000-0000-000000000001'),
  'daily', 'a premium user keeps the daily digest');
select is(
  (select due from public.morning_email_recipients() where user_id = '00000000-0000-0000-0000-000000000001'),
  true, 'a daily digest is always due');
update public.profiles set digest_frequency = 'off' where id = '00000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.morning_email_recipients() where user_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint, 'off means no email');
select tests.authenticate_as('00000000-0000-0000-0000-000000000001');
select throws_ok($$select * from public.morning_email_recipients()$$, '42501', null, 'recipients are service role only');

select * from finish();
rollback;
