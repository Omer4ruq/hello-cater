import { describe, it, expect } from 'vitest';
import {
  priceEvent, computePartnerPayout, computeRefund,
  DEFAULT_PRICING_RULE, type PricingRule, type PartnerLineInput,
} from '@/features/pricing/engine';
import { sumMinor } from '@/lib/money';

const rule: PricingRule = { ...DEFAULT_PRICING_RULE };

/** The worked example from the product brief: 300 guests at ৳700/head. */
const cateringLine: PartnerLineInput = {
  key: 'catering',
  partnerId: 'p1',
  categoryId: 'c1',
  label: 'Catering',
  amountMinor: 21_000_000, // ৳210,000
};

describe('pricing: single-vendor event', () => {
  it('computes the customer total and platform revenue', () => {
    const result = priceEvent([cateringLine], rule);

    expect(result.partnerGrossMinor).toBe(21_000_000);
    // 12% commission retained from the partner
    expect(result.commissionMinor).toBe(2_520_000);
    expect(result.partnerPayableTotalMinor).toBe(18_480_000);
    // 3% customer service fee, within the 500..50,000 taka clamp
    expect(result.serviceFeeMinor).toBe(630_000);
    expect(result.customerTotalMinor).toBe(21_630_000);
    // Platform keeps commission + service fee
    expect(result.platformRevenueMinor).toBe(3_150_000);
  });

  it('keeps the books balanced: customer total = partner payable + platform revenue', () => {
    const result = priceEvent([cateringLine], rule);
    expect(result.partnerPayableTotalMinor + result.platformRevenueMinor)
      .toBe(result.customerTotalMinor);
  });

  it('splits the total into deposit and balance without losing a poisha', () => {
    const result = priceEvent([cateringLine], rule);
    expect(result.depositMinor + result.balanceMinor).toBe(result.customerTotalMinor);
    expect(result.depositMinor).toBe(10_815_000); // 50%
  });

  it('applies the configured service fee floor', () => {
    const result = priceEvent([{ ...cateringLine, amountMinor: 100_000 }], rule);
    // 3% of ৳1,000 would be ৳30, below the ৳500 floor.
    expect(result.serviceFeeMinor).toBe(50_000);
  });

  it('applies the configured service fee ceiling', () => {
    const result = priceEvent([{ ...cateringLine, amountMinor: 1_000_000_000 }], rule);
    expect(result.serviceFeeMinor).toBe(5_000_000);
  });

  it('warns when the order is under the configured minimum', () => {
    const result = priceEvent([{ ...cateringLine, amountMinor: 100_000 }], rule);
    expect(result.warnings).toContain('Order value is below the configured minimum order.');
  });
});

describe('pricing: multi-vendor master proposal', () => {
  const lines: PartnerLineInput[] = [
    { key: 'catering',    partnerId: 'a', categoryId: 'cat',   label: 'Catering',    amountMinor: 25_000_000 },
    { key: 'decoration',  partnerId: 'b', categoryId: 'dec',   label: 'Decoration',  amountMinor: 12_000_000, commissionBps: 1500 },
    { key: 'photography', partnerId: 'c', categoryId: 'photo', label: 'Photography', amountMinor:  5_000_000, commissionBps: 1500 },
    { key: 'sound',       partnerId: 'd', categoryId: 'sound', label: 'Sound',       amountMinor:  4_000_000, commissionBps: 1500 },
    { key: 'venue',       partnerId: 'e', categoryId: 'venue', label: 'Venue',       amountMinor: 15_000_000, commissionBps: 1000 },
  ];

  it('aggregates partner lines and applies per-line commission rates', () => {
    const result = priceEvent(lines, rule, { coordinationFeeMinorOverride: 2_000_000 });

    expect(result.partnerGrossMinor).toBe(61_000_000);
    expect(result.commissionMinor).toBe(
      3_000_000 + 1_800_000 + 750_000 + 600_000 + 1_500_000,
    );
    expect(result.coordinationFeeMinor).toBe(2_000_000);
    expect(sumMinor(result.lines.map((l) => l.partnerPayableMinor)))
      .toBe(result.partnerPayableTotalMinor);
  });

  it('remains balanced across every line', () => {
    const result = priceEvent(lines, rule, { coordinationFeeMinorOverride: 2_000_000 });
    expect(result.partnerPayableTotalMinor + result.platformRevenueMinor)
      .toBe(result.customerTotalMinor);
  });

  it('charges no commission on platform-owned lines', () => {
    const result = priceEvent(
      [...lines, { key: 'coord', partnerId: null, categoryId: null, label: 'Event coordination', amountMinor: 2_000_000, isPlatformLine: true }],
      rule,
    );
    const platformLine = result.lines.find((l) => l.key === 'coord')!;
    expect(platformLine.commissionMinor).toBe(0);
    expect(platformLine.commissionBps).toBe(0);
    // Platform lines are excluded from partner payable.
    expect(result.partnerPayableTotalMinor).toBe(
      sumMinor(result.lines.filter((l) => !l.isPlatformLine).map((l) => l.partnerPayableMinor)),
    );
  });
});

