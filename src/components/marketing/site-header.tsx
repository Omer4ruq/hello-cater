'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ArrowRight, Briefcase, CalendarCheck, ChevronDown, Heart, LayoutGrid, Menu,
  PartyPopper, Sparkles, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItem = { label: string; href: string; description?: string; icon?: LucideIcon };
type Feature = { title: string; body: string; href: string; img: string };

const SERVICES: NavItem[] = [
  { label: 'Catering', href: '/services/catering', description: 'Corporate, wedding and private catering', icon: UtensilsCrossed },
  { label: 'Event management', href: '/services/event-management', description: 'Planning and on-the-day coordination', icon: CalendarCheck },
  { label: 'Event vendors', href: '/services/event-vendors', description: 'Decor, venue, photography, sound and more', icon: Sparkles },
  { label: 'Browse all services', href: '/services', icon: LayoutGrid },
];

const EVENTS: NavItem[] = [
  { label: 'Corporate', href: '/events/corporate', description: 'Lunches, conferences, launches, iftar', icon: Briefcase },
  { label: 'Wedding', href: '/events/wedding', description: 'Holud, mehendi, wedding, reception', icon: Heart },
  { label: 'Private', href: '/events/private', description: 'Birthdays, anniversaries, home parties', icon: PartyPopper },
  { label: 'All event types', href: '/events', icon: LayoutGrid },
];

const SERVICES_FEATURE: Feature = {
  title: 'Corporate catering',
  body: 'Office lunches, iftar and large buffets from verified kitchens.',
  href: '/services/catering',
  img: '/img/photos/buffet.jpg',
};

const EVENTS_FEATURE: Feature = {
  title: 'Conferences & town halls',
  body: 'Venue, stage, AV and hospitality in one proposal.',
  href: '/events/corporate',
  img: '/img/photos/conference.jpg',
};

