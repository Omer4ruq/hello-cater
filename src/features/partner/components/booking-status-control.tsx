'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChefHat, CheckCircle2, PackageCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateBookingStatus } from '../actions';

/**
 * The next fulfilment step a partner can take.
 *
 * Only ever offers one forward move, matching the server-side transition
 * map. Cancellations and refunds are deliberately absent: those go
 * through the platform so both sides have a record and the money is
 * handled correctly.
 */
const NEXT_STEP: Record<string, { status: string; label: string; icon: React.ElementType }> = {
  confirmed: { status: 'in_preparation', label: 'Start preparation', icon: ChefHat },
  in_preparation: { status: 'ready', label: 'Mark ready', icon: PackageCheck },
  ready: { status: 'in_progress', label: 'Mark on site', icon: Truck },
  in_progress: { status: 'completed', label: 'Mark delivered', icon: CheckCircle2 },
};

export function BookingStatusControl({
  bookingId, partnerId, status,
}: {
  bookingId: string;
  partnerId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const step = NEXT_STEP[status];

  if (!step) {
    return status === 'pending_payment' ? (
      <p className="text-xs text-ink-500">Waiting for the customer&rsquo;s payment to clear.</p>
    ) : null;
  }

  async function advance() {
    setPending(true);
    const result = await updateBookingStatus({ bookingId, partnerId, status: step.status });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Updated — ${step.label.toLowerCase()}`);
    router.refresh();
  }

  return (
    <Button size="sm" loading={pending} onClick={advance}>
      <step.icon aria-hidden /> {step.label}
    </Button>
  );
}
