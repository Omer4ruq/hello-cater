'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger,
} from '@/components/ui/dropdown';
import { cn, initials } from '@/lib/utils';

export type NavLink = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Shown as a pill on the right of the item. */
  badge?: number | null;
  /** Only match on exact path (used for section index pages). */
  exact?: boolean;
};

export type NavSection = { title?: string; links: NavLink[] };

export type ShellUser = {
  name: string;
  email: string | null;
  roleLabel: string;
  contextLabel?: string | null;
};

/**
 * Application shell for the customer, partner and admin surfaces.
 *
 * One implementation for all three so navigation, keyboard behaviour and
 * responsive handling stay identical — only the nav data and accent
 * differ. On mobile the sidebar becomes a proper slide-over rather than a
 * squashed desktop layout.
 */
export function AppShell({
  sections, user, surface, unreadCount = 0, onSignOut, children,
}: {
  sections: NavSection[];
  user: ShellUser;
  surface: 'customer' | 'partner' | 'admin';
  unreadCount?: number;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const surfaceAccent = {
    customer: 'bg-brand-700',
    partner: 'bg-clay-600',
    admin: 'bg-ink-900',
  }[surface];

  const homeHref = { customer: '/dashboard', partner: '/partner', admin: '/admin' }[surface];

  const nav = (
    <nav className="flex flex-1 flex-col gap-6" aria-label="Dashboard">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title ? (
            <p className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-wider text-ink-500">
              {section.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.links.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-ink-100 font-medium text-ink-950'
                        : 'text-ink-700 hover:bg-ink-100/70 hover:text-ink-950',
                    )}
                  >
                    <link.icon aria-hidden className="size-4 shrink-0 text-ink-500" />
                    <span className="flex-1 truncate">{link.label}</span>
                    {link.badge ? (
                      <Badge tone={active ? 'brand' : 'neutral'} className="px-1.5 py-0 text-[0.65rem]">
                        {link.badge > 99 ? '99+' : link.badge}
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-200 bg-white px-3 py-4 lg:flex">
        <div className="px-2 pb-5">
          <Logo href={homeHref} />
          {user.contextLabel ? (
            <p className="mt-2 truncate px-0.5 text-xs text-ink-500">{user.contextLabel}</p>
          ) : null}
        </div>
        {nav}
        <UserMenu user={user} surfaceAccent={surfaceAccent} onSignOut={onSignOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur lg:h-16 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" title="Navigation">
                <div onClick={(e) => (e.target as HTMLElement).closest('a') && document.dispatchEvent(new Event('keydown'))}>
                  {nav}
                </div>
                <SheetClose asChild>
                  <Button variant="secondary" block className="mt-6">Close</Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
            <Logo href={homeHref} />
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1.5">
            <Link
              href={`${homeHref === '/admin' ? '/admin' : homeHref}/notifications`}
              className="relative grid size-9 place-items-center rounded-md text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            >
              <Bell aria-hidden className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-clay-500 ring-2 ring-white" />
              ) : null}
            </Link>
            <div className="lg:hidden">
              <UserMenu user={user} surfaceAccent={surfaceAccent} onSignOut={onSignOut} compact />
            </div>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function UserMenu({
  user, surfaceAccent, onSignOut, compact,
}: {
  user: ShellUser;
  surfaceAccent: string;
  onSignOut: () => Promise<void>;
  compact?: boolean;
}) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-ink-100',
            compact ? 'p-1' : 'mt-4 border-t border-ink-200 px-2 py-2.5 pt-3.5',
          )}
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white',
              surfaceAccent,
            )}
            aria-hidden
          >
            {initials(user.name)}
          </span>
          {!compact ? (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-950">{user.name}</span>
                <span className="block truncate text-xs text-ink-500">{user.roleLabel}</span>
              </span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-400" />
            </>
          ) : null}
          <span className="sr-only">Account menu</span>
        </button>
      </DropdownTrigger>

      <DropdownContent align="end" side={compact ? 'bottom' : 'top'}>
        <DropdownLabel>{user.email ?? user.name}</DropdownLabel>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/account"><User aria-hidden /> Profile</Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/account/settings"><Settings aria-hidden /> Settings</Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem
          onSelect={(event) => {
            event.preventDefault();
            void onSignOut();
          }}
        >
          <LogOut aria-hidden /> Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
