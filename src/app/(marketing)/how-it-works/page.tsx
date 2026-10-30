import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, CheckCircle2, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getFaqs, getHomeSections } from '@/features/content/queries';
import { buildMetadata, JsonLd, faqJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'How it works',
  description:
    'One requirement in, comparable written quotations out, one invoice at the end. How Evently BD arranges catering and events in Dhaka for customers and partners.',
  path: '/how-it-works',
});

const PARTNER_STEPS = [
  { title: 'Apply and get verified', body: 'Share your business registration, capacity and past work. We check it before you can quote — that verification is what customers are paying for.' },
  { title: 'Receive matched briefs', body: 'We only send you requests that fit your services, area, capacity and calendar. No mass blasts, no wasted quoting.' },
  { title: 'Quote in a proper builder', body: 'Build itemised quotations from your own menus and packages. Save drafts, revise, and keep every version on record.' },
  { title: 'Deliver and get paid', body: 'The platform collects from the customer. After delivery, finance approves your payout and settles it with a statement.' },
];

export default async function HowItWorksPage() {
  const [sections, customerFaqs, partnerFaqs] = await Promise.all([
    getHomeSections(), getFaqs('customer'), getFaqs('partner'),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'How it works', path: '/how-it-works' }])} />
      <JsonLd data={faqJsonLd([...customerFaqs, ...partnerFaqs].slice(0, 10).map((f) => ({ question: f.question, answer: f.answer })))} />

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">How it works</p>
          <h1 className="mt-2 max-w-3xl text-display-lg">
            A managed marketplace, not a directory
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            We do not hand you five phone numbers. We shortlist verified partners, collect written
            quotations, combine them into one proposal, and coordinate the event through to payout.
          </p>
        </div>
      </section>

      <div className="container-page py-14">
        <Tabs defaultValue="customer">
          <TabsList>
            <TabsTrigger value="customer">
              <Building2 aria-hidden className="mr-1.5 inline size-4" /> For customers
            </TabsTrigger>
            <TabsTrigger value="partner">
              <Store aria-hidden className="mr-1.5 inline size-4" /> For partners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
              {sections.howItWorks.map((step, i) => (
                <li key={step.title} className="border-t-2 border-brand-700 pt-5">
                  <span className="grid size-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h2 className="mt-4 font-sans text-base font-semibold text-ink-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>

            <Card className="mt-12 overflow-hidden">
              <div className="grid lg:grid-cols-2">
                <div className="p-8">
                  <h2 className="text-display-sm">Multi-vendor events, one proposal</h2>
                  <p className="mt-3 text-ink-600">
                    A wedding might need catering, decoration, photography, sound and a venue — five
                    contracts, five invoices and five phone numbers if you arrange it yourself.
                  </p>
                  <p className="mt-3 text-ink-600">
                    We collect a quotation from each, combine them into one master proposal with a
                    single total, and you accept once. Behind the scenes each partner keeps their own
                    fulfilment record; you deal with one coordinator.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {['One total you can actually approve', 'One payment schedule', 'One invoice', 'One point of contact on the day'].map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                        <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative min-h-56 bg-ink-100">
                  <Image src="/img/wedding.svg" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
                </div>
              </div>
            </Card>

            <div className="mt-12">
              <h2 className="text-display-sm">Customer questions</h2>
              <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
                {customerFaqs.map((faq) => (
                  <details key={faq.id} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sans text-base font-medium text-ink-950">
                      {faq.question}
                      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-300 text-ink-600 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2.5 pr-10 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/plan">Plan an Event <ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/partners">Browse partners</Link></Button>
            </div>
          </TabsContent>

          <TabsContent value="partner">
            <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {PARTNER_STEPS.map((step, i) => (
                <li key={step.title} className="border-t-2 border-clay-500 pt-5">
                  <span className="grid size-9 items-center justify-center rounded-full bg-clay-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h2 className="mt-4 font-sans text-base font-semibold text-ink-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>

            <Card className="mt-12 p-8">
              <h2 className="text-display-sm">What you get beyond the leads</h2>
              <p className="mt-3 max-w-2xl text-ink-600">
                The dashboard is the point. Most caterers and vendors in {brand.launchCity} run on
                WhatsApp threads, phone calls and a notebook. Joining replaces that with one system.
              </p>
              <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Request inbox', 'Matched briefs with the full requirement, not a name and a number.'],
                  ['Quote builder', 'Itemised quotations from your saved menus and packages, with version history.'],
                  ['Booking calendar', 'Committed load per day, blackout dates, and double-booking prevention.'],
                  ['Customer history', 'Every event you delivered for each customer, in one place.'],
                  ['Earnings & payouts', 'What you have earned, what is owed, and a statement for every settlement.'],
                  ['Reviews', 'Verified reviews from real completed bookings, with a public right of reply.'],
                ].map(([title, body]) => (
                  <div key={title}>
                    <h3 className="font-sans text-sm font-semibold text-ink-950">{title}</h3>
                    <p className="mt-1 text-sm text-ink-600">{body}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="mt-12">
              <h2 className="text-display-sm">Partner questions</h2>
              <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
                {partnerFaqs.map((faq) => (
                  <details key={faq.id} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-sans text-base font-medium text-ink-950">
                      {faq.question}
                      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-300 text-ink-600 transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2.5 pr-10 text-sm leading-relaxed text-ink-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>

            <Button asChild size="lg" className="mt-10">
              <Link href="/become-a-partner">Apply to join <ArrowRight aria-hidden /></Link>
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
