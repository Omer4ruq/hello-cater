import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartnerCard } from '@/features/marketplace/components/partner-card';
import { searchPartners } from '@/features/marketplace/queries';
import { getCategories, getEventTypes, getFaqs } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 1800;

export async function generateStaticParams() {
  const eventTypes = await getEventTypes();
  return eventTypes.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const eventTypes = await getEventTypes();
  const eventType = eventTypes.find((e) => e.slug === slug);
  if (!eventType) return buildMetadata({ title: 'Event type not found', description: '', noIndex: true });

  return buildMetadata({
    title: eventType.seo_title ?? `${eventType.name} planning & catering in ${brand.launchCity}`,
    description:
      eventType.seo_description ??
      eventType.short_description ??
      `Plan your ${eventType.name.toLowerCase()} in ${brand.launchCity}. One requirement, comparable quotations from verified catering and event partners, one invoice.`,
    path: `/events/${slug}`,
    keywords: [`${eventType.name} Dhaka`, `${eventType.name} catering`, `${eventType.name} planning Bangladesh`],
  });
}

const SEGMENT_ART: Record<string, string> = {
  corporate: '/img/corporate.svg',
  wedding: '/img/wedding.svg',
  private: '/img/events.svg',
  social: '/img/catering.svg',
  government: '/img/vendors.svg',
};

/** Typical service mix per segment — the checklist a planner would run. */
const SEGMENT_SERVICES: Record<string, string[]> = {
  corporate: ['Catering', 'Venue', 'Sound system', 'LED screen', 'Stage', 'Photography', 'Host / MC'],
  wedding: ['Catering', 'Decoration', 'Venue', 'Photography', 'Videography', 'Sound & lighting', 'Makeup', 'Mehendi artist'],
  private: ['Catering', 'Decoration', 'Cake & dessert', 'Photography', 'Entertainment'],
  social: ['Catering', 'Decoration', 'Sound system', 'Furniture & seating', 'Tent'],
  government: ['Catering', 'Venue', 'Stage', 'Sound system', 'Transport', 'Security'],
};

export default async function EventTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [eventTypes, categories] = await Promise.all([getEventTypes(), getCategories()]);
  const eventType = eventTypes.find((e) => e.slug === slug);
  if (!eventType) notFound();

  const [partners, faqs] = await Promise.all([
    searchPartners({ eventType: slug, pageSize: 8 }),
    getFaqs('customer'),
  ]);

  const related = eventTypes.filter((e) => e.segment === eventType.segment && e.id !== eventType.id).slice(0, 10);
  const serviceNames = SEGMENT_SERVICES[eventType.segment] ?? SEGMENT_SERVICES.private;
  const serviceLinks = serviceNames
    .map((name) => categories.find((c) => c.name.toLowerCase() === name.toLowerCase()))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      <JsonLd data={serviceJsonLd({
        name: `${eventType.name} planning and catering`,
        description: eventType.short_description ?? `${eventType.name} in ${brand.launchCity}`,
        path: `/events/${slug}`,
        category: eventType.segment,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Events', path: '/events' },
        { name: eventType.name, path: `/events/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faqs.slice(0, 5).map((f) => ({ question: f.question, answer: f.answer })))} />

      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 -z-10">
          <Image
            src={SEGMENT_ART[eventType.segment] ?? '/img/hero.svg'}
            alt="" fill priority sizes="100vw" className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/65 to-ink-950/35" />
        </div>

        <div className="container-page py-16 text-white lg:py-24">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/60">
            <Link href="/events" className="hover:text-white">Events</Link>
            <span className="mx-2" aria-hidden>/</span>
            <span className="text-white/90">{eventType.name}</span>
          </nav>

          <h1 className="max-w-3xl text-display-lg text-white">
            {eventType.name} in {brand.launchCity}, handled properly
          </h1>
          {eventType.name_bn ? (
            <p lang="bn" className="mt-2 text-lg text-saffron-300">{eventType.name_bn}</p>
          ) : null}
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            {eventType.description ?? eventType.short_description ??
              `Tell us about your ${eventType.name.toLowerCase()} once. We shortlist verified partners, collect comparable written quotations and coordinate everything into one plan.`}
          </p>

          {eventType.typical_guests_min && eventType.typical_guests_max ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/80">
              <Users aria-hidden className="size-3.5" />
              Typically {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href={`/plan?eventTypeSlug=${slug}`}>Plan this event <ArrowRight aria-hidden /></Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href={`/partners?eventType=${slug}`}>Browse partners</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-display-sm">What a {eventType.name.toLowerCase()} usually needs</h2>
            <p className="mt-3 text-ink-600">
              Select what applies when you submit your requirement — we can combine several vendors
              into one proposal with a single total.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {serviceLinks.map((service) => (
                <Link key={service.id} href={`/services/${service.slug}`} className="group">
                  <Card interactive className="flex items-center gap-3 p-4">
                    <CheckCircle2 aria-hidden className="size-4 shrink-0 text-brand-600" />
                    <span className="text-sm font-medium text-ink-900 group-hover:text-brand-800">
                      {service.name}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <Card className="h-fit p-6">
            <h2 className="font-sans text-base font-semibold text-ink-950">
              Why organisers use us for this
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                'One brief instead of five phone calls',
                'Written, comparable quotations',
                'Verified partners with checked capacity',
                'One proposal and one invoice across vendors',
                'A coordinator on the day',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild block className="mt-6">
              <Link href={`/plan?eventTypeSlug=${slug}`}>Start your request</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-ink-500">Free and non-binding</p>
          </Card>
        </div>
      </section>

      {partners.rows.length > 0 ? (
        <section className="border-y border-ink-200 bg-white py-14">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <h2 className="text-display-sm">Partners who do {eventType.name.toLowerCase()}</h2>
              <Button asChild variant="secondary">
                <Link href={`/partners?eventType=${slug}`}>See all <ArrowRight aria-hidden /></Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {partners.rows.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 className="text-display-sm">Common questions</h2>
            <p className="mt-3 text-ink-600">
              Still unsure?{' '}
              <Link href="/contact" className="font-medium text-brand-700 underline underline-offset-4">
                Talk to our team
              </Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {faqs.slice(0, 6).map((faq) => (
              <details key={faq.id} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sans text-base font-medium text-ink-950">
                  {faq.question}
                  <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-300 text-ink-600 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 pr-10 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="container-page pb-16">
          <h2 className="font-sans text-base font-semibold text-ink-950">Related occasions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((item) => (
              <Link key={item.id} href={`/events/${item.slug}`}>
                <Badge tone="neutral" className="px-3.5 py-1.5 text-sm hover:border-brand-300 hover:bg-brand-50">
                  {item.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
