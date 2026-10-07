'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Main navigation with the current section marked (aria-current drives the lime state). */
export function NavLinks({ items }: { items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
