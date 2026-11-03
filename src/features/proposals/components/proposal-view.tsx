'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, MessageSquareWarning, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { Alert } from '@/components/ui/feedback';
import { Textarea } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { formatEventDate } from '@/lib/dates';
import { formatBps } from '@/lib/money';
import { track } from '@/lib/analytics';
import { acceptProposal, rejectProposal, requestProposalChanges } from '../actions';

export type ProposalLineView = {
  id: string;
  label: string;
  description: string | null;
  amount_minor: number;
  is_platform_line: boolean;
  categoryName: string | null;
  partnerName: string | null;
  partnerSlug: string | null;
  partnerRating: number | null;
  partnerRatingCount: number | null;
};

export type ProposalView = {
  id: string;
  reference: string;
  title: string;
  summary: string | null;
  terms: string | null;
  cancellationPolicy: string | null;
  status: string;
  partnerGrossMinor: number;
  serviceFeeMinor: number;
  coordinationFeeMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  depositBps: number;
  depositMinor: number;
  balanceDueDays: number;
  validUntil: string | null;
  eventDate: string | null;
  guestCount: number | null;
  venueName: string | null;
  eventTypeName: string | null;
  cityName: string | null;
};

/**
 * The customer's proposal view.
 *
 * Deliberately presents one total with a full breakdown rather than a
 * grid of competing quotes: the multi-vendor case is exactly where an
 * unassisted comparison falls apart, and combining it is the product.
 */
