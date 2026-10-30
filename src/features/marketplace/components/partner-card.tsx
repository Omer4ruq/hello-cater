import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, Star } from 'lucide-react';
import { Money } from '@/components/ui/money';
import type { PartnerCard as PartnerCardData } from '../queries';

/**
 * Marketplace listing card: the photo leads, details sit quietly below.
 * Same rhythm everywhere partners are listed.
 */
export function PartnerCard({ partner, priority }: { partner: PartnerCardData; priority?: boolean }) {
  const details = [
    partner.maxGuests ? `Up to ${partner.maxGuests} guests` : null,
    partner.completedBookings > 0 ? `${partner.completedBookings} events delivered` : null,
  ].filter(Boolean);

  return (
    <Link href={`/partners/${partner.slug}`} className="group block min-w-0">
      <div className="relative aspect-20/19 overflow-hidden rounded-2xl bg-ink-100">
        <Image
          src={partner.coverImageUrl ?? '/img/photos/chef.jpg'}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-900 shadow-md">
            <BadgeCheck aria-hidden className="size-3.5 text-brand-700" /> Verified
          </span>
          {partner.isFeatured ? (
            <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-bold text-white shadow-md">Featured</span>
          ) : null}
        </div>
        <span
          aria-hidden
          className="absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-ink-900 opacity-0 shadow-md transition-[opacity,translate] duration-300 ease-(--ease-out-expo) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        >
          View profile <ArrowRight className="icon-nudge size-3.5" />
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate font-sans text-base font-semibold text-ink-900">{partner.displayName}</h3>
        {partner.ratingCount > 0 ? (
          <span className="flex shrink-0 items-center gap-1 text-sm text-ink-900">
            <Star aria-hidden className="size-3.5 fill-current" />
            {partner.ratingAvg.toFixed(2)}
            <span className="sr-only">out of 5 from {partner.ratingCount} reviews</span>
          </span>
        ) : (
          <span className="shrink-0 text-sm text-ink-900">New</span>
        )}
      </div>
      {partner.tagline ? <p className="truncate text-sm text-ink-600">{partner.tagline}</p> : null}
      {details.length > 0 ? <p className="text-sm text-ink-600">{details.join(' · ')}</p> : null}
      {partner.priceFromMinor ? (
        <p className="mt-1 text-sm text-ink-900">
          <span className="font-semibold">from <Money minor={partner.priceFromMinor} compact /></span>
        </p>
      ) : partner.minOrderMinor > 0 ? (
        <p className="mt-1 text-sm text-ink-900">
          <span className="font-semibold"><Money minor={partner.minOrderMinor} compact /></span> minimum order
        </p>
      ) : null}
    </Link>
  );
}
