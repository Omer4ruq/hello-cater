import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCatalogCategories } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Catering & event services in Dhaka',
  description:
    'Every service we arrange: corporate and wedding catering, event management, decoration, venues, photography, sound, lighting and more — from verified partners in Dhaka.',
  path: '/services',
  keywords: ['catering services Dhaka', 'event services Bangladesh', 'event suppliers Dhaka'],
});

const GROUPS = [
  { kind: 'catering' as const, slug: 'catering', title: 'Catering', img: '/img/photos/buffet.jpg', alt: 'Buffet service with chafing dishes and flowers', blurb: 'Corporate, wedding, private and packed catering from verified kitchens.' },
  { kind: 'event_service' as const, slug: 'event-management', title: 'Event management', img: '/img/photos/stage.jpg', alt: 'Lit stage set for an event programme', blurb: 'Planning, production and on-the-day coordination.' },
  { kind: 'vendor' as const, slug: 'event-vendors', title: 'Vendors & suppliers', img: '/img/photos/banquet.jpg', alt: 'Banquet hall dressed for a dinner', blurb: 'Decor, venue, photography, sound, lighting, staffing and the rest.' },
];

export default async function ServicesPage() {
  const categories = await getCatalogCategories();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page pt-14 lg:pt-20">
        <div className="max-w-3xl">
          <p className="eyebrow">What we arrange</p>
          <h1 className="mt-3 text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            Every service an event in {brand.launchCity} needs
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            Pick one service or several. For multi-vendor events we combine everything into a single
            proposal with one total and one coordinator.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-7">
            <Link href="/plan">Plan an Event <ArrowRight aria-hidden className="icon-nudge" /></Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-8 md:grid-cols-3">
          {GROUPS.map((group) => (
            <Link key={group.slug} href={`/services/${group.slug}`} className="group block">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-100">
                <Image
                  src={group.img} alt={group.alt} fill loading="eager"
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  Explore <ArrowRight className="icon-nudge size-3.5" />
                </span>
              </div>
              <p className="mt-3 font-semibold text-ink-900">{group.title}</p>
              <p className="text-sm text-ink-600">{group.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- Category listings */}
      {GROUPS.map((group) => {
        const items = categories.filter((c) => c.kind === group.kind && c.parent_id);
        if (items.length === 0) return null;

        return (
          <section key={group.kind} className="reveal container-page pt-20" aria-labelledby={`group-${group.kind}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 id={`group-${group.kind}`} className="text-2xl">{group.title}</h2>
                <p className="mt-1 text-ink-600">{group.blurb}</p>
              </div>
              <Link href={`/services/${group.slug}`} className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
                Overview
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((category) => (
                <Link
                  key={category.id}
                  href={`/services/${category.slug}`}
                  className="rounded-2xl border border-ink-200 p-5 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
                >
                  <p className="font-semibold text-ink-900">{category.name}</p>
                  {category.name_bn ? (
                    <p lang="bn" className="text-sm text-ink-500">{category.name_bn}</p>
                  ) : null}
                  {category.short_description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-600">{category.short_description}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* --------------------------------------------------- Final CTA */}
      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src="/img/photos/longtable.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">
            Not sure which services you need?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Describe the event and our team works out the mix, then comes back with comparable
            quotations from verified partners.
          </p>
          <Button asChild size="lg" variant="accent" className="mt-8 rounded-full px-7">
            <Link href="/plan">
              Plan an Event <ArrowRight aria-hidden className="icon-nudge" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
