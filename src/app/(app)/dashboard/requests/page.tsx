import { Suspense } from 'react';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState, SkeletonTable } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { listCustomerRequests } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'My requests', description: 'Track your event requirements.',
  path: '/dashboard/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

const STATUS_FILTER = {
  key: 'status',
  label: 'Status',
  options: [
    { value: 'submitted', label: 'Submitted' },
    { value: 'matching', label: 'Finding partners' },
    { value: 'partners_invited', label: 'Partners invited' },
    { value: 'quotes_received', label: 'Quotes received' },
    { value: 'proposal_sent', label: 'Proposal sent' },
    { value: 'won', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/dashboard/requests');
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="My requests"
        description="Every requirement you have submitted and where it has reached."
        actions={
          <Button asChild>
            <Link href="/plan"><Plus aria-hidden /> New request</Link>
          </Button>
        }
      />

      <DataToolbar
        searchPlaceholder="Search by reference or title…"
        filters={[STATUS_FILTER]}
        showDateRange
      />

      <Suspense fallback={<SkeletonTable rows={6} cols={5} />}>
        <RequestsTable params={params} />
      </Suspense>
    </>
  );
}

async function RequestsTable({ params }: { params: Record<string, string | undefined> }) {
  const { rows, total, page, pageCount } = await listCustomerRequests({
    page: Number(params.page) || 1,
    q: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={params.q || params.status ? 'No requests match those filters' : 'No requests yet'}
        description={
          params.q || params.status
            ? 'Try clearing the filters to see everything.'
            : 'Tell us what you are planning and we will arrange verified partners to quote.'
        }
        action={<Button asChild><Link href="/plan">Plan an event</Link></Button>}
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <TableWrap label="Requests" className="rounded-none border-0">
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Event</TH>
              <TH>Event date</TH>
              <TH>Guests</TH>
              <TH className="text-right">Budget</TH>
              <TH>Status</TH>
              <TH>Submitted</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((request) => {
              const eventType = request.event_types as unknown as { name: string } | null;
              const city = request.cities as unknown as { name: string } | null;
              return (
                <TR key={request.id}>
                  <TD>
                    <Link
                      href={`/dashboard/requests/${request.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {request.reference}
                    </Link>
                  </TD>
                  <TD>
                    <span className="block">{request.title || eventType?.name || '—'}</span>
                    {city ? <span className="text-xs text-ink-500">{city.name}</span> : null}
                  </TD>
                  <TD>{formatDateShort(request.event_date)}</TD>
                  <TD>{request.guest_count ?? '—'}</TD>
                  <TDNum>
                    {request.budget_total_minor ? <Money minor={request.budget_total_minor} compact /> : <span className="text-ink-500">Flexible</span>}
                  </TDNum>
                  <TD><StatusBadge status={request.status} /></TD>
                  <TD className="whitespace-nowrap text-xs text-ink-500">{relativeDate(request.created_at)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrap>
      <div className="border-t border-ink-200 px-4">
        <Pagination
          page={page} pageCount={pageCount} total={total}
          basePath="/dashboard/requests" searchParams={params}
        />
      </div>
    </Card>
  );
}
