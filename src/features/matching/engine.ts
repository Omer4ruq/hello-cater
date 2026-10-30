/**
 * Partner matching.
 *
 * Rule-based and deliberately explainable — this is NOT machine learning
 * and the product must never claim it is. Each signal produces a 0..1
 * score; signals are combined with configurable weights. Hard
 * disqualifiers (wrong category, blocked date, outside coverage) remove a
 * partner entirely rather than just lowering their score.
 *
 * The output is persisted to `request_match_candidates` with its
 * breakdown so an operator can see exactly why a partner was suggested.
 * Operations always makes the final call on who gets invited.
 */
import type { Bps, Minor } from '@/lib/money';

export type MatchWeights = {
  location: number;
  service: number;
  capacity: number;
  budget: number;
  availability: number;
  cuisine: number;
  eventType: number;
  rating: number;
  reliability: number;
  experience: number;
};

/** Tunable from admin settings; these are the launch defaults. */
export const DEFAULT_WEIGHTS: MatchWeights = {
  location: 20,
  service: 20,
  capacity: 12,
  budget: 12,
  availability: 10,
  cuisine: 6,
  eventType: 5,
  rating: 8,
  reliability: 5,
  experience: 2,
};

export type RequestCriteria = {
  categoryIds: string[];
  cityId: string | null;
  areaId: string | null;
  guestCount: number | null;
  eventDate: string | null;
  eventTypeId: string | null;
  cuisineIds: string[];
  /** Budget for this service line, in poisha. */
  budgetMinor: Minor | null;
  budgetPerPersonMinor: Minor | null;
};

export type PartnerCandidate = {
  partnerId: string;
  displayName: string;
  categoryIds: string[];
  cityIds: string[];
  /** Empty means the partner covers the whole of each listed city. */
  areaIds: string[];
  cuisineIds: string[];
  eventTypeIds: string[];
  minGuests: number | null;
  maxGuests: number | null;
  minOrderMinor: Minor;
  priceFromMinor: Minor | null;
  priceToMinor: Minor | null;
  ratingAvg: number;
  ratingCount: number;
  completedBookings: number;
  responseRateBps: Bps;
  isAcceptingOrders: boolean;
  isVerified: boolean;
  /** Dates the partner has explicitly blocked (YYYY-MM-DD). */
  blockedDates: string[];
  /** Bookings already committed on the requested date. */
  bookingsOnDate: number;
  dailyEventCapacity: number;
  leadTimeHours: number;
};

