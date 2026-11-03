import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { PartnerSignupForm } from '@/features/auth/components/partner-signup-form';
import { getAreas, getCategories, getCities, getFaqs } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { isSupabaseConfigured } from '@/lib/env';
import { brand } from '@/config/brand';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Become a partner',
  description:
    'Join Evently BD as a verified catering or event partner in Dhaka. Get matched briefs, a proper quote builder, a booking calendar, earnings tracking and reliable payouts.',
  path: '/become-a-partner',
  keywords: ['catering business Dhaka', 'event vendor registration Bangladesh', 'become a caterer partner'],
});

const BENEFITS = [
  ['Matched work, not cold leads', 'We only send briefs that fit your services, area, capacity and calendar.'],
  ['A real back office', 'Requests, quotations, bookings, calendar, customers, earnings and reviews in one system — replacing WhatsApp threads and spreadsheets.'],
  ['Written quotations', 'Build itemised quotes from your saved menus. Every version is kept, so nobody argues about what was agreed.'],
  ['Reliable settlement', 'The platform collects from the customer. After delivery, we approve your payout and settle it with a statement.'],
  ['No joining fee', 'We earn a commission on completed bookings only, agreed with you in writing beforehand.'],
  ['Verified badge', 'Customers see that your business and capacity were checked — that is what they are choosing.'],
];

export default async function BecomePartnerPage() {
  const [categories, cities, areas, faqs] = await Promise.all([
    getCategories(), getCities(), getAreas('dhaka'), getFaqs('partner'),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Become a partner', path: '/become-a-partner' }])} />
      <JsonLd data={faqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })))} />

      <section className="container-page grid grid-cols-1 items-center gap-10 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:pt-20">
        <div>
          <p className="eyebrow">For caterers, planners and suppliers</p>
          <h1 className="mt-3 max-w-2xl text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            Get matched work and a back office that runs your business
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            Join {brand.name} as a verified partner in {brand.launchCity}. No joining fee —
            commission on completed bookings only.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-7">
              <a href="#apply">Apply to join <ArrowRight aria-hidden className="icon-nudge" /></a>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
        <div aria-hidden className="hidden h-96 grid-cols-2 grid-rows-2 gap-3 lg:grid">
          <div className="relative row-span-2 overflow-hidden rounded-3xl">
            <Image src="/img/photos/chef.jpg" alt="" fill priority sizes="22vw" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <Image src="/img/photos/buffet.jpg" alt="" fill sizes="18vw" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <Image src="/img/photos/longtable.jpg" alt="" fill sizes="18vw" className="object-cover" />
          </div>
        </div>
        <div className="relative aspect-16/10 overflow-hidden rounded-3xl lg:hidden">
          <Image src="/img/photos/chef.jpg" alt="Chef preparing food for an event" fill priority sizes="100vw" className="object-cover" />
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-12 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:pt-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-display-sm font-extrabold">Why partners join</h2>
          <ul className="mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {BENEFITS.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <CheckCircle2 aria-hidden strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-brand-700" />
                <div>
                  <h3 className="font-sans text-sm font-semibold text-ink-900">{title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl bg-ink-50 p-6 sm:p-7">
            <span className="grid size-11 place-items-center rounded-xl bg-white text-ink-900 shadow-sm">
              <Wallet aria-hidden strokeWidth={1.8} className="size-5" />
            </span>
            <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">How you get paid</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              You quote your price. We add our platform fee on the customer side, and deduct the
              agreed commission from your amount. You always see exactly what you will receive
              before you submit a quote — no hidden deductions at settlement.
            </p>
          </div>

          {faqs.length > 0 ? (
            <div className="mt-10">
              <h3 className="font-sans text-lg font-bold text-ink-900">Partner questions</h3>
              <div className="mt-3 divide-y divide-ink-200 border-y border-ink-200">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 font-sans text-[0.95rem] font-semibold text-ink-900 transition-colors hover:text-black [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <Plus aria-hidden className="size-5 shrink-0 text-ink-900 transition-transform duration-300 ease-(--ease-out-expo) group-open:rotate-45" />
                    </summary>
                    <p className="pb-4 pr-8 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div id="apply" className="scroll-mt-24">
          <h2 className="text-display-sm font-extrabold">Apply to join</h2>
          <p className="mt-2 text-ink-600">
            About five minutes. You can finish your profile and upload documents after signing in.
          </p>

          <div className="mt-6">
            {!isSupabaseConfigured ? (
              <Alert tone="warning" title="Applications are not accepting yet">
                This environment has no database configured. Set the Supabase environment variables
                to enable partner registration.
              </Alert>
            ) : (
              <PartnerSignupForm
                categories={categories
                  .filter((c) => c.parent_id)
                  .map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
                cities={cities.map((c) => ({ id: c.id, name: c.name, isLaunched: c.is_launched }))}
                areas={areas.map((a) => ({ id: a.id, name: a.name, cityId: a.city_id }))}
              />
            )}
          </div>

          <p className="mt-6 text-sm text-ink-600">
            Already a partner?{' '}
            <Link href="/login" className="font-semibold text-ink-900 underline underline-offset-4 hover:text-black">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
