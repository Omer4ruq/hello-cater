'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Layers, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea, TakaInput } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { formatBps } from '@/lib/money';
import { priceEvent, DEFAULT_PRICING_RULE } from '@/features/pricing/engine';
import { saveProposal, sendProposal } from '../actions';

export type QuoteOption = {
  quoteId: string;
  quoteVersionId: string | null;
  partnerId: string;
  partnerName: string;
  categoryId: string | null;
  categoryName: string | null;
  totalMinor: number;
  perPersonMinor: number | null;
  ratingAvg: number;
  ratingCount: number;
  status: string;
  versionNo: number;
  itemCount: number;
  commissionBps: number;
};

type Line = {
  key: string;
  quoteId: string | null;
  quoteVersionId: string | null;
  partnerId: string | null;
  categoryId: string | null;
  label: string;
  description: string;
  amountMinor: number;
  commissionBps: number;
  isPlatformLine: boolean;
};

/**
 * Master proposal builder.
 *
 * Combines selected partner quotes — one per service line — into a single
 * customer-facing proposal with one total. The pricing engine runs here
 * for the operator's preview and again on the server, which is what gets
 * persisted.
 */
export function ProposalBuilder({
  requestId, quotes, existingProposalId, defaultTitle, guestCount, existing,
}: {
  requestId: string;
  quotes: QuoteOption[];
  existingProposalId?: string | null;
  defaultTitle: string;
  guestCount: number | null;
  existing?: {
    title: string; summary: string; terms: string; cancellationPolicy: string;
    serviceFeeMinor: number; coordinationFeeMinor: number; deliveryFeeMinor: number;
    discountMinor: number; taxMinor: number; depositBps: number;
    balanceDueDays: number; validUntil: string | null;
    lines: Line[];
  };
}) {
  const router = useRouter();
  const [lines, setLines] = React.useState<Line[]>(existing?.lines ?? []);
  const [title, setTitle] = React.useState(existing?.title || defaultTitle);
  const [summary, setSummary] = React.useState(existing?.summary ?? '');
  const [terms, setTerms] = React.useState(existing?.terms ?? '');
  const [cancellationPolicy, setCancellationPolicy] = React.useState(existing?.cancellationPolicy ?? '');
  const [serviceFeeMinor, setServiceFeeMinor] = React.useState(existing?.serviceFeeMinor ?? 0);
  const [coordinationFeeMinor, setCoordinationFeeMinor] = React.useState(existing?.coordinationFeeMinor ?? 0);
  const [deliveryFeeMinor, setDeliveryFeeMinor] = React.useState(existing?.deliveryFeeMinor ?? 0);
  const [discountMinor, setDiscountMinor] = React.useState(existing?.discountMinor ?? 0);
  const [taxMinor, setTaxMinor] = React.useState(existing?.taxMinor ?? 0);
  const [depositBps, setDepositBps] = React.useState(existing?.depositBps ?? 5000);
  const [balanceDueDays, setBalanceDueDays] = React.useState(existing?.balanceDueDays ?? 3);
  const [validUntil, setValidUntil] = React.useState(existing?.validUntil ?? '');
  const [busy, setBusy] = React.useState<null | 'save' | 'send'>(null);
  const [proposalId, setProposalId] = React.useState(existingProposalId ?? null);

  // Auto-fill the service fee from the rule the first time lines appear,
  // so an operator starts from the configured default rather than zero.
  const autoFilledRef = React.useRef(Boolean(existing));
  const breakdown = priceEvent(
    lines.map((l) => ({
      key: l.key, partnerId: l.partnerId, categoryId: l.categoryId,
      label: l.label, amountMinor: l.amountMinor,
      commissionBps: l.commissionBps, isPlatformLine: l.isPlatformLine,
    })),
    DEFAULT_PRICING_RULE,
    {
      serviceFeeMinorOverride: serviceFeeMinor,
      coordinationFeeMinorOverride: coordinationFeeMinor,
      deliveryFeeMinor, discountMinor, depositBpsOverride: depositBps,
    },
  );

  const suggestedServiceFee = React.useMemo(() => {
    const gross = lines.reduce((sum, l) => sum + l.amountMinor, 0);
    const raw = Math.round((gross * DEFAULT_PRICING_RULE.service_fee_bps) / 10_000);
    return Math.min(
      Math.max(raw, DEFAULT_PRICING_RULE.service_fee_min_minor ?? 0),
      DEFAULT_PRICING_RULE.service_fee_max_minor ?? raw,
    );
  }, [lines]);

  React.useEffect(() => {
    if (!autoFilledRef.current && lines.length > 0) {
      setServiceFeeMinor(suggestedServiceFee);
      autoFilledRef.current = true;
    }
  }, [lines.length, suggestedServiceFee]);

  const usedQuoteIds = new Set(lines.map((l) => l.quoteId).filter(Boolean));

  function addQuote(quote: QuoteOption) {
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        quoteId: quote.quoteId,
        quoteVersionId: quote.quoteVersionId,
        partnerId: quote.partnerId,
        categoryId: quote.categoryId,
        label: quote.categoryName ?? quote.partnerName,
        description: '',
        amountMinor: quote.totalMinor,
        commissionBps: quote.commissionBps,
        isPlatformLine: false,
      },
    ]);
  }

  function addPlatformLine() {
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        quoteId: null, quoteVersionId: null, partnerId: null, categoryId: null,
        label: 'Event coordination', description: '',
        amountMinor: 0, commissionBps: 0, isPlatformLine: true,
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((l) => l.key !== key));
  }

  function payload() {
    return {
      requestId,
      proposalId: proposalId ?? undefined,
      title, summary, terms, cancellationPolicy,
      lines: lines.map((l) => ({
        quoteId: l.quoteId, quoteVersionId: l.quoteVersionId,
        partnerId: l.partnerId, categoryId: l.categoryId,
        label: l.label, description: l.description,
        amountMinor: l.amountMinor, commissionBps: l.commissionBps,
        isPlatformLine: l.isPlatformLine,
      })),
      serviceFeeMinor, coordinationFeeMinor, deliveryFeeMinor,
      discountMinor, taxMinor, depositBps, balanceDueDays,
      validUntil: validUntil || null,
    };
  }

  async function handleSave() {
    setBusy('save');
    const result = await saveProposal(payload());
    setBusy(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setProposalId(result.data.proposalId);
    toast.success('Proposal saved as a draft');
    router.refresh();
  }

  async function handleSend() {
    setBusy('send');
    const saved = await saveProposal(payload());
    if (!saved.ok) {
      setBusy(null);
      toast.error(saved.error);
      return;
    }
    const sent = await sendProposal(saved.data.proposalId);
    setBusy(null);
    if (!sent.ok) {
      toast.error(sent.error);
      return;
    }
    setProposalId(saved.data.proposalId);
    toast.success('Proposal sent to the customer');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------- Available quotes */}
      <Card>
        <CardHeader><CardTitle as="h2">Submitted quotes</CardTitle></CardHeader>
        <CardContent className="pt-3">
          {quotes.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No submitted quotes yet"
              description="Invite partners and wait for their quotations. You can combine several into one proposal here."
            />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {quotes.map((quote) => {
                const used = usedQuoteIds.has(quote.quoteId);
                return (
                  <li key={quote.quoteId}>
                    <div
                      className={cn(
                        'flex h-full items-start justify-between gap-3 rounded-lg border p-3.5',
                        used ? 'border-brand-300 bg-brand-50/60' : 'border-ink-200',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-semibold text-ink-950">{quote.partnerName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                          {quote.categoryName ? <Badge tone="neutral">{quote.categoryName}</Badge> : null}
                          <span>v{quote.versionNo}</span>
                          <span>{quote.itemCount} lines</span>
                          {quote.ratingCount > 0 ? <span>★ {quote.ratingAvg.toFixed(1)}</span> : null}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-ink-950">
                          <Money minor={quote.totalMinor} />
                          {quote.perPersonMinor ? (
                            <span className="ml-1.5 text-xs font-normal text-ink-500">
                              (<Money minor={quote.perPersonMinor} />/person)
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={used ? 'ghost' : 'secondary'}
                        disabled={used}
                        onClick={() => addQuote(quote)}
                      >
                        {used ? 'Added' : <><Plus aria-hidden /> Add</>}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------- Proposal lines */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle as="h2">Proposal lines</CardTitle>
          <Button variant="secondary" size="sm" onClick={addPlatformLine}>
            <Plus aria-hidden /> Platform line
          </Button>
        </CardHeader>
        <CardContent className="pt-3">
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">
              Add quotes above to start building the proposal.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.key} className="rounded-lg border border-ink-200 p-3.5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                    <Field>
                      <FieldLabel>Line label (customer sees this)</FieldLabel>
                      <FieldControl>
                        <Input value={line.label} onChange={(e) => updateLine(line.key, { label: e.target.value })} />
                      </FieldControl>
                    </Field>
                    <Field>
                      <FieldLabel>Amount</FieldLabel>
                      <TakaInput
                        valueMinor={line.amountMinor}
                        onValueChange={(v) => updateLine(line.key, { amountMinor: v ?? 0 })}
                      />
                    </Field>
                    <div className="flex items-end pb-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => removeLine(line.key)} aria-label="Remove line">
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <Field className="mt-3">
                    <FieldLabel optional>What the customer sees about this line</FieldLabel>
                    <FieldControl>
                      <Textarea
                        rows={2} value={line.description}
                        placeholder="Menu highlights, inclusions, staffing — written for the customer, not internally."
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    </FieldControl>
                  </Field>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3 text-xs">
                    {line.isPlatformLine ? (
                      <Badge tone="brand">Platform line · no commission</Badge>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 text-ink-700">
                          Commission
                          <Input
                            type="number" min={0} max={5000} className="h-8 w-24"
                            value={line.commissionBps}
                            onChange={(e) => updateLine(line.key, { commissionBps: Number(e.target.value) || 0 })}
                          />
                          bps ({formatBps(line.commissionBps)})
                        </label>
                        <span className="text-ink-500">
                          Partner receives{' '}
                          <Money minor={line.amountMinor - Math.round((line.amountMinor * line.commissionBps) / 10_000)} />
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ Commercials */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card>
          <CardHeader><CardTitle as="h2">Presentation & terms</CardTitle></CardHeader>
          <CardContent className="space-y-5 pt-3">
            <Field>
              <FieldLabel>Proposal title</FieldLabel>
              <FieldControl>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel optional>Summary from the event manager</FieldLabel>
              <FieldDescription>
                Why this combination, what you checked, and what happens next. This is the human
                touch that makes a managed marketplace worth paying for.
              </FieldDescription>
              <FieldControl>
                <Textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel optional>Terms</FieldLabel>
              <FieldControl>
                <Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel optional>Cancellation policy shown to the customer</FieldLabel>
              <FieldControl>
                <Textarea rows={3} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} />
              </FieldControl>
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader><CardTitle as="h2">Commercials</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <dl className="space-y-1.5 text-sm">
              <Row label="Partner services" value={breakdown.partnerGrossMinor} />
              <Row label="Commission retained" value={breakdown.commissionMinor} muted />
            </dl>

            <div className="mt-4 space-y-3 border-t border-ink-200 pt-4">
              <Field>
                <FieldLabel optional>Platform service fee</FieldLabel>
                <TakaInput valueMinor={serviceFeeMinor || null} onValueChange={(v) => setServiceFeeMinor(v ?? 0)} />
                {serviceFeeMinor !== suggestedServiceFee ? (
                  <button
                    type="button"
                    onClick={() => setServiceFeeMinor(suggestedServiceFee)}
                    className="mt-1 text-left text-xs text-brand-700 underline underline-offset-2"
                  >
                    Use the rule default (<Money minor={suggestedServiceFee} />)
                  </button>
                ) : null}
              </Field>
              <Field>
                <FieldLabel optional>Coordination fee</FieldLabel>
                <TakaInput valueMinor={coordinationFeeMinor || null} onValueChange={(v) => setCoordinationFeeMinor(v ?? 0)} />
              </Field>
              <Field>
                <FieldLabel optional>Delivery & setup</FieldLabel>
                <TakaInput valueMinor={deliveryFeeMinor || null} onValueChange={(v) => setDeliveryFeeMinor(v ?? 0)} />
              </Field>
              <Field>
                <FieldLabel optional>Discount</FieldLabel>
                <TakaInput valueMinor={discountMinor || null} onValueChange={(v) => setDiscountMinor(v ?? 0)} />
              </Field>
              <Field>
                <FieldLabel optional>VAT / tax</FieldLabel>
                <TakaInput valueMinor={taxMinor || null} onValueChange={(v) => setTaxMinor(v ?? 0)} />
              </Field>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-ink-200 pt-4">
              <span className="font-sans text-sm font-semibold text-ink-900">Customer pays</span>
              <Money minor={breakdown.customerTotalMinor} className="font-sans text-xl font-semibold" />
            </div>
            {guestCount ? (
              <p className="mt-1 text-right text-xs text-ink-500">
                <Money minor={Math.round(breakdown.customerTotalMinor / guestCount)} /> per guest
              </p>
            ) : null}

            <dl className="mt-4 space-y-1.5 rounded-lg bg-ink-50 p-3 text-sm">
              <Row label="Platform revenue" value={breakdown.platformRevenueMinor} strong />
              <Row label="Partners receive" value={breakdown.partnerPayableTotalMinor} />
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Deposit %</FieldLabel>
                <FieldControl>
                  <Input
                    type="number" min={0} max={100}
                    value={Math.round(depositBps / 100)}
                    onChange={(e) => setDepositBps(Math.round((Number(e.target.value) || 0) * 100))}
                  />
                </FieldControl>
              </Field>
              <Field>
                <FieldLabel>Balance due (days)</FieldLabel>
                <FieldControl>
                  <Input
                    type="number" min={0} max={365}
                    value={balanceDueDays}
                    onChange={(e) => setBalanceDueDays(Number(e.target.value) || 0)}
                  />
                </FieldControl>
              </Field>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Deposit <Money minor={breakdown.depositMinor} /> · balance <Money minor={breakdown.balanceMinor} />
            </p>

            <Field className="mt-3">
              <FieldLabel optional>Valid until</FieldLabel>
              <FieldControl>
                <Input
                  type="date" min={new Date().toISOString().slice(0, 10)}
                  value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                />
              </FieldControl>
            </Field>

            {breakdown.warnings.length > 0 ? (
              <Alert tone="warning" className="mt-4">
                <ul className="list-inside list-disc">
                  {breakdown.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </Alert>
            ) : null}

            <div className="mt-5 space-y-2">
              <Button block size="lg" loading={busy === 'send'} disabled={lines.length === 0} onClick={handleSend}>
                <Send aria-hidden /> Save & send to customer
              </Button>
              <Button block variant="secondary" loading={busy === 'save'} disabled={lines.length === 0} onClick={handleSave}>
                Save draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: number; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? 'text-ink-500' : 'text-ink-600'}>{label}</dt>
      <dd className={cn(muted ? 'text-ink-500' : 'text-ink-900', strong && 'font-semibold')}>
        <Money minor={value} />
      </dd>
    </div>
  );
}
