import 'server-only';

import { cache } from 'react';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { Tables } from '@/types/database';
import { FALLBACK_FAQS, FALLBACK_HOME_SECTIONS, FALLBACK_TESTIMONIALS } from './fallback';

/**
 * Runs a public read and degrades to a fallback instead of throwing.
 *
 * Marketing pages must render even if the database is briefly
 * unavailable — an outage should not take the whole front door down.
 * Dashboard queries deliberately do NOT use this: there, failing loudly
 * is correct.
 */
async function safeRead<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured) return fallback;
  try {
    return await fn();
  } catch (error) {
    logger.warn('Public content query failed, serving fallback', { label, error });
    return fallback;
  }
}

export type CategorySummary = Pick<
  Tables<'service_categories'>,
  | 'id' | 'slug' | 'name' | 'name_bn' | 'kind' | 'short_description' | 'description'
  | 'image_url' | 'icon' | 'is_featured' | 'parent_id' | 'sort_order'
  | 'seo_title' | 'seo_description'
>;

export const getCategories = cache(async (kind?: Tables<'service_categories'>['kind']) =>
  safeRead<CategorySummary[]>('categories', async () => {
    const supabase = await createServerSupabase();
    let query = supabase
      .from('service_categories')
      .select('id, slug, name, name_bn, kind, short_description, description, image_url, icon, is_featured, parent_id, sort_order, seo_title, seo_description')
      .eq('is_active', true)
      .order('sort_order');
    if (kind) query = query.eq('kind', kind);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, []),
);

export type EventTypeSummary = Pick<
  Tables<'event_types'>,
  | 'id' | 'slug' | 'name' | 'name_bn' | 'segment' | 'short_description' | 'description'
  | 'image_url' | 'is_featured' | 'typical_guests_min' | 'typical_guests_max' | 'sort_order'
  | 'seo_title' | 'seo_description'
>;

export const getEventTypes = cache(async (segment?: string) =>
  safeRead<EventTypeSummary[]>('event_types', async () => {
    const supabase = await createServerSupabase();
    let query = supabase
      .from('event_types')
      .select('id, slug, name, name_bn, segment, short_description, description, image_url, is_featured, typical_guests_min, typical_guests_max, sort_order, seo_title, seo_description')
      .eq('is_active', true)
      .order('sort_order');
    if (segment) query = query.eq('segment', segment);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, []),
);

export const getCities = cache(async () =>
  safeRead('cities', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('cities')
      .select('id, slug, name, name_bn, is_launched')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }, [] as { id: string; slug: string; name: string; name_bn: string | null; is_launched: boolean }[]),
);

export const getAreas = cache(async (citySlug = 'dhaka') =>
  safeRead('areas', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('areas')
      .select('id, slug, name, name_bn, city_id, cities!inner(slug)')
      .eq('is_active', true)
      .eq('cities.slug', citySlug)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as unknown as { id: string; slug: string; name: string; name_bn: string | null; city_id: string }[];
  }, [] as { id: string; slug: string; name: string; name_bn: string | null; city_id: string }[]),
);

export const getCuisines = cache(async () =>
  safeRead('cuisines', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('cuisines').select('id, slug, name, name_bn').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data ?? [];
  }, [] as { id: string; slug: string; name: string; name_bn: string | null }[]),
);

type SectionItems = Record<string, unknown>[];

export type HomeSectionBlock = {
  key: string;
  heading: string | null;
  subheading: string | null;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
} | null;

export type HomeSections = {
  hero: { heading: string; subheading: string; cta_label: string; cta_href: string };
  trust: { value: string; label: string }[];
  howItWorks: { title: string; body: string }[];
  whyUs: { title: string; body: string }[];
  corporate: HomeSectionBlock;
  wedding: HomeSectionBlock;
  finalCta: HomeSectionBlock;
};

