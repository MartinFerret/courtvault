'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

/**
 * Main navigation. Desktop: pill links in the bar, the current section in lime. Under 720px the
 * links live in a panel opened by the burger button; the panel closes on navigation and Escape.
 */
export function SiteNav({ items }: { items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  // The panel remembers the path it was opened on: a navigation closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenPath(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-burger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(!open)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          {open ? (
            <path
              d="M4 4l14 14M18 4L4 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M3 6h16M3 11h16M3 16h16"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
      <nav id={panelId} className={`nav${open ? ' nav--open' : ''}`} aria-label="Main">
        {items.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
