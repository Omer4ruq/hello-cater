import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Dashboard metric tile. Kept flat and typographic rather than a
 * gradient card, so a row of eight still reads as data.
 */
export function Stat({
  label, value, hint, delta, icon: Icon, href, className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Percentage change vs the previous period. */
  delta?: number | null;
  icon?: React.ElementType;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        {Icon ? <Icon aria-hidden className="size-4 text-ink-400" /> : null}
      </div>
      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-ink-950 tabular-nums">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {delta != null ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              delta >= 0 ? 'text-success-700' : 'text-danger-700',
            )}
          >
            {delta >= 0 ? <TrendingUp aria-hidden className="size-3" /> : <TrendingDown aria-hidden className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="text-xs text-ink-500">{hint}</span> : null}
      </div>
    </>
  );

  const cls = cn(
    'rounded-xl border border-ink-200 bg-white p-4',
    href && 'transition-colors hover:border-ink-300 hover:bg-ink-50/60',
    className,
  );

  return href ? (
    <a href={href} className={cls}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}
