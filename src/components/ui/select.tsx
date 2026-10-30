'use client';

import * as React from 'react';
import { Select as S } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string; disabled?: boolean };
type Group = { label?: string; options: Option[] };

// Radix reserves the empty string; native selects use it for "none".
const EMPTY = '__empty__';
const toRadix = (v: string) => (v === '' ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? '' : v);

function textOf(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : ''))
    .join('');
}

type OptionProps = { value?: string | number; children?: React.ReactNode; disabled?: boolean };

function toOption(el: React.ReactElement<OptionProps>): Option {
  const label = textOf(el.props.children);
  return { value: String(el.props.value ?? label), label, disabled: el.props.disabled };
}

/** Reads <option>/<optgroup> children, flattening arrays and fragments. */
function parseOptions(children: React.ReactNode): Group[] {
  const groups: Group[] = [];
  let loose: Option[] = [];
  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === React.Fragment) {
        walk((child.props as { children?: React.ReactNode }).children);
      } else if (child.type === 'option') {
        loose.push(toOption(child as React.ReactElement<OptionProps>));
      } else if (child.type === 'optgroup') {
        const props = child.props as { label?: string; children?: React.ReactNode };
        if (loose.length) groups.push({ options: loose });
        loose = [];
        const options: Option[] = [];
        React.Children.forEach(props.children, (o) => {
          if (React.isValidElement(o) && o.type === 'option') options.push(toOption(o as React.ReactElement<OptionProps>));
        });
        groups.push({ label: props.label, options });
      }
    });
  };
  walk(children);
  if (loose.length) groups.push({ options: loose });
  return groups;
}

export type SelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  /** `bare` drops the field chrome, for selects embedded in a larger control. */
  variant?: 'field' | 'bare';
};

/**
 * Drop-in replacement for a native <select>: same props, same <option>
 * children, same change events — so forms, react-hook-form and URL
 * filters keep working — with a designed, animated, keyboard-accessible
 * menu instead of the operating system's.
 *
 * A visually hidden native <select> stays the source of truth: it holds
 * the ref, name and value, and picking an item sets its value and
 * dispatches a real `change` event that React and form libraries see.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    className, children, value, defaultValue, onChange, onBlur, name, disabled, required,
    id, variant = 'field', ...props
  },
  ref,
) {
  const nativeRef = React.useRef<HTMLSelectElement | null>(null);
  const setRefs = React.useCallback(
    (el: HTMLSelectElement | null) => {
      nativeRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const groups = React.useMemo(() => parseOptions(children), [children]);
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(
    defaultValue !== undefined ? String(defaultValue) : (groups[0]?.options[0]?.value ?? ''),
  );
  const current = isControlled ? String(value ?? '') : uncontrolled;

  // Uncontrolled selects can be changed from outside (form libraries
  // apply default values and resets through the ref), so follow the DOM.
  React.useEffect(() => {
    const el = nativeRef.current;
    if (!el || isControlled) return;
    const sync = () => setUncontrolled(el.value);
    const syncAfterReset = () => setTimeout(sync);
    const form = el.form;
    sync();
    el.addEventListener('change', sync);
    form?.addEventListener('reset', syncAfterReset);
    return () => {
      el.removeEventListener('change', sync);
      form?.removeEventListener('reset', syncAfterReset);
    };
  }, [isControlled]);

  const commit = (radixValue: string) => {
    const el = nativeRef.current;
    if (!el) return;
    el.value = fromRadix(radixValue);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const ariaInvalid = props['aria-invalid'];

  return (
    <>
      <select
        ref={setRefs}
        name={name}
        required={required}
        disabled={disabled}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
        {...(isControlled ? { value: current, onChange: onChange ?? (() => {}) } : { defaultValue, onChange })}
        onBlur={onBlur}
      >
        {children}
      </select>

      <S.Root
        value={toRadix(current)}
        onValueChange={commit}
        disabled={disabled}
        onOpenChange={(open) => {
          if (!open) nativeRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        }}
      >
        <S.Trigger
          id={id}
          aria-label={props['aria-label']}
          aria-invalid={ariaInvalid}
          aria-describedby={props['aria-describedby']}
          className={cn(
            'group flex w-full min-w-0 items-center justify-between gap-2 text-left text-sm text-ink-950 outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            variant === 'field' && [
              'h-11 rounded-lg border border-ink-300 bg-white px-3.5',
              'transition-[border-color,box-shadow] duration-150',
              'hover:border-ink-400 focus-visible:border-ink-900 focus-visible:shadow-[0_0_0_1px_var(--color-ink-900)]',
              'data-[state=open]:border-ink-900 data-[state=open]:shadow-[0_0_0_1px_var(--color-ink-900)]',
              'aria-invalid:border-danger-500',
              current === '' && 'text-ink-500',
            ],
            variant === 'bare' && ['p-0', current === '' && 'text-ink-500'],
            className,
          )}
        >
          <span className="truncate">
            <S.Value />
          </span>
          {variant === 'field' ? (
            <S.Icon asChild>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-ink-500 transition-transform duration-300 ease-(--ease-out-expo) group-data-[state=open]:rotate-180"
              />
            </S.Icon>
          ) : null}
        </S.Trigger>

        <S.Portal>
          <S.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'motion-pop z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl',
              'max-h-[min(22rem,var(--radix-select-content-available-height))]',
            )}
          >
            <S.ScrollUpButton className="flex h-7 items-center justify-center text-ink-500">
              <ChevronDown aria-hidden className="size-4 rotate-180" />
            </S.ScrollUpButton>
            <S.Viewport className="p-1.5">
              {groups.map((group, gi) => (
                <S.Group key={group.label ?? `g${gi}`}>
                  {group.label ? (
                    <S.Label className="px-3 pb-1 pt-2.5 text-xs font-semibold text-ink-500">{group.label}</S.Label>
                  ) : null}
                  {group.options.map((option) => (
                    <S.Item
                      key={option.value}
                      value={toRadix(option.value)}
                      disabled={option.disabled}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center justify-between gap-6 rounded-xl px-3 py-2.5 text-sm text-ink-800 outline-none',
                        'transition-colors duration-100',
                        'data-highlighted:bg-ink-100 data-highlighted:text-ink-950',
                        'data-[state=checked]:font-semibold data-[state=checked]:text-ink-950',
                        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
                      )}
                    >
                      <S.ItemText>{option.label}</S.ItemText>
                      <S.ItemIndicator>
                        <Check aria-hidden className="size-4 text-brand-700" />
                      </S.ItemIndicator>
                    </S.Item>
                  ))}
                </S.Group>
              ))}
            </S.Viewport>
            <S.ScrollDownButton className="flex h-7 items-center justify-center text-ink-500">
              <ChevronDown aria-hidden className="size-4" />
            </S.ScrollDownButton>
          </S.Content>
        </S.Portal>
      </S.Root>
    </>
  );
});
