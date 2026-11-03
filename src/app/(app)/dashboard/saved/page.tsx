import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart, Star } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
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

// Partners without a cover photo get a stand-in so the grid keeps its rhythm.
const STAND_IN_PHOTOS = ['/img/photos/buffet.jpg', '/img/photos/banquet.jpg', '/img/photos/chef.jpg', '/img/photos/dining.jpg', '/img/photos/longtable.jpg', '/img/photos/terrace.jpg'];

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
        <div className="motion-stagger grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((favorite, index) => {
            const partner = favorite.partner_profiles as unknown as {
              id: string; slug: string; display_name: string; tagline: string | null;
              logo_url: string | null; cover_image_url: string | null; rating_avg: number; rating_count: number;
            } | null;
            if (!partner) return null;

            return (
              <Link key={favorite.id} href={`/partners/${partner.slug}`} className="group block min-w-0">
                <div className="relative aspect-20/19 overflow-hidden rounded-2xl bg-ink-100">
                  <Image
                    src={partner.cover_image_url ?? STAND_IN_PHOTOS[index % STAND_IN_PHOTOS.length]}
                    alt=""
                    fill
                    priority={index < 3}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    {partner.logo_url ? (
                      <span className="relative size-9 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white">
                        <Image src={partner.logo_url} alt="" fill sizes="36px" className="object-cover" />
                      </span>
                    ) : null}
                    <VerifiedBadge className="border-transparent bg-white font-bold text-ink-900 shadow-md" />
                  </div>
                  <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white text-brand-700 shadow-md">
                    <Heart aria-hidden className="size-4 fill-current" />
                    <span className="sr-only">Saved</span>
                  </span>
                  <span
                    aria-hidden
                    className="absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  >
                    View profile <ArrowRight className="icon-nudge size-3.5" />
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <h2 className="truncate font-sans text-base font-semibold text-ink-900">{partner.display_name}</h2>
                  {partner.rating_count > 0 ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-ink-900">
                      <Star aria-hidden className="size-3.5 fill-current" />
                      {partner.rating_avg.toFixed(2)}
                      <span className="sr-only">out of 5 from {partner.rating_count} reviews</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-sm text-ink-900">New</span>
                  )}
                </div>
                {partner.tagline ? <p className="line-clamp-2 text-sm text-ink-600">{partner.tagline}</p> : null}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
