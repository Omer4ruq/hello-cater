import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className, interactive, ...props
}: React.ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ink-200 bg-white shadow-xs',
        interactive &&
          'transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />;
}

export function CardTitle({ className, as: As = 'h3', ...props }: React.ComponentProps<'h3'> & { as?: React.ElementType }) {
  return <As className={cn('font-sans text-base font-semibold tracking-tight text-ink-950', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-ink-600', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center gap-3 border-t border-ink-200 bg-ink-50/60 px-5 py-3.5', className)} {...props} />
  );
}
