import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, BadgeCheck, CalendarDays, FileText, Handshake,
  MessageSquare, Receipt, Repeat, ShieldCheck, Sparkles, Users, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
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

export default async function HomePage() {
  const [sections, categories, eventTypes, partners, testimonials, faqs] = await Promise.all([
    getHomeSections(),
    getCategories(),
    getEventTypes(),
    getFeaturedPartners(6),
    getTestimonials(),
    getFaqs('customer'),
  ]);

  const cateringCategories = categories.filter((c) => c.kind === 'catering' && c.parent_id).slice(0, 8);
  const vendorCategories = categories.filter((c) => c.kind === 'vendor' && c.parent_id).slice(0, 10);
  const corporateEvents = eventTypes.filter((e) => e.segment === 'corporate').slice(0, 6);
  const weddingEvents = eventTypes.filter((e) => e.segment === 'wedding').slice(0, 6);
  const privateEvents = eventTypes.filter((e) => e.segment === 'private').slice(0, 4);

  return (
    <>
      <JsonLd data={faqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })))} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/img/hero.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/60 to-ink-950/25" />
        </div>

        <div className="container-page grid gap-12 py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:py-28">
          <div className="max-w-2xl text-white">
            <Badge tone="saffron" className="mb-6 border-saffron-300/40 bg-white/10 text-saffron-100 backdrop-blur">
              <Sparkles aria-hidden className="size-3.5" />
              Managed marketplace · {brand.launchCity}
            </Badge>

            <h1 className="text-display-xl font-medium text-white">{sections.hero.heading}</h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              {sections.hero.subheading}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href={sections.hero.cta_href || '/plan'}>
                  {sections.hero.cta_label || 'Plan an Event'}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/25 bg-white/10 text-white backdrop-blur hover:border-white/40 hover:bg-white/20"
              >
                <Link href="/services">Explore Services</Link>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
              {sections.trust.map((item) => (
                <div key={item.label}>
                  <dt className="font-display text-xl font-semibold text-saffron-300">{item.value}</dt>
                  <dd className="mt-1 text-xs leading-snug text-white/65">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ------------------------------------------- Quick request */}
          <div className="lg:justify-self-end">
            <Card className="w-full overflow-hidden border-ink-200/60 shadow-xl lg:max-w-md">
              <div className="border-b border-ink-200 bg-white px-6 py-5">
                <p className="eyebrow">Start here</p>
                <h2 className="mt-1.5 font-display text-2xl font-medium text-ink-950">
                  Tell us what you need
                </h2>
                <p className="mt-1.5 text-sm text-ink-600">
                  Free, non-binding, and about two minutes. Our event team replies with matched
                  partners.
                </p>
              </div>
              <div className="bg-white p-6">
                <QuickRequestForm />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Popular services */}
      <section className="container-page py-20" aria-labelledby="services-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">What we arrange</p>
            <h2 id="services-heading" className="mt-2 text-display-md">
              Everything an event in Dhaka needs
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              Catering and every supporting service, from a single verified partner or a full
              vendor team we coordinate for you.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/services">
              All services <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cateringCategories.map((cat) => (
            <Link key={cat.id} href={`/services/${cat.slug}`} className="group">
              <Card interactive className="h-full p-5">
                <p className="font-sans text-base font-semibold text-ink-950 group-hover:text-brand-800">
                  {cat.name}
                </p>
                {cat.name_bn ? (
                  <p lang="bn" className="mt-0.5 text-sm text-ink-500">
                    {cat.name_bn}
                  </p>
                ) : null}
                {cat.short_description ? (
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{cat.short_description}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {vendorCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services/${cat.slug}`}
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- Event types */}
      <section className="border-y border-ink-200 bg-white py-20" aria-labelledby="events-heading">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Occasions</p>
            <h2 id="events-heading" className="mt-2 text-display-md">
              Built around how Bangladesh celebrates
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              From a Tuesday office lunch to a three-day wedding, the workflow adapts to the
              occasion instead of forcing everything into one template.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              { title: 'Corporate', items: corporateEvents, href: '/events/corporate', art: '/img/corporate.svg' },
              { title: 'Wedding', items: weddingEvents, href: '/events/wedding', art: '/img/wedding.svg' },
              { title: 'Private & social', items: privateEvents, href: '/events/private', art: '/img/events.svg' },
            ].map((group) => (
              <Card key={group.title} className="overflow-hidden">
                <div className="relative h-36">
                  <Image src={group.art} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                  <h3 className="absolute bottom-4 left-5 font-display text-2xl font-medium text-white">
                    {group.title}
                  </h3>
                </div>
                <ul className="divide-y divide-ink-100">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/events/${item.slug}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50"
                      >
                        <span className="text-sm font-medium text-ink-800">{item.name}</span>
                        {item.typical_guests_min && item.typical_guests_max ? (
                          <span className="whitespace-nowrap text-xs text-ink-500">
                            {item.typical_guests_min}–{item.typical_guests_max} guests
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-ink-200 px-5 py-3">
                  <Link href={group.href} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                    See {group.title.toLowerCase()} solutions →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section className="container-page py-20" aria-labelledby="how-heading">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading" className="mt-2 text-display-md">
            One brief in. A finished event out.
          </h2>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3 lg:grid-cols-5">
          {sections.howItWorks.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-700 font-sans text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-sans text-base font-semibold text-ink-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- Why us */}
      <section className="border-y border-ink-200 bg-brand-950 py-20 text-white" aria-labelledby="why-heading">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-saffron-300">
              Why {brand.name}
            </p>
            <h2 id="why-heading" className="mt-2 text-display-md text-white">
              A marketplace that actually manages the work
            </h2>
            <p className="mt-4 text-lg text-white/70">
              We are not a directory that hands you five phone numbers. We shortlist, collect
              written quotations, coordinate delivery and settle the money.
            </p>
          </div>

          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {sections.whyUs.map((item, i) => {
              const Icon = WHY_ICONS[i % WHY_ICONS.length];
              return (
                <div key={item.title} className="border-t border-white/15 pt-5">
                  <Icon aria-hidden className="size-5 text-saffron-300" />
                  <h3 className="mt-3.5 font-sans text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- Verified partners */}
      <section className="container-page py-20" aria-labelledby="partners-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Our network</p>
            <h2 id="partners-heading" className="mt-2 text-display-md">
              Verified partners, not a phone list
            </h2>
            <p className="mt-4 text-lg text-ink-600">
              Every partner is checked for business registration, operating capacity and past work
              before they are allowed to quote.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/partners">
              Browse partners <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {partners.length > 0 ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <Link key={partner.id} href={`/partners/${partner.slug}`} className="group">
                <Card interactive className="h-full overflow-hidden">
                  <div className="relative h-40 bg-ink-100">
                    <Image
                      src={partner.cover_image_url ?? '/img/partner.svg'}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute left-4 top-4">
                      <VerifiedBadge />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-sans text-base font-semibold text-ink-950 group-hover:text-brand-800">
                      {partner.display_name}
                    </h3>
                    {partner.tagline ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-600">{partner.tagline}</p>
                    ) : null}
                    <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                      {partner.rating_count > 0 ? (
                        <div className="flex items-center gap-1">
                          <dt className="sr-only">Rating</dt>
                          <dd className="font-medium text-ink-900">
                            ★ {partner.rating_avg.toFixed(1)}
                          </dd>
                          <span>({partner.rating_count})</span>
                        </div>
                      ) : (
                        <Badge tone="neutral">New partner</Badge>
                      )}
                      {partner.max_guests ? (
                        <div className="flex items-center gap-1">
                          <dt className="sr-only">Capacity</dt>
                          <dd>Up to {partner.max_guests} guests</dd>
                        </div>
                      ) : null}
                      {partner.min_order_minor > 0 ? (
                        <div className="flex items-center gap-1">
                          <dt className="sr-only">Minimum order</dt>
                          <dd>
                            Min <Money minor={partner.min_order_minor} compact />
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-10 p-10 text-center">
            <BadgeCheck aria-hidden className="mx-auto size-6 text-brand-600" />
            <p className="mt-4 font-sans text-base font-semibold text-ink-900">
              We are onboarding our founding partners
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
              Verified caterers, decorators, photographers and event managers appear here as they
              complete verification. Submit a requirement and our team will match you manually in
              the meantime.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/plan">Plan an Event</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/become-a-partner">Become a partner</Link>
              </Button>
            </div>
          </Card>
        )}
      </section>

      {/* ------------------------------------- Corporate & wedding split */}
      <section className="container-page grid gap-6 pb-20 lg:grid-cols-2">
        {[
          {
            art: '/img/corporate.svg',
            eyebrow: 'For HR, admin & procurement',
            title: 'Built for HR and admin teams',
            body: 'Stop chasing five caterers on WhatsApp. Submit one requirement, approve one proposal, receive one invoice — with spend limits, departments and approval rules built in.',
            cta: { label: 'See corporate solutions', href: '/corporate' },
            points: ['Company accounts with staff roles', 'Approval limits and departmental billing', 'Recurring office catering', 'Consolidated monthly invoicing'],
          },
          {
            art: '/img/wedding.svg',
            eyebrow: 'For families & wedding planners',
            title: 'From holud to reception, handled',
            body: 'Catering, decoration, photography, sound and venue combined into a single plan with a single coordinator and a single total you can actually compare.',
            cta: { label: 'Plan a wedding', href: '/events/wedding' },
            points: ['One master proposal across all vendors', 'A dedicated event manager', 'Day-of vendor coordination', 'Clear cancellation terms upfront'],
          },
        ].map((block) => (
          <Card key={block.title} className="overflow-hidden">
            <div className="relative h-48">
              <Image src={block.art} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-7">
              <p className="eyebrow">{block.eyebrow}</p>
              <h2 className="mt-2 text-display-sm">{block.title}</h2>
              <p className="mt-3 text-ink-600">{block.body}</p>
              <ul className="mt-5 space-y-2">
                {block.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    {point}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link href={block.cta.href}>
                  {block.cta.label} <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {/* ------------------------------------------------- Testimonials */}
      {testimonials.length > 0 ? (
        <section className="border-y border-ink-200 bg-white py-20" aria-labelledby="testimonials-heading">
          <div className="container-page">
            <h2 id="testimonials-heading" className="max-w-xl text-display-md">
              What organisers tell us
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="flex h-full flex-col border-t-2 border-brand-700 pt-6">
                  <blockquote className="flex-1">
                    <p className="font-display text-lg leading-relaxed text-ink-900">“{t.quote}”</p>
                  </blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-semibold text-ink-950">{t.author_name}</span>
                    {t.author_title ? <span className="text-ink-600"> · {t.author_title}</span> : null}
                    {t.company ? <span className="block text-ink-500">{t.company}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-10 text-xs text-ink-500">
              Quotes are from pilot customers. Company names are withheld until public
              reference approval is in place.
            </p>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- FAQ */}
      <section className="container-page py-20" aria-labelledby="faq-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 id="faq-heading" className="mt-2 text-display-md">
              Before you send a brief
            </h2>
            <p className="mt-4 text-ink-600">
              Still unsure? <Link href="/contact" className="font-medium text-brand-700 underline underline-offset-4">Talk to our team</Link>.
            </p>
          </div>
          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {faqs.slice(0, 7).map((faq) => (
              <details key={faq.id} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sans text-base font-medium text-ink-950">
                  {faq.question}
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-300 text-ink-600 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Final CTA */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-ink-950 px-8 py-14 text-center sm:px-14">
          <Image src="/img/events.svg" alt="" fill sizes="100vw" className="object-cover opacity-30" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-display-md text-white">
              Tell us about your event
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Share your requirement and our team will come back with matched partners and
              comparable quotations. Free and non-binding.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href="/plan">
                  Plan an Event <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/contact">
                  <MessageSquare aria-hidden /> Talk to our team
                </Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
              <CalendarDays aria-hidden className="size-3.5" />
              Most requests receive their first quotations within 24–48 hours
              <Receipt aria-hidden className="ml-2 size-3.5" />
              One invoice, however many vendors
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
