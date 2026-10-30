import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { Alert } from '@/components/ui/feedback';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { requireUserPage } from '@/features/auth/session';
import { activePartner } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, formatDateTime } from '@/lib/dates';
import { CHARGE_KIND_LABELS, UNIT_LABELS } from '@/features/quotes/schema';

export const metadata = buildMetadata({
  title: 'Quote', description: 'Quote detail and version history.',
  path: '/partner/quotes', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/partner/quotes/${id}`);
  const partner = activePartner(user);
  const supabase = await createServerSupabase();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, reference, status, current_version, request_id, partner_id, created_at, service_categories(name), service_requests(reference, title, event_date, guest_count, event_types(name), cities(name))')
    .eq('id', id)
    .eq('partner_id', partner.partnerId)
    .maybeSingle();

  if (!quote) notFound();

  const [{ data: versions }, { data: changeRequests }, { data: invite }] = await Promise.all([
    supabase
      .from('quote_versions')
      .select('id, version_no, status, subtotal_minor, discount_minor, tax_minor, total_minor, per_person_minor, guest_count, notes, payment_terms, cancellation_policy, valid_until, change_summary, submitted_at, created_at, quote_items(id, charge_kind, label, description, unit, quantity, unit_price_minor, line_total_minor, is_optional, sort_order)')
      .eq('quote_id', id)
      .order('version_no', { ascending: false }),
    supabase
      .from('quote_change_requests')
      .select('id, message, created_at, resolved_at')
      .eq('quote_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('request_partner_invites')
      .select('id')
      .eq('request_id', quote.request_id)
      .eq('partner_id', partner.partnerId)
      .maybeSingle(),
  ]);

  const request = quote.service_requests as unknown as {
    reference: string; title: string; event_date: string | null;
    guest_count: number | null; event_types: { name: string } | null; cities: { name: string } | null;
  } | null;

  const current = versions?.[0];
  const canRevise = !['accepted', 'withdrawn'].includes(quote.status);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Partner', href: '/partner' },
          { label: 'Quotes', href: '/partner/quotes' },
          { label: quote.reference },
        ]}
        title={quote.reference}
        description={[
          request?.title || request?.event_types?.name,
          request?.event_date ? formatDateShort(request.event_date) : null,
          request?.guest_count ? `${request.guest_count} guests` : null,
        ].filter(Boolean).join(' · ')}
        actions={
          <>
            <StatusBadge status={quote.status} />
            {canRevise && invite ? (
              <Button asChild>
                <Link href={`/partner/requests/${invite.id}`}>
                  {quote.status === 'changes_requested' ? 'Revise quote' : 'Create revision'}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {quote.status === 'changes_requested' && changeRequests?.length ? (
        <Alert tone="warning" className="mb-6" title="Changes requested">
          {changeRequests[0].message}
        </Alert>
      ) : null}
      {quote.status === 'accepted' ? (
        <Alert tone="success" className="mb-6" title="This quote was accepted">
          The booking is in <Link href="/partner/bookings" className="font-medium underline underline-offset-4">Bookings</Link>.
        </Alert>
      ) : null}

      <div className="space-y-6">
        {(versions ?? []).map((version) => {
          const items = (version.quote_items as unknown as {
            id: string; charge_kind: string; label: string; description: string | null;
            unit: string; quantity: number; unit_price_minor: number;
            line_total_minor: number; is_optional: boolean; sort_order: number;
          }[]).sort((a, b) => a.sort_order - b.sort_order);

          return (
            <Card key={version.id} className={version.id === current?.id ? 'border-clay-300' : undefined}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle as="h2">
                    Version {version.version_no}
                    {version.id === current?.id ? (
                      <Badge tone="clay" className="ml-2">Current</Badge>
                    ) : null}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {version.submitted_at ? `Submitted ${formatDateTime(version.submitted_at)}` : `Draft created ${formatDateTime(version.created_at)}`}
                    {version.valid_until ? ` · valid until ${formatDateShort(version.valid_until)}` : ''}
                  </p>
                </div>
                <StatusBadge status={version.status} />
              </CardHeader>

              <CardContent className="pt-3">
                {version.change_summary ? (
                  <p className="mb-4 rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                    <span className="font-medium">What changed:</span> {version.change_summary}
                  </p>
                ) : null}

                <TableWrap label={`Version ${version.version_no} line items`}>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Item</TH>
                        <TH>Category</TH>
                        <TH>Unit</TH>
                        <TH className="text-right">Qty</TH>
                        <TH className="text-right">Unit price</TH>
                        <TH className="text-right">Total</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {items.map((item) => (
                        <TR key={item.id} className={item.is_optional ? 'text-ink-500' : undefined}>
                          <TD>
                            {item.label}
                            {item.is_optional ? <Badge tone="neutral" className="ml-2">Optional</Badge> : null}
                            {item.description ? <span className="block text-xs text-ink-500">{item.description}</span> : null}
                          </TD>
                          <TD>{CHARGE_KIND_LABELS[item.charge_kind as keyof typeof CHARGE_KIND_LABELS] ?? item.charge_kind}</TD>
                          <TD>{UNIT_LABELS[item.unit as keyof typeof UNIT_LABELS] ?? item.unit}</TD>
                          <TDNum>{Number(item.quantity)}</TDNum>
                          <TDNum><Money minor={item.unit_price_minor} /></TDNum>
                          <TDNum><Money minor={item.line_total_minor} /></TDNum>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>

                <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-600">Subtotal</dt>
                    <dd><Money minor={version.subtotal_minor} /></dd>
                  </div>
                  {version.discount_minor > 0 ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-600">Discount</dt>
                      <dd className="text-success-700">−<Money minor={version.discount_minor} /></dd>
                    </div>
                  ) : null}
                  {version.tax_minor > 0 ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-600">Tax / other</dt>
                      <dd><Money minor={version.tax_minor} /></dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4 border-t border-ink-200 pt-1.5 font-semibold">
                    <dt>Total</dt>
                    <dd><Money minor={version.total_minor} /></dd>
                  </div>
                  {version.per_person_minor ? (
                    <p className="text-right text-xs text-ink-500">
                      <Money minor={version.per_person_minor} /> per person
                    </p>
                  ) : null}
                </dl>

                {version.notes ? (
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{version.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
