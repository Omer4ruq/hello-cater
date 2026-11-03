import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCatalogEventTypes } from '@/features/content/queries';
import { EVENT_SEGMENTS } from '@/features/content/fallback';
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

const SEGMENT_PHOTOS: Record<string, { img: string; alt: string }> = {
  corporate: { img: '/img/photos/conference.jpg', alt: 'Conference hall set with round tables and screens' },
  wedding: { img: '/img/photos/longtable.jpg', alt: 'Long table set with flowers and glassware' },
  private: { img: '/img/photos/terrace.jpg', alt: 'Terrace dining area overlooking water' },
  social: { img: '/img/photos/dining.jpg', alt: 'Dining tables laid for a gathering' },
  government: { img: '/img/photos/panel.jpg', alt: 'Panel discussion on a stage' },
};

const photoCard = 'object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105';
const chip = 'absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100';

export default async function EventsPage() {
  const eventTypes = await getCatalogEventTypes();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Events', path: '/events' }])} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page pt-14 lg:pt-20">
        <div className="max-w-3xl">
          <p className="eyebrow">Occasions</p>
          <h1 className="mt-3 text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            Built around how {brand.country} celebrates
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            A Tuesday office lunch and a three-day wedding need very different handling. We shape the
            brief, the partners and the coordination around the occasion.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full px-7">
            <Link href="/plan">Plan an Event <ArrowRight aria-hidden className="icon-nudge" /></Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {EVENT_SEGMENTS.map((segment) => (
            <Link key={segment.key} href={`/events/${segment.key}`} className="group block">
              <div className="relative aspect-3/2 overflow-hidden rounded-2xl bg-ink-100">
                <Image
                  src={SEGMENT_PHOTOS[segment.key].img} alt={SEGMENT_PHOTOS[segment.key].alt}
                  fill loading="eager" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className={photoCard}
                />
                <span aria-hidden className={chip}>Explore <ArrowRight className="icon-nudge size-3.5" /></span>
              </div>
              <p className="mt-3 font-semibold text-ink-900">{segment.title}</p>
              <p className="text-sm text-ink-600">{segment.blurb}</p>
            </Link>
          ))}
          <Link href="/plan" className="group block">
            <div className="relative aspect-3/2 overflow-hidden rounded-2xl bg-ink-100">
              <Image
                src="/img/photos/audience.jpg" alt="Audience seated for a programme" fill loading="eager"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className={photoCard}
              />
              <span aria-hidden className={chip}>Send a brief <ArrowRight className="icon-nudge size-3.5" /></span>
            </div>
            <p className="mt-3 font-semibold text-ink-900">Something else</p>
            <p className="text-sm text-ink-600">Tell us what you are planning and we will shape it.</p>
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------- Event type lists */}
      {EVENT_SEGMENTS.map((segment) => {
        const items = eventTypes.filter((e) => e.segment === segment.key);
        if (items.length === 0) return null;

        return (
          <section key={segment.key} className="reveal container-page pt-20" aria-labelledby={`segment-${segment.key}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <h2 id={`segment-${segment.key}`} className="text-2xl">{segment.title}</h2>
                <p className="mt-1 text-ink-600">{segment.blurb}</p>
              </div>
              {segment.key !== 'wedding' ? (
                <Link href={`/events/${segment.key}`} className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
                  Overview
                </Link>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((eventType) => (
                <Link
                  key={eventType.id}
                  href={`/events/${eventType.slug}`}
                  className="rounded-2xl border border-ink-200 p-5 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
                >
                  <p className="font-semibold text-ink-900">{eventType.name}</p>
                  {eventType.name_bn ? (
                    <p lang="bn" className="text-sm text-ink-500">{eventType.name_bn}</p>
                  ) : null}
                  {eventType.typical_guests_min && eventType.typical_guests_max ? (
                    <p className="mt-2 text-sm text-ink-600">
                      Typically {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
                    </p>
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
          <Image src="/img/photos/banquet.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">Tell us about your event</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Share the occasion, date and guest count. Our team comes back with matched partners and
            comparable quotations. Free and non-binding.
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
