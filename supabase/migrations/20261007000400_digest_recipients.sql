-- Morning email digest recipients. Daily digests are Premium; free users get the weekly one
-- (Monday morning Eastern, covering Sunday night). "off" disables everything. Service role only.

create or replace function public.morning_email_recipients(p_day date default null)
returns table (
  user_id uuid,
  email text,
  unsubscribe_token uuid,
  is_premium boolean,
  effective_frequency text,
  due boolean,
  headline_player text,
  headline_points integer,
  value_change_cents bigint,
  players_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select coalesce(p_day, ((now() at time zone 'America/New_York')::date - 1)) as day
  ),
  base as (
    select p.id, p.email, p.unsubscribe_token,
      public.is_premium(p.id) as premium,
      case
        when p.digest_frequency = 'off' then 'off'
        when public.is_premium(p.id) then p.digest_frequency
        else 'weekly'
      end as frequency
    from public.profiles p
    where p.email is not null and p.digest_frequency <> 'off'
  )
  select b.id, b.email, b.unsubscribe_token, b.premium, b.frequency,
    (b.frequency = 'daily' or extract(isodow from (select day from params) + 1) = 1) as due,
    (select r.player_name from public.morning_report_for(b.id, (select day from params)) r where not r.locked order by r.points desc nulls last limit 1),
    (select r.points from public.morning_report_for(b.id, (select day from params)) r where not r.locked order by r.points desc nulls last limit 1),
    (select coalesce(sum(r.value_after_cents - r.value_before_cents), 0) from public.morning_report_for(b.id, (select day from params)) r),
    (select count(*)::integer from public.morning_report_for(b.id, (select day from params)) r)
  from base b
  where exists (select 1 from public.morning_report_for(b.id, (select day from params)))
  order by b.premium desc, b.id;
$$;
revoke execute on function public.morning_email_recipients from public, anon, authenticated;
