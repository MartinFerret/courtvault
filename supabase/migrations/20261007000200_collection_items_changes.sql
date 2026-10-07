-- Vault table on desktop needs the 24h change and the gain per item. Columns are appended so
-- the view keeps its contract. Gains stay a Premium feature: null for free users, decided
-- here and not in clients.

-- price_at() is service-role only (it would expose the full history to free users). This
-- wrapper answers one fixed question, the change over the last 24 hours, and may run as a user.
create or replace function public.change_24h_cents(p_parallel_id uuid, p_grade public.grade)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (cp.price_cents - public.price_at(p_parallel_id, p_grade, now() - interval '24 hours'))::integer
  from public.current_prices cp
  where cp.parallel_id = p_parallel_id and cp.grade = p_grade;
$$;
grant execute on function public.change_24h_cents(uuid, public.grade) to authenticated;

create or replace view public.collection_items_detailed
with (security_invoker = true) as
select
  ci.id,
  ci.user_id,
  ci.parallel_id,
  ci.grade,
  ci.serial_number,
  ci.purchase_cents,
  ci.photo_path,
  ci.created_at,
  par.name as parallel_name,
  par.serial_run,
  c.id as card_id,
  c.slug as card_slug,
  c.number as card_number,
  c.is_rookie,
  pl.id as player_id,
  pl.name as player_name,
  pl.slug as player_slug,
  pl.team,
  s.id as set_id,
  s.name as set_name,
  s.slug as set_slug,
  s.season,
  cp.price_cents as current_cents,
  cp.captured_at as price_captured_at,
  cp.buy_url,
  public.change_24h_cents(ci.parallel_id, ci.grade) as change_24h_cents,
  case
    when public.is_premium() and ci.purchase_cents is not null and cp.price_cents is not null
    then (cp.price_cents - ci.purchase_cents)::integer
  end as gain_cents
from public.collection_items ci
join public.parallels par on par.id = ci.parallel_id
join public.cards c on c.id = par.card_id
join public.players pl on pl.id = c.player_id
join public.card_sets s on s.id = c.set_id
left join public.current_prices cp on cp.parallel_id = ci.parallel_id and cp.grade = ci.grade;
