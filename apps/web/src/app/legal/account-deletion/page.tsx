import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LEGAL_ENTITY } from '@courtvault/shared';

export const metadata: Metadata = {
  title: 'Account deletion',
  description: 'How to delete your account and all associated data from the app.',
  alternates: { canonical: '/legal/account-deletion' },
};

export default function AccountDeletionPage() {
  return (
    <article className="prose">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Account deletion', href: '/legal/account-deletion' },
        ]}
      />
      <h1>Delete your account</h1>
      <p>
        Open the app, go to <strong>Profile → Delete account</strong> and confirm. Your collection,
        follows, alerts, photos and sign-in are deleted immediately and cannot be recovered. Active
        subscriptions must be cancelled from your Apple or Google account.
      </p>
      <p>
        If you can no longer access the app, write to{' '}
        <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>{LEGAL_ENTITY.contactEmail}</a> from the
        email address of your account and we will delete it.
      </p>
    </article>
  );
}
