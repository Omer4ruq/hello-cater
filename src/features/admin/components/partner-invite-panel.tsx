'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Textarea, Input } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Money } from '@/components/ui/money';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { invitePartners, recomputeMatches } from '../actions';

export type Candidate = {
  id: string;
  partnerId: string;
  categoryId: string | null;
  categoryName: string | null;
  partnerName: string;
  partnerSlug: string;
  logoUrl: string | null;
  score: number;
  reasons: string[];
  disqualified: boolean;
  disqualifyReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  completedBookings: number;
  responseRateBps: number;
  minOrderMinor: number;
  maxGuests: number | null;
  alreadyInvited: boolean;
};

/**
 * Partner shortlisting.
 *
 * The engine ranks, a human decides. Disqualified candidates are still
 * listed with their reason so an operator can see the full consideration
 * set and override the engine when they know something it does not.
 */
export function PartnerInvitePanel({
  requestId, candidates,
}: {
  requestId: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [message, setMessage] = React.useState('');
  const [respondByHours, setRespondByHours] = React.useState(48);
  const [busy, setBusy] = React.useState<null | 'invite' | 'recompute'>(null);
  const [showDisqualified, setShowDisqualified] = React.useState(false);

  const qualified = candidates.filter((c) => !c.disqualified);
  const disqualified = candidates.filter((c) => c.disqualified);
  const visible = showDisqualified ? candidates : qualified;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRecompute() {
    setBusy('recompute');
    const result = await recomputeMatches(requestId);
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.qualified} partners qualify`);
    router.refresh();
  }

  async function handleInvite() {
    const chosen = candidates.filter((c) => selected.has(c.id));
    if (chosen.length === 0) return;

    setBusy('invite');
    const result = await invitePartners({
      requestId,
      partners: chosen.map((c) => ({ partnerId: c.partnerId, categoryId: c.categoryId })),
      message: message || undefined,
      respondByHours,
    });
    setBusy(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invited ${result.data.invited} partners`);
    setSelected(new Set());
    setMessage('');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle as="h2">Matched partners</CardTitle>
          <p className="mt-0.5 text-xs text-ink-500">
            Rule-based scoring on coverage, capacity, budget, availability and track record.
            You decide who gets invited.
          </p>
        </div>
        <Button variant="secondary" size="sm" loading={busy === 'recompute'} onClick={handleRecompute}>
          <RefreshCw aria-hidden /> Recompute
        </Button>
      </CardHeader>

      <CardContent className="pt-3">
        {candidates.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No candidates computed yet"
            description="Run the matching engine to score verified partners against this brief."
            action={<Button loading={busy === 'recompute'} onClick={handleRecompute}>Run matching</Button>}
          />
        ) : (
          <>
            {qualified.length === 0 ? (
              <Alert tone="warning" className="mb-4" title="No partner qualifies for this brief">
                Every candidate was disqualified. Check the reasons below — you may need to widen the
                date, relax the budget, or onboard supply for this category.
              </Alert>
            ) : null}

            <ul className="space-y-2">
              {visible.map((candidate) => (
                <li key={candidate.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors',
                      candidate.disqualified && 'cursor-not-allowed border-ink-200 bg-ink-50 opacity-70',
                      !candidate.disqualified && selected.has(candidate.id)
                        ? 'border-ink-900 bg-ink-50 ring-1 ring-ink-900'
                        : !candidate.disqualified && 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-brand-700"
                      checked={selected.has(candidate.id)}
                      disabled={candidate.disqualified || candidate.alreadyInvited}
                      onChange={() => toggle(candidate.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-sans text-sm font-semibold text-ink-950">
                          {candidate.partnerName}
                        </span>
                        <VerifiedBadge />
                        {candidate.categoryName ? <Badge tone="neutral">{candidate.categoryName}</Badge> : null}
                        {candidate.alreadyInvited ? <Badge tone="info">Already invited</Badge> : null}
                      </span>

                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                        {candidate.ratingCount > 0 ? (
                          <span>★ {candidate.ratingAvg.toFixed(1)} ({candidate.ratingCount})</span>
                        ) : (
                          <span>New partner</span>
                        )}
                        <span>{candidate.completedBookings} delivered</span>
                        <span>{(candidate.responseRateBps / 100).toFixed(0)}% response</span>
                        {candidate.maxGuests ? <span>up to {candidate.maxGuests} guests</span> : null}
                        <span>min <Money minor={candidate.minOrderMinor} compact /></span>
                      </span>

                      {candidate.disqualified ? (
                        <span className="mt-2 block text-xs font-medium text-danger-700">
                          {candidate.disqualifyReason}
                        </span>
                      ) : candidate.reasons.length > 0 ? (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {candidate.reasons.slice(0, 3).map((reason) => (
                            <Badge key={reason} tone="success">{reason}</Badge>
                          ))}
                        </span>
                      ) : null}
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block font-sans text-lg font-semibold tabular-nums text-ink-950">
                        {candidate.disqualified ? '—' : candidate.score.toFixed(0)}
                      </span>
                      <span className="block text-xs text-ink-500">Score</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {disqualified.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowDisqualified((v) => !v)}
                className="mt-3 text-sm font-medium text-brand-700 hover:underline"
              >
                {showDisqualified ? 'Hide' : 'Show'} {disqualified.length} disqualified{' '}
                {disqualified.length === 1 ? 'candidate' : 'candidates'}
              </button>
            ) : null}

            {selected.size > 0 ? (
              <div className="mt-5 space-y-4 rounded-2xl bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-900">
                  Inviting {selected.size} {selected.size === 1 ? 'partner' : 'partners'}
                </p>

                <Field>
                  <FieldLabel optional>Note to partners</FieldLabel>
                  <FieldDescription>
                    Context that is not in the brief — service style, a hard constraint, or what the
                    customer cares most about.
                  </FieldDescription>
                  <FieldControl>
                    <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                  </FieldControl>
                </Field>

                <Field>
                  <FieldLabel>Respond within (hours)</FieldLabel>
                  <FieldControl>
                    <Input
                      type="number" min={1} max={720} className="w-32"
                      value={respondByHours}
                      onChange={(e) => setRespondByHours(Number(e.target.value) || 48)}
                    />
                  </FieldControl>
                </Field>

                <Button loading={busy === 'invite'} onClick={handleInvite}>
                  <Send aria-hidden /> Send {selected.size} {selected.size === 1 ? 'invitation' : 'invitations'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
