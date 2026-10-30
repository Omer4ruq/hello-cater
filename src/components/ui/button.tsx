import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ' +
    'transition-[background-color,color,border-color,transform] duration-150 ease-out ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-700 text-white hover:bg-brand-800',
        secondary:
          'bg-white text-ink-900 border border-ink-300 hover:bg-ink-50 hover:border-ink-900',
        accent:
          'bg-white text-ink-900 hover:bg-ink-100',
        ghost: 'text-ink-900 hover:bg-ink-100',
        link: 'text-ink-900 underline underline-offset-4 hover:text-black',
        danger: 'bg-danger-500 text-white shadow-xs hover:bg-danger-700',
        outline:
          'border border-ink-900 text-ink-900 hover:bg-ink-50',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-sm [&_svg]:size-4',
        md: 'h-10 rounded-lg px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 rounded-xl px-6 text-base [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-4',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-4',
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
