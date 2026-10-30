import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">About</p>
          <h1 className="mt-2 max-w-3xl text-display-lg">
            {page?.title ?? `Bangladesh's managed marketplace for catering and events`}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            {page?.subtitle ??
              `Arranging an event in ${brand.launchCity} usually means calling five caterers, chasing quotes on WhatsApp, and hoping the price holds. We built the alternative.`}
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-5 text-[0.95rem] leading-relaxed text-ink-700">
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

          <div className="space-y-5">
            <div className="relative aspect-4/3 overflow-hidden rounded-xl">
              <Image src="/img/events.svg" alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
            </div>
            <Card className="p-6">
              <h2 className="font-sans text-base font-semibold text-ink-950">Where we operate</h2>
              <p className="mt-2 text-sm text-ink-600">
                Live in {brand.launchCity}. Expanding across {brand.country} as partner supply
                reaches the depth we need in each district.
              </p>
              <h2 className="mt-5 font-sans text-base font-semibold text-ink-950">How we make money</h2>
              <p className="mt-2 text-sm text-ink-600">
                A commission on completed bookings and a platform service fee, both disclosed before
                anyone commits. No joining fee for partners, no charge for submitting a requirement.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-white py-16">
        <div className="container-page">
          <h2 className="text-display-sm">How we work</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(([title, body]) => (
              <div key={title} className="border-t-2 border-brand-700 pt-5">
                <h3 className="font-sans text-base font-semibold text-ink-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-display-sm">Work with us</h2>
            <p className="mt-3 text-ink-600">
              Whether you are planning an event or run a catering or event business, the next step
              is the same: tell us what you need.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/plan">Plan an Event <ArrowRight aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/become-a-partner">Become a partner</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
