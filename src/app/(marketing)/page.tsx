import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BadgeCheck, Briefcase, Cake, FileText, Flower2, Handshake, Heart,
  MessageSquare, Mic, Moon, PartyPopper, Plus, Presentation, Repeat, Rocket,
  ShieldCheck, Sparkles, Star, Users, UtensilsCrossed, Wallet, Wine,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { buildMetadata, JsonLd, faqJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';
import {
  getCategories, getEventTypes, getFaqs, getFeaturedPartners,
  getHomeSections, getTestimonials,
} from '@/features/content/queries';
import { QuickRequestForm } from '@/features/requests/components/quick-request-form';

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  path: '/',
  keywords: [
    'catering Dhaka', 'corporate catering Bangladesh', 'wedding catering Dhaka',
    'event management Dhaka', 'holud decoration', 'office lunch catering',
    'event vendors Bangladesh',
  ],
});

const WHY_ICONS = [ShieldCheck, Handshake, FileText, Users, Wallet, Repeat];

/** Picks an icon for an event type from its name; the catalogue has no icon field. */
const OCCASION_ICONS: [RegExp, LucideIcon][] = [
  [/conference|seminar|summit/i, Presentation],
  [/town ?hall|agm|meeting/i, Users],
  [/lunch|catering|meal/i, UtensilsCrossed],
  [/iftar|ramadan|eid/i, Moon],
  [/launch/i, Rocket],
  [/dinner|gala|award/i, Wine],
  [/holud|mehendi/i, Flower2],
  [/wedding|reception|engagement/i, Heart],
  [/birthday|anniversary/i, Cake],
  [/party|celebration/i, PartyPopper],
  [/training|workshop|offsite/i, Briefcase],
  [/concert|music|cultural/i, Mic],
];
const occasionIcon = (name: string) =>
  OCCASION_ICONS.find(([re]) => re.test(name))?.[1] ?? Sparkles;

const OCCASIONS = [
  { title: 'Corporate events', body: 'Conferences, town halls, launches', href: '/events/corporate', img: '/img/photos/conference.jpg', alt: 'Conference hall set with round tables and screens' },
  { title: 'Office catering', body: 'Lunches, iftar, large buffets', href: '/services/catering', img: '/img/photos/buffet.jpg', alt: 'Buffet service with chafing dishes and flowers' },
  { title: 'Weddings & holud', body: 'Holud to reception, one plan', href: '/events/wedding', img: '/img/photos/longtable.jpg', alt: 'Long table set with flowers and glassware' },
  { title: 'Private & social', body: 'Dinners, birthdays, gatherings', href: '/events/private', img: '/img/photos/terrace.jpg', alt: 'Terrace dining area overlooking water' },
];

