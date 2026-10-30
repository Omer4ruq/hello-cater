import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerEarnings } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Payouts', description: 'Your settlement history.', path: '/partner/payouts', noIndex: true,
});

export const dynamic = 'force-dynamic';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transfer', bkash: 'bKash', nagad: 'Nagad',
  rocket: 'Rocket', cash: 'Cash', adjustment: 'Adjustment',
};

export default async function PartnerPayoutsPage() {
  const user = await requireUserPage('/partner/payouts');
  const partner = activePartner(user);
  const { payouts } = await getPartnerEarnings(partner.partnerId);

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Every settlement we have made to you, with its full breakdown."
      />

      {payouts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payouts yet"
          description="Once you have delivered events, finance approves a payout and it appears here with a downloadable statement."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Payouts" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH>
                  <TH>Period</TH>
                  <TH className="text-right">Gross</TH>
                  <TH className="text-right">Commission</TH>
                  <TH className="text-right">Adjustment</TH>
                  <TH className="text-right">Net paid</TH>
                  <TH>Method</TH>
                  <TH>Status</TH>
                  <TH>Paid</TH>
                </TR>
              </THead>
              <TBody>
                {payouts.map((payout) => (
                  <TR key={payout.id}>
                    <TD className="font-mono text-xs">{payout.reference}</TD>
                    <TD className="whitespace-nowrap text-xs">
                      {payout.period_start ? `${formatDateShort(payout.period_start)} – ${formatDateShort(payout.period_end)}` : '—'}
                    </TD>
                    <TDNum><Money minor={payout.gross_minor} /></TDNum>
                    <TDNum className="text-ink-600">−<Money minor={payout.commission_minor} /></TDNum>
                    <TDNum className={payout.adjustment_minor < 0 ? 'text-danger-700' : 'text-ink-600'}>
                      {payout.adjustment_minor === 0 ? '—' : <Money minor={payout.adjustment_minor} />}
                    </TDNum>
                    <TDNum className="font-semibold"><Money minor={payout.net_minor} /></TDNum>
                    <TD>{payout.method ? METHOD_LABELS[payout.method] ?? payout.method : '—'}</TD>
                    <TD><StatusBadge status={payout.status} /></TD>
                    <TD className="whitespace-nowrap text-xs text-ink-500">
                      {payout.paid_at ? formatDateShort(payout.paid_at) : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
