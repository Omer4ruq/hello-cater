import { Suspense } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { PartnerCard } from '@/features/marketplace/components/partner-card';
import { SearchFilters } from '@/features/marketplace/components/search-filters';
import { searchPartners } from '@/features/marketplace/queries';
import { getAreas, getCategories, getCities, getCuisines, getEventTypes } from '@/features/content/queries';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Verified catering & event partners in Dhaka',
  description:
    'Browse verified caterers, decorators, photographers, venues and event managers in Dhaka. Compare capacity, pricing and reviews, then request a quotation.',
  path: '/partners',
  keywords: ['caterers in Dhaka', 'event vendors Dhaka', 'wedding decorators Dhaka', 'event photographers Bangladesh'],
});

export const revalidate = 600;

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [categories, cities, areas, cuisines, eventTypes] = await Promise.all([
    getCategories(), getCities(), getAreas('dhaka'), getCuisines(), getEventTypes(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Partners', path: '/partners' }])} />

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">Our network</p>
          <h1 className="mt-2 max-w-3xl text-display-lg">
            Verified catering and event partners in {brand.launchCity}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            Every partner here has passed business verification and capacity checks. Browse them, or
            skip the browsing and let our team shortlist for your specific brief.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/plan">Get matched partners</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <Suspense fallback={<div className="h-24" />}>
          <PartnerResults
            params={params}
            filterOptions={{
              categories: categories
                .filter((c) => c.parent_id)
                .map((c) => ({ value: c.slug, label: c.name })),
              cities: cities.filter((c) => c.is_launched).map((c) => ({ value: c.slug, label: c.name })),
              areas: areas.map((a) => ({ value: a.slug, label: a.name })),
              cuisines: cuisines.map((c) => ({ value: c.slug, label: c.name })),
              eventTypes: eventTypes.map((e) => ({ value: e.slug, label: e.name })),
            }}
          />
        </Suspense>
      </section>
    </>
  );
}

async function PartnerResults({
  params, filterOptions,
}: {
  params: Record<string, string | undefined>;
  filterOptions: {
    categories: { value: string; label: string }[];
    cities: { value: string; label: string }[];
    areas: { value: string; label: string }[];
    cuisines: { value: string; label: string }[];
    eventTypes: { value: string; label: string }[];
  };
}) {
  const result = await searchPartners({
    category: params.category,
    city: params.city,
    area: params.area,
    cuisine: params.cuisine,
    eventType: params.eventType,
    guests: params.guests ? Number(params.guests) : undefined,
    minRating: params.minRating ? Number(params.minRating) : undefined,
    sort: params.sort as never,
    page: Number(params.page) || 1,
    q: params.q,
  });

  return (
    <>
      <SearchFilters {...filterOptions} resultCount={result.total} />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No partners match those filters yet"
          description="We are onboarding partners continuously. Tell us your requirement and our team will match you manually — including partners not yet listed publicly."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/plan">Submit a requirement</Link></Button>
              <Button asChild variant="secondary"><Link href="/partners">Clear filters</Link></Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.rows.map((partner, index) => (
              <PartnerCard key={partner.id} partner={partner} priority={index < 4} />
            ))}
          </div>
          <Pagination
            className="mt-8"
            page={result.page} pageCount={result.pageCount} total={result.total}
            basePath="/partners" searchParams={params}
          />
        </>
      )}
    </>
  );
}
