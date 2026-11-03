import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, CalendarCheck, MapPin, MessageSquare, Star, UserRound, Users, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money, PerPerson } from '@/components/ui/money';
import { EmptyState } from '@/components/ui/feedback';
import { formatDateShort } from '@/lib/dates';
import type { getPublicPartner } from '@/features/marketplace/queries';

export type PartnerProfileData = NonNullable<Awaited<ReturnType<typeof getPublicPartner>>>;

/** Stand-ins only fill gallery slots the partner has no photo for. */
const STAND_INS = ['/img/photos/banquet.jpg', '/img/photos/buffet.jpg', '/img/photos/dining.jpg', '/img/photos/longtable.jpg', '/img/photos/chef.jpg'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Presentational partner profile, shared by the real page and the dev preview. */
export function PartnerProfileView({ data, slug }: { data: PartnerProfileData; slug: string }) {
  const { partner, packages, menus, portfolio, reviews, categories, serviceAreas, operatingHours } = data;

  const hasRating = Boolean(partner.rating_count && partner.rating_count > 0);
  const ratingBreakdown = (key: 'quality_rating' | 'communication_rating' | 'punctuality_rating' | 'value_rating') => {
    const values = reviews.map((r) => r[key]).filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  const realPhotos = [partner.cover_image_url, ...portfolio.map((p) => p.image_url)].filter(
    (src): src is string => Boolean(src),
  );
  const gallery = [...realPhotos, ...STAND_INS.filter((s) => !realPhotos.includes(s))].slice(0, 5);
  const quoteHref = `/plan?partner=${slug}`;

  return (
    <div>
      {/* --------------------------------------------------- Title */}
      <div className="container-page pt-8 lg:pt-10">
        <h1 className="text-display-sm font-extrabold tracking-tight">{partner.display_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-900">
          <span className="inline-flex items-center gap-1 font-semibold">
            <BadgeCheck aria-hidden className="size-4 text-brand-700" /> Verified
          </span>
          <span aria-hidden className="text-ink-300">·</span>
          {hasRating ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star aria-hidden className="size-3.5 fill-current" />
              {partner.rating_avg?.toFixed(2)}
              <span className="font-normal text-ink-600">
                ({partner.rating_count} {partner.rating_count === 1 ? 'review' : 'reviews'})
              </span>
            </span>
          ) : (
            <span className="font-semibold">New</span>
          )}
          <span aria-hidden className="text-ink-300">·</span>
          <span className="text-ink-600">{partner.city ?? 'Dhaka'}</span>
        </div>
      </div>

      {/* ------------------------------------------------- Gallery */}
      <div className="container-page mt-6">
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-100 md:grid md:aspect-auto md:h-104 md:grid-cols-4 md:grid-rows-2 md:gap-2 lg:h-120">
          {gallery.map((src, i) => (
            <div
              key={i}
              className={
                i === 0
                  ? 'absolute inset-0 md:relative md:col-span-2 md:row-span-2'
                  : 'relative hidden bg-ink-100 md:block'
              }
            >
              <Image
                src={src}
                alt=""
                fill
                priority={i === 0}
                sizes={i === 0 ? '(min-width: 768px) 50vw, 100vw' : '25vw'}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------- Content + sidebar */}
      <div className="container-page mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-20">
        <div className="min-w-0 divide-y divide-ink-200">
          {/* Host row */}
          <div className="flex items-center gap-4 pb-8">
            {partner.logo_url ? (
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-ink-100">
                <Image src={partner.logo_url} alt={`${partner.display_name} logo`} fill sizes="56px" className="object-cover" />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink-900">{partner.tagline ?? `Catering and events by ${partner.display_name}`}</p>
              {partner.year_established ? (
                <p className="text-sm text-ink-600">Operating since {partner.year_established}</p>
              ) : null}
            </div>
          </div>

          {/* Highlights */}
          <dl className="grid gap-6 py-8 sm:grid-cols-3">
            <Fact icon={CalendarCheck} label="Events delivered">{partner.completed_bookings ?? 0}</Fact>
            <Fact icon={Users} label="Capacity">
              {partner.min_guests ?? 1}–{partner.max_guests ?? '∞'} guests
            </Fact>
            <Fact icon={MapPin} label="Based in">{partner.city ?? 'Dhaka'}</Fact>
          </dl>

          <Section title="About">
            {partner.about ? (
              <p className="whitespace-pre-wrap leading-relaxed text-ink-700">{partner.about}</p>
            ) : (
              <p className="text-ink-600">
                This partner has not written a description yet. Request a quotation and our team
                will share their full capability profile with you.
              </p>
            )}
          </Section>

          <Section title="Services">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const category = c.service_categories as unknown as { name: string; slug: string } | null;
                return category ? (
                  <Link
                    key={c.category_id}
                    href={`/services/${category.slug}`}
                    className={
                      'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150 ' +
                      (c.is_primary
                        ? 'border-ink-900 text-ink-900 hover:bg-ink-50'
                        : 'border-ink-300 text-ink-700 hover:border-ink-900 hover:text-ink-900')
                    }
                  >
                    {category.name}
                  </Link>
                ) : null;
              })}
            </div>

            <h3 className="mt-8 text-base font-semibold text-ink-900">Service areas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {serviceAreas.map((area) => {
                const areaName = (area.areas as unknown as { name: string } | null)?.name;
                const cityName = (area.cities as unknown as { name: string } | null)?.name;
                return (
                  <span key={area.id} className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3.5 py-1.5 text-sm text-ink-700">
                    <MapPin aria-hidden className="size-3.5" />
                    {areaName ?? `${cityName} — all areas`}
                  </span>
                );
              })}
              {serviceAreas.length === 0 ? (
                <p className="text-sm text-ink-600">Contact us to confirm coverage for your venue.</p>
              ) : null}
            </div>
          </Section>

          {packages.length > 0 ? (
            <Section title="Packages">
              <div className="grid items-start gap-5 sm:grid-cols-2">
                {packages.map((pkg) => {
                  const items = (pkg.package_items as unknown as {
                    id: string; label: string; detail: string | null;
                    is_optional: boolean; addon_price_minor: number | null; sort_order: number;
                  }[] | null) ?? [];
                  const category = pkg.service_categories as unknown as { name: string } | null;

                  return (
                    <article key={pkg.id} className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white">
                      {pkg.hero_image_url ? (
                        <div className="relative aspect-video bg-ink-100">
                          <Image src={pkg.hero_image_url} alt="" fill sizes="(min-width:640px) 400px, 100vw" className="object-cover" />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold text-ink-900">{pkg.name}</h3>
                          {pkg.is_featured ? <Badge tone="solid">Popular</Badge> : null}
                        </div>
                        {category ? <p className="mt-0.5 text-sm text-ink-500">{category.name}</p> : null}
                        {pkg.description ? <p className="mt-3 text-sm text-ink-600">{pkg.description}</p> : null}

                        {items.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-sm text-ink-700">
                            {items
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .slice(0, 8)
                              .map((item) => (
                                <li key={item.id} className="flex items-start gap-2">
                                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-400" />
                                  <span>
                                    {item.label}
                                    {item.is_optional ? <span className="text-ink-500"> (optional)</span> : null}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        ) : null}

                        <div className="mt-auto pt-5">
                          <p className="text-base">
                            {pkg.per_person_price_minor > 0 ? (
                              <PerPerson minor={pkg.per_person_price_minor} className="font-bold text-ink-900" />
                            ) : (
                              <span className="font-bold text-ink-900"><Money minor={pkg.base_price_minor} /></span>
                            )}
                          </p>
                          {pkg.min_guests ? (
                            <p className="mt-0.5 text-xs text-ink-500">
                              Minimum {pkg.min_guests} guests
                              {pkg.max_guests ? ` · up to ${pkg.max_guests}` : ''}
                            </p>
                          ) : null}
                          <Button asChild block variant="secondary" className="mt-4 h-11 rounded-full">
                            <Link href={quoteHref}>Request this package</Link>
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-ink-500">
                Prices are indicative and confirmed in a written quotation against your exact date,
                headcount and location.
              </p>
            </Section>
          ) : null}

          {menus.length > 0 ? (
            <Section title="Menus">
              <div className="space-y-5">
                {menus.map((menu) => {
                  const items = (menu.menu_items as unknown as {
                    id: string; name: string; description: string | null; unit: string;
                    price_minor: number; is_vegetarian: boolean; sort_order: number; is_active: boolean;
                  }[] | null) ?? [];
                  const cuisine = menu.cuisines as unknown as { name: string } | null;

                  return (
                    <article key={menu.id} className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold text-ink-900">{menu.name}</h3>
                        {cuisine ? <span className="text-sm text-ink-500">{cuisine.name}</span> : null}
                      </div>
                      {menu.description ? <p className="mt-1 text-sm text-ink-600">{menu.description}</p> : null}
                      <ul className="mt-3 divide-y divide-ink-200">
                        {items
                          .filter((i) => i.is_active)
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item) => (
                            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-ink-900">
                                  {item.name}
                                  {item.is_vegetarian ? <Badge tone="success" className="ml-2">Veg</Badge> : null}
                                </p>
                                {item.description ? <p className="mt-0.5 text-sm text-ink-600">{item.description}</p> : null}
                              </div>
                              <p className="shrink-0 text-right text-sm font-semibold text-ink-900">
                                <Money minor={item.price_minor} />
                                <span className="block text-xs font-normal text-ink-500">{item.unit.replace(/_/g, ' ')}</span>
                              </p>
                            </li>
                          ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {portfolio.length > 0 ? (
            <Section title="Portfolio">
              <ul className="grid gap-5 sm:grid-cols-2">
                {portfolio.map((item) => (
                  <li key={item.id}>
                    <figure className="group">
                      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-100">
                        <Image
                          src={item.image_url}
                          alt={item.title ?? `Work by ${partner.display_name}`}
                          fill sizes="(min-width:640px) 400px, 100vw"
                          className="object-cover transition-[scale] duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                        />
                      </div>
                      {item.title || item.caption ? (
                        <figcaption className="mt-2.5 text-sm">
                          {item.title ? <span className="block font-semibold text-ink-900">{item.title}</span> : null}
                          {item.caption ? <span className="block text-ink-600">{item.caption}</span> : null}
                          {item.guest_count ? (
                            <span className="block text-ink-500">
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
            </Section>
          ) : null}

          <Section
            title={
              hasRating ? (
                <span className="inline-flex items-center gap-2">
                  <Star aria-hidden className="size-5 fill-current" />
                  {partner.rating_avg?.toFixed(2)} · {partner.rating_count} {partner.rating_count === 1 ? 'review' : 'reviews'}
                </span>
              ) : (
                'Reviews'
              )
            }
          >
            {reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="Reviews can only be left by customers with a completed booking on the platform, so there are none for this partner yet."
              />
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                  {([
                    ['Food & service', 'quality_rating'],
                    ['Communication', 'communication_rating'],
                    ['Punctuality', 'punctuality_rating'],
                    ['Value', 'value_rating'],
                  ] as const).map(([label, key]) => {
                    const value = ratingBreakdown(key);
                    return (
                      <div key={key} className="sm:border-l sm:border-ink-200 sm:pl-4 sm:first:border-0 sm:first:pl-0">
                        <dt className="text-sm text-ink-600">{label}</dt>
                        <dd className="mt-0.5 text-lg font-bold text-ink-900">{value ? value.toFixed(1) : '—'}</dd>
                      </div>
                    );
                  })}
                </dl>

                <ul className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
                  {reviews.map((review) => {
                    const response = (review.review_responses as unknown as { body: string; created_at: string }[] | null)?.[0];
                    return (
                      <li key={review.id}>
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-600">
                            <UserRound className="size-5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-ink-900">Verified customer</p>
                            <p className="text-sm text-ink-500">{formatDateShort(review.created_at)}</p>
                          </div>
                        </div>
                        <p className="mt-3 flex gap-0.5 text-ink-900" aria-label={`${review.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} aria-hidden className={i < review.rating ? 'size-3.5 fill-current' : 'size-3.5 text-ink-300'} />
                          ))}
                        </p>
                        {review.title ? <h3 className="mt-2 text-base font-semibold text-ink-900">{review.title}</h3> : null}
                        {review.comment ? (
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{review.comment}</p>
                        ) : null}
                        {response ? (
                          <div className="mt-4 rounded-2xl bg-ink-50 p-4">
                            <p className="text-sm font-semibold text-ink-900">Reply from {partner.display_name}</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{response.body}</p>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Section>

          {partner.payment_terms || partner.cancellation_policy || operatingHours.length > 0 ? (
            <Section title="Things to know">
              <div className="grid gap-8 sm:grid-cols-2">
                {partner.payment_terms || partner.cancellation_policy ? (
                  <div className="space-y-3 text-sm text-ink-700">
                    <h3 className="text-base font-semibold text-ink-900">Terms</h3>
                    {partner.payment_terms ? (
                      <p><span className="font-semibold text-ink-900">Payment: </span>{partner.payment_terms}</p>
                    ) : null}
                    {partner.cancellation_policy ? (
                      <p><span className="font-semibold text-ink-900">Cancellation: </span>{partner.cancellation_policy}</p>
                    ) : null}
                  </div>
                ) : null}
                {operatingHours.length > 0 ? (
                  <div>
                    <h3 className="text-base font-semibold text-ink-900">Operating hours</h3>
                    <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                      {operatingHours.map((hour) => (
                        <li key={hour.day_of_week} className="flex justify-between gap-4 sm:max-w-64">
                          <span>{DAYS[hour.day_of_week]}</span>
                          <span className="text-ink-600">
                            {hour.is_closed ? 'Closed' : `${hour.opens_at?.slice(0, 5)} – ${hour.closes_at?.slice(0, 5)}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}
        </div>

        {/* ------------------------------------------- Quote card */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-bold text-ink-900">Request a quotation</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Tell us your date, guest count and budget. We will get a written quotation from{' '}
              {partner.display_name} — and, if useful, comparable quotes from similar partners.
            </p>

            <dl className="mt-5 divide-y divide-ink-200 rounded-xl border border-ink-300 text-sm empty:hidden">
              {partner.min_order_minor && partner.min_order_minor > 0 ? (
                <div className="flex justify-between gap-3 px-4 py-3">
                  <dt className="text-ink-600">Minimum order</dt>
                  <dd className="font-semibold text-ink-900"><Money minor={partner.min_order_minor} /></dd>
                </div>
              ) : null}
              {partner.lead_time_hours ? (
                <div className="flex justify-between gap-3 px-4 py-3">
                  <dt className="text-ink-600">Notice needed</dt>
                  <dd className="text-ink-900">{partner.lead_time_hours} hours</dd>
                </div>
              ) : null}
              {partner.year_established ? (
                <div className="flex justify-between gap-3 px-4 py-3">
                  <dt className="text-ink-600">Operating since</dt>
                  <dd className="text-ink-900">{partner.year_established}</dd>
                </div>
              ) : null}
            </dl>

            <Button asChild block size="lg" className="mt-5 rounded-full">
              <Link href={quoteHref}>
                Request a quotation <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button asChild block size="lg" variant="secondary" className="mt-3 rounded-full">
              <Link href="/contact">
                <MessageSquare aria-hidden /> Ask our team
              </Link>
            </Button>

            <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
              Requests are free and non-binding. All communication runs through the platform so
              quotations, changes and commitments stay documented for both sides.
            </p>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------ Other options */}
      <section className="reveal container-page pb-16 pt-16">
        <div className="rounded-3xl bg-ink-50 px-6 py-10 sm:px-10">
          <h2 className="text-2xl font-bold text-ink-900">Looking at other options?</h2>
          <p className="mt-2 max-w-xl text-ink-600">
            Submit one requirement and we will bring back comparable quotations from several verified
            partners — including this one.
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full">
            <Link href="/plan">
              <Utensils aria-hidden /> Plan your event
            </Link>
          </Button>
        </div>
      </section>

      {/* ------------------------------ Mobile bottom bar (sticky to this page, so it stops above the footer) */}
      <div className="sticky bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="container-page flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-ink-900">{partner.display_name}</p>
            {partner.min_order_minor && partner.min_order_minor > 0 ? (
              <p className="text-ink-600"><Money minor={partner.min_order_minor} compact /> minimum order</p>
            ) : (
              <p className="text-ink-600">Free, non-binding request</p>
            )}
          </div>
          <Button asChild size="lg" className="shrink-0 rounded-full px-6">
            <Link href={quoteHref}>Request a quote</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="reveal py-10">
      <h2 className="mb-6 text-2xl font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function Fact({
  icon: Icon, label, children,
}: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-ink-900" />
      <div>
        <dt className="text-sm text-ink-600">{label}</dt>
        <dd className="text-base font-semibold text-ink-900">{children}</dd>
      </div>
    </div>
  );
}
