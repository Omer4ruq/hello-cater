import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Users, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerInvite, getPartnerCatalog, getPartnerProfile } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { QuoteBuilder } from '@/features/quotes/components/quote-builder';
import { InviteResponse } from '@/features/partner/components/invite-response';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate, formatTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Request brief', description: 'Review the brief and submit your quotation.',
  path: '/partner/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/partner/requests/${id}`);
  const partner = activePartner(user);

  const data = await getPartnerInvite(partner.partnerId, id);
  if (!data?.request) notFound();

  const { invite, request, services, cuisines, quote } = data;
  const [catalog, profile] = await Promise.all([
    getPartnerCatalog(partner.partnerId),
    getPartnerProfile(partner.partnerId),
  ]);

  // Load an editable draft (or the last version, to revise from).
  const supabase = await createServerSupabase();
  const { data: versions } = quote
    ? await supabase
        .from('quote_versions')
        .select('id, version_no, status, submitted_at, guest_count, discount_minor, tax_minor, notes, payment_terms, cancellation_policy, valid_until, quote_items(charge_kind, label, description, unit, quantity, unit_price_minor, is_optional, sort_order)')
        .eq('quote_id', quote.id)
        .order('version_no', { ascending: false })
        .limit(1)
    : { data: null };

  const latest = versions?.[0];
  const isRevision = Boolean(latest?.submitted_at && !['draft', 'changes_requested'].includes(latest.status));

  const eventType = request.event_types as unknown as { name: string } | null;
  const city = request.cities as unknown as { name: string } | null;
  const area = request.areas as unknown as { name: string } | null;

  const canQuote = invite.status === 'accepted' || Boolean(quote);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Partner', href: '/partner' },
          { label: 'Requests', href: '/partner/requests' },
          { label: request.reference },
        ]}
        title={request.title || eventType?.name || request.reference}
        description={`${request.reference} · ${formatEventDate(request.event_date)}`}
        actions={<StatusBadge status={invite.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="lg:order-2">
          <CardHeader><CardTitle as="h2">The brief</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <dl className="space-y-3 text-sm">
              <Detail icon={CalendarDays} label="Date">
                {formatEventDate(request.event_date)}
                {request.event_end_date ? ` → ${formatEventDate(request.event_end_date)}` : ''}
                {request.start_time ? <span className="block text-ink-600">{formatTime(request.start_time)}{request.end_time ? ` – ${formatTime(request.end_time)}` : ''}</span> : null}
                {request.is_date_flexible ? <Badge tone="neutral" className="mt-1">Flexible</Badge> : null}
              </Detail>
              <Detail icon={Users} label="Guests">
                {request.guest_count}{request.guest_count_max ? `–${request.guest_count_max}` : ''}
              </Detail>
              <Detail icon={MapPin} label="Location">
                {[request.venue_name, area?.name, city?.name].filter(Boolean).join(', ') || '—'}
              </Detail>
              <Detail icon={Wallet} label="Budget">
                {request.budget_total_minor ? <Money minor={request.budget_total_minor} />
                  : request.budget_per_person_minor ? <><Money minor={request.budget_per_person_minor} /> per person</>
                  : request.budget_min_minor && request.budget_max_minor
                    ? <><Money minor={request.budget_min_minor} /> – <Money minor={request.budget_max_minor} /></>
                    : 'Flexible'}
              </Detail>
            </dl>

            <div className="mt-5">
              <p className="text-sm font-medium text-ink-500">Services requested</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {services.map((service) => {
                  const category = service.service_categories as unknown as { name: string } | null;
                  return <Badge key={service.category_id} tone="clay">{category?.name}</Badge>;
                })}
              </div>
            </div>

            {cuisines.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink-500">Cuisine</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cuisines.map((c) => {
                    const cuisine = c.cuisines as unknown as { name: string } | null;
                    return <Badge key={c.cuisine_id} tone="saffron">{cuisine?.name}</Badge>;
                  })}
                </div>
              </div>
            ) : null}

            {request.dietary_notes ? (
              <Note label="Dietary & menu notes">{request.dietary_notes}</Note>
            ) : null}
            {request.requirements ? (
              <Note label="Additional requirements">{request.requirements}</Note>
            ) : null}
            {request.venue_notes ? (
              <Note label="Venue access">{request.venue_notes}</Note>
            ) : null}

            {invite.message ? (
              <Alert tone="info" className="mt-5" title="Note from our team">{invite.message}</Alert>
            ) : null}

            <p className="mt-5 text-xs leading-relaxed text-ink-500">
              Customer contact details are held by the platform. All communication about this request
              runs through us so commitments stay documented for both sides.
            </p>
          </CardContent>
        </Card>

        <div className="lg:order-1">
          {!canQuote ? (
            <InviteResponse
              inviteId={invite.id}
              partnerId={partner.partnerId}
              status={invite.status}
            />
          ) : profile?.verification_status !== 'approved' ? (
            <Alert tone="warning" title="Verification required">
              You can review briefs, but you must be a verified partner before submitting a quotation.
            </Alert>
          ) : (
            <QuoteBuilder
              partnerId={partner.partnerId}
              requestId={request.id}
              inviteId={invite.id}
              categoryId={invite.category_id}
              quoteId={quote?.id ?? null}
              defaultGuestCount={request.guest_count}
              isRevision={isRevision}
              defaultPaymentTerms={profile?.payment_terms ?? undefined}
              defaultCancellationPolicy={profile?.cancellation_policy ?? undefined}
              menus={catalog.menus.map((menu) => ({
                id: menu.id,
                name: menu.name,
                items: (menu.menu_items as unknown as {
                  id: string; name: string; unit: string; price_minor: number; is_active: boolean;
                }[])
                  .filter((i) => i.is_active)
                  .map((i) => ({ id: i.id, name: i.name, unit: i.unit, price_minor: i.price_minor })),
              }))}
              packages={catalog.packages.map((pkg) => ({
                id: pkg.id, name: pkg.name,
                base_price_minor: pkg.base_price_minor,
                per_person_price_minor: pkg.per_person_price_minor,
              }))}
              initial={
                latest && !isRevision
                  ? {
                      items: (latest.quote_items as unknown as {
                        charge_kind: string; label: string; description: string | null;
                        unit: string; quantity: number; unit_price_minor: number;
                        is_optional: boolean; sort_order: number;
                      }[])
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((item) => ({
                          chargeKind: item.charge_kind as never,
                          label: item.label,
                          description: item.description ?? '',
                          unit: item.unit as never,
                          quantity: Number(item.quantity),
                          unitPriceMinor: item.unit_price_minor,
                          isOptional: item.is_optional,
                        })),
                      discountMinor: latest.discount_minor,
                      taxMinor: latest.tax_minor,
                      notes: latest.notes ?? '',
                      paymentTerms: latest.payment_terms ?? '',
                      cancellationPolicy: latest.cancellation_policy ?? '',
                      validUntil: latest.valid_until,
                      guestCount: latest.guest_count,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

function Detail({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-medium text-ink-500">
        <Icon aria-hidden className="size-3.5" /> {label}
      </dt>
      <dd className="mt-0.5 text-ink-900">{children}</dd>
    </div>
  );
}

function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{children}</p>
    </div>
  );
}
