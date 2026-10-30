import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEventTypes } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Event types we arrange in Dhaka',
  description:
    'Corporate events, weddings, holud, receptions, birthdays, conferences, iftar parties and more — arranged end to end with verified partners in Dhaka.',
  path: '/events',
  keywords: ['wedding planning Dhaka', 'corporate events Bangladesh', 'holud arrangement', 'birthday party Dhaka'],
});

const SEGMENTS = [
  { key: 'corporate', title: 'Corporate', art: '/img/corporate.svg', blurb: 'Lunches, conferences, launches, dealer programmes and iftar.' },
  { key: 'wedding', title: 'Wedding', art: '/img/wedding.svg', blurb: 'Holud, mehendi, akhd, wedding and reception — one plan across all of it.' },
  { key: 'private', title: 'Private', art: '/img/events.svg', blurb: 'Birthdays, anniversaries and family gatherings.' },
  { key: 'social', title: 'Social & religious', art: '/img/catering.svg', blurb: 'Aqiqah, milad, cultural nights and community programmes.' },
  { key: 'government', title: 'Government & NGO', art: '/img/vendors.svg', blurb: 'Public programmes with procurement-friendly documentation.' },
];

export default async function EventsPage() {
  const eventTypes = await getEventTypes();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Events', path: '/events' }])} />

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">Occasions</p>
          <h1 className="mt-2 max-w-3xl text-display-lg">
            Built around how {brand.country} celebrates
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            A Tuesday office lunch and a three-day wedding need very different handling. We shape the
            brief, the partners and the coordination around the occasion.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/plan">Plan an Event <ArrowRight aria-hidden /></Link>
          </Button>
        </div>
      </section>

      <div className="container-page space-y-14 py-16">
        {SEGMENTS.map((segment) => {
          const items = eventTypes.filter((e) => e.segment === segment.key);
          if (items.length === 0) return null;

          return (
            <section key={segment.key} aria-labelledby={`segment-${segment.key}`}>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="max-w-xl">
                  <h2 id={`segment-${segment.key}`} className="text-display-sm">{segment.title}</h2>
                  <p className="mt-2 text-ink-600">{segment.blurb}</p>
                </div>
                <div className="relative hidden h-20 w-40 overflow-hidden rounded-lg sm:block">
                  <Image src={segment.art} alt="" fill sizes="160px" className="object-cover" />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((eventType) => (
                  <Link key={eventType.id} href={`/events/${eventType.slug}`} className="group">
                    <Card interactive className="h-full p-4">
                      <p className="font-sans text-sm font-semibold text-ink-950 group-hover:text-brand-800">
                        {eventType.name}
                      </p>
                      {eventType.name_bn ? (
                        <p lang="bn" className="mt-0.5 text-xs text-ink-500">{eventType.name_bn}</p>
                      ) : null}
                      {eventType.typical_guests_min && eventType.typical_guests_max ? (
                        <p className="mt-2 text-xs text-ink-500">
                          Typically {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
                        </p>
                      ) : null}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
