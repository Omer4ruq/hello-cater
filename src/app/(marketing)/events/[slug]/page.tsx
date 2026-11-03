import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, CheckCircle2, MessageSquare, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { PartnerCard } from '@/features/marketplace/components/partner-card';
import { searchPartners } from '@/features/marketplace/queries';
import { getCatalogCategories, getCatalogEventTypes, getFaqs } from '@/features/content/queries';
import { EVENT_SEGMENTS } from '@/features/content/fallback';
import { buildMetadata, JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 1800;

/**
 * The page shows one event type, or a whole segment when the slug is a
 * segment key (/events/corporate, /events/private: the header links there).
 * An event type with the same slug wins (/events/wedding).
 */
async function resolveOccasion(slug: string) {
  const eventTypes = await getCatalogEventTypes();
  const eventType = eventTypes.find((e) => e.slug === slug);
  if (eventType) return { eventTypes, eventType, segment: null };
  const segment = EVENT_SEGMENTS.find((s) => s.key === slug);
  if (segment) return { eventTypes, eventType: null, segment };
  return null;
}

export async function generateStaticParams() {
  const eventTypes = await getCatalogEventTypes();
  const slugs = new Set([...eventTypes.map((e) => e.slug), ...EVENT_SEGMENTS.map((s) => s.key)]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const occasion = await resolveOccasion(slug);
  if (!occasion) return buildMetadata({ title: 'Event type not found', description: '', noIndex: true });

  const { eventType, segment } = occasion;
  const name = eventType?.name ?? segment!.title;
  return buildMetadata({
    title: eventType?.seo_title ?? `${name} planning & catering in ${brand.launchCity}`,
    description:
      eventType?.seo_description ??
      eventType?.short_description ??
      `Plan your ${name.toLowerCase()} in ${brand.launchCity}. One requirement, comparable quotations from verified catering and event partners, one invoice.`,
    path: `/events/${slug}`,
    keywords: [`${name} Dhaka`, `${name} catering`, `${name} planning Bangladesh`],
  });
}

/** Typical service mix per segment — the checklist a planner would run. */
const SEGMENT_SERVICES: Record<string, string[]> = {
  corporate: ['Catering', 'Venue', 'Sound system', 'LED screen', 'Stage', 'Photography', 'Host / MC'],
  wedding: ['Catering', 'Decoration', 'Venue', 'Photography', 'Videography', 'Sound & lighting', 'Makeup', 'Mehendi artist'],
  private: ['Catering', 'Decoration', 'Cake & dessert', 'Photography', 'Entertainment'],
  social: ['Catering', 'Decoration', 'Sound system', 'Furniture & seating', 'Tent'],
  government: ['Catering', 'Venue', 'Stage', 'Sound system', 'Transport', 'Security'],
};

/** Photo per occasion: a specific match by slug, else one per segment. */
const SLUG_PHOTOS: Record<string, string> = {
  'corporate-lunch': 'buffet', 'corporate-dinner': 'banquet', conference: 'conference', seminar: 'panel',
  training: 'panel', workshop: 'panel', 'product-launch': 'stage', 'dealer-conference': 'conference',
  'annual-program': 'audience', 'corporate-iftar': 'dining', holud: 'stage', reception: 'banquet',
  walima: 'banquet', birthday: 'terrace', 'cultural-program': 'audience',
};
const SEGMENT_PHOTOS: Record<string, string> = {
  corporate: 'conference', wedding: 'longtable', private: 'terrace', social: 'dining', government: 'panel',
};
const photoFor = (slug: string, segment: string) =>
  `/img/photos/${SLUG_PHOTOS[slug] ?? SEGMENT_PHOTOS[segment] ?? 'banquet'}.jpg`;

export default async function EventTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [occasion, categories] = await Promise.all([resolveOccasion(slug), getCatalogCategories()]);
  if (!occasion) notFound();
  const { eventTypes, eventType, segment } = occasion;

  const segmentKey = eventType?.segment ?? segment!.key;
  const name = eventType?.name ?? segment!.title;
  const lower = name.toLowerCase();
  // Segment pages list their occasions instead of partners: the partner
  // search filters by event type, and a segment is not one.
  const [partners, faqs] = await Promise.all([
    eventType ? searchPartners({ eventType: slug, pageSize: 8 }) : null,
    getFaqs('customer'),
  ]);
  const planHref = eventType ? `/plan?eventTypeSlug=${slug}` : '/plan';
  const partnersHref = eventType ? `/partners?eventType=${slug}` : '/partners';

  const inSegment = eventTypes.filter((e) => e.segment === segmentKey && e.id !== eventType?.id);
  const serviceNames = SEGMENT_SERVICES[segmentKey] ?? SEGMENT_SERVICES.private;
  const serviceLinks = serviceNames
    .map((n) => categories.find((c) => c.name.toLowerCase() === n.toLowerCase()))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const photo = photoFor(slug, segmentKey);

  return (
    <>
      <JsonLd data={serviceJsonLd({
        name: `${name} planning and catering`,
        description: eventType?.short_description ?? segment?.blurb ?? `${name} in ${brand.launchCity}`,
        path: `/events/${slug}`,
        category: segmentKey,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Events', path: '/events' },
        { name, path: `/events/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faqs.slice(0, 5).map((f) => ({ question: f.question, answer: f.answer })))} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
            <Link href="/events" className="font-medium underline-offset-4 hover:text-ink-900 hover:underline">Events</Link>
            <span className="mx-2" aria-hidden>/</span>
            <span className="text-ink-900">{name}</span>
          </nav>
          <h1 className="mt-4 text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            {name} in {brand.launchCity}, handled properly
          </h1>
          {eventType?.name_bn ? (
            <p lang="bn" className="mt-2 text-lg text-ink-500">{eventType.name_bn}</p>
          ) : null}
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            {eventType?.description ?? eventType?.short_description ??
              `${segment?.blurb ?? ''} Tell us about your event once. We shortlist verified partners, collect comparable written quotations and coordinate everything into one plan.`}
          </p>

          {eventType?.typical_guests_min && eventType.typical_guests_max ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-50 px-3.5 py-1.5 text-sm font-medium text-ink-700">
              <Users aria-hidden className="size-3.5" />
              Typically {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href={planHref}>
                Plan this event <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
              <Link href={partnersHref}>Browse partners</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-ink-100">
          <Image src={photo} alt="" fill preload sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* --------------------------------------- Occasions (segment pages) */}
      {segment && inSegment.length > 0 ? (
        <section className="reveal container-page pt-12" aria-labelledby="occasions-heading">
          <h2 id="occasions-heading" className="text-2xl">Plan by occasion</h2>
          <div className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {inSegment.map((item) => (
              <Link key={item.id} href={`/events/${item.slug}`} className="group block">
                <div className="relative aspect-20/19 overflow-hidden rounded-2xl bg-ink-100">
                  <Image
                    src={photoFor(item.slug, item.segment)} alt="" fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                  >
                    Explore <ArrowRight className="icon-nudge size-3.5" />
                  </span>
                </div>
                <p className="mt-3 font-semibold text-ink-900">{item.name}</p>
                {item.short_description ? <p className="text-sm text-ink-600">{item.short_description}</p> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------- What it needs */}
      <section className="reveal container-page pt-16" aria-labelledby="needs-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <h2 id="needs-heading" className="text-2xl">
              {eventType ? `What a ${lower} usually needs` : `What ${lower} usually need`}
            </h2>
            <p className="mt-2 max-w-xl text-ink-600">
              Select what applies when you submit your requirement — we can combine several vendors
              into one proposal with a single total.
            </p>
            {serviceLinks.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {serviceLinks.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-ink-200 p-4 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
                  >
                    <CheckCircle2 aria-hidden className="size-4 shrink-0 text-ink-900" />
                    <span className="flex-1 text-sm font-semibold text-ink-900">{service.name}</span>
                    <ArrowRight aria-hidden className="icon-nudge size-4 text-ink-500" />
                  </Link>
                ))}
              </div>
            ) : (
              <ul className="mt-5 flex flex-wrap gap-2">
                {serviceNames.map((n) => (
                  <li key={n} className="rounded-full bg-ink-50 px-4 py-2 text-sm font-medium text-ink-700">{n}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="h-fit rounded-2xl border border-ink-200 p-6">
            <h2 className="font-sans text-base font-semibold text-ink-900">Why organisers use us for this</h2>
            <ul className="mt-4 space-y-3">
              {[
                'One brief instead of five phone calls',
                'Written, comparable quotations',
                'Verified partners with checked capacity',
                'One proposal and one invoice across vendors',
                'A coordinator on the day',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-900" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild block className="mt-6 rounded-full">
              <Link href={planHref}>Start your request</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-ink-500">Free and non-binding</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Partners */}
      {partners ? (
        <section className="reveal container-page pt-20" aria-labelledby="partners-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="partners-heading" className="text-2xl">Partners who do {lower}</h2>
            <Link href={partnersHref} className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
              See all
            </Link>
          </div>
          {partners.rows.length > 0 ? (
            <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {partners.rows.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
            </div>
          ) : (
            <EmptyState
              className="mt-5"
              icon={BadgeCheck}
              title={`No partners listed for ${lower} yet`}
              description="We are onboarding verified partners. Send your brief anyway — our team sources and vets partners for events like yours, including ones not yet listed publicly."
              action={
                <Button asChild className="rounded-full px-6">
                  <Link href={planHref}>Submit a requirement</Link>
                </Button>
              }
            />
          )}
        </section>
      ) : null}

      {/* ----------------------------------------------------------- FAQ */}
      <section className="reveal container-page pt-20" aria-labelledby="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 id="faq-heading" className="text-2xl">Common questions</h2>
            <p className="mt-3 text-ink-600">
              Still unsure?{' '}
              <Link href="/contact" className="font-semibold text-ink-900 underline underline-offset-4">
                Talk to our team
              </Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {faqs.slice(0, 6).map((faq) => (
              <details key={faq.id} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-5 font-sans text-base font-semibold text-ink-900 transition-colors hover:text-black [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <Plus
                    aria-hidden
                    className="size-5 shrink-0 text-ink-900 transition-transform duration-300 ease-(--ease-out-expo) group-open:rotate-45"
                  />
                </summary>
                <p className="pb-5 pr-10 text-ink-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Related */}
      {eventType && inSegment.length > 0 ? (
        <section className="reveal container-page pt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-sans text-base font-semibold text-ink-900">Related occasions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {inSegment.slice(0, 10).map((item) => (
              <Link
                key={item.id}
                href={`/events/${item.slug}`}
                className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-900 transition-colors duration-200 hover:border-ink-900"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------- Final CTA */}
      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src={photo} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">
            Tell us about your {eventType ? lower : 'event'}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            One brief, comparable written proposals from verified partners, one coordinator.
            Free and non-binding.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent" className="rounded-full px-7">
              <Link href={planHref}>
                Plan this event <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="rounded-full border-white/40 bg-transparent px-7 text-white hover:border-white hover:bg-white/10"
            >
              <Link href="/contact">
                <MessageSquare aria-hidden /> Talk to our team
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
