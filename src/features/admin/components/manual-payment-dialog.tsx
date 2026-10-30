'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Money, TakaInputWrapper } from '@/features/admin/components/money-input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { recordManualPayment } from '@/features/payments/actions';

/**
 * Records an offline settlement (bank transfer, cheque, cash).
 *
 * Runs through exactly the same confirmation path as a gateway callback,
 * so the event balance, booking states and ledger entries are identical
 * however the money arrived.
 */
export function ManualPaymentDialog({
  reference, amountMinor,
}: {
  reference: string;
  amountMinor: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState<number | null>(amountMinor);
  const [method, setMethod] = React.useState('bank_transfer');
  const [providerRef, setProviderRef] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    const result = await recordManualPayment({
      reference,
      amountMinor: amount ?? amountMinor,
      method,
      providerRef,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? 'Could not record the payment.');
      return;
    }
    toast.success('Payment recorded and applied');
    router.refresh();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Record receipt</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Record an offline payment</DialogTitle>
          <DialogDescription>
            Confirming <strong>{reference}</strong> as received. This updates the event balance,
            confirms bookings awaiting payment, and posts to the ledger.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Amount received</FieldLabel>
          <FieldDescription>
            Expected <Money minor={amountMinor} />. Change this only if the customer paid a
            different amount.
          </FieldDescription>
          <TakaInputWrapper valueMinor={amount} onValueChange={setAmount} />
        </Field>

        <Field className="mt-4">
          <FieldLabel>Method</FieldLabel>
          <FieldControl>
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="cash">Cash</option>
            </Select>
          </FieldControl>
        </Field>

        <Field className="mt-4">
          <FieldLabel>Bank / transaction reference</FieldLabel>
          <FieldControl>
            <Input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} placeholder="e.g. NEFT-88213445" />
          </FieldControl>
        </Field>

        <DialogFooter>
          <Button loading={pending} disabled={!amount || providerRef.trim().length < 2} onClick={submit}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
