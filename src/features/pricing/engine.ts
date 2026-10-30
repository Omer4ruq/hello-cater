/**
 * Pricing engine.
 *
 * The single place where customer totals, platform revenue and partner
 * payouts are computed. Deliberately pure: it takes explicit inputs and
 * returns a fully itemised breakdown, so every number on an invoice can
 * be traced back to a rule.
 *
 * NOTHING here reads from the request body. Callers resolve the rule
 * from the database and pass it in; the client never supplies a rate.
 */
import {
  applyBps,
  clampMinor,
  sumMinor,
  type Bps,
  type Minor,
} from '@/lib/money';

/** The commercial rule, mirroring a row of `pricing_rules`. */
export type PricingRule = {
  commission_bps: Bps;
  service_fee_bps: Bps;
  service_fee_flat_minor: Minor;
  service_fee_min_minor: Minor | null;
  service_fee_max_minor: Minor | null;
  coordination_fee_minor: Minor;
  coordination_fee_bps: Bps;
  vat_bps: Bps;
  vat_label: string;
  gateway_fee_bearer: 'customer' | 'partner' | 'platform';
  gateway_fee_bps: Bps;
  deposit_bps: Bps;
  min_order_minor: Minor;
};

export const DEFAULT_PRICING_RULE: PricingRule = {
  commission_bps: 1200,
  service_fee_bps: 300,
  service_fee_flat_minor: 0,
  service_fee_min_minor: 50_000,
  service_fee_max_minor: 5_000_000,
  coordination_fee_minor: 0,
  coordination_fee_bps: 0,
  vat_bps: 0,
  vat_label: 'VAT',
  gateway_fee_bearer: 'platform',
  gateway_fee_bps: 0,
  deposit_bps: 5000,
  min_order_minor: 500_000,
};

/** One partner's contribution to an event, before platform charges. */
export type PartnerLineInput = {
  /** Stable identifier used to match the result back to its source. */
  key: string;
  partnerId: string | null;
  categoryId: string | null;
  label: string;
  /** Partner's quoted gross for this line, in poisha. */
  amountMinor: Minor;
  /**
   * Optional commission override, resolved per partner/category by the
   * caller. Falls back to the rule's commission_bps.
   */
  commissionBps?: Bps | null;
  /** Lines the platform itself bills (coordination, staffing we provide). */
  isPlatformLine?: boolean;
};

export type PricingAdjustments = {
  /** Additional delivery or setup charged to the customer. */
  deliveryFeeMinor?: Minor;
  /** Absolute discount applied to the customer total. */
  discountMinor?: Minor;
  /** Overrides the rule-derived coordination fee when ops negotiates one. */
  coordinationFeeMinorOverride?: Minor | null;
  /** Overrides the rule-derived service fee. */
  serviceFeeMinorOverride?: Minor | null;
  /** Overrides the deposit percentage for this proposal. */
  depositBpsOverride?: Bps | null;
};

export type PricedLine = {
  key: string;
  partnerId: string | null;
  categoryId: string | null;
  label: string;
  amountMinor: Minor;
  commissionBps: Bps;
  commissionMinor: Minor;
  partnerPayableMinor: Minor;
  isPlatformLine: boolean;
};

export type PricingBreakdown = {
  lines: PricedLine[];
  /** Sum of all partner lines as quoted. */
  partnerGrossMinor: Minor;
  /** Customer-facing platform service fee. */
  serviceFeeMinor: Minor;
  /** Event coordination/management fee. */
  coordinationFeeMinor: Minor;
  deliveryFeeMinor: Minor;
  discountMinor: Minor;
  /** Tax on the taxable base, using the configured rate. */
  taxMinor: Minor;
  taxLabel: string;
  /** What the customer pays. */
  customerTotalMinor: Minor;
  /** Commission retained across all partner lines. */
  commissionMinor: Minor;
  /** Commission + customer-side fees. */
  platformRevenueMinor: Minor;
  /** Sum of all partner payables. */
  partnerPayableTotalMinor: Minor;
  gatewayFeeMinor: Minor;
  gatewayFeeBearer: PricingRule['gateway_fee_bearer'];
  depositBps: Bps;
  depositMinor: Minor;
  balanceMinor: Minor;
  /** Populated when the order is below the configured minimum. */
  warnings: string[];
};

/**
 * Compute the full commercial breakdown for a set of partner lines.
 *
 * Order of operations (documented because it is a business decision):
 *   1. Commission is taken from each partner line at that line's rate.
 *   2. The customer service fee is a percentage of partner gross plus a
 *      flat component, then clamped to the configured floor/ceiling.
 *   3. The coordination fee is a percentage of partner gross plus a flat
 *      component, unless operations overrides it.
 *   4. Tax applies to (partner gross + fees + delivery − discount).
 *   5. The deposit is a percentage of the final customer total.
 */
