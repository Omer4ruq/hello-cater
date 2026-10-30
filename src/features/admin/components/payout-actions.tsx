'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Money } from '@/components/ui/money';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { updatePayoutStatus } from '../actions';

/**
 * Approve, settle or fail a payout.
 *
 * Marking paid requires a method and a reference, because that is what
 * finance needs to reconcile the bank statement later — and it is what
 * the partner sees on their settlement record.
 */
export function PayoutActions({
  payoutId, reference, status, netMinor,
}: {
  payoutId: string;
  reference: string;
  status: string;
  netMinor: number;
}) {
  const router = useRouter();
  const [method, setMethod] = React.useState('bank_transfer');
  const [providerRef, setProviderRef] = React.useState('');
  const [pending, setPending] = React.useState<string | null>(null);

  async function update(next: 'approved' | 'paid' | 'failed' | 'cancelled') {
    setPending(next);
    const result = await updatePayoutStatus({
      payoutId,
      status: next,
      method: next === 'paid' ? method : undefined,
      providerRef: next === 'paid' ? providerRef : undefined,
      failureReason: next === 'failed' ? 'Transfer failed at the bank' : undefined,
    });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Payout ${next}`);
    router.refresh();
  }

  if (status === 'paid') {
    return <span className="text-xs text-ink-500">Settled</span>;
  }
  if (status === 'cancelled') return null;

  if (status === 'pending') {
    return (
      <Button size="sm" variant="secondary" loading={pending === 'approved'} onClick={() => update('approved')}>
        Approve
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Mark paid</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Record settlement</DialogTitle>
          <DialogDescription>
            Settling <strong>{reference}</strong> for <Money minor={netMinor} />. This posts to the
            ledger and notifies the partner — it cannot be reversed.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Method</FieldLabel>
          <FieldControl>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="cash">Cash</option>
            </Select>
          </FieldControl>
        </Field>

        <Field className="mt-4">
          <FieldLabel>Transaction reference</FieldLabel>
          <FieldDescription>The bank or MFS reference, for reconciliation.</FieldDescription>
          <FieldControl>
            <Input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} placeholder="e.g. TRX8891234" />
          </FieldControl>
        </Field>

        <DialogFooter>
          <Button
            variant="secondary"
            loading={pending === 'failed'}
            onClick={() => update('failed')}
          >
            Mark failed
          </Button>
          <Button
            loading={pending === 'paid'}
            disabled={providerRef.trim().length < 2}
            onClick={() => update('paid')}
          >
            Confirm settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
