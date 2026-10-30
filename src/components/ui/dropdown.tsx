'use client';

import * as React from 'react';
import { DropdownMenu as DM } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Dropdown = DM.Root;
export const DropdownTrigger = DM.Trigger;

export function DropdownContent({ className, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={6}
        className={cn(
          'z-50 min-w-48 overflow-hidden rounded-lg border border-ink-200 bg-white p-1 shadow-lg',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink-800 outline-none',
        'data-[highlighted]:bg-ink-100 data-[highlighted]:text-ink-950',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&_svg]:size-4 [&_svg]:text-ink-500',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500', className)} {...props} />;
}

export function DropdownSeparator({ className, ...props }: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn('my-1 h-px bg-ink-200', className)} {...props} />;
}
