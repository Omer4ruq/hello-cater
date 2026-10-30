import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { PayoutRunPanel } from '@/features/admin/components/payout-run-panel';
import { PayoutActions } from '@/features/admin/components/payout-actions';
import { requireUserPage, hasPermission } from '@/features/auth/session';
import { getPayoutCandidates, listAdminPayouts } from '@/features/admin/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Payouts', description: 'Partner settlements.', path: '/admin/payouts', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage('/admin/payouts');
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, candidates] = await Promise.all([
    listAdminPayouts({ page: Number(params.page) || 1, status: params.status }),
    getPayoutCandidates(),
  ]);

  const canApprove = hasPermission(user, 'payouts.approve');
  const awaitingTotal = candidates.reduce((sum, c) => sum + c.netMinor, 0);
  const pendingTotal = rows
    .filter((p) => ['pending', 'approved', 'processing'].includes(p.status))
    .reduce((sum, p) => sum + p.net_minor, 0);

  return (
    <>
      <PageHeader
        title="Partner payouts"
        description="Delivered bookings become payouts. Finance approves, records the method, and settles."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Awaiting a payout run" icon={Wallet}
          value={<Money minor={awaitingTotal} compact />}
          hint={`${candidates.length} ${candidates.length === 1 ? 'partner' : 'partners'}`}
        />
        <Stat
          label="In flight" value={<Money minor={pendingTotal} compact />}
          hint="created, not yet settled"
        />
        <Stat label="Payout records" value={total} />
      </div>

      {!canApprove ? (
        <Alert tone="info" className="mt-6" title="Read-only">
          You can view payouts but not approve or settle them. That requires the Finance role.
        </Alert>
      ) : null}

      {canApprove && candidates.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle as="h2">Ready to pay out</CardTitle>
            <p className="text-xs text-ink-500">
              Delivered bookings with no payout yet. Creating a payout locks these bookings so they
              cannot be paid twice.
            </p>
          </CardHeader>
          <CardContent className="pt-3">
            <PayoutRunPanel
              groups={candidates.map((c) => ({
                partnerId: c.partnerId,
                partnerName: c.partnerName,
                grossMinor: c.grossMinor,
                commissionMinor: c.commissionMinor,
                netMinor: c.netMinor,
                bookings: c.bookings.map((b) => ({
                  id: b.id,
                  reference: b.reference,
                  serviceDate: b.service_date,
                  eventTitle: (b.events as unknown as { title: string } | null)?.title ?? b.reference,
                  grossMinor: b.gross_minor,
                  commissionMinor: b.commission_minor,
                  netMinor: b.partner_payable_minor,
                })),
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8">
        <h2 className="mb-3 font-sans text-base font-semibold text-ink-950">Payout history</h2>
        <DataToolbar
          searchPlaceholder="Search payouts…"
          filters={[{
            key: 'status', label: 'Status',
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'processing', label: 'Processing' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
          }]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            description="Once partners deliver events, create a payout run above and settle it here."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <TableWrap label="Payouts" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Reference</TH><TH>Partner</TH><TH>Period</TH>
                    <TH className="text-right">Gross</TH>
                    <TH className="text-right">Commission</TH>
                    <TH className="text-right">Net</TH>
                    <TH>Status</TH><TH>Action</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((payout) => {
                    const partner = payout.partner_profiles as unknown as { id: string; display_name: string } | null;
                    return (
                      <TR key={payout.id}>
                        <TD className="font-mono text-xs">{payout.reference}</TD>
                        <TD>{partner?.display_name ?? '—'}</TD>
                        <TD className="whitespace-nowrap text-xs">
                          {payout.period_start
                            ? `${formatDateShort(payout.period_start)} – ${formatDateShort(payout.period_end)}`
                            : '—'}
                        </TD>
                        <TDNum><Money minor={payout.gross_minor} /></TDNum>
                        <TDNum className="text-ink-600">−<Money minor={payout.commission_minor} /></TDNum>
                        <TDNum className="font-semibold"><Money minor={payout.net_minor} /></TDNum>
                        <TD><StatusBadge status={payout.status} /></TD>
                        <TD>
                          {canApprove ? (
                            <PayoutActions
                              payoutId={payout.id}
                              reference={payout.reference}
                              status={payout.status}
                              netMinor={payout.net_minor}
                            />
                          ) : null}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
            <div className="border-t border-ink-200 px-4">
              <Pagination page={page} pageCount={pageCount} total={total} basePath="/admin/payouts" searchParams={params} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
