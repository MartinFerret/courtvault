'use client';

import { useActionState } from 'react';
import type { WaitlistState } from './actions';

export function WaitlistForm({
  action,
}: {
  action: (prev: WaitlistState, formData: FormData) => Promise<WaitlistState>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: 'idle' } as WaitlistState);
  if (state.status === 'ok') {
    return (
      <p className="notice" role="status">
        {state.message}
      </p>
    );
  }
  return (
    <form action={formAction} className="stack">
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      {state.status === 'error' ? (
        <p className="notice error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? 'Joining…' : 'Join the waitlist'}
      </button>
      <p className="muted small">One email when the app launches. No spam.</p>
    </form>
  );
}
