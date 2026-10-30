import { redirect } from 'next/navigation';
import {
  BadgeCheck, Bell, Building2, CalendarRange, ClipboardList, CreditCard,
  FileSearch, FileText, Gauge, Inbox, LayoutDashboard, LifeBuoy, MapPin,
  MessageSquare, Receipt, Settings, ShieldCheck, Sparkles, Star, Users, Wallet,
} from 'lucide-react';
import { AppShell, type NavLink, type NavSection } from '@/components/app/app-shell';
import { requireUserPage } from '@/features/auth/session';
import { signOut } from '@/features/auth/actions';
import { ROLE_LABELS, type Permission } from '@/features/auth/permissions';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage('/admin');

  // Belt and braces: the proxy only checks for a session, this checks the
  // user is actually staff. RLS is still the final authority on the data.
  if (!user.isStaff || !user.platformRole) redirect('/dashboard');

  const can = (permission: Permission) => user.permissions.includes(permission);

  const supabase = await createServerSupabase();
  const [{ count: openRequests }, { count: pendingVerification }, { count: pendingPayouts }, { count: unread }] =
    await Promise.all([
      supabase.from('service_requests').select('id', { count: 'exact', head: true })
        .in('status', ['submitted', 'under_review', 'matching', 'quotes_received']),
      supabase.from('partner_profiles').select('id', { count: 'exact', head: true })
        .in('verification_status', ['pending', 'under_review']),
      supabase.from('payouts').select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'approved']),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);

  const filter = (links: (NavLink & { permission?: Permission })[]) =>
    links.filter((link) => !link.permission || can(link.permission));

  const sections: NavSection[] = [
    {
      links: filter([
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
        { label: 'Requests', href: '/admin/requests', icon: Inbox, permission: 'requests.view', badge: openRequests || null },
        { label: 'Proposals', href: '/admin/proposals', icon: Sparkles, permission: 'proposals.manage' },
        { label: 'Events', href: '/admin/events', icon: CalendarRange, permission: 'bookings.view' },
        { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
      ]),
    },
    {
      title: 'Supply',
      links: filter([
        { label: 'Partners', href: '/admin/partners', icon: Building2, permission: 'partners.view' },
        { label: 'Verification', href: '/admin/verification', icon: ShieldCheck, permission: 'partners.verify', badge: pendingVerification || null },
        { label: 'Quotes', href: '/admin/quotes', icon: ClipboardList, permission: 'quotes.view' },
      ]),
    },
    {
      title: 'Demand',
      links: filter([
        { label: 'Customers', href: '/admin/customers', icon: Users, permission: 'customers.view' },
        { label: 'Reviews', href: '/admin/reviews', icon: Star, permission: 'reviews.moderate' },
        { label: 'Support', href: '/admin/disputes', icon: LifeBuoy, permission: 'tickets.manage' },
      ]),
    },
    {
      title: 'Money',
      links: filter([
        { label: 'Payments', href: '/admin/payments', icon: CreditCard, permission: 'payments.view' },
        { label: 'Invoices', href: '/admin/invoices', icon: Receipt, permission: 'payments.view' },
        { label: 'Payouts', href: '/admin/payouts', icon: Wallet, permission: 'payouts.view', badge: pendingPayouts || null },
        { label: 'Reports', href: '/admin/reports', icon: Gauge, permission: 'reports.view' },
      ]),
    },
    {
      title: 'Platform',
      links: filter([
        { label: 'Catalogue', href: '/admin/services', icon: BadgeCheck, permission: 'catalog.manage' },
        { label: 'Locations', href: '/admin/locations', icon: MapPin, permission: 'catalog.manage' },
        { label: 'Content', href: '/admin/cms', icon: FileText, permission: 'cms.manage' },
        { label: 'Audit log', href: '/admin/audit', icon: FileSearch, permission: 'audit.view' },
        { label: 'Notifications', href: '/admin/notifications', icon: Bell, badge: unread || null },
        { label: 'Settings', href: '/admin/settings', icon: Settings, permission: 'settings.manage' },
      ]),
    },
  ].filter((section) => section.links.length > 0);

  return (
    <AppShell
      surface="admin"
      sections={sections}
      unreadCount={unread ?? 0}
      onSignOut={signOut}
      user={{
        name: user.profile.full_name || user.email || 'Staff',
        email: user.email,
        roleLabel: ROLE_LABELS[user.platformRole],
        contextLabel: 'Operations console',
      }}
    >
      {children}
    </AppShell>
  );
}
