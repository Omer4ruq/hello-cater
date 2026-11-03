import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Building2, CheckCircle2, ClipboardList, Phone, Receipt, Repeat, ShieldCheck, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEventTypes } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: 'Corporate catering & event solutions in Dhaka',
  description:
    'For HR, admin and procurement teams: one requirement, approved partners, spending limits, departmental billing and a single VAT-ready invoice. Recurring office catering supported.',
  path: '/corporate',
  keywords: [
    'corporate catering Dhaka', 'office lunch catering Bangladesh', 'corporate event management Dhaka',
    'company iftar party Dhaka', 'conference catering Dhaka',
  ],
});

const FEATURES = [
  { icon: Users, title: 'Company accounts with roles', body: 'Owners, admins and staff. Employees raise requirements; admins approve them.' },
  { icon: ShieldCheck, title: 'Spending limits and approvals', body: 'Set a per-person cap and require approval above it. No surprise commitments.' },
  { icon: Building2, title: 'Departments and locations', body: 'Tag spend by department or office so cost allocation is not a month-end puzzle.' },
  { icon: Receipt, title: 'One consolidated invoice', body: 'Even when five vendors are involved. VAT-ready, with your TIN and BIN on it.' },
  { icon: Repeat, title: 'Recurring office catering', body: 'Set the weekly lunch up once and let it run, with a single monthly settlement.' },
  { icon: ClipboardList, title: 'Approved partner lists', body: 'Restrict ordering to partners and menus your organisation has already signed off.' },
];

const STEPS = [
  { title: 'Submit one requirement', body: 'Headcount, date, venue and budget. About two minutes.' },
  { title: 'Approve one proposal', body: 'Comparable written quotations, combined into a single total.' },
  { title: 'Receive one invoice', body: 'VAT-ready, tagged to the right department, with a full trail.' },
];

const PORTAL_POINTS = [
  'Approved partners and menus only',
  'Per-employee and per-order spending limits',
  'Department and cost-centre tagging',
  'Approval routing above a threshold',
  'Consolidated monthly invoicing',
];

