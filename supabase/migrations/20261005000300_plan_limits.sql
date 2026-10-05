-- Plan limits are enforced here, never in clients. Clients only read plan_limits for display.
-- On violation the database raises `LIMIT_REACHED:<key>`; the app opens the paywall.

create or replace function public.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_key text := tg_argv[0];
  free_limit integer;
  premium_limit integer;
  allowed integer;
  current_count integer;
begin
  select free_value, premium_value
    into free_limit, premium_limit
  from public.plan_limits
  where key = limit_key;

  if not found then
    raise exception 'Unknown plan limit "%"', limit_key;
  end if;

  allowed := case when public.is_premium(new.user_id) then premium_limit else free_limit end;
  if allowed is null then
    return new;
  end if;

  -- Serialize concurrent inserts per user and limit so the count is exact.
  perform pg_advisory_xact_lock(hashtext(limit_key || ':' || new.user_id::text));

  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into current_count
    using new.user_id;

  if current_count >= allowed then
    raise exception 'LIMIT_REACHED:%', limit_key
      using errcode = 'P0001',
            hint = format('Plan limit "%s" reached (%s). Upgrade to Premium for more.', limit_key, allowed);
  end if;

  return new;
end;
$$;

create trigger collection_items_limit
before insert on public.collection_items
for each row execute function public.enforce_plan_limit('cards');

create trigger followed_players_limit
before insert on public.followed_players
for each row execute function public.enforce_plan_limit('followed_players');

create trigger price_alerts_limit
before insert on public.price_alerts
for each row execute function public.enforce_plan_limit('price_alerts');

create trigger checklist_follows_limit
before insert on public.checklist_follows
for each row execute function public.enforce_plan_limit('checklist_follows');

-- Photo cap, used by the storage policies. Counts objects in the user's folder.
create or replace function public.within_photo_cap(uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  free_limit integer;
  premium_limit integer;
  allowed integer;
  current_count integer;
begin
  select free_value, premium_value into free_limit, premium_limit
  from public.plan_limits where key = 'photos';
  allowed := case when public.is_premium(uid) then premium_limit else free_limit end;
  if allowed is null then
    return true;
  end if;
  select count(*) into current_count
  from storage.objects
  where bucket_id = 'card-photos' and (storage.foldername(name))[1] = uid::text;
  return current_count < allowed;
end;
$$;
