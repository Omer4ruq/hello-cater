import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table primitives.
 *
 * Wrapped in a horizontally scrollable region with a caption target, so
 * wide operations tables stay usable on a tablet without the layout
 * collapsing into an unreadable mess.
 */
export function TableWrap({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  return (
    <div
      className={cn('overflow-x-auto rounded-2xl border border-ink-200 bg-white', className)}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function THead({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('bg-ink-50 text-left', className)} {...props} />;
}

export function TH({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn('whitespace-nowrap border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-600', className)}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('divide-y divide-ink-100', className)} {...props} />;
}

export function TR({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('transition-colors hover:bg-ink-50/70', className)} {...props} />;
}

export function TD({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 align-middle text-ink-800', className)} {...props} />;
}

/** Right-aligned numeric cell with tabular figures so columns line up. */
export function TDNum({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3 text-right align-middle tabular-nums text-ink-900', className)} {...props} />;
}
