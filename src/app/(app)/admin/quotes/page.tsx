import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { paginationRange } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Quotes', description: 'Partner quotations.', path: '/admin/quotes', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/quotes');
  const params = await searchParams;
  const { start, end, page, pageSize } = paginationRange({ page: Number(params.page) || 1 });

  const supabase = await createServerSupabase();
  let query = supabase
    .from('quotes')
    .select(
      'id, reference, status, current_version, updated_at, request_id, partner_profiles(display_name), service_categories(name), service_requests(reference, title, event_date, event_types(name))',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.ilike('reference', `%${params.q}%`);

  const { data, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Every partner quotation across all requests. Open the request workspace to compare and build a proposal."
      />

      <DataToolbar
        searchPlaceholder="Search quote reference…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'shared', label: 'Shared' },
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
          description="Quotes appear here once invited partners start responding."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Quotes" className="rounded-none border-0">
            <Table>
              <THead>
                <TR><TH>Quote</TH><TH>Partner</TH><TH>Request</TH><TH>Line</TH><TH>Version</TH><TH>Status</TH><TH>Updated</TH></TR>
              </THead>
              <TBody>
                {rows.map((quote) => {
                  const partner = quote.partner_profiles as unknown as { display_name: string } | null;
                  const category = quote.service_categories as unknown as { name: string } | null;
                  const request = quote.service_requests as unknown as {
                    reference: string; title: string; event_types: { name: string } | null;
                  } | null;
                  return (
                    <TR key={quote.id}>
                      <TD className="font-mono text-xs">{quote.reference}</TD>
                      <TD>{partner?.display_name ?? '—'}</TD>
                      <TD>
                        <Link href={`/admin/requests/${quote.request_id}`} className="text-brand-700 hover:underline">
                          {request?.reference ?? 'Request'}
                        </Link>
                        <span className="block text-xs text-ink-500">
                          {request?.title || request?.event_types?.name}
                        </span>
                      </TD>
                      <TD>{category?.name ?? '—'}</TD>
                      <TD>v{quote.current_version}</TD>
                      <TD><StatusBadge status={quote.status} /></TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">{relativeDate(quote.updated_at)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination
              page={page} pageCount={Math.ceil(total / pageSize)} total={total}
              basePath="/admin/quotes" searchParams={params}
            />
          </div>
        </Card>
      )}
    </>
  );
}