export function priceEvent(
  lines: readonly PartnerLineInput[],
  rule: PricingRule,
  adjustments: PricingAdjustments = {},
): PricingBreakdown {
  const warnings: string[] = [];

  const pricedLines: PricedLine[] = lines.map((line) => {
    const isPlatformLine = line.isPlatformLine ?? false;
    // The platform's own lines carry no commission — we already keep 100%.
    const commissionBps = isPlatformLine
      ? 0
      : (line.commissionBps ?? rule.commission_bps);
    const commissionMinor = applyBps(line.amountMinor, commissionBps);
    return {
      key: line.key,
      partnerId: line.partnerId,
      categoryId: line.categoryId,
      label: line.label,
      amountMinor: line.amountMinor,
      commissionBps,
      commissionMinor,
      partnerPayableMinor: line.amountMinor - commissionMinor,
      isPlatformLine,
    };
  });

  const partnerGrossMinor = sumMinor(pricedLines.map((l) => l.amountMinor));
  const commissionMinor = sumMinor(pricedLines.map((l) => l.commissionMinor));
  const partnerPayableTotalMinor = sumMinor(
    pricedLines.filter((l) => !l.isPlatformLine).map((l) => l.partnerPayableMinor),
  );

  const serviceFeeMinor =
    adjustments.serviceFeeMinorOverride ??
    clampMinor(
      applyBps(partnerGrossMinor, rule.service_fee_bps) + rule.service_fee_flat_minor,
      rule.service_fee_min_minor,
      rule.service_fee_max_minor,
    );

  const coordinationFeeMinor =
    adjustments.coordinationFeeMinorOverride ??
    applyBps(partnerGrossMinor, rule.coordination_fee_bps) + rule.coordination_fee_minor;

  const deliveryFeeMinor = adjustments.deliveryFeeMinor ?? 0;
  const requestedDiscount = adjustments.discountMinor ?? 0;

  const preTaxBase =
    partnerGrossMinor + serviceFeeMinor + coordinationFeeMinor + deliveryFeeMinor;

  // A discount can never exceed the pre-tax base — that would mean paying
  // the customer to hold the event.
  const discountMinor = Math.min(requestedDiscount, preTaxBase);
  if (discountMinor !== requestedDiscount) {
    warnings.push('Discount was capped at the pre-tax subtotal.');
  }

  const taxableBase = preTaxBase - discountMinor;
  const taxMinor = applyBps(taxableBase, rule.vat_bps);
  const customerTotalMinor = taxableBase + taxMinor;

  const gatewayFeeMinor = applyBps(customerTotalMinor, rule.gateway_fee_bps);

  const depositBps = adjustments.depositBpsOverride ?? rule.deposit_bps;
  const depositMinor = applyBps(customerTotalMinor, depositBps);

  if (partnerGrossMinor > 0 && partnerGrossMinor < rule.min_order_minor) {
    warnings.push('Order value is below the configured minimum order.');
  }

  // The gateway charge reduces platform revenue only when we absorb it.
  const platformRevenueMinor =
    commissionMinor +
    serviceFeeMinor +
    coordinationFeeMinor -
    (rule.gateway_fee_bearer === 'platform' ? gatewayFeeMinor : 0);

  return {
    lines: pricedLines,
    partnerGrossMinor,
    serviceFeeMinor,
    coordinationFeeMinor,
    deliveryFeeMinor,
    discountMinor,
    taxMinor,
    taxLabel: rule.vat_label,
    customerTotalMinor,
    commissionMinor,
    platformRevenueMinor,
    partnerPayableTotalMinor,
    gatewayFeeMinor,
    gatewayFeeBearer: rule.gateway_fee_bearer,
    depositBps,
    depositMinor,
    balanceMinor: customerTotalMinor - depositMinor,
    warnings,
  };
}

/**
 * Partner payout for a delivered booking.
 * Adjustments are signed: a penalty is negative, a bonus positive.
 */
export function computePartnerPayout(input: {
  grossMinor: Minor;
  commissionBps: Bps;
  adjustmentMinor?: Minor;
}): { grossMinor: Minor; commissionMinor: Minor; adjustmentMinor: Minor; netMinor: Minor } {
  const commissionMinor = applyBps(input.grossMinor, input.commissionBps);
  const adjustmentMinor = input.adjustmentMinor ?? 0;
  return {
    grossMinor: input.grossMinor,
    commissionMinor,
    adjustmentMinor,
    netMinor: input.grossMinor - commissionMinor + adjustmentMinor,
  };
}

/** A tier of a cancellation policy, mirroring `cancellation_tiers`. */
export type CancellationTier = {
  hours_before: number;
  refund_bps: Bps;
  keeps_deposit: boolean;
  description: string | null;
};

/**
 * Work out the refund for a cancellation.
 * Tiers are "at least this many hours before the event"; the most
 * generous matching tier wins.
 */
export function computeRefund(input: {
  paidMinor: Minor;
  depositMinor: Minor;
  hoursBeforeEvent: number;
  tiers: readonly CancellationTier[];
}): { refundMinor: Minor; retainedMinor: Minor; tier: CancellationTier | null } {
  const matching = [...input.tiers]
    .filter((t) => input.hoursBeforeEvent >= t.hours_before)
    .sort((a, b) => b.hours_before - a.hours_before)[0];

  if (!matching) {
    // No tier matched: the cancellation is later than every threshold.
    return { refundMinor: 0, retainedMinor: input.paidMinor, tier: null };
  }

  const refundable = matching.keeps_deposit
    ? Math.max(input.paidMinor - input.depositMinor, 0)
    : input.paidMinor;

  const refundMinor = Math.min(applyBps(refundable, matching.refund_bps), input.paidMinor);
  return {
    refundMinor,
    retainedMinor: input.paidMinor - refundMinor,
    tier: matching,
  };
}