export const getHomeSections = cache(async () =>
  safeRead<HomeSections>('home_sections', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('cms_sections')
      .select('key, heading, subheading, body, cta_label, cta_href, image_url, items')
      .eq('page_slug', 'home')
      .eq('is_published', true)
      .order('sort_order');
    if (error) throw error;

    const byKey = Object.fromEntries((data ?? []).map((s) => [s.key, s]));
    return {
      hero: {
        heading: byKey.hero?.heading ?? FALLBACK_HOME_SECTIONS.hero.heading,
        subheading: byKey.hero?.subheading ?? FALLBACK_HOME_SECTIONS.hero.subheading,
        cta_label: byKey.hero?.cta_label ?? FALLBACK_HOME_SECTIONS.hero.cta_label,
        cta_href: byKey.hero?.cta_href ?? FALLBACK_HOME_SECTIONS.hero.cta_href,
      },
      trust: (byKey.trust?.items as SectionItems | undefined)?.length
        ? (byKey.trust!.items as unknown as { value: string; label: string }[])
        : [...FALLBACK_HOME_SECTIONS.trust],
      howItWorks: (byKey.how_it_works?.items as SectionItems | undefined)?.length
        ? (byKey.how_it_works!.items as unknown as { title: string; body: string }[])
        : [...FALLBACK_HOME_SECTIONS.how_it_works],
      whyUs: (byKey.why_us?.items as SectionItems | undefined)?.length
        ? (byKey.why_us!.items as unknown as { title: string; body: string }[])
        : [...FALLBACK_HOME_SECTIONS.why_us],
      corporate: byKey.corporate ?? null,
      wedding: byKey.wedding ?? null,
      finalCta: byKey.final_cta ?? null,
    };
  }, {
    hero: { ...FALLBACK_HOME_SECTIONS.hero },
    trust: [...FALLBACK_HOME_SECTIONS.trust],
    howItWorks: [...FALLBACK_HOME_SECTIONS.how_it_works],
    whyUs: [...FALLBACK_HOME_SECTIONS.why_us],
    corporate: null,
    wedding: null,
    finalCta: null,
  }),
);

export const getFaqs = cache(async (audience: 'customer' | 'partner' = 'customer') =>
  safeRead('faqs', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('faqs')
      .select('id, question, answer, topic, audience')
      .eq('is_published', true)
      .in('audience', [audience, 'all'])
      .order('sort_order');
    if (error) throw error;
    return data?.length ? data : FALLBACK_FAQS;
  }, FALLBACK_FAQS),
);

export const getTestimonials = cache(async () =>
  safeRead('testimonials', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('testimonials')
      .select('id, author_name, author_title, company, quote, rating, event_type, avatar_url')
      .eq('is_published', true)
      .order('sort_order');
    if (error) throw error;
    return data?.length ? data : FALLBACK_TESTIMONIALS;
  }, FALLBACK_TESTIMONIALS),
);

export type PublicPartner = {
  id: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  rating_avg: number;
  rating_count: number;
  completed_bookings: number;
  min_guests: number | null;
  max_guests: number | null;
  min_order_minor: number;
  is_featured: boolean;
  city: string | null;
  area: string | null;
};

export const getFeaturedPartners = cache(async (limit = 6) =>
  safeRead<PublicPartner[]>('featured_partners', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('public_partners')
      .select('id, slug, display_name, tagline, logo_url, cover_image_url, rating_avg, rating_count, completed_bookings, min_guests, max_guests, min_order_minor, is_featured, city, area')
      .order('is_featured', { ascending: false })
      .order('rating_avg', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PublicPartner[];
  }, []),
);

export const getCmsPage = cache(async (slug: string) =>
  safeRead('cms_page', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('cms_pages')
      .select('slug, title, subtitle, body, hero_image_url, seo_title, seo_description, needs_legal_review, updated_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, null as Tables<'cms_pages'> | null),
);

/** Public platform settings (brand.*, features.*, payments.enabled). */
export const getPublicSettings = cache(async () =>
  safeRead('public_settings', async () => {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('system_settings').select('key, value').eq('is_public', true);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  }, {} as Record<string, unknown>),
);
