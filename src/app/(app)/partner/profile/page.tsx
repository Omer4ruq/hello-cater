import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert } from '@/components/ui/feedback';
import { Money } from '@/components/ui/money';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerCatalog, getPartnerProfile } from '@/features/partner/queries';
import { PartnerProfileForm } from '@/features/partner/components/profile-form';
import { buildMetadata } from '@/lib/seo';
import { formatBps } from '@/lib/money';

export const metadata = buildMetadata({
  title: 'Business profile', description: 'Your public profile and operating limits.',
  path: '/partner/profile', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerProfilePage() {
  const user = await requireUserPage('/partner/profile');
  const partner = activePartner(user);
  const [profile, catalog] = await Promise.all([
    getPartnerProfile(partner.partnerId),
    getPartnerCatalog(partner.partnerId),
  ]);

  if (!profile) return null;

  const canEdit = ['owner', 'admin'].includes(partner.role);

  return (
    <>
      <PageHeader
        title="Business profile"
        description="What customers see, and the limits our matching engine uses to decide which briefs reach you."
        actions={
          <>
            <StatusBadge status={profile.verification_status} />
            {profile.verification_status === 'approved' ? <VerifiedBadge /> : null}
          </>
        }
      />

      {!canEdit ? (
        <Alert tone="info" className="mb-6" title="Read-only">
          Only owners and admins can edit the business profile.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <PartnerProfileForm
          partnerId={partner.partnerId}
          readOnly={!canEdit}
          initial={{
            displayName: profile.display_name,
            tagline: profile.tagline ?? '',
            about: profile.about ?? '',
            minOrderMinor: profile.min_order_minor,
            minGuests: profile.min_guests,
            maxGuests: profile.max_guests,
            leadTimeHours: profile.lead_time_hours,
            dailyEventCapacity: profile.daily_event_capacity,
            cancellationPolicy: profile.cancellation_policy ?? '',
            paymentTerms: profile.payment_terms ?? '',
            isAcceptingOrders: profile.is_accepting_orders,
          }}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Commercial terms</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm">
              <dl className="space-y-2.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Commission</dt>
                  <dd className="font-medium text-ink-900">
                    {profile.commission_bps != null ? formatBps(profile.commission_bps) : 'Platform default'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Minimum order</dt>
                  <dd className="text-ink-900"><Money minor={profile.min_order_minor} /></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Events delivered</dt>
                  <dd className="text-ink-900">{profile.completed_bookings}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Rating</dt>
                  <dd className="text-ink-900">
                    {profile.rating_count ? `${profile.rating_avg.toFixed(1)} ★ (${profile.rating_count})` : 'No reviews yet'}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-500">
                Commission is agreed with our partner team and cannot be changed here. Contact us if
                you believe your rate is wrong.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle as="h2">Coverage</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm font-medium text-ink-500">Services</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catalog.categories.map((c) => {
                  const category = c.service_categories as unknown as { name: string } | null;
                  return <Badge key={c.category_id} tone="clay">{category?.name}</Badge>;
                })}
                {catalog.categories.length === 0 ? <p className="text-sm text-ink-600">None set.</p> : null}
              </div>

              <p className="mt-4 text-sm font-medium text-ink-500">Service areas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catalog.serviceAreas.map((area) => {
                  const areaName = (area.areas as unknown as { name: string } | null)?.name;
                  const cityName = (area.cities as unknown as { name: string } | null)?.name;
                  return <Badge key={area.id} tone="neutral">{areaName ?? `${cityName} (all)`}</Badge>;
                })}
                {catalog.serviceAreas.length === 0 ? <p className="text-sm text-ink-600">None set.</p> : null}
              </div>

              <p className="mt-4 text-sm font-medium text-ink-500">Cuisines</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catalog.cuisines.map((c) => {
                  const cuisine = c.cuisines as unknown as { id: string; name: string } | null;
                  return <Badge key={c.cuisine_id} tone="saffron">{cuisine?.name}</Badge>;
                })}
                {catalog.cuisines.length === 0 ? <p className="text-sm text-ink-600">None set.</p> : null}
              </div>

              <p className="mt-4 text-xs text-ink-500">
                To change your services, areas or cuisines, contact our partner team — these affect
                matching and are confirmed during verification.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
