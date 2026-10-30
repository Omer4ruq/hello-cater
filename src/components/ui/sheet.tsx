'use client';

import * as React from 'react';
import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Slide-over panel. Used for mobile navigation and detail drawers. */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({
  className, children, side = 'right', title, ...props
}: React.ComponentProps<typeof D.Content> & { side?: 'left' | 'right'; title: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-[min(24rem,90vw)] flex-col overflow-y-auto border-ink-200 bg-white shadow-xl',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
          <D.Title className="font-sans text-base font-semibold text-ink-950">{title}</D.Title>
          <D.Close className="rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-900" aria-label="Close">
            <X aria-hidden className="size-4" />
          </D.Close>
        </div>
        <div className="flex-1 p-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
