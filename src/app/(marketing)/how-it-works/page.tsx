import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, CheckCircle2, Plus, Store } from 'lucide-react';
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

const PARTNER_TOOLS = [
  ['Request inbox', 'Matched briefs with the full requirement, not a name and a number.'],
  ['Quote builder', 'Itemised quotations from your saved menus and packages, with version history.'],
  ['Booking calendar', 'Committed load per day, blackout dates, and double-booking prevention.'],
  ['Customer history', 'Every event you delivered for each customer, in one place.'],
  ['Earnings & payouts', 'What you have earned, what is owed, and a statement for every settlement.'],
  ['Reviews', 'Verified reviews from real completed bookings, with a public right of reply.'],
];

const TAB_TRIGGER =
  'mb-0 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-300 px-5 text-sm font-semibold text-ink-900 transition-colors duration-200 hover:border-ink-900 data-[state=active]:border-ink-900 data-[state=active]:bg-ink-900 data-[state=active]:text-white';

function Faqs({ id, title, faqs }: { id: string; title: string; faqs: { id: string; question: string; answer: string }[] }) {
  if (faqs.length === 0) return null;
  return (
    <section className="reveal mt-24 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" aria-labelledby={id}>
      <div>
        <h2 id={id} className="text-display-sm font-extrabold">{title}</h2>
        <p className="mt-3 text-ink-600">
          Something else?{' '}
          <Link href="/contact" className="font-semibold text-ink-900 underline underline-offset-4">Talk to our team</Link>.
        </p>
      </div>
      <div className="divide-y divide-ink-200 border-y border-ink-200">
        {faqs.map((faq) => (
          <details key={faq.id} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-5 font-sans text-base font-semibold text-ink-900 transition-colors hover:text-black [&::-webkit-details-marker]:hidden">
              {faq.question}
              <Plus aria-hidden className="size-5 shrink-0 text-ink-900 transition-transform duration-300 ease-(--ease-out-expo) group-open:rotate-45" />
            </summary>
            <p className="pb-5 pr-10 text-ink-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default async function HowItWorksPage() {
  const [sections, customerFaqs, partnerFaqs] = await Promise.all([
    getHomeSections(), getFaqs('customer'), getFaqs('partner'),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'How it works', path: '/how-it-works' }])} />
      <JsonLd data={faqJsonLd([...customerFaqs, ...partnerFaqs].slice(0, 10).map((f) => ({ question: f.question, answer: f.answer })))} />

      <section className="container-page grid grid-cols-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
        <div>
          <p className="eyebrow">How it works</p>
          <h1 className="mt-3 max-w-3xl text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            A managed marketplace, not a directory
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            We do not hand you five phone numbers. We shortlist verified partners, collect written
            quotations, combine them into one proposal, and coordinate the event through to payout.
          </p>
        </div>
        <div aria-hidden className="hidden h-96 grid-cols-2 grid-rows-2 gap-3 lg:grid">
          <div className="relative row-span-2 overflow-hidden rounded-3xl">
            <Image src="/img/photos/panel.jpg" alt="" fill priority sizes="22vw" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <Image src="/img/photos/chef.jpg" alt="" fill sizes="18vw" className="object-cover" />
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <Image src="/img/photos/dining.jpg" alt="" fill sizes="18vw" className="object-cover" />
          </div>
        </div>
      </section>

      <div className="container-page">
        <Tabs defaultValue="customer">
          <TabsList className="gap-2 border-b-0">
            <TabsTrigger value="customer" className={TAB_TRIGGER}>
              <Building2 aria-hidden className="size-4" /> For customers
            </TabsTrigger>
            <TabsTrigger value="partner" className={TAB_TRIGGER}>
              <Store aria-hidden className="size-4" /> For partners
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="pt-8">
            <ol className="motion-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sections.howItWorks.map((step, i) => (
                <li key={step.title} className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100">
                  <span className="text-sm font-bold text-brand-700">Step {i + 1}</span>
                  <h2 className="mt-2 font-sans text-base font-semibold text-ink-900">{step.title}</h2>
                  <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>

            <section className="reveal mt-20 grid overflow-hidden rounded-3xl bg-ink-50 lg:grid-cols-2" aria-labelledby="multi-vendor-heading">
              <div className="p-8 sm:p-12 lg:p-14">
                <h2 id="multi-vendor-heading" className="text-display-sm font-extrabold">Multi-vendor events, one proposal</h2>
                <p className="mt-4 text-ink-600">
                  A wedding might need catering, decoration, photography, sound and a venue — five
                  contracts, five invoices and five phone numbers if you arrange it yourself.
                </p>
                <p className="mt-3 text-ink-600">
                  We collect a quotation from each, combine them into one master proposal with a
                  single total, and you accept once. Behind the scenes each partner keeps their own
                  fulfilment record; you deal with one coordinator.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {['One total you can actually approve', 'One payment schedule', 'One invoice', 'One point of contact on the day'].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-ink-900">
                      <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative min-h-72">
                <Image src="/img/photos/longtable.jpg" alt="Long table set with flowers and glassware" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </section>

            <Faqs id="customer-faq-heading" title="Customer questions" faqs={customerFaqs} />

            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/plan">Plan an Event <ArrowRight aria-hidden className="icon-nudge" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
                <Link href="/partners">Browse partners</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="partner" className="pt-8">
            <ol className="motion-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PARTNER_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100">
                  <span className="text-sm font-bold text-brand-700">Step {i + 1}</span>
                  <h2 className="mt-2 font-sans text-base font-semibold text-ink-900">{step.title}</h2>
                  <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>

            <section className="reveal mt-20 grid grid-cols-1 overflow-hidden rounded-3xl bg-ink-50 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" aria-labelledby="partner-tools-heading">
              <div className="relative min-h-72">
                <Image src="/img/photos/chef.jpg" alt="Chef preparing food for an event" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
              </div>
              <div className="p-8 sm:p-12 lg:p-14">
                <h2 id="partner-tools-heading" className="text-display-sm font-extrabold">What you get beyond the leads</h2>
                <p className="mt-4 max-w-2xl text-ink-600">
                  The dashboard is the point. Most caterers and vendors in {brand.launchCity} run on
                  WhatsApp threads, phone calls and a notebook. Joining replaces that with one system.
                </p>
                <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {PARTNER_TOOLS.map(([title, body]) => (
                    <div key={title}>
                      <h3 className="font-sans text-sm font-semibold text-ink-900">{title}</h3>
                      <p className="mt-0.5 text-sm text-ink-600">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <Faqs id="partner-faq-heading" title="Partner questions" faqs={partnerFaqs} />

            <Button asChild size="lg" className="mt-12 rounded-full px-7">
              <Link href="/become-a-partner">Apply to join <ArrowRight aria-hidden className="icon-nudge" /></Link>
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
