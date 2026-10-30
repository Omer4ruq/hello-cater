import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { paginationRange } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Invoices', description: 'Customer invoices and partner statements.',
  path: '/admin/invoices', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/invoices');
  const params = await searchParams;
  const { start, end, page, pageSize } = paginationRange({ page: Number(params.page) || 1 });

  const supabase = await createServerSupabase();
  let query = supabase
    .from('invoices')
    .select('id, number, kind, status, bill_to_name, total_minor, paid_minor, issue_date, due_date, event_id, events(title)', { count: 'exact' })
    .order('issue_date', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.kind) query = query.eq('kind', params.kind as never);
  if (params.q) query = query.ilike('number', `%${params.q}%`);

  const { data, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Customer invoices and partner settlement statements."
      />

      <DataToolbar
        searchPlaceholder="Search invoice number…"
        filters={[
          {
            key: 'kind', label: 'Type',
            options: [
              { value: 'customer_invoice', label: 'Customer invoice' },
              { value: 'partner_statement', label: 'Partner statement' },
              { value: 'credit_note', label: 'Credit note' },
            ],
          },
          {
            key: 'status', label: 'Status',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'issued', label: 'Issued' },
              { value: 'partially_paid', label: 'Part paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'void', label: 'Void' },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Customer invoices are issued when an event is confirmed. Partner statements accompany each payout."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Invoices" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH><TH>Type</TH><TH>Billed to</TH><TH>Event</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Paid</TH>
                  <TH>Issued</TH><TH>Due</TH><TH>Status</TH><TH></TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((invoice) => (
                  <TR key={invoice.id}>
                    <TD className="font-mono text-xs">{invoice.number}</TD>
                    <TD className="capitalize">{invoice.kind.replace(/_/g, ' ')}</TD>
                    <TD>{invoice.bill_to_name}</TD>
                    <TD>{(invoice.events as unknown as { title: string } | null)?.title ?? '—'}</TD>
                    <TDNum><Money minor={invoice.total_minor} /></TDNum>
                    <TDNum><Money minor={invoice.paid_minor} /></TDNum>
                    <TD className="whitespace-nowrap text-xs">{formatDateShort(invoice.issue_date)}</TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateShort(invoice.due_date)}</TD>
                    <TD><StatusBadge status={invoice.status} /></TD>
                    <TD>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination
              page={page} pageCount={Math.ceil(total / pageSize)} total={total}
              basePath="/admin/invoices" searchParams={params}
            />
          </div>
        </Card>
      )}
    </>
  );
}
