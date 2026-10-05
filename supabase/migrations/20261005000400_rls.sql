-- Row Level Security on every table. The service role bypasses RLS and is the only writer
-- for catalog, prices, games and job tables.

-- Defense in depth: clients never write catalog, market or job tables.
revoke insert, update, delete on
  public.players, public.card_sets, public.cards, public.parallels,
  public.price_points, public.current_prices, public.games, public.player_game_lines,
  public.plan_limits
from anon, authenticated;
revoke all on public.job_runs from anon, authenticated;
revoke select, update, delete on public.waitlist from anon, authenticated;

alter table public.players enable row level security;
alter table public.card_sets enable row level security;
alter table public.cards enable row level security;
alter table public.parallels enable row level security;
alter table public.profiles enable row level security;
alter table public.collection_items enable row level security;
alter table public.followed_players enable row level security;
alter table public.checklist_follows enable row level security;
alter table public.price_alerts enable row level security;
alter table public.waitlist enable row level security;
alter table public.price_points enable row level security;
alter table public.current_prices enable row level security;
alter table public.games enable row level security;
alter table public.player_game_lines enable row level security;
alter table public.plan_limits enable row level security;
alter table public.job_runs enable row level security;

-- Public read
create policy "players are public" on public.players for select to anon, authenticated using (true);
create policy "card sets are public" on public.card_sets for select to anon, authenticated using (true);
create policy "cards are public" on public.cards for select to anon, authenticated using (true);
create policy "parallels are public" on public.parallels for select to anon, authenticated using (true);
create policy "current prices are public" on public.current_prices for select to anon, authenticated using (true);
create policy "games are public" on public.games for select to anon, authenticated using (true);
create policy "stat lines are public" on public.player_game_lines for select to anon, authenticated using (true);
create policy "plan limits are public" on public.plan_limits for select to anon, authenticated using (true);

-- Price history: free users and visitors see the last N days (plan_limits.price_history_days),
-- Premium sees everything. Enforced here so it cannot be bypassed by querying the table.
create policy "price history within plan window" on public.price_points
for select to anon, authenticated
using (
  public.is_premium()
  or captured_at >= now() - make_interval(
    days => coalesce((select free_value from public.plan_limits where key = 'price_history_days'), 30)
  )
);

-- Own rows only
create policy "read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own collection" on public.collection_items
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own followed players" on public.followed_players
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own checklist follows" on public.checklist_follows
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own price alerts" on public.price_alerts
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Waitlist: anonymous insert only
create policy "anyone can join the waitlist" on public.waitlist
for insert to anon, authenticated with check (true);
