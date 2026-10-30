import { LifeBuoy } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { relativeDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Support & disputes', description: 'Support queue.', path: '/admin/disputes', noIndex: true,
});

export const dynamic = 'force-dynamic';

const PRIORITY_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'danger'> = {
  low: 'neutral', normal: 'info', high: 'warning', urgent: 'danger',
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/disputes');
  const params = await searchParams;
  const supabase = await createServerSupabase();

  let ticketQuery = supabase
    .from('support_tickets')
    .select('id, reference, subject, category, status, priority, created_at, first_response_at, opened_by, profiles(full_name, email), partner_profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.status) ticketQuery = ticketQuery.eq('status', params.status as never);
  if (params.q) ticketQuery = ticketQuery.ilike('subject', `%${params.q}%`);

  const [{ data: tickets }, { data: disputes }] = await Promise.all([
    ticketQuery,
    supabase
      .from('disputes')
      .select('id, reason, status, claim_minor, settlement_minor, resolution_kind, created_at, bookings(reference, partner_profiles(display_name))')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const ticketRows = tickets ?? [];
  const disputeRows = disputes ?? [];

  return (
    <>
      <PageHeader
        title="Support & disputes"
        description="Customer and partner issues, and the money decisions that resolve them."
      />

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets ({ticketRows.length})</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({disputeRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <DataToolbar
            searchPlaceholder="Search subject…"
            filters={[{
              key: 'status', label: 'Status',
              options: [
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'waiting', label: 'Waiting' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ],
            }]}
          />

          {ticketRows.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No tickets" description="Support requests from customers and partners land here." />
          ) : (
            <Card className="overflow-hidden p-0">
              <TableWrap label="Support tickets" className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR><TH>Reference</TH><TH>Subject</TH><TH>From</TH><TH>Category</TH><TH>Priority</TH><TH>Status</TH><TH>Age</TH></TR>
                  </THead>
                  <TBody>
                    {ticketRows.map((ticket) => {
                      const opener = ticket.profiles as unknown as { full_name: string; email: string | null } | null;
                      const partner = ticket.partner_profiles as unknown as { display_name: string } | null;
                      return (
                        <TR key={ticket.id}>
                          <TD className="font-mono text-xs">{ticket.reference}</TD>
                          <TD className="max-w-sm">{ticket.subject}</TD>
                          <TD>
                            <span className="block text-sm">{partner?.display_name ?? opener?.full_name ?? '—'}</span>
                            <span className="text-xs text-ink-500">{opener?.email}</span>
                          </TD>
                          <TD className="capitalize">{ticket.category.replace(/_/g, ' ')}</TD>
                          <TD><Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge></TD>
                          <TD><StatusBadge status={ticket.status} /></TD>
                          <TD className="whitespace-nowrap text-xs text-ink-500">{relativeDate(ticket.created_at)}</TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="disputes">
          {disputeRows.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No disputes" description="Disputes raised against a booking appear here with their claim and settlement." />
          ) : (
            <Card className="overflow-hidden p-0">
              <TableWrap label="Disputes" className="rounded-none border-0">
                <Table>
                  <THead>
                    <TR><TH>Booking</TH><TH>Partner</TH><TH>Reason</TH><TH className="text-right">Claim</TH><TH className="text-right">Settled</TH><TH>Outcome</TH><TH>Status</TH></TR>
                  </THead>
                  <TBody>
                    {disputeRows.map((dispute) => {
                      const booking = dispute.bookings as unknown as {
                        reference: string; partner_profiles: { display_name: string } | null;
                      } | null;
                      return (
                        <TR key={dispute.id}>
                          <TD className="font-mono text-xs">{booking?.reference ?? '—'}</TD>
                          <TD>{booking?.partner_profiles?.display_name ?? '—'}</TD>
                          <TD className="max-w-sm">{dispute.reason}</TD>
                          <TDNum>{dispute.claim_minor ? <Money minor={dispute.claim_minor} /> : '—'}</TDNum>
                          <TDNum>{dispute.settlement_minor ? <Money minor={dispute.settlement_minor} /> : '—'}</TDNum>
                          <TD className="capitalize">{dispute.resolution_kind?.replace(/_/g, ' ') ?? '—'}</TD>
                          <TD><StatusBadge status={dispute.status} /></TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
