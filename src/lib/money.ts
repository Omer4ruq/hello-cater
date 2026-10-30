/**
 * Money handling.
 *
 * RULE: every monetary value in this system is an integer number of
 * *poisha* (BDT minor units). 1 BDT = 100 poisha. Floating point is
 * never used to represent or accumulate money — only for display.
 *
 * The database mirrors this: every `*_minor` column is BIGINT.
 */

export const MINOR_UNITS_PER_MAJOR = 100;
export const CURRENCY = 'BDT';
export const CURRENCY_SYMBOL = '৳';

/** Basis points: 10000 bps = 100%. */
export type Bps = number;
/** An integer count of poisha. */
export type Minor = number;

export class MoneyError extends Error {}

function assertSafeMinor(value: number, label = 'amount'): asserts value is Minor {
  if (!Number.isFinite(value)) throw new MoneyError(`${label} must be a finite number`);
  if (!Number.isInteger(value)) throw new MoneyError(`${label} must be an integer in poisha, got ${value}`);
  if (!Number.isSafeInteger(value)) throw new MoneyError(`${label} exceeds the safe integer range`);
}

/** Convert taka (possibly fractional) to poisha, rounding half away from zero. */
export function toMinor(major: number): Minor {
  if (!Number.isFinite(major)) throw new MoneyError('Amount must be a finite number');
  const scaled = major * MINOR_UNITS_PER_MAJOR;
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
  assertSafeMinor(rounded);
  return rounded;
}

/** Convert poisha to taka. For DISPLAY ONLY — never feed the result back into arithmetic. */
export function toMajor(minor: Minor): number {
  assertSafeMinor(minor);
  return minor / MINOR_UNITS_PER_MAJOR;
}

/**
 * Apply a basis-point rate to an amount.
 * Rounds half away from zero so that a 50% split of an odd amount is
 * deterministic and never silently loses a poisha.
 */
export function applyBps(amount: Minor, bps: Bps): Minor {
  assertSafeMinor(amount);
  if (!Number.isInteger(bps)) throw new MoneyError('Basis points must be an integer');
  if (bps < 0) throw new MoneyError('Basis points must not be negative');
  const raw = (amount * bps) / 10_000;
  const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
  assertSafeMinor(rounded);
  return rounded;
}

export function sumMinor(values: readonly Minor[]): Minor {
  let total = 0;
  for (const v of values) {
    assertSafeMinor(v);
    total += v;
  }
  assertSafeMinor(total, 'total');
  return total;
}

/** Clamp to a range, used to enforce configured fee floors and ceilings. */
export function clampMinor(value: Minor, min?: Minor | null, max?: Minor | null): Minor {
  let out = value;
  if (min != null && out < min) out = min;
  if (max != null && out > max) out = max;
  return out;
}

export function multiplyQuantity(unitPrice: Minor, quantity: number): Minor {
  assertSafeMinor(unitPrice, 'unit price');
  if (!Number.isFinite(quantity) || quantity < 0) throw new MoneyError('Quantity must be a non-negative number');
  // Mirrors the database's round(quantity * unit_price_minor)::bigint.
  const raw = unitPrice * quantity;
  const rounded = Math.round(raw);
  assertSafeMinor(rounded);
  return rounded;
}

/**
 * Split an amount across n parts without losing or inventing poisha.
 * Remainder poisha are distributed to the earliest parts.
 */
export function splitEvenly(amount: Minor, parts: number): Minor[] {
  assertSafeMinor(amount);
  if (!Number.isInteger(parts) || parts <= 0) throw new MoneyError('Parts must be a positive integer');
  const base = Math.trunc(amount / parts);
  const remainder = amount - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Allocate an amount proportionally to weights, preserving the total
 * exactly (largest-remainder method).
 */
export function allocateByWeight(amount: Minor, weights: readonly number[]): Minor[] {
  assertSafeMinor(amount);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return splitEvenly(amount, Math.max(weights.length, 1));

  const exact = weights.map((w) => (amount * w) / totalWeight);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = amount - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floors];
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) {
    out[order[k].i] += 1;
  }
  return out;
}

const bdtFormatter = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const bdtFormatterPrecise = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format poisha as BDT for display, e.g. 21000000 -> "৳2,10,000". */
export function formatMinor(minor: Minor, opts: { precise?: boolean } = {}): string {
  const major = toMajor(minor);
  const formatted = opts.precise || major % 1 !== 0
    ? bdtFormatterPrecise.format(major)
    : bdtFormatter.format(major);
  // Intl may emit "BDT" where the narrow symbol is unavailable.
  return formatted.replace(/^BDT\s?/, CURRENCY_SYMBOL);
}

/** Compact form for dashboard tiles, e.g. "৳2.1L", "৳12.4K". */
export function formatMinorCompact(minor: Minor): string {
  const major = toMajor(minor);
  const abs = Math.abs(major);
  if (abs >= 10_000_000) return `${CURRENCY_SYMBOL}${(major / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${CURRENCY_SYMBOL}${(major / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${CURRENCY_SYMBOL}${(major / 1_000).toFixed(1)}K`;
  return formatMinor(minor);
}

export function formatBps(bps: Bps): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/** Parse a user-entered taka string ("2,10,000" / "৳1200.50") into poisha. */
export function parseTakaInput(input: string): Minor | null {
  const cleaned = input.replace(/[৳,\s]/g, '').trim();
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return toMinor(Number(cleaned));
}
