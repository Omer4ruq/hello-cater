import Link from 'next/link';
import { CalendarRange } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card } from '@/components/ui/card';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { paginationRange } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort, countdown } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Events', description: 'Confirmed events.', path: '/admin/events', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/events');
  const params = await searchParams;
  const { start, end, page, pageSize } = paginationRange({ page: Number(params.page) || 1 });

  const supabase = await createServerSupabase();
  let query = supabase
    .from('events')
    .select(
      'id, reference, title, stage, event_date, guest_count, venue_name, total_minor, paid_minor, event_manager_id, event_types(name), cities(name), organizations(name), bookings(id)',
      { count: 'exact' },
    )
    .order('event_date', { ascending: true })
    .range(start, end);

  if (params.status) query = query.eq('stage', params.status as never);
  if (params.q) query = query.or(`reference.ilike.%${params.q}%,title.ilike.%${params.q}%`);
  if (params.from) query = query.gte('event_date', params.from);
  if (params.to) query = query.lte('event_date', params.to);

  const { data, count } = await query;
  const rows = data ?? [];
  const total = count ?? 0;

  return (
    <>
      <PageHeader
        title="Events"
        description="Every confirmed event, its vendors and how much has been collected."
      />

      <DataToolbar
        searchPlaceholder="Search events…"
        showDateRange
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
          description="An event is created the moment a customer accepts a proposal."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableWrap label="Events" className="rounded-none border-0">
            <Table>
              <THead>
                <TR>
                  <TH>Event</TH><TH>Customer</TH><TH>Date</TH><TH>Guests</TH>
                  <TH>Vendors</TH>
                  <TH className="text-right">Value</TH>
                  <TH className="text-right">Collected</TH>
                  <TH>Stage</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((event) => {
                  const org = event.organizations as unknown as { name: string } | null;
                  const bookings = (event.bookings as unknown as { id: string }[] | null) ?? [];
                  const outstanding = event.total_minor - event.paid_minor;
                  return (
                    <TR key={event.id}>
                      <TD>
                        <Link href={`/admin/events/${event.id}`} className="font-medium text-brand-700 hover:underline">
                          {event.title}
                        </Link>
                        <span className="block text-xs text-ink-500">{event.reference}</span>
                      </TD>
                      <TD>{org?.name ?? 'Individual'}</TD>
                      <TD>
                        <span className="block whitespace-nowrap">{formatDateShort(event.event_date)}</span>
                        <span className="text-xs text-ink-500">{countdown(event.event_date)}</span>
                      </TD>
                      <TD>{event.guest_count ?? '—'}</TD>
                      <TD>{bookings.length}</TD>
                      <TDNum><Money minor={event.total_minor} compact /></TDNum>
                      <TDNum>
                        <Money minor={event.paid_minor} compact />
                        {outstanding > 0 ? (
                          <span className="block text-xs text-warning-700">
                            <Money minor={outstanding} compact /> due
                          </span>
                        ) : null}
                      </TDNum>
                      <TD><StatusBadge status={event.stage} /></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <div className="border-t border-ink-200 px-4">
            <Pagination
              page={page} pageCount={Math.ceil(total / pageSize)} total={total}
              basePath="/admin/events" searchParams={params}
            />
          </div>
        </Card>
      )}
    </>
  );
}
