import { formatMinor, formatMinorCompact, toMajor } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Renders poisha as BDT.
 *
 * Always emits a machine-readable value in `data-amount-minor` so tests
 * and exports can read the exact integer rather than parsing a
 * locale-formatted string.
 */
export function Money({
  minor, compact, precise, className, muted,
}: {
  minor: number;
  compact?: boolean;
  precise?: boolean;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      data-amount-minor={minor}
      className={cn('tabular-nums', muted && 'text-ink-600', className)}
      title={compact ? formatMinor(minor) : undefined}
    >
      {compact ? formatMinorCompact(minor) : formatMinor(minor, { precise })}
    </span>
  );
}

/** Per-person unit price, e.g. "৳700 / person". */
export function PerPerson({ minor, className }: { minor: number; className?: string }) {
  return (
    <span className={cn('tabular-nums', className)} data-amount-minor={minor}>
      {formatMinor(minor)}
      <span className="text-ink-500"> / person</span>
    </span>
  );
}

export function priceRangeLabel(fromMinor: number | null, toMinor: number | null): string | null {
  if (fromMinor == null) return null;
  if (toMinor == null || toMinor === fromMinor) return `From ${formatMinor(fromMinor)}`;
  return `${formatMinor(fromMinor)} – ${formatMinor(toMinor)}`;
}

export { toMajor };
