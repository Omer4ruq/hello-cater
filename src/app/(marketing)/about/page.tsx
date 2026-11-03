import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCmsPage } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'About us',
  description: `${brand.name} is a managed marketplace for catering and event services in ${brand.country}. We shortlist verified partners, collect comparable quotations and coordinate delivery.`,
  path: '/about',
});

const PRINCIPLES = [
  ['We verify before we recommend', 'A listing on this platform means business registration, operating capacity and past work were checked. That is the whole product.'],
  ['Everything in writing', 'Verbal estimates that change on the day are the single biggest complaint in this market. Every price here is itemised and recorded.'],
  ['One point of contact', 'However many vendors an event needs, you deal with one coordinator, approve one proposal and receive one invoice.'],
  ['Partners are customers too', 'The back office we give partners is not a bonus. Replacing WhatsApp threads and notebooks with a real system is why good partners stay.'],
  ['Money is handled carefully', 'The platform collects, holds and settles. Every amount is traceable from the customer payment to the partner payout.'],
];

export default async function AboutPage() {
  const page = await getCmsPage('about');

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])} />

      <section className="container-page pt-12 lg:pt-20">
        <div className="max-w-3xl">
          <p className="eyebrow">About</p>
          <h1 className="mt-3 text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            {page?.title ?? `Bangladesh's managed marketplace for catering and events`}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            {page?.subtitle ??
              `Arranging an event in ${brand.launchCity} usually means calling five caterers, chasing quotes on WhatsApp, and hoping the price holds. We built the alternative.`}
          </p>
        </div>
        <div className="relative mt-10 aspect-4/3 overflow-hidden rounded-3xl bg-ink-100 sm:aspect-21/9">
          <Image
            src="/img/photos/stage.jpg" alt="" fill priority
            sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover"
          />
        </div>
      </section>

      <section className="reveal container-page pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-prose space-y-5 text-lg leading-relaxed text-ink-700">
            {page?.body ? (
              page.body.split(/\n{2,}/).map((paragraph, i) => <p key={i}>{paragraph.trim()}</p>)
            ) : (
              <>
                <p>
                  Events in {brand.country} are arranged through relationships and phone calls. That
                  works — until you need to compare four caterers fairly, prove to your finance team
                  what you committed to, or coordinate five vendors on a wedding day.
                </p>
                <p>
                  {brand.name} sits between customers and service providers as a managed layer. You
                  submit one requirement. Our team shortlists verified partners who genuinely cover
                  your date, area and capacity. Those partners submit written, itemised quotations.
                  We combine them into a single proposal with one total, and you accept once.
                </p>
                <p>
                  From there we coordinate: payments, schedules, documents, vendor communication and
                  the event day itself. Partners get paid after delivery, with a statement showing
                  exactly how the amount was calculated.
                </p>
                <p>
                  We are starting in {brand.launchCity} because depth matters more than coverage at
                  the beginning. The platform is built so additional districts open from an admin
                  screen rather than a code change.
                </p>
              </>
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-100">
              <Image src="/img/photos/dining.jpg" alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
            </div>
            <div className="rounded-2xl bg-ink-50 p-6 sm:p-7">
              <h2 className="font-sans text-base font-semibold text-ink-900">Where we operate</h2>
              <p className="mt-2 text-sm text-ink-600">
                Live in {brand.launchCity}. Expanding across {brand.country} as partner supply
                reaches the depth we need in each district.
              </p>
              <h2 className="mt-5 font-sans text-base font-semibold text-ink-900">How we make money</h2>
              <p className="mt-2 text-sm text-ink-600">
                A commission on completed bookings and a platform service fee, both disclosed before
                anyone commits. No joining fee for partners, no charge for submitting a requirement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal container-page pt-24" aria-labelledby="principles-heading">
        <h2 id="principles-heading" className="text-display-md font-extrabold">How we work</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(([title, body], i) => (
            <div key={title} className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100">
              <span className="text-sm font-bold text-brand-700">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-sans text-base font-semibold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src="/img/photos/terrace.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/60" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">Work with us</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Whether you are planning an event or run a catering or event business, the next step
            is the same: tell us what you need.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent" className="rounded-full px-7">
              <Link href="/plan">Plan an Event <ArrowRight aria-hidden className="icon-nudge" /></Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="rounded-full border-white/40 bg-transparent px-7 text-white hover:border-white hover:bg-white/10"
            >
              <Link href="/become-a-partner">Become a partner</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
