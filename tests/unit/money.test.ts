import { describe, it, expect } from 'vitest';
import {
  toMinor, toMajor, applyBps, sumMinor, clampMinor, multiplyQuantity,
  splitEvenly, allocateByWeight, formatMinor, formatMinorCompact,
  formatBps, parseTakaInput, MoneyError,
} from '@/lib/money';

describe('money: conversion', () => {
  it('converts taka to poisha', () => {
    expect(toMinor(1)).toBe(100);
    expect(toMinor(700)).toBe(70_000);
    expect(toMinor(1234.56)).toBe(123_456);
  });

  it('rounds half away from zero rather than to even', () => {
    expect(toMinor(0.005)).toBe(1);
    expect(toMinor(-0.005)).toBe(-1);
  });

  it('round-trips without drift on values that break floats', () => {
    // 0.1 + 0.2 !== 0.3 in float; in poisha it is exact.
    expect(toMinor(0.1) + toMinor(0.2)).toBe(toMinor(0.3));
  });

  it('rejects non-finite input', () => {
    expect(() => toMinor(Number.NaN)).toThrow(MoneyError);
    expect(() => toMinor(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });

  it('rejects fractional poisha', () => {
    expect(() => toMajor(10.5)).toThrow(MoneyError);
  });
});

describe('money: basis points', () => {
  it('applies a percentage', () => {
    expect(applyBps(100_000, 1200)).toBe(12_000); // 12% of ৳1,000
    expect(applyBps(21_000_000, 1200)).toBe(2_520_000); // 12% of ৳210,000
  });

  it('handles 0% and 100%', () => {
    expect(applyBps(500, 0)).toBe(0);
    expect(applyBps(500, 10_000)).toBe(500);
  });

  it('rounds half away from zero', () => {
    expect(applyBps(1, 5000)).toBe(1); // 0.5 poisha -> 1
    expect(applyBps(3, 5000)).toBe(2); // 1.5 poisha -> 2
  });

  it('rejects negative or fractional rates', () => {
    expect(() => applyBps(100, -1)).toThrow(MoneyError);
    expect(() => applyBps(100, 12.5)).toThrow(MoneyError);
  });
});

describe('money: aggregation', () => {
  it('sums exactly', () => {
    expect(sumMinor([21_000_000, 500_000, 300_000, 1_000_000])).toBe(22_800_000);
  });

  it('clamps to configured floors and ceilings', () => {
    expect(clampMinor(10_000, 50_000, 5_000_000)).toBe(50_000);
    expect(clampMinor(9_000_000, 50_000, 5_000_000)).toBe(5_000_000);
    expect(clampMinor(100_000, 50_000, 5_000_000)).toBe(100_000);
    expect(clampMinor(100_000, null, null)).toBe(100_000);
  });

  it('multiplies by fractional quantities the same way the database does', () => {
    expect(multiplyQuantity(70_000, 300)).toBe(21_000_000);
    expect(multiplyQuantity(33_333, 1.5)).toBe(50_000); // round(49999.5)
  });
});

describe('money: splitting preserves the total', () => {
  it('splits evenly and distributes the remainder', () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(sumMinor(splitEvenly(100, 3))).toBe(100);
    expect(sumMinor(splitEvenly(1_000_001, 7))).toBe(1_000_001);
  });

  it('allocates by weight without losing a poisha', () => {
    const parts = allocateByWeight(100_000, [1, 1, 1]);
    expect(sumMinor(parts)).toBe(100_000);

    const uneven = allocateByWeight(22_800_000, [21_000_000, 1_200_000, 600_000]);
    expect(sumMinor(uneven)).toBe(22_800_000);
  });

  it('falls back to an even split when weights are all zero', () => {
    expect(sumMinor(allocateByWeight(10, [0, 0]))).toBe(10);
  });

  it('never loses money across 500 random allocations', () => {
    for (let i = 0; i < 500; i++) {
      const amount = Math.floor(Math.random() * 10_000_000);
      const weights = Array.from({ length: 2 + (i % 5) }, () => Math.floor(Math.random() * 100));
      expect(sumMinor(allocateByWeight(amount, weights))).toBe(amount);
    }
  });
});

describe('money: formatting', () => {
  it('formats poisha as BDT', () => {
    expect(formatMinor(21_000_000)).toContain('210,000');
    expect(formatMinor(21_000_000)).toContain('৳');
  });

  it('formats compactly for dashboard tiles', () => {
    expect(formatMinorCompact(21_000_000)).toBe('৳2.10L');
    expect(formatMinorCompact(120_000_000_0)).toBe('৳1.20Cr');
    expect(formatMinorCompact(1_240_000)).toBe('৳12.4K');
  });

  it('formats basis points as a percentage', () => {
    expect(formatBps(1200)).toBe('12%');
    expect(formatBps(1250)).toBe('12.50%');
  });

  it('parses user input with separators and the currency symbol', () => {
    expect(parseTakaInput('৳2,10,000')).toBe(21_000_000);
    expect(parseTakaInput('1200.50')).toBe(120_050);
    expect(parseTakaInput('')).toBeNull();
    expect(parseTakaInput('abc')).toBeNull();
    expect(parseTakaInput('12.345')).toBeNull();
  });
});
