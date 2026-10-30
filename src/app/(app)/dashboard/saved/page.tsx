import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { listSavedPartners } from '@/features/customer/queries';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Saved partners', description: 'Partners you saved.',
  path: '/dashboard/saved', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function SavedPartnersPage() {
  await requireUserPage('/dashboard/saved');
  const saved = await listSavedPartners();

  return (
    <>
      <PageHeader
        title="Saved partners"
        description="Partners you shortlisted. Mention them in a request and we will include them when we invite quotes."
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Browse the marketplace and save partners you like the look of. We will factor them in when shortlisting for your next event."
          action={<Button asChild><Link href="/partners">Browse partners</Link></Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((favorite) => {
            const partner = favorite.partner_profiles as unknown as {
              id: string; slug: string; display_name: string; tagline: string | null;
              logo_url: string | null; rating_avg: number; rating_count: number;
            } | null;
            if (!partner) return null;

            return (
              <Link key={favorite.id} href={`/partners/${partner.slug}`} className="group">
                <Card interactive className="h-full">
                  <CardContent className="flex gap-4">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                      <Image
                        src={partner.logo_url ?? '/img/catering.svg'}
                        alt="" fill sizes="56px" className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-sans text-base font-semibold text-ink-950 group-hover:text-brand-800">
                          {partner.display_name}
                        </h2>
                        <VerifiedBadge />
                      </div>
                      {partner.tagline ? (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-600">{partner.tagline}</p>
                      ) : null}
                      <p className="mt-1.5 text-xs text-ink-500">
                        {partner.rating_count > 0
                          ? `★ ${partner.rating_avg.toFixed(1)} (${partner.rating_count} reviews)`
                          : 'New partner'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
