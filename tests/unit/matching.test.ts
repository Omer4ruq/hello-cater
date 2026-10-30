import { describe, it, expect } from 'vitest';
import {
  scorePartner, matchPartners, DEFAULT_WEIGHTS,
  type PartnerCandidate, type RequestCriteria,
} from '@/features/matching/engine';

const NOW = new Date('2026-03-01T06:00:00+06:00');

function partner(overrides: Partial<PartnerCandidate> = {}): PartnerCandidate {
  return {
    partnerId: 'p1',
    displayName: 'Test Caterer',
    categoryIds: ['catering'],
    cityIds: ['dhaka'],
    areaIds: ['gulshan'],
    cuisineIds: ['bangladeshi'],
    eventTypeIds: ['corporate-lunch'],
    minGuests: 20,
    maxGuests: 500,
    minOrderMinor: 500_000,
    priceFromMinor: 50_000,
    priceToMinor: 120_000,
    ratingAvg: 4.6,
    ratingCount: 24,
    completedBookings: 40,
    responseRateBps: 9000,
    isAcceptingOrders: true,
    isVerified: true,
    blockedDates: [],
    bookingsOnDate: 0,
    dailyEventCapacity: 3,
    leadTimeHours: 24,
    ...overrides,
  };
}

function criteria(overrides: Partial<RequestCriteria> = {}): RequestCriteria {
  return {
    categoryIds: ['catering'],
    cityId: 'dhaka',
    areaId: 'gulshan',
    guestCount: 300,
    eventDate: '2026-03-20',
    eventTypeId: 'corporate-lunch',
    cuisineIds: ['bangladeshi'],
    budgetMinor: 21_000_000,
    budgetPerPersonMinor: 70_000,
    ...overrides,
  };
}

