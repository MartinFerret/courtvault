import Link from 'next/link';
import { AppCta } from './app-cta';
import { Breadcrumbs } from './breadcrumbs';
import type { SetRelease } from '@/lib/data';
import { PATHS, checklistPath } from '@/lib/paths';

/** "Mar 4, 2027" from an ISO day. */
function longDay(day: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
}

/**
 * Placeholder checklist page at the final URL of an announced set (audit item 7): noindex,
 * only what Topps announced (date, box configuration), never an invented card list.
 */
export function UpcomingChecklist({ release }: { release: SetRelease }) {
  const label = `${release.season} ${release.name}`;
  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Checklists', href: PATHS.checklists },
          { name: label, href: checklistPath(release.public_slug) },
        ]}
      />
      <header className="upcoming">
        <p className="ln__eyebrow">Coming next</p>
        <h1>{label} basketball checklist</h1>
        <p className="lead">
          {release.release_date
            ? `Topps releases ${label} on ${longDay(release.release_date)}.`
            : `Topps has announced ${label}; the release date is not public yet.`}{' '}
          The full checklist, every rookie card and every parallel with its print run will be
          published on this page the day the official list is out.
        </p>
      </header>
      <dl className="facts">
        <div>
          <dd>{release.release_date ? longDay(release.release_date) : 'TBA'}</dd>
          <dt>release date</dt>
        </div>
        {release.box_config ? (
          <div>
            <dd>{release.box_config}</dd>
            <dt>box configuration</dt>
          </div>
        ) : null}
        <div>
          <dd>{release.season}</dd>
          <dt>season</dt>
        </div>
      </dl>
      <p>
        Until then: the <Link href={PATHS.checklists}>2025-26 Topps checklists</Link>, the{' '}
        <Link href={PATHS.rookies}>rookie ranking</Link>, and{' '}
        <Link href={PATHS.movers}>what moved after last night&apos;s games</Link>.
      </p>
      <AppCta context={`your ${label} cards, the day it releases`} />
    </>
  );
}
