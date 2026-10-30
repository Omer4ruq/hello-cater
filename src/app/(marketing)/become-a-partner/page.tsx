import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
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

      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 -z-10">
          <Image src="/img/partner.svg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/70 to-ink-950/40" />
        </div>
        <div className="container-page py-16 text-white lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-saffron-300">
            For caterers, planners and suppliers
          </p>
          <h1 className="mt-3 max-w-3xl text-display-lg text-white">
            Get matched work and a back office that runs your business
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Join {brand.name} as a verified partner in {brand.launchCity}. No joining fee —
            commission on completed bookings only.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-display-sm">Why partners join</h2>
          <ul className="mt-6 space-y-5">
            {BENEFITS.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <div>
                  <h3 className="font-sans text-sm font-semibold text-ink-950">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <Card className="mt-8 p-6">
            <Wallet aria-hidden className="size-5 text-brand-700" />
            <h3 className="mt-3 font-sans text-base font-semibold text-ink-950">How you get paid</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              You quote your price. We add our platform fee on the customer side, and deduct the
              agreed commission from your amount. You always see exactly what you will receive
              before you submit a quote — no hidden deductions at settlement.
            </p>
          </Card>

          <div className="mt-8">
            <h3 className="font-sans text-base font-semibold text-ink-950">Partner questions</h3>
            <div className="mt-3 divide-y divide-ink-200 border-y border-ink-200">
              {faqs.map((faq) => (
                <details key={faq.id} className="group py-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink-950">
                    {faq.question}
                    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border border-ink-300 text-xs text-ink-600 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 pr-8 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-display-sm">Apply to join</h2>
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
            <Link href="/login" className="font-medium text-brand-700 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
