'use client';

import * as React from 'react';
import { Label } from 'radix-ui';
import { cn } from '@/lib/utils';

const FieldContext = React.createContext<{
  id: string;
  errorId: string;
  descriptionId: string;
  hasError: boolean;
} | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error('Field components must be used inside <Field>');
  return ctx;
}

/**
 * Accessible form field wrapper.
 *
 * Wires label/control/description/error together with the right ids and
 * aria-* attributes so errors are announced rather than only coloured red.
 */
export function Field({
  children, error, className,
}: {
  children: React.ReactNode;
  error?: string | null;
  className?: string;
}) {
  const id = React.useId();
  const value = React.useMemo(
    () => ({ id, errorId: `${id}-error`, descriptionId: `${id}-description`, hasError: Boolean(error) }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        {children}
        {error ? (
          <p id={value.errorId} role="alert" className="text-sm font-medium text-danger-700">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({
  children, className, optional, ...props
}: React.ComponentProps<typeof Label.Root> & { optional?: boolean }) {
  const { id } = useField();
  return (
    <Label.Root
      htmlFor={id}
      className={cn('text-sm font-medium text-ink-900', className)}
      {...props}
    >
      {children}
      {optional ? <span className="ml-1.5 font-normal text-ink-500">(optional)</span> : null}
    </Label.Root>
  );
}

export function FieldDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  const { descriptionId } = useField();
  return (
    <p id={descriptionId} className={cn('text-sm text-ink-600', className)}>
      {children}
    </p>
  );
}

/** Supplies id + aria wiring to whatever control it wraps. */
export function FieldControl({ children }: { children: React.ReactElement }) {
  const { id, errorId, descriptionId, hasError } = useField();
  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id,
    'aria-invalid': hasError || undefined,
    'aria-describedby': [hasError ? errorId : null, descriptionId].filter(Boolean).join(' ') || undefined,
  });
}