const PRIMARY: NavItem[] = [
  { label: 'Partners', href: '/partners' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Corporate', href: '/corporate' },
  { label: 'For partners', href: '/become-a-partner' },
];

type ItemEvent = React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>;

/**
 * The grey pill that glides between top-level nav items under the
 * pointer. Items report their box on hover; the pill moves there.
 */
function useHoverPill() {
  // `glide` is false on the first hover so the pill fades in already in
  // place instead of growing from where it was last hidden.
  const [pill, setPill] = React.useState({ left: 0, width: 0, visible: false, glide: false });
  const onItemEnter = (e: ItemEvent) => {
    const el = e.currentTarget;
    setPill((p) => ({ left: el.offsetLeft, width: el.offsetWidth, visible: true, glide: p.visible }));
  };
  const onLeave = () => setPill((p) => ({ ...p, visible: false }));
  return { pill, onItemEnter, onLeave };
}

function MenuPanel({
  items, label, feature, onItemEnter,
}: {
  items: NavItem[];
  label: string;
  feature: Feature;
  onItemEnter: (e: ItemEvent) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = React.useId();

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  // A short open delay keeps the menu from flashing when the pointer only
  // crosses the nav; a longer close delay forgives diagonal movement.
  const openSoon = () => {
    clear();
    timer.current = setTimeout(() => setOpen(true), 70);
  };
  const closeSoon = () => {
    clear();
    timer.current = setTimeout(() => setOpen(false), 160);
  };

  React.useEffect(() => clear, []);

  return (
    <div
      className="relative"
      onMouseEnter={(e) => { onItemEnter(e); openSoon(); }}
      onMouseLeave={closeSoon}
      onFocus={onItemEnter}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          e.currentTarget.querySelector('button')?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="relative z-10 flex items-center gap-1 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors duration-200 hover:text-ink-900 aria-expanded:text-ink-900"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { clear(); setOpen((v) => !v); }}
      >
        {label}
        <ChevronDown
          aria-hidden
          className={cn('size-3.5 transition-transform duration-300 ease-(--ease-out-expo)', open && 'rotate-180')}
        />
      </button>

      <div
        id={panelId}
        inert={!open}
        className={cn(
          'absolute left-0 top-full z-50 origin-top-left pt-3',
          'transition-[opacity,translate,scale,visibility] duration-200 ease-(--ease-out-expo)',
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-[0.98] opacity-0',
        )}
      >
        <div className="grid w-160 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2 rounded-3xl border border-ink-200 bg-white p-2.5 shadow-xl">
          <ul className={cn('flex flex-col', open && 'motion-stagger')}>
            {items.map((item) => {
              const Icon = item.icon ?? LayoutGrid;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3.5 rounded-2xl p-3 transition-colors duration-150 hover:bg-ink-50"
                    onClick={() => setOpen(false)}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 transition-[color,border-color,scale] duration-200 group-hover:scale-105 group-hover:border-ink-300 group-hover:text-brand-700">
                      <Icon aria-hidden strokeWidth={1.8} className="size-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">{item.label}</span>
                      {item.description ? (
                        <span className="mt-0.5 block text-xs text-ink-600">{item.description}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={feature.href}
            onClick={() => setOpen(false)}
            className="group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white hover:text-white"
          >
            <Image
              src={feature.img} alt="" fill sizes="16rem"
              className="-z-10 object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
            />
            <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
            <span className="text-base font-bold">{feature.title}</span>
            <span className="mt-1 text-xs text-white/85">{feature.body}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
              Explore <ArrowRight aria-hidden className="icon-nudge size-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const { pill, onItemEnter, onLeave } = useHoverPill();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      style={{ viewTransitionName: 'site-header' }}
      className={cn(
        'sticky top-0 z-40 border-b bg-white/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-300',
        scrolled ? 'border-ink-200 shadow-sm' : 'border-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-18">
        <div className="flex items-center gap-1">
          <Logo />
          <nav aria-label="Main" className="relative ml-6 hidden items-center lg:flex" onMouseLeave={onLeave}>
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute left-0 top-1/2 h-10 -translate-y-1/2 rounded-full bg-ink-100',
                pill.glide ? 'transition-[transform,width,opacity]' : 'transition-opacity',
                'duration-300 ease-(--ease-out-expo)',
                pill.visible ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
            />
            <MenuPanel label="Services" items={SERVICES} feature={SERVICES_FEATURE} onItemEnter={onItemEnter} />
            <MenuPanel label="Events" items={EVENTS} feature={EVENTS_FEATURE} onItemEnter={onItemEnter} />
            {PRIMARY.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={onItemEnter}
                  onFocus={onItemEnter}
                  className={cn(
                    'relative z-10 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200',
                    active ? 'text-ink-900' : 'text-ink-700 hover:text-ink-900',
                  )}
                >
                  {item.label}
                  {active ? (
                    <span aria-hidden className="absolute inset-x-4 bottom-0.5 h-0.5 rounded-full bg-ink-900" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Button asChild variant="secondary" size="sm" className="h-10 rounded-full px-5">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="h-10 rounded-full px-4">
                <Link href="/login">Log in</Link>
              </Button>
            )}
            <Button asChild size="sm" className="h-10 rounded-full px-5">
              <Link href="/plan">
                Plan an Event <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent title="Menu">
              <nav aria-label="Mobile" className="motion-stagger flex flex-col gap-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-500">Services</p>
                {SERVICES.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 active:bg-ink-100">
                      {i.icon ? <i.icon aria-hidden strokeWidth={1.8} className="size-4.5 text-ink-500" /> : null}
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <p className="px-3 pb-1 pt-4 text-xs font-semibold text-ink-500">Events</p>
                {EVENTS.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 active:bg-ink-100">
                      {i.icon ? <i.icon aria-hidden strokeWidth={1.8} className="size-4.5 text-ink-500" /> : null}
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-3 h-px bg-ink-200" />
                {PRIMARY.map((i) => (
                  <SheetClose asChild key={i.href}>
                    <Link href={i.href} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 active:bg-ink-100">
                      {i.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="mt-5 flex flex-col gap-2">
                  <Button asChild block size="lg" className="rounded-full">
                    <Link href="/plan">Plan an Event</Link>
                  </Button>
                  <Button asChild variant="secondary" block size="lg" className="rounded-full">
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
