import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUGGESTIONS = [
  { title: 'Plan an event', body: 'Send one brief, get comparable quotes', href: '/plan', img: '/img/photos/stage.jpg' },
  { title: 'Browse partners', body: 'Verified caterers and event teams', href: '/partners', img: '/img/photos/buffet.jpg' },
  { title: 'Corporate events', body: 'Conferences, town halls, launches', href: '/events/corporate', img: '/img/photos/conference.jpg' },
];

/** Body of every 404. Pages supply their own chrome (or the marketing layout does). */
export function NotFoundContent() {
  return (
    <div className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold text-brand-700">Error 404</p>
        <h1 className="mt-3 text-display-md font-extrabold">We could not find that page</h1>
        <p className="mt-4 text-lg text-ink-600">
          The link may be outdated, or the page may have moved. These are good places to pick up from.
        </p>
        <Button asChild size="lg" className="mt-8 rounded-full px-7">
          <Link href="/">
            Back to home <ArrowRight aria-hidden className="icon-nudge" />
          </Link>
        </Button>
      </div>

      <ul className="motion-stagger mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="group block">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-ink-100">
                <Image
                  src={s.img} alt="" fill sizes="(min-width: 640px) 18rem, 100vw"
                  className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                />
              </div>
              <p className="mt-3 flex items-center gap-1 font-semibold text-ink-900">
                {s.title} <ArrowRight aria-hidden className="icon-nudge size-4" />
              </p>
              <p className="text-sm text-ink-600">{s.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
