import 'server-only';

import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Public marketplace reads.
 *
 * Everything here goes through `partner_search_index` / `public_partners`
 * — definer's-rights views that expose only publishable columns of
 * approved, published partners. Commercial terms, verification notes and
 * payout details are not reachable from the public site at all.
 */

export type PartnerFilters = {
  category?: string;
  city?: string;
  area?: string;
  cuisine?: string;
  eventType?: string;
  guests?: number;
  minRating?: number;
  maxBudgetMinor?: number;
  sort?: 'recommended' | 'rating' | 'price_low' | 'experience';
  page?: number;
  pageSize?: number;
  q?: string;
};

export type PartnerCard = {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  completedBookings: number;
  isFeatured: boolean;
  minGuests: number | null;
  maxGuests: number | null;
  minOrderMinor: number;
  priceFromMinor: number | null;
  categoryIds: string[];
  cityIds: string[];
  areaIds: string[];
};

export async function searchPartners(filters: PartnerFilters): Promise<{
  rows: PartnerCard[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(filters.pageSize ?? 12, 48);
  const empty = { rows: [], total: 0, page, pageCount: 0 };

  if (!isSupabaseConfigured) return empty;

  try {
    const supabase = await createServerSupabase();

    // Resolve slug filters to ids in one round trip.
    const [categoryId, cityId, areaId, cuisineId, eventTypeId] = await Promise.all([
      filters.category ? resolveId(supabase, 'service_categories', filters.category) : null,
      filters.city ? resolveId(supabase, 'cities', filters.city) : null,
      filters.area ? resolveId(supabase, 'areas', filters.area) : null,
      filters.cuisine ? resolveId(supabase, 'cuisines', filters.cuisine) : null,
      filters.eventType ? resolveId(supabase, 'event_types', filters.eventType) : null,
    ]);

    let query = supabase
      .from('partner_search_index')
      .select(
        'partner_id, slug, display_name, tagline, logo_url, cover_image_url, rating_avg, rating_count, completed_bookings, is_featured, min_guests, max_guests, min_order_minor, price_from_minor, category_ids, city_ids, area_ids',
        { count: 'exact' },
      );

    if (categoryId) query = query.contains('category_ids', [categoryId]);
    if (cityId) query = query.contains('city_ids', [cityId]);
    if (areaId) query = query.contains('area_ids', [areaId]);
    if (cuisineId) query = query.contains('cuisine_ids', [cuisineId]);
    if (eventTypeId) query = query.contains('event_type_ids', [eventTypeId]);
    if (filters.q) query = query.ilike('display_name', `%${filters.q}%`);
    if (filters.minRating) query = query.gte('rating_avg', filters.minRating);

    // Capacity: the partner must be able to serve the headcount.
    if (filters.guests) {
      query = query.or(`max_guests.is.null,max_guests.gte.${filters.guests}`);
      query = query.or(`min_guests.is.null,min_guests.lte.${filters.guests}`);
    }
    if (filters.maxBudgetMinor) {
      query = query.or(`min_order_minor.is.null,min_order_minor.lte.${filters.maxBudgetMinor}`);
    }

    switch (filters.sort) {
      case 'rating':
        query = query.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false });
        break;
      case 'price_low':
        query = query.order('price_from_minor', { ascending: true, nullsFirst: false });
        break;
      case 'experience':
        query = query.order('completed_bookings', { ascending: false });
        break;
      default:
        // "Recommended": featured first, then proven, then well rated.
        query = query
          .order('is_featured', { ascending: false })
          .order('completed_bookings', { ascending: false })
          .order('rating_avg', { ascending: false });
    }

    const start = (page - 1) * pageSize;
    const { data, count, error } = await query.range(start, start + pageSize - 1);
    if (error) throw error;

    return {
      rows: (data ?? []).flatMap((row) =>
        row.partner_id && row.slug && row.display_name
          ? [{
              id: row.partner_id,
              slug: row.slug,
              displayName: row.display_name,
              tagline: row.tagline,
              logoUrl: row.logo_url,
              coverImageUrl: row.cover_image_url,
              ratingAvg: row.rating_avg ?? 0,
              ratingCount: row.rating_count ?? 0,
              completedBookings: row.completed_bookings ?? 0,
              isFeatured: row.is_featured ?? false,
              minGuests: row.min_guests,
              maxGuests: row.max_guests,
              minOrderMinor: row.min_order_minor ?? 0,
              priceFromMinor: row.price_from_minor,
              categoryIds: row.category_ids ?? [],
              cityIds: row.city_ids ?? [],
              areaIds: row.area_ids ?? [],
            }]
          : [],
      ),
      total: count ?? 0,
      page,
      pageCount: Math.ceil((count ?? 0) / pageSize),
    };
  } catch (error) {
    logger.warn('Partner search failed', { error });
    return empty;
  }
}

async function resolveId(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  table: 'service_categories' | 'cities' | 'areas' | 'cuisines' | 'event_types',
  slug: string,
): Promise<string | null> {
  const { data } = await supabase.from(table).select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}

/** Full public profile for one partner. Returns null when not published. */
export const getPublicPartner = cache(async (slug: string) => {
  if (!isSupabaseConfigured) return null;

  try {
    const supabase = await createServerSupabase();

    const { data: partner } = await supabase
      .from('public_partners')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!partner?.id) return null;

    const [packages, menus, portfolio, reviews, categories, areas, hours] = await Promise.all([
      supabase
        .from('partner_packages')
        .select('id, slug, name, description, hero_image_url, base_price_minor, per_person_price_minor, min_guests, max_guests, is_featured, package_items(id, label, detail, is_optional, addon_price_minor, sort_order), service_categories(name)')
        .eq('partner_id', partner.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('menus')
        .select('id, name, description, cuisines(name), menu_items(id, name, description, unit, price_minor, is_vegetarian, sort_order, is_active)')
        .eq('partner_id', partner.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('partner_portfolio')
        .select('id, title, caption, image_url, guest_count, taken_on')
        .eq('partner_id', partner.id)
        .eq('is_public', true)
        .order('sort_order'),
      supabase
        .from('reviews')
        .select('id, rating, quality_rating, communication_rating, punctuality_rating, value_rating, title, comment, is_anonymous, created_at, review_responses(body, created_at)')
        .eq('partner_id', partner.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('partner_categories')
        .select('category_id, is_primary, price_from_minor, price_to_minor, service_categories(name, slug, kind)')
        .eq('partner_id', partner.id),
      supabase
        .from('partner_service_areas')
        .select('id, cities(name, slug), areas(name, slug)')
        .eq('partner_id', partner.id),
      supabase
        .from('partner_operating_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('partner_id', partner.id)
        .order('day_of_week'),
    ]);

    return {
      partner,
      packages: packages.data ?? [],
      menus: menus.data ?? [],
      portfolio: portfolio.data ?? [],
      reviews: reviews.data ?? [],
      categories: categories.data ?? [],
      serviceAreas: areas.data ?? [],
      operatingHours: hours.data ?? [],
    };
  } catch (error) {
    logger.warn('Public partner fetch failed', { slug, error });
    return null;
  }
});

/** Slugs for static generation and the sitemap. */
export async function listPublishedPartnerSlugs(limit = 1000): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.from('public_partners').select('slug').limit(limit);
    return (data ?? []).map((r) => r.slug).filter((s): s is string => Boolean(s));
  } catch {
    return [];
  }
}
