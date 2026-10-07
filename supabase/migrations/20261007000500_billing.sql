-- Web checkout through Stripe (decision of 2026-10-07) next to RevenueCat for the stores.
-- The database stays the single source of Premium: only the two webhooks (service role) write
-- the premium columns. Founder's Lifetime is a one-time purchase behind a flag with an end date
-- and a buyer cap; the remaining count is public and honest.

alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  add column premium_source text check (premium_source in ('revenuecat', 'stripe', 'lifetime', 'promo'));

-- One row per lifetime buyer, whatever the platform. Counts against the founders cap.
create table public.lifetime_purchases (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform text not null check (platform in ('web', 'ios', 'android')),
  reference text not null unique,
  amount_cents integer,
  purchased_at timestamptz not null default now()
);
alter table public.lifetime_purchases enable row level security;
create policy "read own lifetime purchase" on public.lifetime_purchases
for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.lifetime_purchases from anon, authenticated;

-- Webhook idempotency: Stripe (and RevenueCat) may deliver an event more than once.
create table public.billing_events (
  id text primary key,
  provider text not null check (provider in ('stripe', 'revenuecat')),
  type text not null,
  user_id uuid,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

insert into public.app_settings (key, value, description) values
  ('founders_lifetime', jsonb_build_object(
    'enabled', true,
    'ends_at', null,
    'cap', 500
  ), 'Founder''s Lifetime plan: enabled flag, optional end date (ISO timestamptz) and buyer cap. Disappears automatically when either is reached.');

-- Public status of the Founder's Lifetime offer (website, paywall). Never fakes scarcity:
-- sold is the real count of lifetime_purchases.
create or replace function public.founders_lifetime_status()
returns table (enabled boolean, ends_at timestamptz, cap integer, sold integer, remaining integer, available boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select
      coalesce((value->>'enabled')::boolean, false) as enabled,
      nullif(value->>'ends_at', '')::timestamptz as ends_at,
      coalesce((value->>'cap')::integer, 0) as cap
    from public.app_settings where key = 'founders_lifetime'
  ),
  sold as (select count(*)::integer as n from public.lifetime_purchases)
  select
    cfg.enabled,
    cfg.ends_at,
    cfg.cap,
    sold.n,
    greatest(cfg.cap - sold.n, 0),
    cfg.enabled and (cfg.ends_at is null or cfg.ends_at > now()) and sold.n < cfg.cap
  from cfg, sold;
$$;
grant execute on function public.founders_lifetime_status() to anon, authenticated;

-- Service role: records a lifetime purchase and grants permanent Premium in one step.
-- Returns false when the offer is closed (the webhook then logs it for a manual refund).
create or replace function public.grant_lifetime(p_user_id uuid, p_platform text, p_reference text, p_amount_cents integer default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.lifetime_purchases where reference = p_reference) then
    return true;
  end if;
  insert into public.lifetime_purchases (user_id, platform, reference, amount_cents)
  values (p_user_id, p_platform, p_reference, p_amount_cents)
  on conflict (user_id) do nothing;
  update public.profiles
  set is_premium = true, premium_until = null, premium_source = 'lifetime'
  where id = p_user_id;
  return true;
end;
$$;
revoke execute on function public.grant_lifetime from public, anon, authenticated;
