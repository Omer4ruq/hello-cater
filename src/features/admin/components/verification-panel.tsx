'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, CheckCircle2, Eye, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { formatBps } from '@/lib/money';
import { setPartnerVerification, setPartnerCommission } from '../actions';

/**
 * Verification decisions.
 *
 * Approving is separated from publishing: a partner can be verified (and
 * so able to receive invitations) before their public listing is ready.
 * Every decision writes a verification event and an audit entry.
 */
export function VerificationPanel({
  partnerId, status, isPublished, commissionBps, canSetCommission,
}: {
  partnerId: string;
  status: string;
  isPublished: boolean;
  commissionBps: number | null;
  canSetCommission: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = React.useState('');
  const [publish, setPublish] = React.useState(isPublished);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [rate, setRate] = React.useState(commissionBps != null ? String(commissionBps / 100) : '');
  const [rateReason, setRateReason] = React.useState('');
  const [ratePending, setRatePending] = React.useState(false);

  async function decide(next: 'under_review' | 'approved' | 'rejected' | 'suspended') {
    if ((next === 'rejected' || next === 'suspended') && notes.trim().length < 3) {
      toast.error('Add a reason — the partner sees it.');
      return;
    }
    setBusy(next);
    const result = await setPartnerVerification({
      partnerId, status: next, notes: notes || undefined,
      publish: next === 'approved' ? publish : false,
    });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Partner marked ${next.replace(/_/g, ' ')}`);
    setNotes('');
    router.refresh();
  }

  async function saveRate() {
    setRatePending(true);
    const parsed = rate.trim() === '' ? null : Math.round(Number(rate) * 100);
    const result = await setPartnerCommission({ partnerId, commissionBps: parsed, reason: rateReason });
    setRatePending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Commission updated');
    setRateReason('');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle as="h2">Verification decision</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <Field>
            <FieldLabel optional={status === 'approved'}>Notes</FieldLabel>
            <FieldDescription>
              Rejection and suspension reasons are sent to the partner. Approval notes stay internal.
            </FieldDescription>
            <FieldControl>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FieldControl>
          </Field>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-ink-200 p-3">
            <input
              type="checkbox" className="mt-0.5 size-4 accent-brand-700"
              checked={publish} onChange={(e) => setPublish(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-ink-950">Publish to the marketplace</span>
              <span className="mt-0.5 block text-xs text-ink-600">
                Makes the partner visible publicly. Leave off to verify them privately first.
              </span>
            </span>
          </label>

          <div className="mt-5 space-y-2">
            <Button block loading={busy === 'approved'} onClick={() => decide('approved')}>
              <CheckCircle2 aria-hidden /> Approve
            </Button>
            {status !== 'under_review' ? (
              <Button block variant="secondary" loading={busy === 'under_review'} onClick={() => decide('under_review')}>
                <Eye aria-hidden /> Mark under review
              </Button>
            ) : null}
            <Button block variant="secondary" loading={busy === 'rejected'} onClick={() => decide('rejected')}>
              <XCircle aria-hidden /> Reject
            </Button>
            <Button block variant="ghost" className="text-danger-700" loading={busy === 'suspended'} onClick={() => decide('suspended')}>
              <Ban aria-hidden /> Suspend
            </Button>
          </div>
        </CardContent>
      </Card>

      {canSetCommission ? (
        <Card>
          <CardHeader><CardTitle as="h2">Commission override</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <Alert tone="info" className="mb-4">
              Leave blank to use the platform default. Current:{' '}
              {commissionBps != null ? formatBps(commissionBps) : 'platform default'}.
            </Alert>
            <Field>
              <FieldLabel optional>Commission %</FieldLabel>
              <FieldControl>
                <Input
                  type="number" min={0} max={50} step="0.25" placeholder="e.g. 10"
                  value={rate} onChange={(e) => setRate(e.target.value)}
                />
              </FieldControl>
            </Field>
            <Field className="mt-3">
              <FieldLabel>Reason (audited)</FieldLabel>
              <FieldControl>
                <Input value={rateReason} onChange={(e) => setRateReason(e.target.value)} placeholder="e.g. Launch partner agreement" />
              </FieldControl>
            </Field>
            <Button
              className="mt-4" block variant="secondary"
              loading={ratePending} disabled={rateReason.trim().length < 3}
              onClick={saveRate}
            >
              Save commission
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
