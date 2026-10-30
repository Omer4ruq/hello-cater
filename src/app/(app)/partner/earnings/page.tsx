import { TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Money } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerEarnings } from '@/features/partner/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Earnings', description: 'What you have earned and what is owed to you.',
  path: '/partner/earnings', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerEarningsPage() {
  const user = await requireUserPage('/partner/earnings');
  const partner = activePartner(user);
  const { summary, awaitingPayout } = await getPartnerEarnings(partner.partnerId);

  const awaitingTotal = awaitingPayout.reduce((sum, b) => sum + b.partner_payable_minor, 0);

  return (
    <>
      <PageHeader
        title="Earnings"
        description="Your share of every delivered booking, after the agreed commission."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lifetime earned" icon={TrendingUp} value={<Money minor={summary?.lifetime_earned_minor ?? 0} compact />} hint="delivered events" />
        <Stat label="Awaiting payout" icon={Wallet} value={<Money minor={awaitingTotal} compact />} hint={`${awaitingPayout.length} bookings`} />
        <Stat label="Events delivered" value={summary?.completed_count ?? 0} />
        <Stat label="Upcoming" value={summary?.upcoming_count ?? 0} hint="confirmed, not yet delivered" />
      </div>

      <Alert tone="info" className="mt-6" title="How settlement works">
        The platform collects from the customer. Once an event is delivered and confirmed, finance
        approves your payout and settles it to your registered bank or MFS account with a statement.
      </Alert>

      <Card className="mt-6">
        <CardHeader><CardTitle as="h2">Delivered and awaiting payout</CardTitle></CardHeader>
        <CardContent className="p-0">
          {awaitingPayout.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Wallet}
                title="Nothing awaiting payout"
                description="Delivered bookings that have not yet been settled will be listed here with their exact amounts."
              />
            </div>
          ) : (
            <TableWrap label="Bookings awaiting payout" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Booking</TH>
                    <TH>Event</TH>
                    <TH>Service date</TH>
                    <TH className="text-right">Gross</TH>
                    <TH className="text-right">Commission</TH>
                    <TH className="text-right">You receive</TH>
                  </TR>
                </THead>
                <TBody>
                  {awaitingPayout.map((booking) => (
                    <TR key={booking.id}>
                      <TD className="font-mono text-xs">{booking.reference}</TD>
                      <TD>{(booking.events as unknown as { title: string } | null)?.title ?? '—'}</TD>
                      <TD>{formatDateShort(booking.service_date)}</TD>
                      <TDNum><Money minor={booking.gross_minor} /></TDNum>
                      <TDNum className="text-ink-600">−<Money minor={booking.commission_minor} /></TDNum>
                      <TDNum className="font-semibold text-success-700"><Money minor={booking.partner_payable_minor} /></TDNum>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>
    </>
  );
}
