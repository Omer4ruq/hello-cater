'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItem = { label: string; href: string; description?: string };

const SERVICES: NavItem[] = [
  { label: 'Catering', href: '/services/catering', description: 'Corporate, wedding and private catering' },
  { label: 'Event management', href: '/services/event-management', description: 'Planning and on-the-day coordination' },
  { label: 'Event vendors', href: '/services/event-vendors', description: 'Decor, venue, photography, sound and more' },
  { label: 'Browse all services', href: '/services' },
];

const EVENTS: NavItem[] = [
  { label: 'Corporate', href: '/events/corporate', description: 'Lunches, conferences, launches, iftar' },
  { label: 'Wedding', href: '/events/wedding', description: 'Holud, mehendi, wedding, reception' },
  { label: 'Private', href: '/events/private', description: 'Birthdays, anniversaries, home parties' },
  { label: 'All event types', href: '/events' },
];

const PRIMARY: NavItem[] = [
  { label: 'Partners', href: '/partners' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Corporate', href: '/corporate' },
  { label: 'For partners', href: '/become-a-partner' },
];

function MenuPanel({ items, label }: { items: NavItem[]; label: string }) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  React.useEffect(() => cancelClose, []);

  return (
    <div className="relative" onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:text-ink-950"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        {label}
        <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 w-80 pt-2">
          <ul className="overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-lg">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-ink-50"
                  onClick={() => setOpen(false)}
                >
                  <span className="block text-sm font-medium text-ink-950">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-xs text-ink-600">{item.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-paper/85 backdrop-blur-md transition-colors',
        scrolled ? 'border-ink-200' : 'border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <div className="flex items-center gap-1">
          <Logo />
          <nav aria-label="Main" className="ml-6 hidden items-center lg:flex">
            <MenuPanel label="Services" items={SERVICES} />
            <MenuPanel label="Events" items={EVENTS} />
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href ? 'text-brand-800' : 'text-ink-700 hover:text-ink-950',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/plan">Plan an Event</Link>
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent title="Menu">
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Services</p>
                {SERVICES.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Events</p>
                {EVENTS.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-3 h-px bg-ink-200" />
                {PRIMARY.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="mt-5 flex flex-col gap-2">
                  <Button asChild block>
                    <Link href="/plan">Plan an Event</Link>
                  </Button>
                  <Button asChild variant="secondary" block>
                    <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                      {isAuthenticated ? 'Go to dashboard' : 'Log in'}
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
