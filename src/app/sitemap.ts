import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';
import { getCategories, getCities, getEventTypes } from '@/features/content/queries';
import { listPublishedPartnerSlugs } from '@/features/marketplace/queries';
import { LEGAL_PAGES } from '@/features/content/legal';

export const revalidate = 3600;

/** Every indexable URL, generated from the live catalogue. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${appUrl}/plan`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${appUrl}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${appUrl}/events`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${appUrl}/partners`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${appUrl}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${appUrl}/corporate`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${appUrl}/become-a-partner`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${appUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${appUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const [categories, eventTypes, cities, partnerSlugs] = await Promise.all([
    getCategories(), getEventTypes(), getCities(), listPublishedPartnerSlugs(2000),
  ]);

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: `${appUrl}/services/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: c.is_featured ? 0.8 : 0.6,
    })),
    ...eventTypes.map((e) => ({
      url: `${appUrl}/events/${e.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: e.is_featured ? 0.8 : 0.6,
    })),
    ...cities
      .filter((c) => c.is_launched)
      .map((c) => ({
        url: `${appUrl}/partners?city=${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ...partnerSlugs.map((slug) => ({
      url: `${appUrl}/partners/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...LEGAL_PAGES.map((p) => ({
      url: `${appUrl}/${p.slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}
