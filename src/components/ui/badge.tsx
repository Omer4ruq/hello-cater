import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { BadgeCheck } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-ink-200 bg-ink-50 text-ink-700',
        brand: 'border-brand-200 bg-brand-50 text-brand-800',
        // Legacy tone names kept for API compatibility; they render in the new palette.
        saffron: 'border-warning-500/25 bg-warning-50 text-warning-700',
        clay: 'border-ink-300 bg-white text-ink-800',
        success: 'border-success-500/25 bg-success-50 text-success-700',
        warning: 'border-warning-500/25 bg-warning-50 text-warning-700',
        danger: 'border-danger-500/25 bg-danger-50 text-danger-700',
        info: 'border-info-500/25 bg-info-50 text-info-700',
        solid: 'border-transparent bg-ink-900 text-white',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** The verification mark used across partner surfaces. */
export function VerifiedBadge({ className, label = 'Verified' }: { className?: string; label?: string }) {
  return (
    <Badge tone="brand" className={cn('gap-1', className)}>
      <BadgeCheck aria-hidden className="size-3.5" />
      {label}
    </Badge>
  );
}

export { badgeVariants };
