'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GripVertical, Plus, Save, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Textarea, TakaInput } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import {
  CHARGE_KINDS, CHARGE_KIND_LABELS, QUOTE_UNITS, UNIT_LABELS,
  quoteTotals, type QuoteItemInput,
} from '../schema';
import { saveQuoteDraft, submitQuote } from '../actions';

export type QuoteBuilderProps = {
  partnerId: string;
  requestId: string;
  inviteId?: string | null;
  categoryId?: string | null;
  quoteId?: string | null;
  /** The guest count from the brief, used for per-person maths. */
  defaultGuestCount: number | null;
  /** Editable starting point — an existing draft or a previous version. */
  initial?: {
    items: QuoteItemInput[];
    discountMinor: number;
    taxMinor: number;
    notes: string;
    paymentTerms: string;
    cancellationPolicy: string;
    validUntil: string | null;
    guestCount: number | null;
  };
  /** True when the last version was already submitted. */
  isRevision: boolean;
  menus: { id: string; name: string; items: { id: string; name: string; unit: string; price_minor: number }[] }[];
  packages: { id: string; name: string; base_price_minor: number; per_person_price_minor: number }[];
  defaultPaymentTerms?: string;
  defaultCancellationPolicy?: string;
};

const BLANK_ITEM: QuoteItemInput = {
  chargeKind: 'food', label: '', description: '', unit: 'per_person',
  quantity: 1, unitPriceMinor: 0, isOptional: false,
};

/**
 * The partner quote builder.
 *
 * Totals are recomputed live for the partner's benefit, but the server
 * and the database recompute them independently on save — the numbers
 * posted from here are never trusted.
 */
