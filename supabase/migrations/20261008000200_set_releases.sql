-- Upcoming Topps sets (SEO audit of 2026-10-08, item 7): a placeholder checklist page lives at
-- the final URL before the checklist is imported, noindex until then. Rows come from Martin
-- (release date, box configuration) and from job-releases, which reads Topps' official
-- checklists page once a day and notifies when something new appears or the page is unreachable.

create table public.set_releases (
  slug text primary key,
  public_slug text not null unique,
  name text not null,
  season text not null check (season ~ '^20[0-9]{2}-[0-9]{2}$'),
  release_date date,
  box_config text,
  source_url text,
  status text not null default 'announced' check (status in ('announced', 'imported')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.set_releases enable row level security;
create policy "set_releases are public" on public.set_releases for select to anon, authenticated using (true);

-- The placeholder flips to "imported" by itself when the checklist lands in card_sets.
create or replace function public.set_releases_mark_imported()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.set_releases set status = 'imported', updated_at = now()
  where public_slug = new.public_slug and status <> 'imported';
  return new;
end $$;
create trigger card_sets_mark_release_imported
  after insert or update of public_slug on public.card_sets
  for each row when (new.public_slug is not null) execute function public.set_releases_mark_imported();

-- First placeholder: 2026-27 Topps Basketball (flagship first, CLAUDE.md scope). Date and box
-- configuration are entered from the official announcement, never guessed.
insert into public.set_releases (slug, public_slug, name, season, notes)
values ('2026-27-topps-basketball', '2026-27-topps-basketball', 'Topps Basketball', '2026-27',
  'Placeholder created 2026-10-08. Release date and box configuration to enter from the official Topps announcement.')
on conflict (slug) do nothing;

insert into public.app_settings (key, value, description)
values ('topps_release_check', '{}'::jsonb,
  'Last run of job-releases: status (ok, blocked:<http status>, disallowed), checked_at, notified_at, found.')
on conflict (key) do nothing;

-- 14:00 UTC = 9 or 10 AM Eastern, once a day, after the stats and prices jobs.
select cron.schedule('job-releases', '0 14 * * *', $$select public.invoke_job('job-releases')$$);
