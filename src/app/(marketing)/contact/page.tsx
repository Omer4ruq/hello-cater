import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ContactForm } from '@/features/support/components/contact-form';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const metadata = buildMetadata({
  title: 'Contact us',
  description: `Talk to the ${brand.name} team about an event, a corporate account, or joining as a partner.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])} />

      <section className="border-b border-ink-200 bg-white">
        <div className="container-page py-14 lg:py-18">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 max-w-2xl text-display-lg">Talk to our team</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-600">
            Planning something specific, or just want to know whether we can cover it? Send us a
            message and we will reply within one working day.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="text-display-sm">Send a message</h2>
          <div className="mt-6"><ContactForm /></div>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="font-sans text-base font-semibold text-ink-950">Reach us directly</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <div>
                  <dt className="text-ink-600">Phone</dt>
                  <dd>
                    <a href={`tel:${brand.supportPhone}`} className="font-medium text-brand-700 hover:underline">
                      {brand.supportPhoneDisplay}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <div>
                  <dt className="text-ink-600">Support</dt>
                  <dd>
                    <a href={`mailto:${brand.supportEmail}`} className="font-medium text-brand-700 hover:underline">
                      {brand.supportEmail}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <div>
                  <dt className="text-ink-600">Partnerships</dt>
                  <dd>
                    <a href={`mailto:${brand.salesEmail}`} className="font-medium text-brand-700 hover:underline">
                      {brand.salesEmail}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <div>
                  <dt className="text-ink-600">Office</dt>
                  <dd className="text-ink-900">
                    {brand.address.line1}
                    <br />
                    {brand.address.city}, {brand.address.country}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-base font-semibold text-ink-950">Already have a booking?</h2>
            <p className="mt-2 text-sm text-ink-600">
              Message your event manager from inside your dashboard — it keeps everything on one
              thread and gets a faster answer than the general inbox.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-base font-semibold text-ink-950">Office hours</h2>
            <p className="mt-2 text-sm text-ink-600">
              Saturday to Thursday, 9:00 – 19:00 ({brand.timezone}). For an event happening today,
              please call rather than email.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
