import Link from 'next/link';
import { Receipt } from 'lucide-react';
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
import { listCustomerInvoices } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Invoices', description: 'Your invoices.', path: '/dashboard/invoices', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function CustomerInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/dashboard/invoices');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listCustomerInvoices({
    page: Number(params.page) || 1, q: params.q, status: params.status,
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="One invoice per event, however many vendors were involved. Print or save any of them as PDF."
      />

      <DataToolbar
        searchPlaceholder="Search invoice number…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'issued', label: 'Issued' },
            { value: 'partially_paid', label: 'Part paid' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="An invoice is issued when your event is confirmed."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Invoices" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Number</TH><TH>Event</TH><TH>Issued</TH><TH>Due</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Balance</TH>
                  <TH>Status</TH><TH></TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((invoice) => {
                  const event = invoice.events as unknown as { title: string; reference: string } | null;
                  return (
                    <TR key={invoice.id}>
                      <TD className="font-mono text-xs">{invoice.number}</TD>
                      <TD>{event?.title ?? '—'}</TD>
                      <TD className="whitespace-nowrap text-xs">{formatDateShort(invoice.issue_date)}</TD>
                      <TD className="whitespace-nowrap text-xs">{formatDateShort(invoice.due_date)}</TD>
                      <TDNum><Money minor={invoice.total_minor} /></TDNum>
                      <TDNum className={invoice.total_minor - invoice.paid_minor > 0 ? 'text-warning-700' : 'text-success-700'}>
                        <Money minor={invoice.total_minor - invoice.paid_minor} />
                      </TDNum>
                      <TD><StatusBadge status={invoice.status} /></TD>
                      <TD>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/invoices/${invoice.id}`}>View</Link>
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/dashboard/invoices" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
