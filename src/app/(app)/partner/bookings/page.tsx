import { BadgeCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, listPartnerBookings } from '@/features/partner/queries';
import { BookingStatusControl } from '@/features/partner/components/booking-status-control';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate, formatTime, countdown } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Bookings', description: 'Your confirmed jobs.', path: '/partner/bookings', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage('/partner/bookings');
  const partner = activePartner(user);
  const params = await searchParams;

  const { rows, total, page, pageCount } = await listPartnerBookings(partner.partnerId, {
    page: Number(params.page) || 1, q: params.q, status: params.status,
    from: params.from, to: params.to,
  });

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Confirmed jobs with their timing, headcount, venue and your payable amount."
      />

      <DataToolbar
        searchPlaceholder="Search by booking reference…"
        showDateRange
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'pending_payment', label: 'Awaiting payment' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'in_preparation', label: 'In preparation' },
            { value: 'ready', label: 'Ready' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="No bookings yet"
          description="When a customer accepts a proposal that includes your quote, the job appears here."
        />
      ) : (
        <>
          <div className="space-y-4">
            {rows.map((booking) => {
              const event = booking.events as unknown as {
                id: string; title: string; reference: string; venue_name: string | null;
                address_line: string | null; event_date: string; guest_count: number | null;
              } | null;
              const category = booking.service_categories as unknown as { name: string } | null;

              return (
                <Card key={booking.id}>
                  <CardContent>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-sans text-base font-semibold text-ink-950">
                            {event?.title ?? booking.reference}
                          </h2>
                          {category ? <Badge tone="clay">{category.name}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {booking.reference}{event ? ` · event ${event.reference}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Service date">
                        {formatEventDate(booking.service_date)}
                        <span className="block text-xs text-ink-500">{countdown(booking.service_date)}</span>
                      </Field>
                      <Field label="Time">
                        {booking.service_time ? formatTime(booking.service_time) : booking.delivery_window ?? 'To be confirmed'}
                      </Field>
                      <Field label="Headcount">{booking.headcount ?? event?.guest_count ?? '—'}</Field>
                      <Field label="Venue">
                        {event?.venue_name ?? '—'}
                        {event?.address_line ? <span className="block text-xs text-ink-500">{event.address_line}</span> : null}
                      </Field>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-ink-100 pt-4">
                      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-500">Your quote</dt>
                          <dd className="font-medium text-ink-900"><Money minor={booking.gross_minor} /></dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-500">Commission</dt>
                          <dd className="text-ink-700">−<Money minor={booking.commission_minor} /></dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-ink-500">You receive</dt>
                          <dd className="font-semibold text-success-700"><Money minor={booking.partner_payable_minor} /></dd>
                        </div>
                      </dl>

                      <BookingStatusControl
                        bookingId={booking.id}
                        partnerId={partner.partnerId}
                        status={booking.status}
                      />
                    </div>

                    {booking.fulfilment_notes ? (
                      <p className="mt-4 whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
                        <span className="font-medium">Instructions: </span>
                        {booking.fulfilment_notes}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Pagination page={page} pageCount={pageCount} total={total} basePath="/partner/bookings" searchParams={params} />
        </>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-900">{children}</dd>
    </div>
  );
}
