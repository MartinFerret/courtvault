'use client';

import { useActionState, useEffect } from 'react';
import { identifyWaitlist, track } from '@/components/analytics';
import type { WaitlistState } from './actions';

export function WaitlistForm({
  action,
}: {
  action: (prev: WaitlistState, formData: FormData) => Promise<WaitlistState>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: 'idle' } as WaitlistState);
  useEffect(() => {
    if (state.status === 'ok') {
      if (state.email) identifyWaitlist(state.email);
      track('waitlist_submitted');
    } else if (state.status === 'error') {
      track('waitlist_failed', { reason: state.message ?? null });
    }
  }, [state]);
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
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        maxLength={254}
      />
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: 'none' }}
      />
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
