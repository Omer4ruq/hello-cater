import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { listAdminRequests } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate, countdown } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Requests', description: 'Request queue.', path: '/admin/requests', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/requests');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listAdminRequests({
    page: Number(params.page) || 1, q: params.q, status: params.status,
    from: params.from, to: params.to, assigned: params.assigned,
  });

  return (
    <>
      <PageHeader
        title="Request queue"
        description="Every incoming requirement. Triage, shortlist partners, collect quotes and build the proposal."
      />

      <DataToolbar
        searchPlaceholder="Search reference, title or customer…"
        showDateRange
        filters={[
          {
            key: 'status', label: 'Status',
            options: [
              { value: 'submitted', label: 'New' },
              { value: 'under_review', label: 'Under review' },
              { value: 'matching', label: 'Matching' },
              { value: 'partners_invited', label: 'Partners invited' },
              { value: 'quotes_received', label: 'Quotes received' },
              { value: 'proposal_sent', label: 'Proposal sent' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          },
          {
            key: 'assigned', label: 'Owner',
            options: [{ value: 'unassigned', label: 'Unassigned only' }],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing in the queue"
          description="New requirements land here the moment a customer submits the wizard."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Requests" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH>
                  <TH>Customer</TH>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Guests</TH>
                  <TH className="text-right">Budget</TH>
                  <TH>Status</TH>
                  <TH>Age</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((request) => {
                  const eventType = request.event_types as unknown as { name: string } | null;
                  const city = request.cities as unknown as { name: string } | null;
                  const org = request.organizations as unknown as { name: string } | null;
                  return (
                    <TR key={request.id}>
                      <TD>
                        <Link href={`/admin/requests/${request.id}`} className="font-medium text-brand-700 hover:underline">
                          {request.reference}
                        </Link>
                        {!request.assigned_to ? <Badge tone="warning" className="ml-2">Unassigned</Badge> : null}
                      </TD>
                      <TD>
                        <span className="block">{request.contact_name ?? '—'}</span>
                        {org ? <span className="text-xs text-ink-500">{org.name}</span> : null}
                      </TD>
                      <TD>
                        <span className="block">{request.title || eventType?.name || '—'}</span>
                        {city ? <span className="text-xs text-ink-500">{city.name}</span> : null}
                      </TD>
                      <TD>
                        <span className="block whitespace-nowrap">{formatDateShort(request.event_date)}</span>
                        <span className="text-xs text-ink-500">{request.event_date ? countdown(request.event_date) : ''}</span>
                      </TD>
                      <TD>{request.guest_count ?? '—'}</TD>
                      <TDNum>
                        {request.budget_total_minor ? <Money minor={request.budget_total_minor} compact />
                          : request.budget_per_person_minor ? <><Money minor={request.budget_per_person_minor} compact />/p</>
                          : <span className="text-ink-500">Flexible</span>}
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
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/admin/requests" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
