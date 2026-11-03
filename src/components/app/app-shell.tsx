'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const surfaceAccent = {
    customer: 'bg-brand-700',
    partner: 'bg-ink-700',
    admin: 'bg-ink-900',
  }[surface];

  const homeHref = { customer: '/dashboard', partner: '/partner', admin: '/admin' }[surface];

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink-200 bg-white px-3 py-5 lg:flex">
        <div className="px-3 pb-6">
          <Logo href={homeHref} />
          {user.contextLabel ? (
            <p className="mt-2 truncate text-xs text-ink-500">{user.contextLabel}</p>
          ) : null}
        </div>
        <div className="-mx-3 flex-1 overflow-y-auto px-3">
          <SidebarNav sections={sections} pathname={pathname} />
        </div>
        <div className="mt-4 border-t border-ink-200 pt-3">
          <UserMenu user={user} surfaceAccent={surfaceAccent} onSignOut={onSignOut} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-1 lg:hidden">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation" className="size-11">
                  <Menu aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" title="Navigation">
                <SidebarNav
                  sections={sections}
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                  className="motion-stagger"
                />
              </SheetContent>
            </Sheet>
            <Logo href={homeHref} />
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1">
            <Link
              href={`${homeHref}/notifications`}
              className="relative grid size-11 place-items-center rounded-full text-ink-600 transition-colors duration-200 hover:bg-ink-100 hover:text-ink-900 lg:size-10"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            >
              <Bell aria-hidden className="size-[18px]" />
              {unreadCount > 0 ? (
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-brand-700 ring-2 ring-white" />
              ) : null}
            </Link>
            <div className="lg:hidden">
              <UserMenu user={user} surfaceAccent={surfaceAccent} onSignOut={onSignOut} compact />
            </div>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar links with the marketing nav's hover pill: one grey pill glides
 * between items; the first hover fades it in already in place.
 */
function SidebarNav({
  sections, pathname, onNavigate, className,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const [pill, setPill] = React.useState({ top: 0, height: 0, visible: false, glide: false });
  const onItemEnter = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget;
    setPill((p) => ({ top: el.offsetTop, height: el.offsetHeight, visible: true, glide: p.visible }));
  };

  return (
    <nav
      aria-label="Dashboard"
      className={cn('relative flex flex-col gap-6', className)}
      onMouseLeave={() => setPill((p) => ({ ...p, visible: false }))}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 rounded-full bg-ink-100',
          pill.glide ? 'transition-[translate,height,opacity]' : 'transition-opacity',
          'duration-300 ease-(--ease-out-expo)',
          pill.visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ translate: `0 ${pill.top}px`, height: pill.height }}
      />
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title ? (
            <p className="mb-1.5 px-3 text-xs font-semibold text-ink-500">{section.title}</p>
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
                    onClick={onNavigate}
                    onMouseEnter={onItemEnter}
                    onFocus={onItemEnter}
                    className={cn(
                      'relative z-10 flex min-h-11 items-center gap-3 rounded-full px-3 text-sm transition-colors duration-200 lg:min-h-10',
                      active
                        ? 'bg-ink-100 font-semibold text-ink-900'
                        : 'font-medium text-ink-700 hover:text-ink-900',
                    )}
                  >
                    <link.icon
                      aria-hidden
                      className={cn('size-[18px] shrink-0', active ? 'text-brand-700' : 'text-ink-500')}
                    />
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
            'flex items-center gap-3 text-left transition-colors duration-200 hover:bg-ink-100',
            compact ? 'size-11 justify-center rounded-full' : 'w-full rounded-xl px-3 py-2.5',
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
                <span className="block truncate text-sm font-semibold text-ink-900">{user.name}</span>
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