describe('matching: hard disqualifiers', () => {
  it('excludes unverified partners', () => {
    const r = scorePartner(partner({ isVerified: false }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.disqualified).toBe(true);
    expect(r.disqualifyReason).toBe('Partner is not verified');
    expect(r.score).toBe(0);
  });

  it('excludes partners not accepting orders', () => {
    expect(scorePartner(partner({ isAcceptingOrders: false }), criteria(), DEFAULT_WEIGHTS, NOW).disqualified).toBe(true);
  });

  it('excludes partners who do not offer the service', () => {
    const r = scorePartner(partner({ categoryIds: ['photography'] }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.disqualifyReason).toBe('Does not offer the requested service');
  });

  it('excludes partners outside the city', () => {
    const r = scorePartner(partner({ cityIds: ['chattogram'] }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.disqualifyReason).toBe('Outside the partner’s service area');
  });

  it('excludes partners who blocked the date', () => {
    const r = scorePartner(partner({ blockedDates: ['2026-03-20'] }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.disqualifyReason).toBe('Partner has blocked this date');
  });

  it('excludes partners already at capacity that day', () => {
    const r = scorePartner(partner({ bookingsOnDate: 3, dailyEventCapacity: 3 }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.disqualifyReason).toBe('Partner is fully booked on this date');
  });

  it('excludes partners who cannot meet the lead time', () => {
    const r = scorePartner(
      partner({ leadTimeHours: 72 }),
      criteria({ eventDate: '2026-03-02' }),
      DEFAULT_WEIGHTS, NOW,
    );
    expect(r.disqualifyReason).toBe('Requires 72h notice');
  });

  it('excludes partners who cannot serve the guest count', () => {
    expect(scorePartner(partner({ maxGuests: 100 }), criteria(), DEFAULT_WEIGHTS, NOW).disqualifyReason)
      .toBe('Cannot serve 300 guests (max 100)');
    expect(scorePartner(partner({ minGuests: 500 }), criteria(), DEFAULT_WEIGHTS, NOW).disqualifyReason)
      .toBe('Minimum 500 guests');
  });
});

describe('matching: scoring', () => {
  it('produces a normalised 0..100 score', () => {
    const r = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('keeps every signal within 0..1 across a wide input sweep', () => {
    // Guards the normalisation invariant: if any single signal can exceed
    // 1, the weighted score can exceed 100 and rankings become unstable.
    for (const ratingAvg of [0, 2.9, 3, 4.6, 5]) {
      for (const ratingCount of [0, 1, 9, 24, 1000]) {
        for (const completedBookings of [0, 10, 50, 5000]) {
          for (const responseRateBps of [0, 5000, 10_000]) {
            const r = scorePartner(
              partner({ ratingAvg, ratingCount, completedBookings, responseRateBps }),
              criteria(), DEFAULT_WEIGHTS, NOW,
            );
            for (const [signal, value] of Object.entries(r.breakdown)) {
              expect(value, `${signal} out of range`).toBeGreaterThanOrEqual(0);
              expect(value, `${signal} out of range`).toBeLessThanOrEqual(1);
            }
            expect(r.score).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it('scores an exact area match above city-wide coverage', () => {
    const exact = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    const cityWide = scorePartner(partner({ areaIds: [] }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(exact.breakdown.location).toBeGreaterThan(cityWide.breakdown.location);
    expect(exact.score).toBeGreaterThan(cityWide.score);
  });

  it('penalises partners whose entry price is above the budget', () => {
    const affordable = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    const expensive = scorePartner(
      partner({ priceFromMinor: 200_000, priceToMinor: 300_000 }),
      criteria(), DEFAULT_WEIGHTS, NOW,
    );
    expect(expensive.breakdown.budget).toBeLessThan(affordable.breakdown.budget);
  });

  it('gives unrated but verified partners a neutral rating score, not zero', () => {
    const r = scorePartner(partner({ ratingAvg: 0, ratingCount: 0 }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.breakdown.rating).toBe(0.5);
    expect(r.disqualified).toBe(false);
  });

  it('prefers partners with free capacity on the day', () => {
    const free = scorePartner(partner({ bookingsOnDate: 0 }), criteria(), DEFAULT_WEIGHTS, NOW);
    const busy = scorePartner(partner({ bookingsOnDate: 2, dailyEventCapacity: 3 }), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(free.breakdown.availability).toBeGreaterThan(busy.breakdown.availability);
  });

  it('explains itself with human-readable reasons', () => {
    const r = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(r.reasons).toContain('Covers the exact area');
    expect(r.reasons.some((x) => x.includes('Rated 4.6'))).toBe(true);
    expect(r.reasons).toContain('40 events delivered');
  });

  it('flags orders below the partner minimum without disqualifying', () => {
    const r = scorePartner(
      partner({ minOrderMinor: 50_000_000 }),
      criteria(), DEFAULT_WEIGHTS, NOW,
    );
    expect(r.disqualified).toBe(false);
    expect(r.reasons).toContain('Below the partner’s minimum order');
    expect(r.breakdown.budget).toBeLessThanOrEqual(0.2);
  });

  it('is deterministic', () => {
    const a = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    const b = scorePartner(partner(), criteria(), DEFAULT_WEIGHTS, NOW);
    expect(a.score).toBe(b.score);
  });

  it('responds to reconfigured weights', () => {
    const base = scorePartner(partner({ areaIds: [] }), criteria(), DEFAULT_WEIGHTS, NOW);
    const locationHeavy = scorePartner(
      partner({ areaIds: [] }), criteria(),
      { ...DEFAULT_WEIGHTS, location: 100 }, NOW,
    );
    expect(locationHeavy.score).not.toBe(base.score);
  });
});

describe('matching: ranking', () => {
  it('ranks qualified partners above disqualified ones', () => {
    const results = matchPartners(
      [
        partner({ partnerId: 'blocked', blockedDates: ['2026-03-20'] }),
        partner({ partnerId: 'good' }),
        partner({ partnerId: 'far', cityIds: ['sylhet'] }),
        partner({ partnerId: 'okay', areaIds: [], ratingAvg: 3.9, ratingCount: 3 }),
      ],
      criteria(), { now: NOW },
    );

    expect(results[0].partnerId).toBe('good');
    expect(results[1].partnerId).toBe('okay');
    expect(results.slice(2).every((r) => r.disqualified)).toBe(true);
  });

  it('retains disqualified candidates so operations can see why', () => {
    const results = matchPartners([partner({ partnerId: 'x', isVerified: false })], criteria(), { now: NOW });
    expect(results).toHaveLength(1);
    expect(results[0].disqualifyReason).toBeTruthy();
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => partner({ partnerId: `p${i}` }));
    expect(matchPartners(many, criteria(), { limit: 5, now: NOW })).toHaveLength(5);
  });

  it('handles an empty candidate pool', () => {
    expect(matchPartners([], criteria(), { now: NOW })).toEqual([]);
  });
});
