'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Field, FieldLabel, FieldControl } from '@/components/ui/field';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { respondToInvite } from '@/features/quotes/actions';

/** Accept or decline a quotation invitation. */
export function InviteResponse({
  inviteId, partnerId, status,
}: {
  inviteId: string;
  partnerId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | 'accept' | 'decline'>(null);
  const [reason, setReason] = React.useState('');

  async function respond(decision: 'accepted' | 'declined') {
    setBusy(decision === 'accepted' ? 'accept' : 'decline');
    const result = await respondToInvite({
      inviteId, partnerId, decision,
      reason: decision === 'declined' ? reason : undefined,
    });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(decision === 'accepted' ? 'Accepted — you can now build your quote.' : 'Declined. Thanks for responding quickly.');
    router.refresh();
  }

  if (status === 'declined') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium text-ink-900">You declined this request</p>
          <p className="mt-1.5 text-sm text-ink-600">
            If your availability has changed, contact our team and we can reopen it.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Can you take this on?</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <p className="text-sm text-ink-600">
          Accept to unlock the quote builder. Declining costs nothing, but responding quickly improves
          how often we match you.
        </p>

        <div className="mt-5 space-y-2">
          <Button block size="lg" loading={busy === 'accept'} onClick={() => respond('accepted')}>
            <Check aria-hidden /> Accept and quote
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button block variant="secondary">
                <X aria-hidden /> Decline
              </Button>
            </DialogTrigger>
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>Decline this request</DialogTitle>
                <DialogDescription>
                  A quick reason helps us send you better-matched briefs.
                </DialogDescription>
              </DialogHeader>
              <Field>
                <FieldLabel optional>Reason</FieldLabel>
                <FieldControl>
                  <Textarea
                    rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Already booked that date, or the guest count is beyond our capacity"
                  />
                </FieldControl>
              </Field>
              <DialogFooter>
                <Button variant="danger" loading={busy === 'decline'} onClick={() => respond('declined')}>
                  Decline request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
