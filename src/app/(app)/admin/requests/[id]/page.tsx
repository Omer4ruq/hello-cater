import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays, Mail, MapPin, Phone, Users, Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, statusLabel } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { PartnerInvitePanel, type Candidate } from '@/features/admin/components/partner-invite-panel';
import { ProposalBuilder, type QuoteOption } from '@/features/admin/components/proposal-builder';
import { InternalNotes } from '@/features/admin/components/internal-notes';
import { RequestStatusControl } from '@/features/admin/components/request-status-control';
import { requireUserPage, hasPermission } from '@/features/auth/session';
import { getAdminRequestWorkspace } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime, formatEventDate, formatTime, relativeDate } from '@/lib/dates';
import { CHARGE_KIND_LABELS } from '@/features/quotes/schema';

export const metadata = buildMetadata({
  title: 'Request workspace', description: 'Operations workspace.',
  path: '/admin/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminRequestWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/admin/requests/${id}`);

  const data = await getAdminRequestWorkspace(id);
  if (!data) notFound();

  const { request, services, cuisines, candidates, invites, quotes, proposals, notes, history } = data;
  const eventType = request.event_types as unknown as { name: string } | null;
  const city = request.cities as unknown as { name: string } | null;
  const area = request.areas as unknown as { name: string } | null;
  const organization = request.organizations as unknown as { id: string; name: string } | null;
  const customer = request.profiles as unknown as { full_name: string; email: string | null; phone: string | null } | null;

  const invitedPartnerIds = new Set(invites.map((i) => i.partner_id));

  const candidateRows: Candidate[] = candidates.map((c) => {
    const partner = c.partner_profiles as unknown as {
      id: string; display_name: string; slug: string; rating_avg: number;
      rating_count: number; completed_bookings: number; response_rate_bps: number;
      min_order_minor: number; max_guests: number | null; logo_url: string | null;
    } | null;
    const category = c.service_categories as unknown as { name: string } | null;
    return {
      id: c.id,
      partnerId: c.partner_id,
      categoryId: c.category_id,
      categoryName: category?.name ?? null,
      partnerName: partner?.display_name ?? 'Partner',
      partnerSlug: partner?.slug ?? '',
      logoUrl: partner?.logo_url ?? null,
      score: Number(c.score),
      reasons: c.reasons ?? [],
      disqualified: c.disqualified,
      disqualifyReason: c.disqualify_reason,
      ratingAvg: partner?.rating_avg ?? 0,
      ratingCount: partner?.rating_count ?? 0,
      completedBookings: partner?.completed_bookings ?? 0,
      responseRateBps: partner?.response_rate_bps ?? 0,
      minOrderMinor: partner?.min_order_minor ?? 0,
      maxGuests: partner?.max_guests ?? null,
      alreadyInvited: invitedPartnerIds.has(c.partner_id),
    };
  });

  const submittedQuotes: QuoteOption[] = quotes
    .filter((q) => q.current?.submitted_at)
    .map((q) => {
      const partner = q.partner_profiles as unknown as {
        display_name: string; slug: string; rating_avg: number; rating_count: number;
      } | null;
      const category = q.service_categories as unknown as { name: string } | null;
      const items = (q.current?.quote_items as unknown as unknown[] | null) ?? [];
      return {
        quoteId: q.id,
        quoteVersionId: q.current?.id ?? null,
        partnerId: q.partner_id,
        partnerName: partner?.display_name ?? 'Partner',
        categoryId: q.category_id,
        categoryName: category?.name ?? null,
        totalMinor: q.current?.total_minor ?? 0,
        perPersonMinor: q.current?.per_person_minor ?? null,
        ratingAvg: partner?.rating_avg ?? 0,
        ratingCount: partner?.rating_count ?? 0,
        status: q.status,
        versionNo: q.current?.version_no ?? 1,
        itemCount: items.length,
        commissionBps: 1200,
      };
    });

  const draftProposal = proposals.find((p) => p.status === 'draft');
  const canManageProposals = hasPermission(user, 'proposals.manage');

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/admin' },
          { label: 'Requests', href: '/admin/requests' },
          { label: request.reference },
        ]}
        title={request.title || eventType?.name || request.reference}
        description={`${request.reference} · submitted ${relativeDate(request.submitted_at ?? request.created_at)}`}
        actions={
          <>
            <StatusBadge status={request.status} />
            <RequestStatusControl requestId={request.id} status={request.status} assignedTo={request.assigned_to} />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <Tabs defaultValue={submittedQuotes.length > 0 ? 'quotes' : 'partners'}>
            <TabsList>
              <TabsTrigger value="brief">Brief</TabsTrigger>
              <TabsTrigger value="partners">Partners ({candidateRows.filter((c) => !c.disqualified).length})</TabsTrigger>
              <TabsTrigger value="quotes">Quotes ({submittedQuotes.length})</TabsTrigger>
              {canManageProposals ? <TabsTrigger value="proposal">Proposal</TabsTrigger> : null}
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* ------------------------------------------------- Brief */}
            <TabsContent value="brief">
              <Card>
                <CardHeader><CardTitle as="h2">Requirement</CardTitle></CardHeader>
                <CardContent className="pt-3">
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <Detail icon={CalendarDays} label="Date & time">
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
                      {request.address_line ? <span className="block text-ink-600">{request.address_line}</span> : null}
                    </Detail>
                    <Detail icon={Wallet} label="Budget">
                      {request.budget_total_minor ? <Money minor={request.budget_total_minor} />
                        : request.budget_per_person_minor ? <><Money minor={request.budget_per_person_minor} />/person</>
                        : request.budget_min_minor && request.budget_max_minor
                          ? <><Money minor={request.budget_min_minor} /> – <Money minor={request.budget_max_minor} /></>
                          : 'Flexible'}
                    </Detail>
                  </dl>

                  <div className="mt-5">
                    <p className="text-xs font-medium text-ink-500">Services</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {services.map((s) => {
                        const category = s.service_categories as unknown as { name: string } | null;
                        return <Badge key={s.category_id} tone="brand">{category?.name}</Badge>;
                      })}
                    </div>
                  </div>

                  {cuisines.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-ink-500">Cuisine</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {cuisines.map((c) => {
                          const cuisine = c.cuisines as unknown as { name: string } | null;
                          return <Badge key={c.cuisine_id}>{cuisine?.name}</Badge>;
                        })}
                      </div>
                    </div>
                  ) : null}

                  {request.dietary_notes ? <Note label="Dietary & menu">{request.dietary_notes}</Note> : null}
                  {request.requirements ? <Note label="Requirements">{request.requirements}</Note> : null}
                  {request.venue_notes ? <Note label="Venue access">{request.venue_notes}</Note> : null}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---------------------------------------------- Partners */}
            <TabsContent value="partners">
              <div className="space-y-6">
                {invites.length > 0 ? (
                  <Card>
                    <CardHeader><CardTitle as="h2">Invited ({invites.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <TableWrap label="Invitations" className="rounded-none border-0">
                        <Table>
                          <THead>
                            <TR>
                              <TH>Partner</TH><TH>Line</TH><TH>Status</TH>
                              <TH>Invited</TH><TH>Responded</TH><TH>Reason</TH>
                            </TR>
                          </THead>
                          <TBody>
                            {invites.map((invite) => {
                              const partner = invite.partner_profiles as unknown as { display_name: string; slug: string } | null;
                              const category = invite.service_categories as unknown as { name: string } | null;
                              return (
                                <TR key={invite.id}>
                                  <TD>
                                    <Link href={`/admin/partners/${invite.partner_id}`} className="font-medium text-brand-700 hover:underline">
                                      {partner?.display_name ?? 'Partner'}
                                    </Link>
                                  </TD>
                                  <TD>{category?.name ?? '—'}</TD>
                                  <TD><StatusBadge status={invite.status} /></TD>
                                  <TD className="text-xs text-ink-500">{relativeDate(invite.invited_at)}</TD>
                                  <TD className="text-xs text-ink-500">{invite.responded_at ? relativeDate(invite.responded_at) : '—'}</TD>
                                  <TD className="text-xs text-ink-600">{invite.decline_reason ?? '—'}</TD>
                                </TR>
                              );
                            })}
                          </TBody>
                        </Table>
                      </TableWrap>
                    </CardContent>
                  </Card>
                ) : null}

                <PartnerInvitePanel requestId={request.id} candidates={candidateRows} />
              </div>
            </TabsContent>

            {/* ------------------------------------------------ Quotes */}
            <TabsContent value="quotes">
              {quotes.length === 0 ? (
                <EmptyState
                  title="No quotes yet"
                  description="Invited partners submit their quotations here. You can compare them side by side before building a proposal."
                />
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => {
                    const partner = quote.partner_profiles as unknown as {
                      display_name: string; slug: string; rating_avg: number; rating_count: number;
                    } | null;
                    const category = quote.service_categories as unknown as { name: string } | null;
                    const current = quote.current;
                    const items = (current?.quote_items as unknown as {
                      id: string; charge_kind: string; label: string; unit: string;
                      quantity: number; unit_price_minor: number; line_total_minor: number; is_optional: boolean;
                    }[] | null) ?? [];

                    return (
                      <Card key={quote.id}>
                        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle as="h2">
                              <Link href={`/admin/partners/${quote.partner_id}`} className="hover:underline">
                                {partner?.display_name ?? 'Partner'}
                              </Link>
                            </CardTitle>
                            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                              <span className="font-mono">{quote.reference}</span>
                              {category ? <Badge tone="neutral">{category.name}</Badge> : null}
                              <span>v{current?.version_no ?? 1}</span>
                              {partner?.rating_count ? <span>★ {partner.rating_avg.toFixed(1)} ({partner.rating_count})</span> : <span>New partner</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-sans text-lg font-semibold text-ink-950">
                              <Money minor={current?.total_minor ?? 0} />
                            </p>
                            {current?.per_person_minor ? (
                              <p className="text-xs text-ink-500"><Money minor={current.per_person_minor} />/person</p>
                            ) : null}
                            <div className="mt-1"><StatusBadge status={quote.status} /></div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          {items.length > 0 ? (
                            <TableWrap label={`${partner?.display_name} quote lines`}>
                              <Table>
                                <THead>
                                  <TR>
                                    <TH>Item</TH><TH>Category</TH>
                                    <TH className="text-right">Qty</TH>
                                    <TH className="text-right">Unit</TH>
                                    <TH className="text-right">Total</TH>
                                  </TR>
                                </THead>
                                <TBody>
                                  {items.map((item) => (
                                    <TR key={item.id} className={item.is_optional ? 'text-ink-500' : undefined}>
                                      <TD>
                                        {item.label}
                                        {item.is_optional ? <Badge tone="neutral" className="ml-2">Optional</Badge> : null}
                                      </TD>
                                      <TD>{CHARGE_KIND_LABELS[item.charge_kind as keyof typeof CHARGE_KIND_LABELS] ?? item.charge_kind}</TD>
                                      <TDNum>{Number(item.quantity)}</TDNum>
                                      <TDNum><Money minor={item.unit_price_minor} /></TDNum>
                                      <TDNum><Money minor={item.line_total_minor} /></TDNum>
                                    </TR>
                                  ))}
                                </TBody>
                              </Table>
                            </TableWrap>
                          ) : (
                            <p className="text-sm text-ink-600">This quote has no submitted version yet.</p>
                          )}

                          {current?.notes ? (
                            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                              {current.notes}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* --------------------------------------------- Proposal */}
            {canManageProposals ? (
              <TabsContent value="proposal">
                {proposals.filter((p) => p.status !== 'draft').length > 0 ? (
                  <Card className="mb-6">
                    <CardHeader><CardTitle as="h2">Proposal history</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <TableWrap label="Proposals" className="rounded-none border-0">
                        <Table>
                          <THead>
                            <TR><TH>Reference</TH><TH>Version</TH><TH className="text-right">Total</TH><TH>Sent</TH><TH>Status</TH></TR>
                          </THead>
                          <TBody>
                            {proposals.filter((p) => p.status !== 'draft').map((proposal) => (
                              <TR key={proposal.id}>
                                <TD className="font-mono text-xs">{proposal.reference}</TD>
                                <TD>v{proposal.version_no}</TD>
                                <TDNum><Money minor={proposal.total_minor} /></TDNum>
                                <TD className="text-xs text-ink-500">{proposal.sent_at ? formatDateTime(proposal.sent_at) : '—'}</TD>
                                <TD><StatusBadge status={proposal.status} /></TD>
                              </TR>
                            ))}
                          </TBody>
                        </Table>
                      </TableWrap>
                    </CardContent>
                  </Card>
                ) : null}

                {submittedQuotes.length === 0 ? (
                  <Alert tone="info" title="No submitted quotes yet">
                    Invite partners and collect at least one quotation before building a proposal.
                  </Alert>
                ) : (
                  <ProposalBuilder
                    requestId={request.id}
                    quotes={submittedQuotes}
                    existingProposalId={draftProposal?.id ?? null}
                    defaultTitle={request.title || eventType?.name || 'Your event proposal'}
                    guestCount={request.guest_count}
                  />
                )}
              </TabsContent>
            ) : null}

            {/* --------------------------------------------- Activity */}
            <TabsContent value="activity">
              <Card>
                <CardHeader><CardTitle as="h2">Status history</CardTitle></CardHeader>
                <CardContent className="pt-3">
                  <ol className="space-y-4">
                    {history.map((entry) => {
                      const actor = entry.profiles as unknown as { full_name: string } | null;
                      return (
                        <li key={entry.id} className="flex gap-3">
                          <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-700" />
                          <div>
                            <p className="text-sm text-ink-900">
                              {entry.from_status ? `${statusLabel(entry.from_status)} → ` : ''}
                              <span className="font-medium">{statusLabel(entry.to_status)}</span>
                            </p>
                            <p className="text-xs text-ink-500">
                              {formatDateTime(entry.created_at)}
                              {actor ? ` · ${actor.full_name}` : ''}
                            </p>
                            {entry.note ? <p className="mt-0.5 text-sm text-ink-600">{entry.note}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ----------------------------------------------- Side panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle as="h2">Customer</CardTitle></CardHeader>
            <CardContent className="pt-3 text-sm">
              <p className="font-medium text-ink-950">{request.contact_name || customer?.full_name}</p>
              {organization ? (
                <p className="mt-0.5 text-ink-600">{organization.name}</p>
              ) : (
                <p className="mt-0.5 text-ink-500">Individual customer</p>
              )}
              <dl className="mt-3 space-y-2">
                {request.contact_phone ? (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Phone</dt>
                    <Phone aria-hidden className="size-3.5 text-ink-400" />
                    <dd><a href={`tel:${request.contact_phone}`} className="text-brand-700 hover:underline">{request.contact_phone}</a></dd>
                  </div>
                ) : null}
                {request.contact_email ? (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Email</dt>
                    <Mail aria-hidden className="size-3.5 text-ink-400" />
                    <dd><a href={`mailto:${request.contact_email}`} className="break-all text-brand-700 hover:underline">{request.contact_email}</a></dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs text-ink-500">
                Prefers {request.preferred_channel.replace(/_/g, ' ')} · source {request.source.replace(/_/g, ' ')}
              </p>
            </CardContent>
          </Card>

          <InternalNotes entity="service_request" entityId={request.id} notes={notes.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.created_at,
            authorName: (n.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Staff',
          }))} />
        </div>
      </div>
    </>
  );
}

function Detail({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        <Icon aria-hidden className="size-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm text-ink-900">{children}</dd>
    </div>
  );
}

function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{children}</p>
    </div>
  );
}
