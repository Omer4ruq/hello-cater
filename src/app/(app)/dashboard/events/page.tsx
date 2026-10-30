import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
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
import { listCustomerEvents } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, countdown } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'My events', description: 'Your confirmed events.', path: '/dashboard/events', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/dashboard/events');
  const params = await searchParams;
  const { rows, total, page, pageCount } = await listCustomerEvents({
    page: Number(params.page) || 1, q: params.q, status: params.status,
  });

  return (
    <>
      <PageHeader title="My events" description="Confirmed events, their vendors and their payment status." />

      <DataToolbar
        searchPlaceholder="Search events…"
        filters={[{
          key: 'status', label: 'Stage',
          options: [
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'planning', label: 'Planning' },
            { value: 'vendor_preparation', label: 'Vendor prep' },
            { value: 'pre_event', label: 'Pre-event' },
            { value: 'event_day', label: 'Event day' },
            { value: 'completed', label: 'Completed' },
            { value: 'closed', label: 'Closed' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No events yet"
          description="Once you accept a proposal, your event workspace appears here with its schedule, vendors, documents and payments."
          action={<Button asChild><Link href="/dashboard/proposals">View proposals</Link></Button>}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Events" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Guests</TH>
                  <TH>Venue</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Paid</TH>
                  <TH>Stage</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((event) => (
                  <TR key={event.id}>
                    <TD>
                      <Link href={`/dashboard/events/${event.id}`} className="font-medium text-brand-700 hover:underline">
                        {event.title}
                      </Link>
                      <span className="block text-xs text-ink-500">{event.reference}</span>
                    </TD>
                    <TD>
                      <span className="block">{formatDateShort(event.event_date)}</span>
                      <span className="text-xs text-ink-500">{countdown(event.event_date)}</span>
                    </TD>
                    <TD>{event.guest_count ?? '—'}</TD>
                    <TD>{event.venue_name ?? (event.cities as unknown as { name: string } | null)?.name ?? '—'}</TD>
                    <TDNum><Money minor={event.total_minor} /></TDNum>
                    <TDNum>
                      <Money minor={event.paid_minor} />
                      {event.paid_minor < event.total_minor ? (
                        <span className="block text-xs text-warning-700">
                          <Money minor={event.total_minor - event.paid_minor} /> due
                        </span>
                      ) : null}
                    </TDNum>
                    <TD><StatusBadge status={event.stage} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination page={page} pageCount={pageCount} total={total} basePath="/dashboard/events" searchParams={params} />
          </div>
        </Card>
      )}
    </>
  );
}
