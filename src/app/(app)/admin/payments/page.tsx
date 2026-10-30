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
import { ManualPaymentDialog } from '@/features/admin/components/manual-payment-dialog';
import { requireUserPage, hasPermission } from '@/features/auth/session';
import { listAdminPayments } from '@/features/admin/queries';
import { isPaymentConfigured, integrations } from '@/lib/env.server';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Payments', description: 'Customer payments.', path: '/admin/payments', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage('/admin/payments');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listAdminPayments({
    page: Number(params.page) || 1, q: params.q, status: params.status,
  });

  const canManage = hasPermission(user, 'payments.manage');

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every customer payment, its gateway state and what it was applied to."
      />

      {!isPaymentConfigured ? (
        <Alert tone="warning" className="mb-6" title="Gateway not configured — manual settlement mode">
          <p>
            No payment gateway credentials are set, so checkout falls back to offline settlement.
            Customers receive bank-transfer instructions and finance records receipt here. Set{' '}
            <code>SSLCOMMERZ_STORE_ID</code> and <code>SSLCOMMERZ_STORE_PASSWORD</code> to enable
            online payment.
          </p>
        </Alert>
      ) : (
        <Alert tone="info" className="mb-6" title={`Gateway: ${integrations.payments.provider}`}>
          Running in {integrations.payments.sandbox ? 'sandbox' : 'live'} mode. Every payment is
          confirmed by a server-side validation call before it is marked paid.
        </Alert>
      )}

      <DataToolbar
        searchPlaceholder="Search by payment reference…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'initiated', label: 'Initiated' },
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
            { value: 'failed', label: 'Failed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'refunded', label: 'Refunded' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Customer payments appear here as soon as checkout starts, with their full gateway history."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Payments" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH><TH>Customer</TH><TH>Event</TH><TH>Purpose</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Fee</TH>
                  <TH>Method</TH><TH>Status</TH><TH>Paid at</TH>
                  {canManage ? <TH>Action</TH> : null}
                </TR>
              </THead>
              <TBody>
                {rows.map((payment) => {
                  const event = payment.events as unknown as { id: string; title: string; reference: string } | null;
                  const customer = payment.profiles as unknown as { full_name: string; email: string | null } | null;
                  return (
                    <TR key={payment.id}>
                      <TD className="font-mono text-xs">{payment.reference}</TD>
                      <TD>
                        <span className="block">{customer?.full_name ?? '—'}</span>
                        <span className="text-xs text-ink-500">{customer?.email}</span>
                      </TD>
                      <TD>
                        {event ? (
                          <Link href={`/admin/events/${event.id}`} className="text-brand-700 hover:underline">
                            {event.title}
                          </Link>
                        ) : '—'}
                      </TD>
                      <TD className="capitalize">{payment.purpose}</TD>
                      <TDNum><Money minor={payment.amount_minor} /></TDNum>
                      <TDNum className="text-ink-500">
                        {payment.gateway_fee_minor > 0 ? <Money minor={payment.gateway_fee_minor} /> : '—'}
                      </TDNum>
                      <TD>{payment.method ?? payment.provider}</TD>
                      <TD><StatusBadge status={payment.status} /></TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">
                        {payment.paid_at ? formatDateTime(payment.paid_at) : '—'}
                      </TD>
                      {canManage ? (
                        <TD>
                          {['initiated', 'pending', 'failed'].includes(payment.status) ? (
                            <ManualPaymentDialog
                              reference={payment.reference}
                              amountMinor={payment.amount_minor}
                            />
                          ) : null}
                        </TD>
                      ) : null}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/admin/payments" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
