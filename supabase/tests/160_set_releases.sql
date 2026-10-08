begin;
select plan(4);

select ok(exists (select 1 from public.set_releases where public_slug = '2026-27-topps-basketball'), 'the 2026-27 flagship release row exists (imported locally by the demo set)');
set local role anon;
select ok((select count(*) from public.set_releases) >= 1, 'anon reads the announced releases');
reset role;
insert into public.set_releases (slug, public_slug, name, season) values ('2027-28-topps-test-basketball', '2027-28-topps-test-basketball', 'Topps Test', '2027-28');
insert into public.card_sets (slug, name, season, public_slug) values ('2027-28-topps-test-basketball', 'Topps Test', '2027-28', '2027-28-topps-test-basketball');
select is((select status from public.set_releases where slug = '2027-28-topps-test-basketball'), 'imported', 'importing the set marks the release imported');
select ok(exists (select 1 from cron.job where jobname = 'job-releases'), 'job-releases is scheduled');

select * from finish();
rollback;
