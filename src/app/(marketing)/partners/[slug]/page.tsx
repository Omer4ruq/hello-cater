import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CalendarCheck, MapPin, MessageSquare, Star, Users, Utensils } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Money, PerPerson } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { getPublicPartner, listPublishedPartnerSlugs } from '@/features/marketplace/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { appUrl } from '@/lib/env';
import { formatDateShort } from '@/lib/dates';

export const revalidate = 900;

export async function generateStaticParams() {
  const slugs = await listPublishedPartnerSlugs(200);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPartner(slug);
  if (!data) return buildMetadata({ title: 'Partner not found', description: '', noIndex: true });

  const { partner } = data;
  return buildMetadata({
    title: partner.seo_title ?? `${partner.display_name} — verified partner`,
    description:
      partner.seo_description ??
      partner.tagline ??
      `${partner.display_name} is a verified catering and event partner on Evently BD. Request a quotation with your date, guest count and budget.`,
    path: `/partners/${slug}`,
    type: 'profile',
    image: partner.cover_image_url ?? undefined,
  });
}

export default async function PartnerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPartner(slug);
  if (!data) notFound();

  const { partner, packages, menus, portfolio, reviews, categories, serviceAreas, operatingHours } = data;

  const ratingBreakdown = (key: 'quality_rating' | 'communication_rating' | 'punctuality_rating' | 'value_rating') => {
    const values = reviews.map((r) => r[key]).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: partner.display_name,
    description: partner.about ?? partner.tagline ?? undefined,
    image: partner.cover_image_url ?? undefined,
    url: `${appUrl}/partners/${slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: partner.city ?? 'Dhaka',
      addressCountry: 'BD',
    },
    ...(partner.rating_count && partner.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: partner.rating_avg,
            reviewCount: partner.rating_count,
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Partners', path: '/partners' },
          { name: partner.display_name ?? slug, path: `/partners/${slug}` },
        ])}
      />

      {/* -------------------------------------------------------- Cover */}
      <div className="relative h-52 bg-ink-200 sm:h-72">
        <Image
          src={partner.cover_image_url ?? '/img/partner.svg'}
          alt=""
          fill priority sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 to-transparent" />
      </div>

      <div className="container-page">
        <div className="-mt-12 flex flex-wrap items-end gap-5 sm:-mt-16">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border-4 border-paper bg-white sm:size-32">
            <Image
              src={partner.logo_url ?? '/img/catering.svg'}
              alt={`${partner.display_name} logo`}
              fill sizes="128px" className="object-cover"
            />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-medium text-ink-950 sm:text-4xl">
                {partner.display_name}
              </h1>
              <VerifiedBadge />
            </div>
            {partner.tagline ? <p className="mt-1.5 text-ink-600">{partner.tagline}</p> : null}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0">
            <dl className="grid grid-cols-2 gap-4 border-y border-ink-200 py-5 sm:grid-cols-4">
              <Fact icon={Star} label="Rating">
                {partner.rating_count && partner.rating_count > 0
                  ? `${partner.rating_avg?.toFixed(1)} (${partner.rating_count})`
                  : 'New partner'}
              </Fact>
              <Fact icon={CalendarCheck} label="Events delivered">
                {partner.completed_bookings ?? 0}
              </Fact>
              <Fact icon={Users} label="Capacity">
                {partner.min_guests ?? 1}–{partner.max_guests ?? '∞'} guests
              </Fact>
              <Fact icon={MapPin} label="Based in">{partner.city ?? 'Dhaka'}</Fact>
            </dl>

            <Tabs defaultValue="about" className="mt-6">
              <TabsList>
                <TabsTrigger value="about">About</TabsTrigger>
                {packages.length > 0 ? <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger> : null}
                {menus.length > 0 ? <TabsTrigger value="menus">Menus ({menus.length})</TabsTrigger> : null}
                {portfolio.length > 0 ? <TabsTrigger value="portfolio">Portfolio</TabsTrigger> : null}
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="about">
                <div className="prose-sm max-w-none space-y-6">
                  {partner.about ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-ink-700">{partner.about}</p>
                  ) : (
                    <p className="text-ink-600">
                      This partner has not written a description yet. Request a quotation and our team
                      will share their full capability profile with you.
                    </p>
                  )}

                  <div>
                    <h2 className="font-sans text-base font-semibold text-ink-950">Services</h2>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {categories.map((c) => {
                        const category = c.service_categories as unknown as { name: string; slug: string } | null;
                        return category ? (
                          <Link key={c.category_id} href={`/services/${category.slug}`}>
                            <Badge tone={c.is_primary ? 'brand' : 'neutral'}>{category.name}</Badge>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div>
                    <h2 className="font-sans text-base font-semibold text-ink-950">Service areas</h2>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {serviceAreas.map((area) => {
                        const areaName = (area.areas as unknown as { name: string } | null)?.name;
                        const cityName = (area.cities as unknown as { name: string } | null)?.name;
                        return (
                          <Badge key={area.id} tone="neutral">
                            {areaName ?? `${cityName} — all areas`}
                          </Badge>
                        );
                      })}
                      {serviceAreas.length === 0 ? (
                        <p className="text-sm text-ink-600">Contact us to confirm coverage for your venue.</p>
                      ) : null}
                    </div>
                  </div>

                  {partner.payment_terms || partner.cancellation_policy ? (
                    <div>
                      <h2 className="font-sans text-base font-semibold text-ink-950">Terms</h2>
                      {partner.payment_terms ? (
                        <p className="mt-2 text-sm text-ink-700">
                          <span className="font-medium">Payment: </span>{partner.payment_terms}
                        </p>
                      ) : null}
                      {partner.cancellation_policy ? (
                        <p className="mt-1.5 text-sm text-ink-700">
                          <span className="font-medium">Cancellation: </span>{partner.cancellation_policy}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {operatingHours.length > 0 ? (
                    <div>
                      <h2 className="font-sans text-base font-semibold text-ink-950">Operating hours</h2>
                      <ul className="mt-2 grid gap-1 text-sm text-ink-700 sm:grid-cols-2">
                        {operatingHours.map((hour) => (
                          <li key={hour.day_of_week} className="flex justify-between gap-4 sm:max-w-64">
                            <span>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][hour.day_of_week]}</span>
                            <span className="text-ink-600">
                              {hour.is_closed ? 'Closed' : `${hour.opens_at?.slice(0, 5)} – ${hour.closes_at?.slice(0, 5)}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              {packages.length > 0 ? (
                <TabsContent value="packages">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {packages.map((pkg) => {
                      const items = (pkg.package_items as unknown as {
                        id: string; label: string; detail: string | null;
                        is_optional: boolean; addon_price_minor: number | null; sort_order: number;
                      }[] | null) ?? [];
                      const category = pkg.service_categories as unknown as { name: string } | null;

                      return (
                        <Card key={pkg.id} className="flex flex-col overflow-hidden">
                          {pkg.hero_image_url ? (
                            <div className="relative h-36">
                              <Image src={pkg.hero_image_url} alt="" fill sizes="(min-width:640px) 50vw, 100vw" className="object-cover" />
                            </div>
                          ) : null}
                          <CardContent className="flex flex-1 flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-sans text-base font-semibold text-ink-950">{pkg.name}</h3>
                              {pkg.is_featured ? <Badge tone="saffron">Popular</Badge> : null}
                            </div>
                            {category ? <Badge tone="neutral" className="mt-1.5 self-start">{category.name}</Badge> : null}
                            {pkg.description ? (
                              <p className="mt-2.5 text-sm text-ink-600">{pkg.description}</p>
                            ) : null}

                            {items.length > 0 ? (
                              <ul className="mt-3 space-y-1 text-sm text-ink-700">
                                {items
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .slice(0, 8)
                                  .map((item) => (
                                    <li key={item.id} className="flex items-start gap-2">
                                      <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-600" />
                                      <span>
                                        {item.label}
                                        {item.is_optional ? <span className="text-ink-500"> (optional)</span> : null}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            ) : null}

                            <div className="mt-auto pt-4">
                              <p className="text-sm">
                                {pkg.per_person_price_minor > 0 ? (
                                  <PerPerson minor={pkg.per_person_price_minor} className="font-semibold text-ink-950" />
                                ) : (
                                  <span className="font-semibold text-ink-950">
                                    <Money minor={pkg.base_price_minor} />
                                  </span>
                                )}
                              </p>
                              {pkg.min_guests ? (
                                <p className="mt-0.5 text-xs text-ink-500">
                                  Minimum {pkg.min_guests} guests
                                  {pkg.max_guests ? ` · up to ${pkg.max_guests}` : ''}
                                </p>
                              ) : null}
                              <Button asChild block size="sm" className="mt-3">
                                <Link href={`/plan?partner=${slug}`}>Request this package</Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-xs text-ink-500">
                    Prices are indicative and confirmed in a written quotation against your exact date,
                    headcount and location.
                  </p>
                </TabsContent>
              ) : null}

              {menus.length > 0 ? (
                <TabsContent value="menus">
                  <div className="space-y-6">
                    {menus.map((menu) => {
                      const items = (menu.menu_items as unknown as {
                        id: string; name: string; description: string | null; unit: string;
                        price_minor: number; is_vegetarian: boolean; sort_order: number; is_active: boolean;
                      }[] | null) ?? [];
                      const cuisine = menu.cuisines as unknown as { name: string } | null;

                      return (
                        <Card key={menu.id}>
                          <CardHeader>
                            <CardTitle as="h3">{menu.name}</CardTitle>
                            {cuisine ? <Badge tone="saffron" className="self-start">{cuisine.name}</Badge> : null}
                            {menu.description ? <p className="text-sm text-ink-600">{menu.description}</p> : null}
                          </CardHeader>
                          <CardContent className="pt-3">
                            <ul className="divide-y divide-ink-100">
                              {items
                                .filter((i) => i.is_active)
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map((item) => (
                                  <li key={item.id} className="flex items-start justify-between gap-4 py-2.5">
                                    <div>
                                      <p className="text-sm font-medium text-ink-900">
                                        {item.name}
                                        {item.is_vegetarian ? <Badge tone="success" className="ml-2">Veg</Badge> : null}
                                      </p>
                                      {item.description ? (
                                        <p className="mt-0.5 text-sm text-ink-600">{item.description}</p>
                                      ) : null}
                                    </div>
                                    <p className="shrink-0 text-sm font-medium text-ink-950">
                                      <Money minor={item.price_minor} />
                                      <span className="block text-xs font-normal text-ink-500">
                                        {item.unit.replace(/_/g, ' ')}
                                      </span>
                                    </p>
                                  </li>
                                ))}
                            </ul>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              ) : null}

              {portfolio.length > 0 ? (
                <TabsContent value="portfolio">
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((item) => (
                      <li key={item.id}>
                        <figure>
                          <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-ink-100">
                            <Image
                              src={item.image_url}
                              alt={item.title ?? `Work by ${partner.display_name}`}
                              fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                          {item.title || item.caption ? (
                            <figcaption className="mt-2 text-sm">
                              {item.title ? <span className="block font-medium text-ink-900">{item.title}</span> : null}
                              {item.caption ? <span className="block text-ink-600">{item.caption}</span> : null}
                              {item.guest_count ? (
                                <span className="block text-xs text-ink-500">
                                  {item.guest_count} guests
                                  {item.taken_on ? ` · ${formatDateShort(item.taken_on)}` : ''}
                                </span>
                              ) : null}
                            </figcaption>
                          ) : null}
                        </figure>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ) : null}

              <TabsContent value="reviews">
                {reviews.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title="No reviews yet"
                    description="Reviews can only be left by customers with a completed booking on the platform, so there are none for this partner yet."
                  />
                ) : (
                  <>
                    <dl className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-ink-200 bg-white p-5 sm:grid-cols-4">
                      {([
                        ['Food & service', 'quality_rating'],
                        ['Communication', 'communication_rating'],
                        ['Punctuality', 'punctuality_rating'],
                        ['Value', 'value_rating'],
                      ] as const).map(([label, key]) => {
                        const value = ratingBreakdown(key);
                        return (
                          <div key={key}>
                            <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
                            <dd className="mt-0.5 font-sans text-lg font-semibold text-ink-950">
                              {value ? value.toFixed(1) : '—'}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>

                    <ul className="space-y-5">
                      {reviews.map((review) => {
                        const response = (review.review_responses as unknown as { body: string; created_at: string }[] | null)?.[0];
                        return (
                          <li key={review.id} className="border-b border-ink-100 pb-5 last:border-0">
                            <p className="text-sm text-saffron-600" aria-label={`${review.rating} out of 5`}>
                              <span aria-hidden>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                            </p>
                            {review.title ? (
                              <h3 className="mt-1.5 font-sans text-base font-semibold text-ink-950">{review.title}</h3>
                            ) : null}
                            {review.comment ? (
                              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{review.comment}</p>
                            ) : null}
                            <p className="mt-2 text-xs text-ink-500">
                              Verified customer · {formatDateShort(review.created_at)}
                            </p>
                            {response ? (
                              <div className="mt-3 rounded-lg border-l-2 border-brand-400 bg-ink-50 p-3.5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                                  Reply from {partner.display_name}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{response.body}</p>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ------------------------------------------------- CTA panel */}
          <Card className="lg:sticky lg:top-24">
            <CardContent>
              <h2 className="font-sans text-base font-semibold text-ink-950">
                Request a quotation
              </h2>
              <p className="mt-1.5 text-sm text-ink-600">
                Tell us your date, guest count and budget. We will get a written quotation from{' '}
                {partner.display_name} — and, if useful, comparable quotes from similar partners.
              </p>

              <dl className="mt-4 space-y-2 border-y border-ink-100 py-4 text-sm">
                {partner.min_order_minor && partner.min_order_minor > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-600">Minimum order</dt>
                    <dd className="font-medium text-ink-900"><Money minor={partner.min_order_minor} /></dd>
                  </div>
                ) : null}
                {partner.lead_time_hours ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-600">Notice needed</dt>
                    <dd className="text-ink-900">{partner.lead_time_hours} hours</dd>
                  </div>
                ) : null}
                {partner.year_established ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-600">Operating since</dt>
                    <dd className="text-ink-900">{partner.year_established}</dd>
                  </div>
                ) : null}
              </dl>

              <Button asChild block size="lg" className="mt-4">
                <Link href={`/plan?partner=${slug}`}>Request a quotation</Link>
              </Button>
              <Button asChild block variant="secondary" className="mt-2">
                <Link href="/contact">
                  <MessageSquare aria-hidden /> Ask our team
                </Link>
              </Button>

              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                Requests are free and non-binding. All communication runs through the platform so
                quotations, changes and commitments stay documented for both sides.
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="mt-16 border-t border-ink-200 py-10">
          <h2 className="font-sans text-lg font-semibold text-ink-950">Looking at other options?</h2>
          <p className="mt-1.5 text-ink-600">
            Submit one requirement and we will bring back comparable quotations from several verified
            partners — including this one.
          </p>
          <Button asChild className="mt-5">
            <Link href="/plan">
              <Utensils aria-hidden /> Plan your event
            </Link>
          </Button>
        </section>
      </div>
    </>
  );
}

function Fact({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
        <Icon aria-hidden className="size-3.5" /> {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-ink-950">{children}</dd>
    </div>
  );
}
