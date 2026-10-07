-- Vault table on desktop needs the 24h change and the gain per item. Columns are appended so
-- the view keeps its contract. Gains stay a Premium feature: null for free users, decided
-- here and not in clients.

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
  (cp.price_cents - public.price_at(ci.parallel_id, ci.grade, now() - interval '24 hours'))::integer as change_24h_cents,
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
