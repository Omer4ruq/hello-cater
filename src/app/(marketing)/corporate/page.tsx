import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Building2, CheckCircle2, ClipboardList, Receipt, Repeat, ShieldCheck, Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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

export default async function CorporatePage() {
  const eventTypes = await getEventTypes('corporate');

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Corporate', path: '/corporate' }])} />

      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 -z-10">
          <Image src="/img/corporate.svg" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/70 to-ink-950/40" />
        </div>
        <div className="container-page py-16 text-white lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-saffron-300">
            For HR, admin & procurement
          </p>
          <h1 className="mt-3 max-w-3xl text-display-lg text-white">
            Stop chasing five caterers on WhatsApp
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            Submit one requirement. Approve one proposal. Receive one invoice. With spending limits,
            departmental billing and a documented trail your finance team will actually accept.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href="/plan">Submit a requirement <ArrowRight aria-hidden /></Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/contact">Talk to our corporate team</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="max-w-2xl">
          <h2 className="text-display-md">Built for the way procurement actually works</h2>
          <p className="mt-4 text-lg text-ink-600">
            Everything below is standard on a company account — no separate enterprise tier to
            negotiate before you can run your first event.
          </p>
        </div>

        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-t border-ink-200 pt-5">
              <feature.icon aria-hidden className="size-5 text-brand-700" />
              <h3 className="mt-3.5 font-sans text-base font-semibold text-ink-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-200 bg-white py-16">
        <div className="container-page">
          <h2 className="text-display-sm">Corporate occasions we handle</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {eventTypes.map((eventType) => (
              <Link key={eventType.id} href={`/events/${eventType.slug}`} className="group">
                <Card interactive className="h-full p-4">
                  <p className="font-sans text-sm font-semibold text-ink-950 group-hover:text-brand-800">
                    {eventType.name}
                  </p>
                  {eventType.typical_guests_min && eventType.typical_guests_max ? (
                    <p className="mt-1.5 text-xs text-ink-500">
                      {eventType.typical_guests_min}–{eventType.typical_guests_max} guests
                    </p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <Card className="p-8">
            <h2 className="text-display-sm">A private marketplace for your company</h2>
            <p className="mt-3 text-ink-600">
              For organisations running frequent events, we can configure a company portal: your
              approved partners, your negotiated menus, your spending rules.
            </p>
            <p className="mt-3 text-ink-600">
              An office manager raising a 25-person lunch then picks from options your procurement
              team already approved — no re-sourcing, no re-negotiating, no approval bottleneck.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                'Approved partners and menus only',
                'Per-employee and per-order spending limits',
                'Department and cost-centre tagging',
                'Approval routing above a threshold',
                'Consolidated monthly invoicing',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6" variant="outline">
              <Link href="/contact">Discuss a company portal <ArrowRight aria-hidden /></Link>
            </Button>
          </Card>

          <Card className="p-8">
            <h2 className="text-display-sm">Recurring office catering</h2>
            <p className="mt-3 text-ink-600">
              Weekly lunch for 60 people should not be a weekly decision. Set the arrangement up
              once — menu rotation, delivery window, headcount tolerance — and it runs.
            </p>
            <p className="mt-3 text-ink-600">
              You get one monthly invoice, one settlement, and a dashboard showing exactly what was
              delivered on which day.
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-200 pt-5">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-500">Typical setup</dt>
                <dd className="mt-1 font-sans text-lg font-semibold text-ink-950">One week</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-500">Billing</dt>
                <dd className="mt-1 font-sans text-lg font-semibold text-ink-950">Monthly</dd>
              </div>
            </dl>
            <Button asChild className="mt-6">
              <Link href="/plan?eventTypeSlug=corporate-lunch">Set up recurring catering</Link>
            </Button>
          </Card>
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-2xl border border-ink-200 bg-brand-950 px-8 py-14 text-center sm:px-14">
          <h2 className="mx-auto max-w-2xl text-display-md text-white">
            Give us one requirement to work with
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            We will come back with matched partners and comparable written quotations — usually
            within 24–48 hours. Free, and nothing is committed until you accept.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href="/plan">Submit a requirement</Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <a href={`tel:${brand.supportPhone}`}>Call {brand.supportPhoneDisplay}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
