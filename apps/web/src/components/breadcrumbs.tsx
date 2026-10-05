import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';
import { JsonLd } from './json-ld';

export interface Crumb {
  name: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) => (
          <li key={item.href}>
            {i === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.href}>{item.name}</Link>}
          </li>
        ))}
      </ol>
      <JsonLd data={jsonLd} />
    </nav>
  );
}
