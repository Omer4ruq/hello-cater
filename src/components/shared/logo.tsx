import Link from 'next/link';
import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';

/**
 * Wordmark. Purely typographic with a single geometric mark so the brand
 * can be replaced by editing `src/config/brand.ts` and this one file.
 */
export function Logo({
  className, href = '/', mono, showTagline,
}: {
  className?: string;
  href?: string | null;
  mono?: boolean;
  showTagline?: boolean;
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'relative grid size-8 shrink-0 place-items-center rounded-lg',
          mono ? 'bg-white text-brand-800' : 'bg-brand-700 text-white',
        )}
      >
        {/* A plate-and-place-setting mark: food + event, in one glyph. */}
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="7.2" />
          <circle cx="12" cy="12" r="3.1" />
          <path d="M12 1.6v3M12 19.4v3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.32rem] font-bold tracking-tight',
            mono ? 'text-white' : 'text-ink-900',
          )}
        >
          {brand.shortName}
          <span className={mono ? 'text-white/70' : 'text-brand-700'}>{' '}BD</span>
        </span>
        {showTagline ? (
          <span className={cn('mt-1 text-[0.68rem]', mono ? 'text-white/70' : 'text-ink-500')}>
            {brand.launchCity} · {brand.country}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex rounded-md" aria-label={`${brand.name} home`}>
      {content}
    </Link>
  );
}
