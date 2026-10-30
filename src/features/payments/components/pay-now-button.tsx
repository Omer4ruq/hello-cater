'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { track } from '@/lib/analytics';
import { startEventPayment } from '../actions';

/**
 * Starts checkout and hands the browser to the gateway.
 *
 * The amount shown is informational — the server recomputes it from the
 * event balance, so a tampered value here changes nothing.
 */
export function PayNowButton({
  eventId, amountMinor, purpose = 'balance', variant = 'primary', block,
}: {
  eventId: string;
  amountMinor: number;
  purpose?: 'deposit' | 'balance' | 'full';
  variant?: 'primary' | 'secondary' | 'accent';
  block?: boolean;
}) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    track('payment_started', { eventId, amountMinor, purpose });
    const result = await startEventPayment({ eventId, purpose });

    if (!result.ok) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    // Full navigation, not a router push: the target is the gateway.
    window.location.assign(result.redirectUrl);
  }

  return (
    <Button onClick={handleClick} loading={pending} variant={variant} block={block}>
      <CreditCard aria-hidden />
      Pay <Money minor={amountMinor} />
    </Button>
  );
}
