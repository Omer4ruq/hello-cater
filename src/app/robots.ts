import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

/**
 * Private surfaces are excluded explicitly. They are also protected by
 * auth and RLS — this just keeps them out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production';

  return {
    rules: isProduction
      ? [{
          userAgent: '*',
          allow: '/',
          disallow: [
            '/dashboard/', '/partner/', '/admin/', '/account/', '/api/',
            '/login', '/register', '/reset-password', '/forgot-password', '/auth/',
          ],
        }]
      // Preview and staging deployments must never be indexed.
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
