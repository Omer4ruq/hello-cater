import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { listCustomerPayments } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Payments', description: 'Your payment history.',
  path: '/dashboard/payments', noIndex: true,
});

export const dynamic = 'force-dynamic';

const BANNERS: Record<string, { tone: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string }> = {
  success: { tone: 'success', title: 'Payment received', body: 'Thank you. Your receipt is below and a copy is on its way by email.' },
  pending: { tone: 'info', title: 'Payment is being confirmed', body: 'Your bank is still confirming this payment. It usually clears within a few minutes.' },
  failed: { tone: 'danger', title: 'Payment did not go through', body: 'No amount has been taken. You can try again from your event page.' },
  cancelled: { tone: 'warning', title: 'Payment cancelled', body: 'You cancelled at the payment page. Nothing has been charged.' },
};

export default async function CustomerPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/dashboard/payments');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listCustomerPayments({
    page: Number(params.page) || 1, status: params.status,
  });

  const banner = params.status && BANNERS[params.status] ? BANNERS[params.status] : null;

  return (
    <>
      <PageHeader title="Payments" description="Every payment you have made, with its receipt." />

      {banner ? (
        <Alert tone={banner.tone} className="mb-6" title={banner.title}>{banner.body}</Alert>
      ) : null}

      <DataToolbar
        searchPlaceholder="Search payments…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'failed', label: 'Failed' },
            { value: 'refunded', label: 'Refunded' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Once you accept a proposal, your deposit and balance payments appear here with receipts."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Payments" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH><TH>Event</TH><TH>Purpose</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Method</TH><TH>Status</TH><TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((payment) => {
                  const event = payment.events as unknown as { title: string; reference: string } | null;
                  return (
                    <TR key={payment.id}>
                      <TD className="font-mono text-xs">{payment.reference}</TD>
                      <TD>{event?.title ?? '—'}</TD>
                      <TD className="capitalize">{payment.purpose}</TD>
                      <TDNum>
                        <Money minor={payment.amount_minor} />
                        {payment.refunded_minor > 0 ? (
                          <span className="block text-xs text-clay-700">
                            <Money minor={payment.refunded_minor} /> refunded
                          </span>
                        ) : null}
                      </TDNum>
                      <TD>{payment.method ?? '—'}</TD>
                      <TD><StatusBadge status={payment.status} /></TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">
                        {payment.paid_at ? formatDateTime(payment.paid_at) : formatDateTime(payment.created_at)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/dashboard/payments" searchParams={params} />
          </div>
        </Card>
      )}

      <p className="mt-6 text-sm text-ink-600">
        Need an invoice? They are in{' '}
        <Link href="/dashboard/invoices" className="font-medium text-brand-700 underline underline-offset-4">Invoices</Link>.
      </p>
    </>
  );
}
