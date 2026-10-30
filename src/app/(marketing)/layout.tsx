import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { getSessionUser } from '@/features/auth/session';
import { isSupabaseConfigured } from '@/lib/env';
import { JsonLd, organizationJsonLd } from '@/lib/seo';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // The public site must render for signed-out visitors and before
  // Supabase is configured, so this read is best-effort.
  const user = isSupabaseConfigured ? await getSessionUser().catch(() => null) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={organizationJsonLd()} />
      <SiteHeader isAuthenticated={Boolean(user)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