export function ProposalDetail({
  proposal, lines, readOnly,
}: {
  proposal: ProposalView;
  lines: ProposalLineView[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | 'accept' | 'reject' | 'changes'>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [changeMessage, setChangeMessage] = React.useState('');
  const [rejectReason, setRejectReason] = React.useState('');

  const expired =
    proposal.validUntil != null && new Date(proposal.validUntil) < new Date(new Date().toDateString());

  React.useEffect(() => {
    track('proposal_viewed', { proposalId: proposal.id });
  }, [proposal.id]);

  async function handleAccept() {
    setBusy('accept');
    setError(null);
    const result = await acceptProposal({ proposalId: proposal.id });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    track('proposal_accepted', { proposalId: proposal.id, totalMinor: proposal.totalMinor });
    toast.success('Proposal accepted. Your event workspace is ready.');
    router.push(`/dashboard/events/${result.eventId}`);
    router.refresh();
  }

  async function handleChanges() {
    setBusy('changes');
    const result = await requestProposalChanges({ proposalId: proposal.id, message: changeMessage });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Sent. Our team will revise and resend.');
    router.refresh();
  }

  async function handleReject() {
    setBusy('reject');
    const result = await rejectProposal({ proposalId: proposal.id, reason: rejectReason });
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Thanks — that helps us do better next time.');
    router.refresh();
  }

  const partnerLines = lines.filter((l) => !l.is_platform_line);
  const platformLines = lines.filter((l) => l.is_platform_line);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-6">
        {expired && !readOnly ? (
          <Alert tone="warning" title="This proposal has expired">
            Prices were held until {formatEventDate(proposal.validUntil)}. Ask us to refresh it and we
            will re-confirm availability with every partner.
          </Alert>
        ) : null}

        {error ? <Alert tone="danger" title="We could not complete that">{error}</Alert> : null}

        {/* ------------------------------------------------- What's included */}
        <Card>
          <CardHeader>
            <CardTitle as="h2">What is included</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-ink-100">
              {partnerLines.map((line) => (
                <li key={line.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-base font-semibold text-ink-950">{line.label}</h3>
                        {line.categoryName ? <Badge tone="neutral">{line.categoryName}</Badge> : null}
                      </div>
                      {line.partnerName ? (
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-600">
                          <span className="font-medium text-ink-800">{line.partnerName}</span>
                          <VerifiedBadge />
                          {line.partnerRatingCount ? (
                            <span className="text-xs">
                              ★ {line.partnerRating?.toFixed(1)} ({line.partnerRatingCount})
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {line.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                          {line.description}
                        </p>
                      ) : null}
                    </div>
                    <Money minor={line.amount_minor} className="shrink-0 text-base font-semibold" />
                  </div>
                </li>
              ))}
            </ul>

            {platformLines.length > 0 ? (
              <ul className="mt-2 divide-y divide-ink-100 border-t border-ink-200 pt-2">
                {platformLines.map((line) => (
                  <li key={line.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{line.label}</p>
                      {line.description ? <p className="mt-0.5 text-sm text-ink-600">{line.description}</p> : null}
                    </div>
                    <Money minor={line.amount_minor} className="text-sm font-semibold" />
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {proposal.summary ? (
          <Card>
            <CardHeader><CardTitle as="h2">Summary from your event manager</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{proposal.summary}</p>
            </CardContent>
          </Card>
        ) : null}

        {proposal.terms || proposal.cancellationPolicy ? (
          <Card>
            <CardHeader><CardTitle as="h2">Terms</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-3 text-sm leading-relaxed text-ink-700">
              {proposal.terms ? <p className="whitespace-pre-wrap">{proposal.terms}</p> : null}
              {proposal.cancellationPolicy ? (
                <div>
                  <p className="font-medium text-ink-900">Cancellation</p>
                  <p className="mt-1 whitespace-pre-wrap">{proposal.cancellationPolicy}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ------------------------------------------------------ Money panel */}
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle as="h2">Your total</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <dl className="space-y-2 text-sm">
            <Row label="Services" value={proposal.partnerGrossMinor} />
            {proposal.deliveryFeeMinor > 0 ? <Row label="Delivery & setup" value={proposal.deliveryFeeMinor} /> : null}
            {proposal.coordinationFeeMinor > 0 ? <Row label="Event coordination" value={proposal.coordinationFeeMinor} /> : null}
            {proposal.serviceFeeMinor > 0 ? <Row label="Platform service fee" value={proposal.serviceFeeMinor} /> : null}
            {proposal.discountMinor > 0 ? <Row label="Discount" value={-proposal.discountMinor} tone="success" /> : null}
            {proposal.taxMinor > 0 ? <Row label="VAT" value={proposal.taxMinor} /> : null}
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
            <span className="font-sans text-sm font-semibold text-ink-900">Total</span>
            <Money minor={proposal.totalMinor} className="font-sans text-xl font-semibold" />
          </div>

          <div className="mt-4 rounded-lg bg-ink-50 p-3.5 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-ink-700">Deposit to confirm ({formatBps(proposal.depositBps)})</span>
              <Money minor={proposal.depositMinor} className="font-semibold" />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-ink-600">
              <span>Balance</span>
              <Money minor={proposal.totalMinor - proposal.depositMinor} />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Balance due {proposal.balanceDueDays} days before the event.
            </p>
          </div>

          {proposal.validUntil ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
              <AlertCircle aria-hidden className="size-3.5" />
              Prices held until {formatEventDate(proposal.validUntil)}
            </p>
          ) : null}

          {!readOnly ? (
            <div className="mt-5 space-y-2">
              <Button block size="lg" loading={busy === 'accept'} onClick={handleAccept} disabled={expired}>
                <CheckCircle2 aria-hidden /> Accept proposal
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button block variant="secondary">
                    <MessageSquareWarning aria-hidden /> Request changes
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request changes</DialogTitle>
                    <DialogDescription>
                      Tell us what to adjust — menu, headcount, budget, timing. We will go back to the
                      partners and send a revised proposal.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={5}
                    value={changeMessage}
                    onChange={(e) => setChangeMessage(e.target.value)}
                    placeholder="e.g. Can we swap the dessert, and price a 350-guest option?"
                    aria-label="What would you like changed?"
                  />
                  <DialogFooter>
                    <Button
                      loading={busy === 'changes'}
                      onClick={handleChanges}
                      disabled={changeMessage.trim().length < 5}
                    >
                      Send request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button block variant="ghost" className="text-ink-600">
                    <ThumbsDown aria-hidden /> Decline
                  </Button>
                </DialogTrigger>
                <DialogContent size="sm">
                  <DialogHeader>
                    <DialogTitle>Decline this proposal</DialogTitle>
                    <DialogDescription>
                      A short reason helps us match you better next time. Nothing is charged.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Over budget, or we went with an in-house option"
                    aria-label="Why are you declining?"
                  />
                  <DialogFooter>
                    <Button
                      variant="danger"
                      loading={busy === 'reject'}
                      onClick={handleReject}
                      disabled={rejectReason.trim().length < 3}
                    >
                      Decline proposal
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            Accepting confirms your booking with every partner listed. You pay the deposit to us, and
            we release funds to partners after the event is delivered.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone?: 'success' }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className={tone === 'success' ? 'text-success-700' : 'text-ink-900'}>
        <Money minor={value} />
      </dd>
    </div>
  );
}
