import Link from 'next/link';
import Image from 'next/image';
import { Users, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, VerifiedBadge } from '@/components/ui/badge';
import { Money } from '@/components/ui/money';
import type { PartnerCard as PartnerCardData } from '../queries';

/** Marketplace listing card. Kept dense but calm — it appears 12 at a time. */
export function PartnerCard({ partner, priority }: { partner: PartnerCardData; priority?: boolean }) {
  return (
    <Link href={`/partners/${partner.slug}`} className="group block h-full">
      <Card interactive className="flex h-full flex-col overflow-hidden">
        <div className="relative h-44 bg-ink-100">
          <Image
            src={partner.coverImageUrl ?? '/img/partner.svg'}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <VerifiedBadge />
            {partner.isFeatured ? <Badge tone="saffron">Featured</Badge> : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-sans text-base font-semibold text-ink-950 group-hover:text-brand-800">
            {partner.displayName}
          </h3>
          {partner.tagline ? (
            <p className="mt-1 line-clamp-2 text-sm text-ink-600">{partner.tagline}</p>
          ) : null}

          <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-xs text-ink-600">
            <div className="flex items-center gap-1">
              <dt className="sr-only">Rating</dt>
              <dd>
                {partner.ratingCount > 0 ? (
                  <>
                    <span className="font-medium text-ink-900">★ {partner.ratingAvg.toFixed(1)}</span>{' '}
                    <span>({partner.ratingCount})</span>
                  </>
                ) : (
                  <Badge tone="neutral">New partner</Badge>
                )}
              </dd>
            </div>

            {partner.completedBookings > 0 ? (
              <div className="flex items-center gap-1">
                <dt className="sr-only">Events delivered</dt>
                <dd>{partner.completedBookings} events</dd>
              </div>
            ) : null}

            {partner.maxGuests ? (
              <div className="flex items-center gap-1">
                <dt className="sr-only">Capacity</dt>
                <Users aria-hidden className="size-3" />
                <dd>up to {partner.maxGuests}</dd>
              </div>
            ) : null}

            {partner.priceFromMinor ? (
              <div className="flex items-center gap-1">
                <dt className="sr-only">From</dt>
                <Wallet aria-hidden className="size-3" />
                <dd>
                  from <Money minor={partner.priceFromMinor} compact />
                </dd>
              </div>
            ) : partner.minOrderMinor > 0 ? (
              <div className="flex items-center gap-1">
                <dt className="sr-only">Minimum order</dt>
                <Wallet aria-hidden className="size-3" />
                <dd>
                  min <Money minor={partner.minOrderMinor} compact />
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </Card>
    </Link>
  );
}
