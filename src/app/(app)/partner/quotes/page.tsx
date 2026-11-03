import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, listPartnerQuotes } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Quotes', description: 'Your quotations.', path: '/partner/quotes', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerQuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage('/partner/quotes');
  const partner = activePartner(user);
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listPartnerQuotes(partner.partnerId, {
    page: Number(params.page) || 1, q: params.q, status: params.status,
  });

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Every quotation you have prepared, with its full version history."
      />

      <DataToolbar
        searchPlaceholder="Search by quote reference…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'shared', label: 'Shared with customer' },
            { value: 'changes_requested', label: 'Changes requested' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Not selected' },
            { value: 'withdrawn', label: 'Withdrawn' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No quotes yet"
          description="Accept a quotation request and build your first quote — line by line, with your own menus and charges."
          action={<Button asChild><Link href="/partner/requests">View requests</Link></Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Quotes" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Quote</TH>
                  <TH>Event</TH>
                  <TH>Event date</TH>
                  <TH>Version</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Valid until</TH>
                  <TH>Status</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((quote) => {
                  const request = quote.service_requests as unknown as {
                    reference: string; title: string; event_date: string | null;
                    guest_count: number | null; event_types: { name: string } | null;
                  } | null;
                  const category = quote.service_categories as unknown as { name: string } | null;
                  return (
                    <TR key={quote.id}>
                      <TD>
                        <Link href={`/partner/quotes/${quote.id}`} className="font-semibold text-ink-900 underline-offset-4 hover:underline">
                          {quote.reference}
                        </Link>
                        {category ? <span className="block text-xs text-ink-500">{category.name}</span> : null}
                      </TD>
                      <TD>
                        {request?.title || request?.event_types?.name || '—'}
                        {request?.guest_count ? <span className="block text-xs text-ink-500">{request.guest_count} guests</span> : null}
                      </TD>
                      <TD>{formatDateShort(request?.event_date)}</TD>
                      <TD>v{quote.current_version}</TD>
                      <TDNum>{quote.latest ? <Money minor={quote.latest.total_minor} /> : '—'}</TDNum>
                      <TD>{quote.latest?.valid_until ? formatDateShort(quote.latest.valid_until) : '—'}</TD>
                      <TD><StatusBadge status={quote.status} /></TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">{relativeDate(quote.updated_at)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/partner/quotes" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