export default async function HomePage() {
  const [sections, categories, eventTypes, partners, testimonials, faqs] = await Promise.all([
    getHomeSections(),
    getCategories(),
    getEventTypes(),
    getFeaturedPartners(8),
    getTestimonials(),
    getFaqs('customer'),
  ]);

  const cateringCategories = categories.filter((c) => c.kind === 'catering' && c.parent_id).slice(0, 8);
  const vendorCategories = categories.filter((c) => c.kind === 'vendor' && c.parent_id).slice(0, 10);
  const occasions = [...eventTypes]
    .sort((a, b) => Number(b.segment === 'corporate') - Number(a.segment === 'corporate'))
    .slice(0, 12);

  return (
    <>
      <JsonLd data={faqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })))} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page pt-14 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            {sections.hero.heading}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600">{sections.hero.subheading}</p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <QuickRequestForm />
          <p className="mt-1 text-center text-sm text-ink-600">
            Tell us what you need. Free, non-binding, about two minutes.{' '}
            <Link href="/services" className="font-semibold text-ink-900 underline underline-offset-4 hover:text-black">
              Explore services
            </Link>
          </p>
        </div>

        {occasions.length > 0 ? (
          <nav aria-label="Occasions" className="hide-scrollbar mt-12 flex gap-8 overflow-x-auto border-b border-ink-200 sm:justify-center">
            {occasions.map((type) => {
              const Icon = occasionIcon(type.name);
              return (
                <Link
                  key={type.id}
                  href={`/events/${type.slug}`}
                  className="group flex shrink-0 flex-col items-center gap-2 border-b-2 border-transparent pb-3 pt-1 text-xs font-semibold text-ink-600 transition-colors duration-200 hover:border-ink-300 hover:text-ink-900"
                >
                  <Icon aria-hidden strokeWidth={1.6} className="size-6 transition-transform duration-200 ease-out group-hover:-translate-y-0.5" />
                  {type.name}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>

      {/* ------------------------------------------------ Browse by occasion */}
      <section className="container-page pt-12" aria-labelledby="occasions-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="occasions-heading" className="text-2xl">Plan by occasion</h2>
          <Link href="/events" className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
            All occasions
          </Link>
        </div>
        <div className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o) => (
            <Link key={o.href} href={o.href} className="group block">
              <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-ink-100">
                <Image
                  src={o.img} alt={o.alt} fill loading="eager"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-[1.05]"
                />
                <span
                  aria-hidden
                  className="absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  Explore <ArrowRight className="icon-nudge size-3.5" />
                </span>
              </div>
              <p className="mt-3 font-semibold text-ink-900">{o.title}</p>
              <p className="text-sm text-ink-600">{o.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ Verified partners */}
      <section className="reveal container-page pt-20" aria-labelledby="partners-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 id="partners-heading" className="text-2xl">Verified partners</h2>
            <p className="mt-1 text-ink-600">
              Checked for registration, capacity and past work before they can quote.
            </p>
          </div>
          <Link href="/partners" className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
            Browse partners
          </Link>
        </div>

        {partners.length > 0 ? (
          <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {partners.map((partner) => (
              <Link key={partner.id} href={`/partners/${partner.slug}`} className="group block min-w-0">
                <div className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-ink-100">
                  <Image
                    src={partner.cover_image_url ?? '/img/photos/chef.jpg'}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-[1.05]"
                  />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-900 shadow-md">
                    <BadgeCheck aria-hidden className="size-3.5 text-brand-700" /> Verified
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <h3 className="truncate font-sans text-base font-semibold text-ink-900">
                    {partner.display_name}
                  </h3>
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
                {partner.tagline ? <p className="truncate text-sm text-ink-600">{partner.tagline}</p> : null}
                {partner.max_guests ? <p className="text-sm text-ink-600">Up to {partner.max_guests} guests</p> : null}
                {partner.min_order_minor > 0 ? (
                  <p className="mt-1 text-sm text-ink-900">
                    <span className="font-semibold">from <Money minor={partner.min_order_minor} compact /></span> minimum
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid overflow-hidden rounded-3xl bg-ink-50 md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <BadgeCheck aria-hidden className="size-7 text-brand-700" />
              <p className="mt-4 text-xl font-bold text-ink-900">We are onboarding our founding partners</p>
              <p className="mt-2 max-w-md text-ink-600">
                Verified caterers, decorators, photographers and event managers appear here as they
                complete verification. Send a brief and our team will match you by hand meanwhile.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/plan">Plan an Event</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/become-a-partner">Become a partner</Link>
                </Button>
              </div>
            </div>
            <div className="relative min-h-72">
              <Image src="/img/photos/chef.jpg" alt="Chef preparing food for an event" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- Services */}
      {cateringCategories.length > 0 ? (
        <section className="reveal container-page pt-20" aria-labelledby="services-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 id="services-heading" className="text-2xl">Everything an event in Dhaka needs</h2>
              <p className="mt-1 text-ink-600">From a single verified partner or a full vendor team we coordinate.</p>
            </div>
            <Link href="/services" className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
              All services
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cateringCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/services/${cat.slug}`}
                className="rounded-2xl border border-ink-200 p-5 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
              >
                <p className="font-semibold text-ink-900">{cat.name}</p>
                {cat.name_bn ? <p lang="bn" className="text-sm text-ink-500">{cat.name_bn}</p> : null}
                {cat.short_description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-600">{cat.short_description}</p>
                ) : null}
              </Link>
            ))}
          </div>
          {vendorCategories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {vendorCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/services/${cat.slug}`}
                  className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-900 transition-colors duration-200 hover:border-ink-900"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* --------------------------------------------------- How it works */}
      <section className="reveal container-page pt-24" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-display-md font-extrabold">One brief in. A finished event out.</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {sections.howItWorks.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100">
              <span className="text-sm font-bold text-brand-700">Step {i + 1}</span>
              <h3 className="mt-2 font-sans text-base font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- Why us */}
      <section className="reveal container-page pt-24" aria-labelledby="why-heading">
        <div className="grid overflow-hidden rounded-3xl bg-ink-50 lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-14">
            <p className="eyebrow">Why {brand.name}</p>
            <h2 id="why-heading" className="mt-3 text-display-md font-extrabold">
              A marketplace that actually manages the work
            </h2>
            <p className="mt-4 max-w-lg text-lg text-ink-600">
              Not a directory of phone numbers. We shortlist, collect written quotations,
              coordinate delivery and settle the money.
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {sections.whyUs.map((item, i) => {
                const Icon = WHY_ICONS[i % WHY_ICONS.length];
                return (
                  <div key={item.title} className="flex gap-3">
                    <Icon aria-hidden strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-ink-900" />
                    <div>
                      <h3 className="font-sans text-sm font-semibold text-ink-900">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-ink-600">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="border-ink-900">
                <Link href="/corporate">Company accounts</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/how-it-works">How it works <ArrowRight aria-hidden className="icon-nudge" /></Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-80">
            <Image
              src="/img/photos/banquet.jpg" alt="Banquet hall set for a corporate dinner" fill
              sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Testimonials */}
      {testimonials.length > 0 ? (
        <section className="reveal container-page pt-24" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className="text-2xl">What organisers tell us</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="flex h-full flex-col rounded-2xl border border-ink-200 p-7 transition-shadow duration-300 hover:shadow-md">
                <div aria-hidden className="flex gap-0.5 text-ink-900">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-3.5 fill-current" />)}
                </div>
                <blockquote className="mt-4 flex-1">
                  <p className="text-ink-900">“{t.quote}”</p>
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-sm">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-100 font-bold text-ink-700">
                    {t.author_name.charAt(0)}
                  </span>
                  <span>
                    <span className="block font-semibold text-ink-900">{t.author_name}</span>
                    <span className="text-ink-600">{[t.author_title, t.company].filter(Boolean).join(' · ')}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-500">
            Quotes are from pilot customers. Company names are withheld until public reference
            approval is in place.
          </p>
        </section>
      ) : null}

      {/* --------------------------------------------------------- FAQ */}
      <section className="reveal container-page pt-24" aria-labelledby="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h2 id="faq-heading" className="text-display-md font-extrabold">Before you send a brief</h2>
            <p className="mt-3 text-ink-600">
              Still unsure?{' '}
              <Link href="/contact" className="font-semibold text-ink-900 underline underline-offset-4">Talk to our team</Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {faqs.slice(0, 7).map((faq) => (
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

      {/* --------------------------------------------------- Final CTA */}
      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src="/img/photos/audience.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">Tell us about your event</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Share your requirement and our team comes back with matched partners and comparable
            quotations. Free and non-binding.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href="/plan">
                Plan an Event <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10"
            >
              <Link href="/contact">
                <MessageSquare aria-hidden /> Talk to our team
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/70">
            Most requests receive their first quotations within 24–48 hours.
          </p>
        </div>
      </section>
    </>
  );
}
