import Image from 'next/image';
import { Clock, Mail, MapPin, MessageSquare, Phone, Inbox } from 'lucide-react';
import { ContactForm } from '@/features/support/components/contact-form';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Contact us',
  description: `Talk to the ${brand.name} team about an event, a corporate account, or joining as a partner.`,
  path: '/contact',
});

const CHANNELS = [
  { icon: Phone, label: 'Phone', value: brand.supportPhoneDisplay, href: `tel:${brand.supportPhone}` },
  { icon: Mail, label: 'Support', value: brand.supportEmail, href: `mailto:${brand.supportEmail}` },
  { icon: MessageSquare, label: 'Partnerships', value: brand.salesEmail, href: `mailto:${brand.salesEmail}` },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])} />

      <section className="container-page grid grid-cols-1 items-end gap-10 pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-20">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 max-w-2xl text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">Talk to our team</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            Planning something specific, or just want to know whether we can cover it? Send us a
            message and we will reply within one working day.
          </p>
        </div>
        <div aria-hidden className="relative hidden aspect-16/10 overflow-hidden rounded-3xl bg-ink-100 lg:block">
          <Image src="/img/photos/terrace.jpg" alt="" fill priority sizes="40vw" className="object-cover" />
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-12 pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16 lg:pt-20">
        <section aria-labelledby="message-heading" className="rounded-3xl border border-ink-200 p-6 sm:p-10">
          <h2 id="message-heading" className="text-display-sm font-extrabold">Send a message</h2>
          <div className="mt-6"><ContactForm /></div>
        </section>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="direct-heading" className="rounded-2xl bg-ink-50 p-6 sm:p-7">
            <h2 id="direct-heading" className="font-sans text-base font-semibold text-ink-900">Reach us directly</h2>
            <dl className="mt-4 space-y-2">
              {CHANNELS.map(({ icon: Icon, label, value, href }) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <a
                      href={href}
                      className="group -mx-3 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-200 hover:bg-white"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-ink-900 shadow-sm">
                        <Icon aria-hidden strokeWidth={1.8} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span aria-hidden className="block text-sm text-ink-600">{label}</span>
                        <span className="block truncate font-semibold text-ink-900 underline-offset-4 group-hover:underline">{value}</span>
                      </span>
                    </a>
                  </dd>
                </div>
              ))}
              <div className="flex items-start gap-3 py-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-ink-900 shadow-sm">
                  <MapPin aria-hidden strokeWidth={1.8} className="size-4" />
                </span>
                <div>
                  <dt className="text-sm text-ink-600">Office</dt>
                  <dd className="font-semibold text-ink-900">
                    {brand.address.line1}
                    <br />
                    {brand.address.city}, {brand.address.country}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          <section aria-labelledby="booking-heading" className="flex gap-4 rounded-2xl border border-ink-200 p-6">
            <Inbox aria-hidden strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-ink-900" />
            <div>
              <h2 id="booking-heading" className="font-sans text-base font-semibold text-ink-900">Already have a booking?</h2>
              <p className="mt-1.5 text-sm text-ink-600">
                Message your event manager from inside your dashboard — it keeps everything on one
                thread and gets a faster answer than the general inbox.
              </p>
            </div>
          </section>

          <section aria-labelledby="hours-heading" className="flex gap-4 rounded-2xl border border-ink-200 p-6">
            <Clock aria-hidden strokeWidth={1.8} className="mt-0.5 size-5 shrink-0 text-ink-900" />
            <div>
              <h2 id="hours-heading" className="font-sans text-base font-semibold text-ink-900">Office hours</h2>
              <p className="mt-1.5 text-sm text-ink-600">
                Saturday to Thursday, 9:00 – 19:00 ({brand.timezone}). For an event happening today,
                please call rather than email.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