describe('pricing: discounts, tax and gateway fees', () => {
  it('applies a discount before tax', () => {
    const vatRule: PricingRule = { ...rule, vat_bps: 500 }; // 5%
    const result = priceEvent([cateringLine], vatRule, { discountMinor: 1_000_000 });

    const base = 21_000_000 + result.serviceFeeMinor - 1_000_000;
    expect(result.taxMinor).toBe(Math.round(base * 0.05));
    expect(result.customerTotalMinor).toBe(base + result.taxMinor);
  });

  it('caps a discount at the pre-tax subtotal', () => {
    const result = priceEvent([cateringLine], rule, { discountMinor: 999_999_999 });
    expect(result.customerTotalMinor).toBe(0);
    expect(result.warnings).toContain('Discount was capped at the pre-tax subtotal.');
  });

  it('reduces platform revenue when the platform absorbs the gateway fee', () => {
    const gatewayRule: PricingRule = { ...rule, gateway_fee_bps: 250, gateway_fee_bearer: 'platform' };
    const absorbed = priceEvent([cateringLine], gatewayRule);
    const passedOn = priceEvent([cateringLine], { ...gatewayRule, gateway_fee_bearer: 'customer' });

    expect(absorbed.gatewayFeeMinor).toBeGreaterThan(0);
    expect(absorbed.platformRevenueMinor).toBe(
      passedOn.platformRevenueMinor - absorbed.gatewayFeeMinor,
    );
  });

  it('honours an operations override of the service fee', () => {
    const result = priceEvent([cateringLine], rule, { serviceFeeMinorOverride: 0 });
    expect(result.serviceFeeMinor).toBe(0);
    expect(result.customerTotalMinor).toBe(21_000_000);
  });

  it('never produces a negative total', () => {
    const result = priceEvent([{ ...cateringLine, amountMinor: 0 }], rule, { discountMinor: 5_000_000 });
    expect(result.customerTotalMinor).toBeGreaterThanOrEqual(0);
  });
});

describe('pricing: partner payout', () => {
  it('computes gross minus commission plus adjustment', () => {
    expect(computePartnerPayout({ grossMinor: 21_000_000, commissionBps: 1200 })).toEqual({
      grossMinor: 21_000_000,
      commissionMinor: 2_520_000,
      adjustmentMinor: 0,
      netMinor: 18_480_000,
    });
  });

  it('supports a negative adjustment for a penalty', () => {
    const payout = computePartnerPayout({
      grossMinor: 10_000_000, commissionBps: 1200, adjustmentMinor: -500_000,
    });
    expect(payout.netMinor).toBe(10_000_000 - 1_200_000 - 500_000);
  });
});

describe('pricing: cancellation refunds', () => {
  const tiers = [
    { hours_before: 168, refund_bps: 10_000, keeps_deposit: false, description: null },
    { hours_before: 72,  refund_bps:  7_500, keeps_deposit: false, description: null },
    { hours_before: 24,  refund_bps:  5_000, keeps_deposit: true,  description: null },
    { hours_before: 0,   refund_bps:      0, keeps_deposit: true,  description: null },
  ];

  it('refunds in full outside the longest window', () => {
    const r = computeRefund({ paidMinor: 10_000_000, depositMinor: 5_000_000, hoursBeforeEvent: 200, tiers });
    expect(r.refundMinor).toBe(10_000_000);
    expect(r.retainedMinor).toBe(0);
  });

  it('applies the matching tier', () => {
    const r = computeRefund({ paidMinor: 10_000_000, depositMinor: 5_000_000, hoursBeforeEvent: 100, tiers });
    expect(r.refundMinor).toBe(7_500_000);
  });

  it('retains the deposit when the tier says so', () => {
    const r = computeRefund({ paidMinor: 10_000_000, depositMinor: 5_000_000, hoursBeforeEvent: 30, tiers });
    // 50% of the ৳50,000 that is not deposit
    expect(r.refundMinor).toBe(2_500_000);
    expect(r.retainedMinor).toBe(7_500_000);
  });

  it('refunds nothing inside the final window', () => {
    const r = computeRefund({ paidMinor: 10_000_000, depositMinor: 5_000_000, hoursBeforeEvent: 2, tiers });
    expect(r.refundMinor).toBe(0);
  });

  it('never refunds more than was paid', () => {
    const r = computeRefund({
      paidMinor: 1_000_000, depositMinor: 5_000_000, hoursBeforeEvent: 500, tiers,
    });
    expect(r.refundMinor).toBeLessThanOrEqual(1_000_000);
  });

  it('retains everything when no tier matches at all', () => {
    const r = computeRefund({
      paidMinor: 1_000_000, depositMinor: 0, hoursBeforeEvent: -5,
      tiers: [{ hours_before: 24, refund_bps: 10_000, keeps_deposit: false, description: null }],
    });
    expect(r.refundMinor).toBe(0);
    expect(r.tier).toBeNull();
  });
});
