-- Profile creation on sign-up and the single source of truth for Premium status.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- True when the user has an active Premium entitlement. premium_until null = no expiry.
create or replace function public.is_premium(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.is_premium and (p.premium_until is null or p.premium_until > now())
      from public.profiles p
      where p.id = uid
    ),
    false
  );
$$;

-- Only the service role (RevenueCat webhook) may change Premium fields or the email.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (push_token) on public.profiles to authenticated;
