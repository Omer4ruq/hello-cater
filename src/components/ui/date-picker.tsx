'use client';

import * as React from 'react';
import { Popover as P } from 'radix-ui';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Values are plain YYYY-MM-DD strings, the same as a native date input.
type Ymd = string;

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date): Ymd => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromYmd(v: string | undefined | null): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last));
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
const longLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export type DatePickerProps = {
  value?: string | null;
  onChange?: (value: Ymd) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  /** `bare` drops the field chrome, for pickers embedded in a larger control. */
  variant?: 'field' | 'bare';
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
};

/**
 * Designed replacement for <input type="date">: a trigger that opens an
 * animated calendar popover. Arrow keys move by day/week, PageUp/PageDown
 * by month, Home/End to the week's edges, Enter picks, Escape closes.
 * Emits '' when cleared.
 */
export function DatePicker({
  value, onChange, onBlur, min, max, placeholder = 'Add date', disabled, variant = 'field',
  className, id, name, ...aria
}: DatePickerProps) {
  const selected = fromYmd(value);
  const minDate = fromYmd(min);
  const maxDate = fromYmd(max);
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState<Date>(() => selected ?? minDate ?? new Date());
  const gridRef = React.useRef<HTMLDivElement>(null);

  const outOfRange = (d: Date) =>
    (minDate !== null && d < minDate) || (maxDate !== null && d > maxDate);
  const clamp = (d: Date) => (minDate && d < minDate ? minDate : maxDate && d > maxDate ? maxDate : d);

  const onOpenChange = (next: boolean) => {
    if (next) setFocus(clamp(selected ?? new Date()));
    else onBlur?.();
    setOpen(next);
  };

  // Keep DOM focus on the focused day as it moves. Synchronous once the
  // grid exists (a month change remounts the days, so waiting a frame
  // would drop fast keypresses); on open the portal mounts a frame later.
  React.useLayoutEffect(() => {
    if (!open) return;
    const focusDay = () =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${toYmd(focus)}"]`)?.focus();
    if (gridRef.current) {
      focusDay();
      return;
    }
    const id = requestAnimationFrame(focusDay);
    return () => cancelAnimationFrame(id);
  }, [open, focus]);

  const pick = (d: Date) => {
    if (outOfRange(d)) return;
    onChange?.(toYmd(d));
    setOpen(false);
    onBlur?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDays(focus, -focus.getDay()),
      End: () => addDays(focus, 6 - focus.getDay()),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocus(clamp(moves[e.key]()));
    }
  };

  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i - first.getDay()));
  const weeks = Array.from({ length: days[35].getMonth() === focus.getMonth() ? 6 : 5 }, (_, w) =>
    days.slice(w * 7, w * 7 + 7),
  );
  const todayYmd = toYmd(new Date());
  const nextMonth = addMonths(first, 1);
  const canPrev = !minDate || new Date(first.getFullYear(), first.getMonth(), 0) >= minDate;
  const canNext = !maxDate || nextMonth <= maxDate;

  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <P.Trigger
        id={id}
        disabled={disabled}
        aria-label={aria['aria-label']}
        aria-invalid={aria['aria-invalid']}
        aria-describedby={aria['aria-describedby']}
        className={cn(
          'group flex w-full min-w-0 items-center gap-2 text-left text-sm text-ink-950 outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variant === 'field' && [
            'h-11 rounded-lg border border-ink-300 bg-white px-3.5',
            'transition-[border-color,box-shadow] duration-150',
            'hover:border-ink-400 focus-visible:border-ink-900 focus-visible:shadow-[0_0_0_1px_var(--color-ink-900)]',
            'data-[state=open]:border-ink-900 data-[state=open]:shadow-[0_0_0_1px_var(--color-ink-900)]',
            'aria-invalid:border-danger-500',
          ],
          variant === 'bare' && 'p-0',
          !selected && 'text-ink-500',
          className,
        )}
      >
        <span className="flex-1 truncate">{selected ? shortLabel.format(selected) : placeholder}</span>
        {variant === 'field' ? <CalendarDays aria-hidden className="size-4 shrink-0 text-ink-500" /> : null}
      </P.Trigger>

      <P.Portal>
        <P.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="motion-pop z-50 w-[19.5rem] rounded-2xl border border-ink-200 bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button" aria-label="Previous month" disabled={!canPrev}
              onClick={() => setFocus(clamp(addMonths(focus, -1)))}
              className="grid size-8 place-items-center rounded-full text-ink-900 transition-colors hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-ink-900">
              {monthLabel.format(first)}
            </p>
            <button
              type="button" aria-label="Next month" disabled={!canNext}
              onClick={() => setFocus(clamp(addMonths(focus, 1)))}
              className="grid size-8 place-items-center rounded-full text-ink-900 transition-colors hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>

          <div ref={gridRef} role="grid" aria-label={monthLabel.format(first)} onKeyDown={onKeyDown}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <span key={d} role="columnheader" className="grid h-8 place-items-center text-xs font-semibold text-ink-500">
                  {d}
                </span>
              ))}
            </div>
            {/* Keyed by month so a new month fades in. */}
            <div key={toYmd(first)} className="animate-[fade-in_200ms_ease-out]">
              {weeks.map((week) => (
                <div role="row" key={toYmd(week[0])} className="grid grid-cols-7">
                  {week.map((d) => {
                    const ymd = toYmd(d);
                    const inMonth = d.getMonth() === focus.getMonth();
                    const isSelected = value === ymd;
                    const isFocus = toYmd(focus) === ymd;
                    const blocked = outOfRange(d);
                    return (
                      <div role="gridcell" key={ymd} aria-selected={isSelected} className="grid place-items-center py-0.5">
                        <button
                          type="button"
                          data-day={ymd}
                          tabIndex={isFocus ? 0 : -1}
                          disabled={blocked}
                          aria-label={longLabel.format(d)}
                          aria-current={ymd === todayYmd ? 'date' : undefined}
                          onClick={() => pick(d)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              pick(d);
                            }
                          }}
                          className={cn(
                            'grid size-9 place-items-center rounded-full text-sm outline-none transition-[background-color,color,scale] duration-150 active:scale-90',
                            inMonth ? 'text-ink-900' : 'text-ink-400',
                            !blocked && !isSelected && 'hover:bg-ink-100',
                            'focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-1',
                            ymd === todayYmd && !isSelected && 'font-bold underline decoration-2 underline-offset-4',
                            isSelected && 'bg-ink-900 font-semibold text-white',
                            blocked && 'cursor-not-allowed text-ink-300 line-through',
                          )}
                        >
                          {d.getDate()}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {selected ? (
            <div className="mt-3 flex justify-end border-t border-ink-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange?.('');
                  setOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-900 underline underline-offset-4 hover:bg-ink-100"
              >
                Clear date
              </button>
            </div>
          ) : null}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
