import * as React from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-950 shadow-xs ' +
  'placeholder:text-ink-400 transition-colors ' +
  'hover:border-ink-300 focus:border-brand-600 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500 ' +
  'aria-[invalid=true]:border-danger-500 aria-[invalid=true]:focus:outline-danger-500';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(base, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        base, 'h-10 appearance-none bg-no-repeat pr-9',
        "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1.5' stroke='%236b655a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E\")]",
        'bg-[position:right_0.65rem_center] bg-[size:1.1rem]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Money input. Displays taka, emits poisha, and never lets a float reach
 * the caller.
 */
export function TakaInput({
  valueMinor, onValueChange, className, ...props
}: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  valueMinor: number | null;
  onValueChange: (minor: number | null) => void;
}) {
  // The input keeps its own text so a half-typed "1200." is not
  // clobbered, but must still follow the prop when a parent resets it.
  // React's documented way to do that is to adjust state during render
  // against the previous prop value — an effect here would cause a
  // second render pass on every keystroke.
  const [text, setText] = React.useState(() =>
    valueMinor == null ? '' : String(valueMinor / 100),
  );
  const [lastValueMinor, setLastValueMinor] = React.useState(valueMinor);

  if (valueMinor !== lastValueMinor) {
    setLastValueMinor(valueMinor);
    const textAsMinor = text === '' ? null : Math.round(Number(text) * 100);
    if (textAsMinor !== valueMinor) {
      setText(valueMinor == null ? '' : String(valueMinor / 100));
    }
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500"
      >
        ৳
      </span>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw !== '' && !/^\d*\.?\d{0,2}$/.test(raw)) return;
          setText(raw);
          onValueChange(raw === '' ? null : Math.round(Number(raw) * 100));
        }}
        className={cn(base, 'h-10 pl-7', className)}
      />
    </div>
  );
}
