import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { logger } from '@/lib/logger';
import {
  matchPartners, DEFAULT_WEIGHTS,
  type MatchResult, type MatchWeights, type PartnerCandidate, type RequestCriteria,
} from './engine';

/**
 * Loads every partner that could conceivably serve a request and scores
 * them with the rule-based engine.
 *
 * Runs with the service role because it must read across all partners,
 * including their availability and current load — data no single client
 * is allowed to see. Only the resulting scores are persisted, and those
 * are staff-only by RLS.
 */
export async function computeMatchesForRequest(
  requestId: string,
  options: { weights?: MatchWeights; persist?: boolean; limit?: number } = {},
): Promise<MatchResult[]> {
  const supabase = createAdminSupabase();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select(
      'id, event_type_id, event_date, guest_count, city_id, area_id, budget_mode, budget_total_minor, budget_per_person_minor, budget_max_minor',
    )
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    logger.warn('Cannot match: request not found', { requestId, error: requestError });
    return [];
  }

  const [{ data: services }, { data: cuisines }] = await Promise.all([
    supabase.from('request_services').select('category_id').eq('request_id', requestId),
    supabase.from('request_cuisines').select('cuisine_id').eq('request_id', requestId),
  ]);

  const categoryIds = (services ?? []).map((s) => s.category_id);
  const cuisineIds = (cuisines ?? []).map((c) => c.cuisine_id);

  const criteria: RequestCriteria = {
    categoryIds,
    cityId: request.city_id,
    areaId: request.area_id,
    guestCount: request.guest_count,
    eventDate: request.event_date,
    eventTypeId: request.event_type_id,
    cuisineIds,
    budgetMinor: request.budget_total_minor ?? request.budget_max_minor,
    budgetPerPersonMinor: request.budget_per_person_minor,
  };

  const candidates = await loadCandidates({
    categoryIds,
    cityId: request.city_id,
    eventDate: request.event_date,
  });

  const results = matchPartners(candidates, criteria, {
    weights: options.weights ?? DEFAULT_WEIGHTS,
    limit: options.limit,
  });

  if (options.persist !== false && results.length > 0) {
    const { error } = await supabase.from('request_match_candidates').upsert(
      results.map((r) => ({
        request_id: requestId,
        partner_id: r.partnerId,
        category_id: r.categoryId,
        score: r.score,
        breakdown: r.breakdown as unknown as Json,
        reasons: r.reasons,
        disqualified: r.disqualified,
        disqualify_reason: r.disqualifyReason,
        computed_at: new Date().toISOString(),
      })),
      { onConflict: 'request_id,partner_id,category_id' },
    );
    if (error) logger.warn('Failed to persist match candidates', { requestId, error });
  }

  return results;
}

/** Assembles the candidate pool with the live signals the engine needs. */
async function loadCandidates(filters: {
  categoryIds: string[];
  cityId: string | null;
  eventDate: string | null;
}): Promise<PartnerCandidate[]> {
  const supabase = createAdminSupabase();

  let query = supabase
    .from('partner_search_index')
    .select(
      'partner_id, display_name, category_ids, city_ids, area_ids, cuisine_ids, event_type_ids, min_guests, max_guests, min_order_minor, rating_avg, rating_count, completed_bookings, price_from_minor',
    );

  // Narrow in the database where we can; the engine still re-checks.
  if (filters.categoryIds.length) query = query.overlaps('category_ids', filters.categoryIds);
  if (filters.cityId) query = query.contains('city_ids', [filters.cityId]);

  const { data: rawRows, error } = await query.limit(400);
  if (error || !rawRows?.length) {
    if (error) logger.warn('Partner index query failed', { error });
    return [];
  }

  // A view exposes every column as nullable because PostgreSQL does not
  // carry NOT NULL through a view definition. Narrow once, here.
  const indexRows = rawRows.flatMap((r) =>
    r.partner_id && r.display_name ? [{ ...r, partner_id: r.partner_id, display_name: r.display_name }] : [],
  );
  if (!indexRows.length) return [];

  const partnerIds = indexRows.map((r) => r.partner_id);

  const [{ data: profiles }, { data: blocked }, { data: bookings }] = await Promise.all([
    supabase
      .from('partner_profiles')
      .select('id, is_accepting_orders, verification_status, response_rate_bps, daily_event_capacity, lead_time_hours')
      .in('id', partnerIds),
    filters.eventDate
      ? supabase
          .from('partner_availability')
          .select('partner_id, on_date')
          .in('partner_id', partnerIds)
          .eq('is_blocked', true)
          .eq('on_date', filters.eventDate)
      : Promise.resolve({ data: [] as { partner_id: string; on_date: string }[] }),
    filters.eventDate
      ? supabase
          .from('bookings')
          .select('partner_id')
          .in('partner_id', partnerIds)
          .eq('service_date', filters.eventDate)
          .in('status', ['pending_payment', 'partially_paid', 'confirmed', 'in_preparation', 'ready', 'in_progress'])
      : Promise.resolve({ data: [] as { partner_id: string }[] }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const blockedByPartner = new Map<string, string[]>();
  for (const row of blocked ?? []) {
    blockedByPartner.set(row.partner_id, [...(blockedByPartner.get(row.partner_id) ?? []), row.on_date]);
  }
  const loadByPartner = new Map<string, number>();
  for (const row of bookings ?? []) {
    loadByPartner.set(row.partner_id, (loadByPartner.get(row.partner_id) ?? 0) + 1);
  }

  // Price ceilings come from the partner's category rows.
  const { data: priceRows } = await supabase
    .from('partner_categories')
    .select('partner_id, price_to_minor')
    .in('partner_id', partnerIds);
  const priceToByPartner = new Map<string, number>();
  for (const row of priceRows ?? []) {
    if (row.price_to_minor == null) continue;
    const current = priceToByPartner.get(row.partner_id);
    if (current == null || row.price_to_minor > current) {
      priceToByPartner.set(row.partner_id, row.price_to_minor);
    }
  }

  return indexRows.flatMap((row) => {
    const profile = profileById.get(row.partner_id);
    if (!profile) return [];
    return [{
      partnerId: row.partner_id,
      displayName: row.display_name,
      categoryIds: row.category_ids ?? [],
      cityIds: row.city_ids ?? [],
      areaIds: row.area_ids ?? [],
      cuisineIds: row.cuisine_ids ?? [],
      eventTypeIds: row.event_type_ids ?? [],
      minGuests: row.min_guests,
      maxGuests: row.max_guests,
      minOrderMinor: row.min_order_minor ?? 0,
      priceFromMinor: row.price_from_minor,
      priceToMinor: priceToByPartner.get(row.partner_id) ?? null,
      ratingAvg: row.rating_avg ?? 0,
      ratingCount: row.rating_count ?? 0,
      completedBookings: row.completed_bookings ?? 0,
      responseRateBps: profile.response_rate_bps,
      isAcceptingOrders: profile.is_accepting_orders,
      isVerified: profile.verification_status === 'approved',
      blockedDates: blockedByPartner.get(row.partner_id) ?? [],
      bookingsOnDate: loadByPartner.get(row.partner_id) ?? 0,
      dailyEventCapacity: profile.daily_event_capacity,
      leadTimeHours: profile.lead_time_hours,
    }];
  });
}