export type MatchResult = {
  partnerId: string;
  categoryId: string | null;
  score: number;
  breakdown: Record<keyof MatchWeights, number>;
  reasons: string[];
  disqualified: boolean;
  disqualifyReason: string | null;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Hours between now and the event, used for the lead-time check. */
function hoursUntil(dateIso: string, now: Date): number {
  const target = new Date(`${dateIso}T00:00:00+06:00`).getTime();
  return (target - now.getTime()) / 3_600_000;
}

export function scorePartner(
  partner: PartnerCandidate,
  criteria: RequestCriteria,
  weights: MatchWeights = DEFAULT_WEIGHTS,
  now: Date = new Date(),
): MatchResult {
  const reasons: string[] = [];
  const breakdown = {
    location: 0, service: 0, capacity: 0, budget: 0, availability: 0,
    cuisine: 0, eventType: 0, rating: 0, reliability: 0, experience: 0,
  } as Record<keyof MatchWeights, number>;

  const disqualify = (reason: string): MatchResult => ({
    partnerId: partner.partnerId,
    categoryId: criteria.categoryIds[0] ?? null,
    score: 0,
    breakdown,
    reasons,
    disqualified: true,
    disqualifyReason: reason,
  });

  // ---- Hard gates -----------------------------------------------------
  if (!partner.isVerified) return disqualify('Partner is not verified');
  if (!partner.isAcceptingOrders) return disqualify('Partner is not accepting orders');

  const matchedCategories = criteria.categoryIds.filter((c) => partner.categoryIds.includes(c));
  if (criteria.categoryIds.length > 0 && matchedCategories.length === 0) {
    return disqualify('Does not offer the requested service');
  }

  if (criteria.cityId && !partner.cityIds.includes(criteria.cityId)) {
    return disqualify('Outside the partner’s service area');
  }

  if (criteria.eventDate) {
    if (partner.blockedDates.includes(criteria.eventDate)) {
      return disqualify('Partner has blocked this date');
    }
    if (partner.bookingsOnDate >= partner.dailyEventCapacity) {
      return disqualify('Partner is fully booked on this date');
    }
    const lead = hoursUntil(criteria.eventDate, now);
    if (lead < partner.leadTimeHours) {
      return disqualify(`Requires ${partner.leadTimeHours}h notice`);
    }
  }

  if (criteria.guestCount != null) {
    if (partner.maxGuests != null && criteria.guestCount > partner.maxGuests) {
      return disqualify(`Cannot serve ${criteria.guestCount} guests (max ${partner.maxGuests})`);
    }
    if (partner.minGuests != null && criteria.guestCount < partner.minGuests) {
      return disqualify(`Minimum ${partner.minGuests} guests`);
    }
  }

  // ---- Soft signals ---------------------------------------------------

  // Location: an exact area match beats city-wide coverage.
  if (!criteria.cityId) {
    breakdown.location = 0.5;
  } else if (criteria.areaId && partner.areaIds.includes(criteria.areaId)) {
    breakdown.location = 1;
    reasons.push('Covers the exact area');
  } else if (partner.areaIds.length === 0) {
    breakdown.location = 0.85;
    reasons.push('Covers the whole city');
  } else {
    breakdown.location = 0.6;
  }

  // Service coverage: how much of the request this partner can take on.
  breakdown.service = criteria.categoryIds.length
    ? matchedCategories.length / criteria.categoryIds.length
    : 0.5;
  if (matchedCategories.length > 1) {
    reasons.push(`Covers ${matchedCategories.length} of the requested services`);
  }

  // Capacity: reward comfortable headroom, not a bare pass.
  if (criteria.guestCount == null || partner.maxGuests == null) {
    breakdown.capacity = 0.6;
  } else {
    const utilisation = criteria.guestCount / partner.maxGuests;
    // Sweet spot is 30–80% of stated capacity.
    breakdown.capacity =
      utilisation <= 0.8 && utilisation >= 0.3 ? 1 : utilisation < 0.3 ? 0.7 : 0.55;
    if (breakdown.capacity === 1) reasons.push('Comfortable capacity for this guest count');
  }

  // Budget: compare the partner's typical range with the customer's budget.
  const perPersonBudget =
    criteria.budgetPerPersonMinor ??
    (criteria.budgetMinor != null && criteria.guestCount
      ? Math.round(criteria.budgetMinor / criteria.guestCount)
      : null);

  if (perPersonBudget == null || partner.priceFromMinor == null) {
    breakdown.budget = 0.5;
  } else if (perPersonBudget >= partner.priceFromMinor) {
    const ceiling = partner.priceToMinor ?? partner.priceFromMinor * 2;
    breakdown.budget = perPersonBudget <= ceiling ? 1 : 0.8;
    if (breakdown.budget === 1) reasons.push('Within the stated budget');
  } else {
    // Below the partner's entry price — score falls off with the gap.
    breakdown.budget = clamp01(perPersonBudget / partner.priceFromMinor) * 0.6;
  }

  if (criteria.budgetMinor != null && criteria.budgetMinor < partner.minOrderMinor) {
    breakdown.budget = Math.min(breakdown.budget, 0.2);
    reasons.push('Below the partner’s minimum order');
  }

  // Availability: fewer commitments on the day is better.
  breakdown.availability = criteria.eventDate
    ? clamp01(1 - partner.bookingsOnDate / Math.max(partner.dailyEventCapacity, 1))
    : 0.7;

  breakdown.cuisine = criteria.cuisineIds.length
    ? criteria.cuisineIds.filter((c) => partner.cuisineIds.includes(c)).length /
      criteria.cuisineIds.length
    : 0.5;
  if (breakdown.cuisine === 1 && criteria.cuisineIds.length) {
    reasons.push('Matches every requested cuisine');
  }

  breakdown.eventType = criteria.eventTypeId
    ? partner.eventTypeIds.includes(criteria.eventTypeId)
      ? 1
      : 0.4
    : 0.5;

  // Rating: quality is blended toward a neutral 0.5 in proportion to how
  // much evidence there is, so a single 5-star review does not outrank a
  // partner with thirty 4.5s, and an unrated but verified partner still
  // gets a fair chance to quote. Always lands in [0, 1].
  const ratingQuality = clamp01((partner.ratingAvg - 3) / 2); // 3.0 -> 0, 5.0 -> 1
  const ratingConfidence = clamp01(partner.ratingCount / 10);
  breakdown.rating = 0.5 + (ratingQuality - 0.5) * ratingConfidence;
  if (partner.ratingAvg >= 4.5 && partner.ratingCount >= 5) {
    reasons.push(`Rated ${partner.ratingAvg.toFixed(1)} across ${partner.ratingCount} reviews`);
  }

  breakdown.reliability = clamp01(partner.responseRateBps / 10_000);
  breakdown.experience = clamp01(partner.completedBookings / 50);
  if (partner.completedBookings >= 25) {
    reasons.push(`${partner.completedBookings} events delivered`);
  }

  const weightTotal = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = (Object.keys(weights) as (keyof MatchWeights)[]).reduce(
    (sum, key) => sum + breakdown[key] * weights[key],
    0,
  );

  return {
    partnerId: partner.partnerId,
    categoryId: matchedCategories[0] ?? criteria.categoryIds[0] ?? null,
    // Normalised to 0..100 so scores stay comparable if weights change.
    score: Math.round((weighted / weightTotal) * 10000) / 100,
    breakdown,
    reasons,
    disqualified: false,
    disqualifyReason: null,
  };
}

/**
 * Rank candidates for a request. Disqualified partners are retained (so
 * operations can see who was considered and why they were excluded) but
 * sorted to the bottom.
 */
export function matchPartners(
  partners: readonly PartnerCandidate[],
  criteria: RequestCriteria,
  options: { weights?: MatchWeights; limit?: number; now?: Date } = {},
): MatchResult[] {
  const results = partners.map((p) =>
    scorePartner(p, criteria, options.weights ?? DEFAULT_WEIGHTS, options.now),
  );

  results.sort((a, b) => {
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1;
    return b.score - a.score;
  });

  return options.limit ? results.slice(0, options.limit) : results;
}
