import Link from 'next/link';
import { Building2, Store, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/features/account/components/profile-form';
import { requireUserPage } from '@/features/auth/session';
import { ROLE_LABELS } from '@/features/auth/permissions';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Your profile', description: 'Your account details.', path: '/account', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUserPage('/account');

  return (
    <>
      <h1 className="text-display-sm">Your profile</h1>
      <p className="mt-2 text-ink-600">
        How we address you and reach you. Changing your email here does not change your sign-in
        address — contact support for that.
      </p>

      <Card className="mt-7">
        <CardHeader><CardTitle as="h2">Personal details</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <ProfileForm
            initial={{
              fullName: user.profile.full_name,
              phone: user.profile.phone ?? '',
              locale: user.profile.locale as 'en' | 'bn',
            }}
            email={user.email}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle as="h2">Your access</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <dl className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-ink-600">Member since</dt>
              <dd className="text-sm text-ink-900">{formatDateShort(user.profile.created_at)}</dd>
            </div>

            {user.isStaff && user.platformRole ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-2 text-sm text-ink-600">
                  <ShieldCheck aria-hidden className="size-4 text-ink-400" /> Platform role
                </dt>
                <dd><Badge tone="solid">{ROLE_LABELS[user.platformRole]}</Badge></dd>
              </div>
            ) : null}

            {user.customerOrgs.length > 0 ? (
              <div>
                <dt className="flex items-center gap-2 text-sm text-ink-600">
                  <Building2 aria-hidden className="size-4 text-ink-400" /> Company accounts
                </dt>
                <dd className="mt-2 space-y-1.5">
                  {user.customerOrgs.map((org) => (
                    <p key={org.organizationId} className="flex items-center gap-2 text-sm">
                      <span className="text-ink-900">{org.organizationName}</span>
                      <Badge tone="neutral" className="capitalize">{org.role}</Badge>
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}

            {user.partnerOrgs.length > 0 ? (
              <div>
                <dt className="flex items-center gap-2 text-sm text-ink-600">
                  <Store aria-hidden className="size-4 text-ink-400" /> Partner accounts
                </dt>
                <dd className="mt-2 space-y-1.5">
                  {user.partnerOrgs.map((org) => (
                    <p key={org.organizationId} className="flex items-center gap-2 text-sm">
                      <span className="text-ink-900">{org.organizationName}</span>
                      <Badge tone="clay" className="capitalize">{org.role}</Badge>
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="secondary"><Link href="/account/settings">Notification settings</Link></Button>
        <Button asChild variant="ghost"><Link href="/forgot-password">Change password</Link></Button>
      </div>
    </>
  );
}