export function QuoteBuilder(props: QuoteBuilderProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<QuoteItemInput[]>(
    props.initial?.items?.length
      ? props.initial.items
      : [{ ...BLANK_ITEM, label: 'Catering per head', quantity: props.defaultGuestCount ?? 1 }],
  );
  const [guestCount, setGuestCount] = React.useState<number | null>(
    props.initial?.guestCount ?? props.defaultGuestCount,
  );
  const [discountMinor, setDiscountMinor] = React.useState(props.initial?.discountMinor ?? 0);
  const [taxMinor, setTaxMinor] = React.useState(props.initial?.taxMinor ?? 0);
  const [notes, setNotes] = React.useState(props.initial?.notes ?? '');
  const [paymentTerms, setPaymentTerms] = React.useState(
    props.initial?.paymentTerms ?? props.defaultPaymentTerms ?? '',
  );
  const [cancellationPolicy, setCancellationPolicy] = React.useState(
    props.initial?.cancellationPolicy ?? props.defaultCancellationPolicy ?? '',
  );
  const [validUntil, setValidUntil] = React.useState(props.initial?.validUntil ?? '');
  const [changeSummary, setChangeSummary] = React.useState('');
  const [busy, setBusy] = React.useState<null | 'save' | 'submit'>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const totals = quoteTotals({ items, discountMinor, taxMinor, guestCount });

  function updateItem(index: number, patch: Partial<QuoteItemInput>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem(preset?: Partial<QuoteItemInput>) {
    setItems((current) => [...current, { ...BLANK_ITEM, ...preset }]);
  }

  function removeItem(index: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  /** Pulls a whole menu in as line items, priced per person. */
  function importMenu(menuId: string) {
    const menu = props.menus.find((m) => m.id === menuId);
    if (!menu) return;
    setItems((current) => [
      ...current.filter((i) => i.label.trim() !== ''),
      ...menu.items.map((item) => ({
        ...BLANK_ITEM,
        chargeKind: 'food' as const,
        label: item.name,
        unit: (QUOTE_UNITS as readonly string[]).includes(item.unit)
          ? (item.unit as QuoteItemInput['unit'])
          : ('per_person' as const),
        quantity: item.unit === 'per_person' ? (guestCount ?? 1) : 1,
        unitPriceMinor: item.price_minor,
      })),
    ]);
    toast.success(`${menu.items.length} items added from ${menu.name}`);
  }

  function buildDraft() {
    return {
      quoteId: props.quoteId ?? undefined,
      requestId: props.requestId,
      inviteId: props.inviteId ?? undefined,
      categoryId: props.categoryId ?? undefined,
      guestCount,
      items,
      discountMinor,
      taxMinor,
      notes,
      paymentTerms,
      cancellationPolicy,
      validUntil: validUntil || null,
      changeSummary,
    };
  }

  async function handleSave() {
    setBusy('save');
    setError(null);
    setFieldErrors({});
    const result = await saveQuoteDraft({ partnerId: props.partnerId, draft: buildDraft() });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    toast.success('Draft saved');
    router.refresh();
  }

  async function handleSubmit() {
    setBusy('submit');
    setError(null);
    setFieldErrors({});
    track('quote_submitted', { requestId: props.requestId, totalMinor: totals.totalMinor });
    const result = await submitQuote({ partnerId: props.partnerId, draft: buildDraft() });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    toast.success(`Quote submitted${result.data.versionNo > 1 ? ` (v${result.data.versionNo})` : ''}`);
    router.push('/partner/quotes');
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-6">
        {error ? <Alert tone="danger" title="Check your quote">{error}</Alert> : null}

        {props.isRevision ? (
          <Alert tone="info" title="This will create a new version">
            The previous version stays on record. Add a short note describing what changed so the
            customer can see the difference.
          </Alert>
        ) : null}

        {/* --------------------------------------------------- Line items */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle as="h2">Line items</CardTitle>
            {props.menus.length > 0 ? (
              <Select
                aria-label="Import a menu"
                className="w-auto"
                value=""
                onChange={(e) => e.target.value && importMenu(e.target.value)}
              >
                <option value="">Import from a menu…</option>
                {props.menus.map((menu) => (
                  <option key={menu.id} value={menu.id}>{menu.name}</option>
                ))}
              </Select>
            ) : null}
          </CardHeader>

          <CardContent className="pt-3">
            {fieldErrors.items ? (
              <p role="alert" className="mb-3 text-sm font-medium text-danger-700">{fieldErrors.items[0]}</p>
            ) : null}

            <ul className="space-y-3">
              {items.map((item, index) => (
                <li
                  key={index}
                  className={cn(
                    'rounded-2xl border p-4 transition-[border-color,background-color] duration-200',
                    item.isOptional ? 'border-dashed border-ink-300 bg-ink-50/50' : 'border-ink-200',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical aria-hidden className="mt-2.5 size-4 shrink-0 text-ink-300" />
                    <div className="grid min-w-0 flex-1 gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <Field>
                          <FieldLabel>Description</FieldLabel>
                          <FieldControl>
                            <Input
                              value={item.label}
                              onChange={(e) => updateItem(index, { label: e.target.value })}
                              placeholder="e.g. Kacchi biryani with borhani"
                            />
                          </FieldControl>
                        </Field>
                        <Field>
                          <FieldLabel>Category</FieldLabel>
                          <FieldControl>
                            <Select
                              value={item.chargeKind}
                              onChange={(e) => updateItem(index, { chargeKind: e.target.value as QuoteItemInput['chargeKind'] })}
                            >
                              {CHARGE_KINDS.map((kind) => (
                                <option key={kind} value={kind}>{CHARGE_KIND_LABELS[kind]}</option>
                              ))}
                            </Select>
                          </FieldControl>
                        </Field>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <Field>
                          <FieldLabel>Unit</FieldLabel>
                          <FieldControl>
                            <Select
                              value={item.unit}
                              onChange={(e) => updateItem(index, { unit: e.target.value as QuoteItemInput['unit'] })}
                            >
                              {QUOTE_UNITS.map((unit) => (
                                <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
                              ))}
                            </Select>
                          </FieldControl>
                        </Field>
                        <Field>
                          <FieldLabel>Quantity</FieldLabel>
                          <FieldControl>
                            <Input
                              type="number" min={0.01} step="0.01" inputMode="decimal"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                            />
                          </FieldControl>
                        </Field>
                        <Field>
                          <FieldLabel>Unit price</FieldLabel>
                          <TakaInput
                            valueMinor={item.unitPriceMinor}
                            onValueChange={(v) => updateItem(index, { unitPriceMinor: v ?? 0 })}
                          />
                        </Field>
                        <div className="flex flex-col justify-end pb-0.5">
                          <p className="text-sm font-medium text-ink-500">Line total</p>
                          <p className="mt-1 text-base font-bold tabular-nums text-ink-900">
                            <Money minor={Math.round(item.quantity * item.unitPriceMinor)} />
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-ink-700">
                          <input
                            type="checkbox"
                            className="size-4 accent-brand-700"
                            checked={item.isOptional}
                            onChange={(e) => updateItem(index, { isOptional: e.target.checked })}
                          />
                          Optional add-on (excluded from the total)
                        </label>
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 aria-hidden /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => addItem()}>
                <Plus aria-hidden /> Add line
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem({ chargeKind: 'delivery', label: 'Delivery', unit: 'flat', quantity: 1 })}>
                + Delivery
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem({ chargeKind: 'setup', label: 'Setup', unit: 'flat', quantity: 1 })}>
                + Setup
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem({ chargeKind: 'service_staff', label: 'Service staff', unit: 'per_item', quantity: 1 })}>
                + Service staff
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem({ chargeKind: 'equipment', label: 'Equipment', unit: 'flat', quantity: 1 })}>
                + Equipment
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* -------------------------------------------------------- Terms */}
        <Card>
          <CardHeader><CardTitle as="h2">Terms & notes</CardTitle></CardHeader>
          <CardContent className="space-y-5 pt-3">
            <Field>
              <FieldLabel optional>Notes for the customer</FieldLabel>
              <FieldDescription>
                What is included, serving style, staff numbers, setup time — anything that helps them
                compare fairly.
              </FieldDescription>
              <FieldControl>
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </FieldControl>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel optional>Payment terms</FieldLabel>
                <FieldControl>
                  <Textarea rows={3} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. 50% advance, balance on the event day" />
                </FieldControl>
              </Field>
              <Field>
                <FieldLabel optional>Cancellation policy</FieldLabel>
                <FieldControl>
                  <Textarea rows={3} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} placeholder="e.g. Free cancellation up to 7 days before" />
                </FieldControl>
              </Field>
            </div>

            {props.isRevision ? (
              <Field>
                <FieldLabel>What changed in this version?</FieldLabel>
                <FieldControl>
                  <Input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="e.g. Reduced per-head price, added dessert counter" />
                </FieldControl>
              </Field>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------ Totals */}
      <Card className="lg:sticky lg:top-24">
        <CardHeader><CardTitle as="h2">Quote total</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <Field>
            <FieldLabel>Guests this quote covers</FieldLabel>
            <FieldControl>
              <Input
                type="number" min={1} inputMode="numeric"
                value={guestCount ?? ''}
                onChange={(e) => setGuestCount(e.target.value === '' ? null : Number(e.target.value))}
              />
            </FieldControl>
          </Field>

          <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-600">Subtotal</dt>
              <dd className="text-ink-900"><Money minor={totals.subtotalMinor} /></dd>
            </div>
            {totals.optionalMinor > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Optional add-ons</dt>
                <dd className="text-ink-500"><Money minor={totals.optionalMinor} /></dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 space-y-4">
            <Field error={fieldErrors.discountMinor?.[0]}>
              <FieldLabel optional>Discount</FieldLabel>
              <TakaInput valueMinor={discountMinor || null} onValueChange={(v) => setDiscountMinor(v ?? 0)} />
            </Field>
            <Field>
              <FieldLabel optional>Tax / other charges</FieldLabel>
              <TakaInput valueMinor={taxMinor || null} onValueChange={(v) => setTaxMinor(v ?? 0)} />
            </Field>
            <Field>
              <FieldLabel optional>Quote valid until</FieldLabel>
              <FieldControl>
                <DatePicker
                  min={new Date().toISOString().slice(0, 10)}
                  value={validUntil}
                  onChange={setValidUntil}
                />
              </FieldControl>
            </Field>
          </div>

          <div className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-4">
            <span className="font-sans text-sm font-semibold text-ink-900">Your total</span>
            <Money minor={totals.totalMinor} className="font-sans text-2xl font-extrabold tracking-tight text-ink-900" />
          </div>
          {totals.perPersonMinor != null ? (
            <p className="mt-1 text-right text-xs text-ink-500">
              <Money minor={totals.perPersonMinor} /> per person
            </p>
          ) : null}

          <Alert tone="info" className="mt-5">
            This is your price. The platform fee and any customer-side charges are added separately —
            the customer sees one combined total and you are paid your amount less the agreed commission.
          </Alert>

          <div className="mt-5 space-y-2">
            <Button block size="lg" loading={busy === 'submit'} onClick={handleSubmit}>
              <Send aria-hidden /> {props.isRevision ? 'Submit revision' : 'Submit quote'}
            </Button>
            <Button block variant="secondary" loading={busy === 'save'} onClick={handleSave}>
              <Save aria-hidden /> Save draft
            </Button>
          </div>

          <p className="mt-3 text-xs text-ink-500">
            Submitting freezes this version. You can always create a revision if the brief changes.
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...new Set(items.map((i) => i.chargeKind))].map((kind) => (
              <Badge key={kind} tone="neutral">{CHARGE_KIND_LABELS[kind]}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
