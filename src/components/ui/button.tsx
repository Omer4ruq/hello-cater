import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ' +
    'transition-[background-color,color,border-color,box-shadow,transform] duration-150 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-700 text-white shadow-xs hover:bg-brand-800 focus-visible:outline-brand-700',
        secondary:
          'bg-white text-ink-900 border border-ink-200 shadow-xs hover:bg-ink-50 hover:border-ink-300',
        accent:
          'bg-saffron-400 text-ink-950 shadow-xs hover:bg-saffron-300',
        ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-950',
        link: 'text-brand-700 underline underline-offset-4 hover:text-brand-800',
        danger: 'bg-danger-500 text-white shadow-xs hover:bg-danger-700',
        outline:
          'border border-brand-700 text-brand-700 hover:bg-brand-50',
      },
      size: {
        sm: 'h-8 rounded-md px-3 text-sm [&_svg]:size-4',
        md: 'h-10 rounded-md px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 rounded-lg px-6 text-base [&_svg]:size-5',
        icon: 'size-10 rounded-md [&_svg]:size-4',
        'icon-sm': 'size-8 rounded-md [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and blocks interaction. Announced to screen readers. */
    loading?: boolean;
  };

export function Button({
  className, variant, size, block, asChild, loading, children, disabled, ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  // With `asChild` the styles are forwarded to the caller's element (a
  // Link, usually). Radix's Slot accepts exactly one child, so the
  // loading affordance is not available in that mode — use a real
  // <button> when you need a spinner.
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span className="sr-only">Loading</span>
        </>
      ) : null}
      {children}
    </button>
  );
}

export { buttonVariants };