export default async function CorporatePage() {
  const eventTypes = await getEventTypes('corporate');

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Corporate', path: '/corporate' }])} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page grid items-center gap-10 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:pt-20">
        <div>
          <p className="eyebrow">For HR, admin and procurement teams</p>
          <h1 className="mt-3 max-w-xl text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            Stop chasing five caterers on WhatsApp
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            Submit one requirement. Approve one proposal. Receive one invoice. With spending limits,
            departmental billing and a documented trail your finance team will actually accept.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/plan">Submit a requirement <ArrowRight aria-hidden className="icon-nudge" /></Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
              <Link href="/contact">Talk to our corporate team</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-ink-100">
            <Image
              src="/img/photos/conference.jpg" alt="Conference hall set with round tables and screens"
              fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover"
            />
          </div>
          <div className="motion-stagger absolute -bottom-5 left-4 right-4 flex flex-wrap gap-2 sm:left-6 sm:right-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-md">
              <Receipt aria-hidden className="size-4 text-brand-700" /> One VAT-ready invoice
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-900 shadow-md">
              <ShieldCheck aria-hidden className="size-4 text-brand-700" /> Spending limits
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- One, one, one */}
      <section className="reveal container-page pt-20" aria-label="How a corporate request runs">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100">
              <span className="text-sm font-bold text-brand-700">Step {i + 1}</span>
              <h2 className="mt-2 font-sans text-base font-semibold text-ink-900">{step.title}</h2>
              <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------ Features */}
      <section className="reveal container-page pt-24" aria-labelledby="features-heading">
        <div className="max-w-2xl">
          <h2 id="features-heading" className="text-display-md font-extrabold">
            Built for the way procurement actually works
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Everything below is standard on a company account — no separate enterprise tier to
            negotiate before you can run your first event.
          </p>
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-900">
                <feature.icon aria-hidden strokeWidth={1.8} className="size-5" />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold text-ink-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ Occasions */}
      {eventTypes.length > 0 ? (
        <section className="reveal container-page pt-24" aria-labelledby="occasions-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="occasions-heading" className="text-2xl">Corporate occasions we handle</h2>
            <Link href="/events/corporate" className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
              All corporate events
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {eventTypes.map((eventType) => (
              <Link
                key={eventType.id}
                href={`/events/${eventType.slug}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-ink-200 p-5 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
              >
                <span>
                  <span className="block font-semibold text-ink-900">{eventType.name}</span>
                  {eventType.typical_guests_min && eventType.typical_guests_max ? (
                    <span className="mt-0.5 block text-sm text-ink-600">
                      {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
                    </span>
                  ) : null}
                </span>
                <ArrowRight aria-hidden className="icon-nudge size-4 shrink-0 text-ink-500" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------ Company portal */}
      <section className="reveal container-page pt-24" aria-labelledby="portal-heading">
        <div className="grid overflow-hidden rounded-3xl bg-ink-50 lg:grid-cols-2">
          <div className="relative min-h-72 lg:order-2">
            <Image
              src="/img/photos/banquet.jpg" alt="Banquet hall set for a corporate dinner" fill
              sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover"
            />
          </div>
          <div className="p-8 sm:p-12 lg:p-14">
            <p className="eyebrow">Company portal</p>
            <h2 id="portal-heading" className="mt-3 text-display-sm font-extrabold">
              A private marketplace for your company
            </h2>
            <p className="mt-4 text-ink-600">
              For organisations running frequent events, we can configure a company portal: your
              approved partners, your negotiated menus, your spending rules.
            </p>
            <p className="mt-3 text-ink-600">
              An office manager raising a 25-person lunch then picks from options your procurement
              team already approved — no re-sourcing, no re-negotiating, no approval bottleneck.
            </p>
            <ul className="mt-6 space-y-2.5">
              {PORTAL_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-900">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full border-ink-900">
              <Link href="/contact">Discuss a company portal <ArrowRight aria-hidden className="icon-nudge" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --------------------------------------------- Recurring catering */}
      <section className="reveal container-page pt-6" aria-labelledby="recurring-heading">
        <div className="grid overflow-hidden rounded-3xl bg-ink-50 lg:grid-cols-2">
          <div className="relative min-h-72">
            <Image
              src="/img/photos/buffet.jpg" alt="Buffet service with chafing dishes and flowers" fill
              sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover"
            />
          </div>
          <div className="p-8 sm:p-12 lg:p-14">
            <p className="eyebrow">Office catering</p>
            <h2 id="recurring-heading" className="mt-3 text-display-sm font-extrabold">Recurring office catering</h2>
            <p className="mt-4 text-ink-600">
              Weekly lunch for 60 people should not be a weekly decision. Set the arrangement up
              once — menu rotation, delivery window, headcount tolerance — and it runs.
            </p>
            <p className="mt-3 text-ink-600">
              You get one monthly invoice, one settlement, and a dashboard showing exactly what was
              delivered on which day.
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-200 pt-5">
              <div>
                <dt className="text-sm text-ink-600">Typical setup</dt>
                <dd className="mt-1 text-lg font-bold text-ink-900">One week</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-600">Billing</dt>
                <dd className="mt-1 text-lg font-bold text-ink-900">Monthly</dd>
              </div>
            </dl>
            <Button asChild size="lg" className="mt-8 rounded-full px-7">
              <Link href="/plan?eventTypeSlug=corporate-lunch">
                Set up recurring catering <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Final CTA */}
      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src="/img/photos/audience.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">
            Give us one requirement to work with
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            We will come back with matched partners and comparable written quotations — usually
            within 24–48 hours. Free, and nothing is committed until you accept.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent" className="rounded-full px-7">
              <Link href="/plan">Submit a requirement <ArrowRight aria-hidden className="icon-nudge" /></Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="rounded-full border-white/40 bg-transparent px-7 text-white hover:border-white hover:bg-white/10"
            >
              <a href={`tel:${brand.supportPhone}`}><Phone aria-hidden /> Call {brand.supportPhoneDisplay}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
