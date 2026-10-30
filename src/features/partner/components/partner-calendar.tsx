'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { formatEventDate, formatTime } from '@/lib/dates';
import { setAvailability } from '../actions';

type Booking = {
  id: string; reference: string; status: string; date: string;
  time: string | null; headcount: number | null; title: string;
};
type Availability = { date: string; isBlocked: boolean; note: string | null; capacityOverride: number | null };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Month calendar of committed load and blackout dates.
 *
 * Shows *committed* bookings only. We deliberately do not present this as
 * guaranteed real-time availability — a partner's own off-platform work
 * is invisible to us, so the honest claim is "what we know about".
 */
export function PartnerCalendar({
  partnerId, year, month, bookings, availability, dailyCapacity,
}: {
  partnerId: string;
  year: number;
  month: number;
  bookings: Booking[];
  availability: Availability[];
  dailyCapacity: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const bookingsByDate = React.useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      map.set(booking.date, [...(map.get(booking.date) ?? []), booking]);
    }
    return map;
  }, [bookings]);

  const availabilityByDate = React.useMemo(
    () => new Map(availability.map((a) => [a.date, a])),
    [availability],
  );

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const monthLabel = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const todayIso = new Date().toISOString().slice(0, 10);

  const monthParam = (offset: number) => {
    const d = new Date(year, month + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  async function toggleBlock(date: string, isBlocked: boolean) {
    setPending(true);
    const result = await setAvailability({ partnerId, date, isBlocked });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isBlocked ? 'Date blocked' : 'Date opened');
    router.refresh();
  }

  const selectedBookings = selected ? (bookingsByDate.get(selected) ?? []) : [];
  const selectedAvailability = selected ? availabilityByDate.get(selected) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-base font-semibold text-ink-950">{monthLabel}</h2>
            <div className="flex gap-1">
              <Button asChild variant="secondary" size="icon-sm" aria-label="Previous month">
                <Link href={`/partner/calendar?month=${monthParam(-1)}`}><ChevronLeft aria-hidden /></Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/partner/calendar">Today</Link>
              </Button>
              <Button asChild variant="secondary" size="icon-sm" aria-label="Next month">
                <Link href={`/partner/calendar?month=${monthParam(1)}`}><ChevronRight aria-hidden /></Link>
              </Button>
            </div>
          </div>

          <div role="grid" aria-label={`Calendar for ${monthLabel}`}>
            <div role="row" className="grid grid-cols-7 gap-1 border-b border-ink-200 pb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} role="columnheader" className="text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <span aria-hidden>{day.slice(0, 1)}</span>
                  <span className="sr-only">{day}</span>
                  <span className="hidden sm:inline" aria-hidden>{day.slice(1)}</span>
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} aria-hidden />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayBookings = bookingsByDate.get(iso) ?? [];
                const dayAvailability = availabilityByDate.get(iso);
                const capacity = dayAvailability?.capacityOverride ?? dailyCapacity;
                const isBlocked = dayAvailability?.isBlocked ?? false;
                const isFull = dayBookings.length >= capacity;
                const isPast = iso < todayIso;

                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    onClick={() => setSelected(iso)}
                    aria-selected={selected === iso}
                    aria-label={`${formatEventDate(iso)}${isBlocked ? ', blocked' : ''}${dayBookings.length ? `, ${dayBookings.length} bookings` : ''}`}
                    className={cn(
                      'flex min-h-16 flex-col items-start rounded-lg border p-1.5 text-left transition-colors sm:min-h-20',
                      selected === iso ? 'border-clay-500 ring-1 ring-clay-500' : 'border-ink-200',
                      isBlocked && 'bg-ink-100 text-ink-400',
                      !isBlocked && isFull && 'bg-danger-50',
                      !isBlocked && !isFull && dayBookings.length > 0 && 'bg-success-50',
                      isPast && 'opacity-55',
                    )}
                  >
                    <span className={cn('text-xs font-medium', iso === todayIso && 'rounded-full bg-clay-600 px-1.5 text-white')}>
                      {day}
                    </span>
                    {isBlocked ? (
                      <Lock aria-hidden className="mt-1 size-3 text-ink-400" />
                    ) : dayBookings.length > 0 ? (
                      <span className="mt-1 w-full space-y-0.5">
                        {dayBookings.slice(0, 2).map((b) => (
                          <span key={b.id} className="block truncate rounded bg-white/70 px-1 text-[0.62rem] text-ink-700">
                            {b.time ? formatTime(b.time) : ''} {b.title}
                          </span>
                        ))}
                        {dayBookings.length > 2 ? (
                          <span className="block text-[0.62rem] text-ink-500">+{dayBookings.length - 2} more</span>
                        ) : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 border-t border-ink-200 pt-4 text-xs text-ink-600">
            <Legend className="bg-success-50 border-success-500/30" label="Has bookings" />
            <Legend className="bg-danger-50 border-danger-500/30" label="At capacity" />
            <Legend className="bg-ink-100 border-ink-300" label="Blocked" />
          </div>

          <p className="mt-3 text-xs text-ink-500">
            This shows work booked through {`the platform`}. It cannot see jobs you have taken
            elsewhere — block those dates so our matching skips them.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24">
        <CardContent>
          {!selected ? (
            <p className="py-6 text-center text-sm text-ink-600">Choose a date to see its detail.</p>
          ) : (
            <>
              <h2 className="font-sans text-base font-semibold text-ink-950">{formatEventDate(selected)}</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Capacity {selectedAvailability?.capacityOverride ?? dailyCapacity} events/day
              </p>

              {selectedBookings.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {selectedBookings.map((booking) => (
                    <li key={booking.id} className="rounded-lg border border-ink-200 p-3">
                      <p className="text-sm font-medium text-ink-950">{booking.title}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {booking.time ? formatTime(booking.time) : 'Time TBC'}
                        {booking.headcount ? ` · ${booking.headcount} guests` : ''}
                      </p>
                      <div className="mt-2"><StatusBadge status={booking.status} /></div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-ink-600">Nothing booked on this date.</p>
              )}

              {selectedAvailability?.note ? (
                <p className="mt-3 rounded-lg bg-ink-50 p-2.5 text-xs text-ink-700">{selectedAvailability.note}</p>
              ) : null}

              <Button
                block
                className="mt-5"
                variant={selectedAvailability?.isBlocked ? 'secondary' : 'outline'}
                loading={pending}
                onClick={() => toggleBlock(selected, !selectedAvailability?.isBlocked)}
              >
                {selectedAvailability?.isBlocked ? (
                  <><Unlock aria-hidden /> Open this date</>
                ) : (
                  <><Lock aria-hidden /> Block this date</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('size-3 rounded border', className)} />
      {label}
    </span>
  );
}
