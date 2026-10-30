import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCategories } from '@/features/content/queries';
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
  { kind: 'catering' as const, title: 'Catering', art: '/img/catering.svg', blurb: 'Corporate, wedding, private and packed catering from verified kitchens.' },
  { kind: 'event_service' as const, title: 'Event management', art: '/img/events.svg', blurb: 'Planning, production and on-the-day coordination.' },
  { kind: 'vendor' as const, title: 'Vendors & suppliers', art: '/img/vendors.svg', blurb: 'Decor, venue, photography, sound, lighting, staffing and the rest.' },
];

export default async function ServicesPage() {
  const categories = await getCategories();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])} />

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">What we arrange</p>
          <h1 className="mt-2 max-w-3xl text-display-lg">
            Every service an event in {brand.launchCity} needs
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            Pick one service or several. For multi-vendor events we combine everything into a single
            proposal with one total and one coordinator.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/plan">Plan an Event <ArrowRight aria-hidden /></Link>
          </Button>
        </div>
      </section>

      <div className="container-page space-y-16 py-16">
        {GROUPS.map((group) => {
          const items = categories.filter((c) => c.kind === group.kind && c.parent_id);
          if (items.length === 0) return null;

          return (
            <section key={group.kind} aria-labelledby={`group-${group.kind}`}>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="max-w-xl">
                  <h2 id={`group-${group.kind}`} className="text-display-sm">{group.title}</h2>
                  <p className="mt-2 text-ink-600">{group.blurb}</p>
                </div>
                <div className="relative hidden h-20 w-40 overflow-hidden rounded-lg sm:block">
                  <Image src={group.art} alt="" fill sizes="160px" className="object-cover" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((category) => (
                  <Link key={category.id} href={`/services/${category.slug}`} className="group">
                    <Card interactive className="h-full p-4">
                      <p className="font-sans text-sm font-semibold text-ink-950 group-hover:text-brand-800">
                        {category.name}
                      </p>
                      {category.name_bn ? (
                        <p lang="bn" className="mt-0.5 text-xs text-ink-500">{category.name_bn}</p>
                      ) : null}
                      {category.short_description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-600">
                          {category.short_description}
                        </p>
                      ) : null}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {categories.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-sans text-base font-semibold text-ink-900">Service catalogue loading</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
              Our service catalogue is managed from the admin console. Connect the database to see the
              full list, or tell us what you need and we will arrange it.
            </p>
            <Button asChild className="mt-6"><Link href="/plan">Plan an Event</Link></Button>
          </Card>
        ) : null}
      </div>
    </>
  );
}
