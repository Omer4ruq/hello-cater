import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { brand } from '@/config/brand';

const COLUMNS = [
  {
    title: 'Services',
    links: [
      { label: 'Catering', href: '/services/catering' },
      { label: 'Event management', href: '/services/event-management' },
      { label: 'Event vendors', href: '/services/event-vendors' },
      { label: 'Browse partners', href: '/partners' },
    ],
  },
  {
    title: 'Events',
    links: [
      { label: 'Corporate events', href: '/events/corporate' },
      { label: 'Weddings', href: '/events/wedding' },
      { label: 'Holud', href: '/events/holud' },
      { label: 'Birthdays', href: '/events/birthday' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Corporate solutions', href: '/corporate' },
      { label: 'Become a partner', href: '/become-a-partner' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Cancellation & refunds', href: '/refund-policy' },
      { label: 'Partner agreement', href: '/partner-agreement' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-ink-950 text-ink-300">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Logo mono showTagline href="/" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-400">
              {brand.description}
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-500" />
                <span>
                  {brand.address.line1}, {brand.address.city}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone aria-hidden className="size-4 shrink-0 text-ink-500" />
                <a className="hover:text-white" href={`tel:${brand.supportPhone}`}>
                  {brand.supportPhoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail aria-hidden className="size-4 shrink-0 text-ink-500" />
                <a className="hover:text-white" href={`mailto:${brand.supportEmail}`}>
                  {brand.supportEmail}
                </a>
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-400 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.legalName}. All rights reserved.
          </p>
          <p>
            Prices in {brand.currency} ({brand.currencySymbol}). Serving {brand.launchCity} and
            expanding across {brand.country}.
          </p>
        </div>
      </div>
    </footer>
  );
}
