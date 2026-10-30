import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

/* ---------------------------------------------------------------- Alert */

const ALERT_TONES = {
  info: { cls: 'border-info-500/25 bg-info-50 text-info-700', Icon: Info },
  success: { cls: 'border-success-500/25 bg-success-50 text-success-700', Icon: CheckCircle2 },
  warning: { cls: 'border-warning-500/25 bg-warning-50 text-warning-700', Icon: TriangleAlert },
  danger: { cls: 'border-danger-500/25 bg-danger-50 text-danger-700', Icon: AlertCircle },
} as const;

export function Alert({
  tone = 'info', title, children, className,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = ALERT_TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', cls, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="[&_a]:underline">{children}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-5">
      <Skeleton className="mb-3 h-5 w-1/3" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white" aria-busy>
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-ink-100 p-4 last:border-0">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={c === 0 ? 'h-4 w-1/4' : 'h-4 flex-1'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- EmptyState */

export function EmptyState({
  icon: Icon, title, description, action, className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-white text-ink-500 shadow-xs">
          <Icon aria-hidden className="size-5" />
        </span>
      ) : null}
      <p className="font-sans text-base font-semibold text-ink-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-600">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
