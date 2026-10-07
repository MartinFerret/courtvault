import type { ReactNode } from 'react';

/** What is coming, instead of a blank block. One sentence, optionally a link. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <p className="empty__title">{title}</p>
      {children ? <p className="empty__body">{children}</p> : null}
    </div>
  );
}
