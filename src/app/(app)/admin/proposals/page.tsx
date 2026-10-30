import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { paginationRange } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Proposals', description: 'Master proposals.', path: '/admin/proposals', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/proposals');
  const params = await searchParams;
  const { start, end, page, pageSize } = paginationRange({ page: Number(params.page) || 1 });

  const supabase = await createServerSupabase();
  let query = supabase
    .from('proposals')
    .select(
      'id, reference, status, version_no, total_minor, platform_revenue_minor, valid_until, sent_at, created_at, request_id, service_requests(reference, title, contact_name, event_types(name))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.ilike('reference', `%${params.q}%`);

  const { data, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Proposals"
        description="Master proposals across every request, including drafts not yet sent."
      />

      <DataToolbar
        searchPlaceholder="Search proposal reference…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'viewed', label: 'Viewed' },
            { value: 'changes_requested', label: 'Changes requested' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Declined' },
            { value: 'expired', label: 'Expired' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No proposals yet"
          description="Build one from the request workspace once partner quotes are in."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Proposals" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH><TH>Customer</TH><TH>Event</TH><TH>Version</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Our revenue</TH>
                  <TH>Valid until</TH><TH>Status</TH><TH>Sent</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((proposal) => {
                  const request = proposal.service_requests as unknown as {
                    reference: string; title: string; contact_name: string | null;
                    event_types: { name: string } | null;
                  } | null;
                  return (
                    <TR key={proposal.id}>
                      <TD>
                        <Link href={`/admin/requests/${proposal.request_id}`} className="font-mono text-xs text-brand-700 hover:underline">
                          {proposal.reference}
                        </Link>
                      </TD>
                      <TD>{request?.contact_name ?? '—'}</TD>
                      <TD>{request?.title || request?.event_types?.name || '—'}</TD>
                      <TD>v{proposal.version_no}</TD>
                      <TDNum><Money minor={proposal.total_minor} /></TDNum>
                      <TDNum className="text-success-700"><Money minor={proposal.platform_revenue_minor} /></TDNum>
                      <TD>{formatDateShort(proposal.valid_until)}</TD>
                      <TD><StatusBadge status={proposal.status} /></TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">
                        {proposal.sent_at ? relativeDate(proposal.sent_at) : '—'}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination
              page={page} pageCount={Math.ceil(total / pageSize)} total={total}
              basePath="/admin/proposals" searchParams={params}
            />
          </div>
        </Card>
      )}
    </>
  );
}
