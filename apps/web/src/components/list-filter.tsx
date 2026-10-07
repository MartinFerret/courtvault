'use client';

import { useId, useState } from 'react';

/**
 * Text filter for a long server-rendered list. Rows carry `data-filter="<searchable text>"`
 * (and `data-rookie` when the toggle applies); the markup stays complete for search engines,
 * the filter only hides rows in the browser.
 */
export function ListFilter({
  target,
  placeholder,
  label,
  total,
  noun,
  toggle,
}: {
  target: string;
  placeholder: string;
  label: string;
  total: number;
  noun: string;
  toggle?: { label: string; attr: string };
}) {
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState(false);
  const [shown, setShown] = useState(total);
  const id = useId();

  // Runs on each change, not in an effect: the rows are plain server-rendered DOM.
  const apply = (nextQuery: string, nextOnly: boolean) => {
    setQuery(nextQuery);
    setOnly(nextOnly);
    const root = document.getElementById(target);
    if (!root) return;
    const q = nextQuery.trim().toLowerCase();
    let n = 0;
    for (const row of root.querySelectorAll<HTMLElement>('[data-filter]')) {
      const text = row.dataset['filter'] ?? '';
      const hit =
        (!q || text.includes(q)) && (!nextOnly || !toggle || row.hasAttribute(toggle.attr));
      row.hidden = !hit;
      if (hit) n += 1;
    }
    for (const group of root.querySelectorAll<HTMLElement>('[data-group]')) {
      group.hidden = !group.querySelector('[data-filter]:not([hidden])');
    }
    setShown(n);
  };

  return (
    <div className="list-filter" role="search">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        onChange={(e) => apply(e.target.value, only)}
      />
      {toggle ? (
        <label className="list-filter__toggle">
          <input type="checkbox" checked={only} onChange={(e) => apply(query, e.target.checked)} />
          {toggle.label}
        </label>
      ) : null}
      <span className="muted small" aria-live="polite">
        {shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`}
      </span>
    </div>
  );
}
