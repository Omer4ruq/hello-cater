import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText, Mail, MapPin, Phone } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { VerificationPanel } from '@/features/admin/components/verification-panel';
import { InternalNotes } from '@/features/admin/components/internal-notes';
import { requireUserPage, hasPermission } from '@/features/auth/session';
import { getAdminPartner } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatBps } from '@/lib/money';
import { formatDateShort, formatDateTime, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Partner', description: 'Partner record.', path: '/admin/partners', noIndex: true,
});

export const dynamic = 'force-dynamic';

const DOCUMENT_LABELS: Record<string, string> = {
  trade_license: 'Trade licence', nid: 'National ID', tin: 'TIN certificate',
  bin_vat: 'BIN / VAT', bank_statement: 'Bank statement', food_license: 'Food licence',
  insurance: 'Insurance', contract: 'Contract', portfolio: 'Portfolio', other: 'Other',
};

export default async function AdminPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/admin/partners/${id}`);

  const data = await getAdminPartner(id);
  if (!data) notFound();

  const { profile, documents, categories, serviceAreas, verification, bookings, payouts, notes } = data;
  const org = profile.organizations as unknown as {
    id: string; name: string; legal_name: string | null; phone: string | null;
    email: string | null; address_line: string | null; area: string | null;
    city: string | null; trade_license: string | null; tin: string | null; bin_vat: string | null;
  } | null;

  const canVerify = hasPermission(user, 'partners.verify');
  const canSetCommission = hasPermission(user, 'settings.manage');

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/admin' },
          { label: 'Partners', href: '/admin/partners' },
          { label: profile.display_name },
        ]}
        title={profile.display_name}
        description={org?.legal_name ?? org?.name ?? ''}
        actions={
          <>
            <StatusBadge status={profile.verification_status} />
            {profile.verification_status === 'approved' && profile.published_at ? <VerifiedBadge /> : null}
            {profile.published_at ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/partners/${profile.slug}`}>View public profile</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
              <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
              <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle as="h2">Business</CardTitle></CardHeader>
                  <CardContent className="pt-3">
                    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      <Row label="Legal name" value={org?.legal_name ?? '—'} />
                      <Row label="Business type" value={profile.business_type?.replace(/_/g, ' ') ?? '—'} />
                      <Row label="Established" value={profile.year_established?.toString() ?? '—'} />
                      <Row label="Trade licence" value={org?.trade_license ?? '—'} />
                      <Row label="TIN" value={org?.tin ?? '—'} />
                      <Row label="BIN / VAT" value={org?.bin_vat ?? '—'} />
                    </dl>

                    <dl className="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm">
                      {org?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone aria-hidden className="size-3.5 text-ink-400" />
                          <a href={`tel:${org.phone}`} className="text-brand-700 hover:underline">{org.phone}</a>
                        </div>
                      ) : null}
                      {org?.email ? (
                        <div className="flex items-center gap-2">
                          <Mail aria-hidden className="size-3.5 text-ink-400" />
                          <a href={`mailto:${org.email}`} className="break-all text-brand-700 hover:underline">{org.email}</a>
                        </div>
                      ) : null}
                      {org?.address_line || org?.city ? (
                        <div className="flex items-center gap-2">
                          <MapPin aria-hidden className="size-3.5 text-ink-400" />
                          <span>{[org.address_line, org.area, org.city].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : null}
                    </dl>

                    {profile.about ? (
                      <div className="mt-5 border-t border-ink-100 pt-4">
                        <p className="text-xs font-medium text-ink-500">About</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{profile.about}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle as="h2">Capability</CardTitle></CardHeader>
                  <CardContent className="pt-3">
                    <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      <Row label="Guest range" value={`${profile.min_guests ?? '—'} – ${profile.max_guests ?? '—'}`} />
                      <Row label="Minimum order" value={<Money minor={profile.min_order_minor} />} />
                      <Row label="Lead time" value={`${profile.lead_time_hours} hours`} />
                      <Row label="Daily capacity" value={`${profile.daily_event_capacity} events`} />
                      <Row label="Rating" value={profile.rating_count ? `${profile.rating_avg.toFixed(1)} ★ (${profile.rating_count})` : 'No reviews'} />
                      <Row label="Delivered" value={`${profile.completed_bookings} events`} />
                      <Row label="Response rate" value={`${(profile.response_rate_bps / 100).toFixed(0)}%`} />
                      <Row
                        label="Commission"
                        value={profile.commission_bps != null ? formatBps(profile.commission_bps) : 'Platform default'}
                      />
                    </dl>

                    <div className="mt-5 border-t border-ink-100 pt-4">
                      <p className="text-xs font-medium text-ink-500">Categories</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {categories.map((c) => {
                          const category = c.service_categories as unknown as { name: string } | null;
                          return (
                            <Badge key={c.category_id} tone={c.is_primary ? 'brand' : 'neutral'}>
                              {category?.name}
                              {c.price_from_minor ? ` · from ${(c.price_from_minor / 100).toLocaleString()}` : ''}
                            </Badge>
                          );
                        })}
                      </div>

                      <p className="mt-4 text-xs font-medium text-ink-500">Service areas</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {serviceAreas.map((area) => {
                          const areaName = (area.areas as unknown as { name: string } | null)?.name;
                          const cityName = (area.cities as unknown as { name: string } | null)?.name;
                          return <Badge key={area.id} tone="neutral">{areaName ?? `${cityName} (all)`}</Badge>;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents uploaded"
                  description="The partner uploads their trade licence and supporting documents from their dashboard. Verification documents are stored in a private bucket and served through short-lived signed URLs."
                />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-ink-100">
                      {documents.map((doc) => (
                        <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div className="flex items-center gap-3">
                            <FileText aria-hidden className="size-4 text-ink-400" />
                            <div>
                              <p className="text-sm font-medium text-ink-950">
                                {DOCUMENT_LABELS[doc.kind] ?? doc.kind}
                                {doc.is_verified ? <Badge tone="success" className="ml-2">Verified</Badge> : null}
                              </p>
                              <p className="text-xs text-ink-500">
                                {doc.title} · uploaded {relativeDate(doc.created_at)}
                                {doc.expires_on ? ` · expires ${formatDateShort(doc.expires_on)}` : ''}
                              </p>
                            </div>
                          </div>
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/api/files/partner-documents?path=${encodeURIComponent(doc.storage_path)}`}>
                              Open
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bookings">
              {bookings.length === 0 ? (
                <EmptyState title="No bookings yet" description="Confirmed jobs for this partner will appear here." />
              ) : (
                <Card className="overflow-hidden p-0">
                  <TableWrap label="Partner bookings" className="rounded-none border-0">
                    <Table>
                      <THead>
                        <TR><TH>Booking</TH><TH>Event</TH><TH>Date</TH><TH className="text-right">Gross</TH><TH className="text-right">Payable</TH><TH>Status</TH></TR>
                      </THead>
                      <TBody>
                        {bookings.map((booking) => (
                          <TR key={booking.id}>
                            <TD className="font-mono text-xs">{booking.reference}</TD>
                            <TD>{(booking.events as unknown as { title: string } | null)?.title ?? '—'}</TD>
                            <TD>{formatDateShort(booking.service_date)}</TD>
                            <TDNum><Money minor={booking.gross_minor} /></TDNum>
                            <TDNum><Money minor={booking.partner_payable_minor} /></TDNum>
                            <TD><StatusBadge status={booking.status} /></TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </TableWrap>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payouts">
              {payouts.length === 0 ? (
                <EmptyState title="No payouts yet" description="Settlements to this partner will appear here." />
              ) : (
                <Card className="overflow-hidden p-0">
                  <TableWrap label="Partner payouts" className="rounded-none border-0">
                    <Table>
                      <THead><TR><TH>Reference</TH><TH className="text-right">Net</TH><TH>Status</TH><TH>Paid</TH></TR></THead>
                      <TBody>
                        {payouts.map((payout) => (
                          <TR key={payout.id}>
                            <TD className="font-mono text-xs">{payout.reference}</TD>
                            <TDNum><Money minor={payout.net_minor} /></TDNum>
                            <TD><StatusBadge status={payout.status} /></TD>
                            <TD className="text-xs text-ink-500">{payout.paid_at ? formatDateShort(payout.paid_at) : '—'}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </TableWrap>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader><CardTitle as="h2">Verification history</CardTitle></CardHeader>
                <CardContent className="pt-3">
                  {verification.length === 0 ? (
                    <p className="text-sm text-ink-600">No verification events recorded.</p>
                  ) : (
                    <ol className="space-y-4">
                      {verification.map((event) => {
                        const actor = event.profiles as unknown as { full_name: string } | null;
                        return (
                          <li key={event.id} className="flex gap-3">
                            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-700" />
                            <div>
                              <p className="text-sm text-ink-900">
                                {event.from_status ? `${event.from_status} → ` : ''}
                                <span className="font-medium">{event.to_status}</span>
                              </p>
                              <p className="text-xs text-ink-500">
                                {formatDateTime(event.created_at)}{actor ? ` · ${actor.full_name}` : ''}
                              </p>
                              {event.notes ? <p className="mt-0.5 text-sm text-ink-600">{event.notes}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {canVerify ? (
            <VerificationPanel
              partnerId={profile.id}
              status={profile.verification_status}
              isPublished={Boolean(profile.published_at)}
              commissionBps={profile.commission_bps}
              canSetCommission={canSetCommission}
            />
          ) : null}

          <InternalNotes
            entity="partner"
            entityId={profile.id}
            notes={notes.map((n) => ({
              id: n.id, body: n.body, createdAt: n.created_at,
              authorName: (n.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Staff',
            }))}
          />
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-900">{value}</dd>
    </div>
  );
}
