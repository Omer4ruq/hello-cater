'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { Input, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldLabel, FieldDescription } from '@/components/ui/field';
import { TakaInput } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/dates';
import { createPayout } from '../actions';

type Booking = {
  id: string; reference: string; serviceDate: string; eventTitle: string;
  grossMinor: number; commissionMinor: number; netMinor: number;
};

type Group = {
  partnerId: string; partnerName: string;
  grossMinor: number; commissionMinor: number; netMinor: number;
  bookings: Booking[];
};

/**
 * Creates a payout covering a partner's unsettled delivered bookings.
 *
 * The server re-checks that every booking is genuinely delivered and not
 * already in another payout, so a stale page cannot double-pay.
 */
export function PayoutRunPanel({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Record<string, Set<string>>>({});
  const [adjustment, setAdjustment] = React.useState<Record<string, number>>({});
  const [adjustmentReason, setAdjustmentReason] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  function bookingsFor(group: Group): Set<string> {
    return selected[group.partnerId] ?? new Set(group.bookings.map((b) => b.id));
  }

  function toggleBooking(group: Group, bookingId: string) {
    const current = new Set(bookingsFor(group));
    if (current.has(bookingId)) current.delete(bookingId);
    else current.add(bookingId);
    setSelected((s) => ({ ...s, [group.partnerId]: current }));
  }

  async function create(group: Group) {
    const ids = [...bookingsFor(group)];
    if (ids.length === 0) {
      toast.error('Select at least one booking.');
      return;
    }
    setBusy(group.partnerId);
    const result = await createPayout({
      partnerId: group.partnerId,
      bookingIds: ids,
      adjustmentMinor: adjustment[group.partnerId] || undefined,
      adjustmentReason: adjustmentReason[group.partnerId] || undefined,
      notes: notes[group.partnerId] || undefined,
    });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Payout created for ${group.partnerName}`);
    router.refresh();
  }

  return (
    <ul className="space-y-3">
      {groups.map((group) => {
        const chosen = bookingsFor(group);
        const chosenBookings = group.bookings.filter((b) => chosen.has(b.id));
        const net = chosenBookings.reduce((sum, b) => sum + b.netMinor, 0)
          + (adjustment[group.partnerId] ?? 0);
        const isOpen = expanded === group.partnerId;

        return (
          <li key={group.partnerId} className="rounded-2xl border border-ink-200">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 p-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setExpanded(isOpen ? null : group.partnerId)}
            >
              <span className="min-w-0">
                <span className="block font-sans text-sm font-semibold text-ink-950">
                  {group.partnerName}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {chosenBookings.length} of {group.bookings.length} bookings selected
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-right">
                  <span className="block font-sans text-base font-semibold text-ink-950">
                    <Money minor={net} />
                  </span>
                  <span className="block text-xs text-ink-500">Net payable</span>
                </span>
                <ChevronDown aria-hidden className={cn('size-4 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-ink-200 p-4">
                <ul className="space-y-1.5">
                  {group.bookings.map((booking) => (
                    <li key={booking.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
                        <input
                          type="checkbox"
                          className="size-4 accent-brand-700"
                          checked={chosen.has(booking.id)}
                          onChange={() => toggleBooking(group, booking.id)}
                        />
                        <span className="min-w-0 flex-1 truncate text-ink-800">
                          {booking.eventTitle}
                          <span className="ml-2 font-mono text-xs text-ink-500">{booking.reference}</span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-500">{formatDateShort(booking.serviceDate)}</span>
                        <span className="w-24 shrink-0 text-right text-ink-900">
                          <Money minor={booking.netMinor} />
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel optional>Adjustment</FieldLabel>
                    <FieldDescription>Negative for a penalty, positive for a bonus.</FieldDescription>
                    <TakaInput
                      valueMinor={adjustment[group.partnerId] ?? null}
                      onValueChange={(v) => setAdjustment((a) => ({ ...a, [group.partnerId]: v ?? 0 }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel optional>Adjustment reason</FieldLabel>
                    <FieldControl>
                      <Input
                        value={adjustmentReason[group.partnerId] ?? ''}
                        onChange={(e) => setAdjustmentReason((a) => ({ ...a, [group.partnerId]: e.target.value }))}
                        placeholder="e.g. Late delivery credit agreed on ticket TK-2026-00012"
                      />
                    </FieldControl>
                  </Field>
                </div>

                <Field className="mt-4">
                  <FieldLabel optional>Notes for the statement</FieldLabel>
                  <FieldControl>
                    <Textarea
                      rows={2}
                      value={notes[group.partnerId] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [group.partnerId]: e.target.value }))}
                    />
                  </FieldControl>
                </Field>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-ink-600">
                    Net payable <strong className="text-ink-950"><Money minor={net} /></strong>
                  </p>
                  <Button loading={busy === group.partnerId} onClick={() => create(group)}>
                    <Wallet aria-hidden /> Create payout
                  </Button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
