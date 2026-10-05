-- Shared helpers for pgTAP tests. Loaded first (files run in alphabetical order).
-- Each test file wraps itself in a transaction, so settings made with set_config(..., true) vanish.
begin;
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Impersonate a signed-in user for the rest of the current transaction.
create or replace function tests.authenticate_as(uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;

-- Back to the session role (postgres), which bypasses RLS like the service role does.
create or replace function tests.clear_auth()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select has_function('tests', 'authenticate_as', 'test helpers installed');
select * from finish();
commit;
