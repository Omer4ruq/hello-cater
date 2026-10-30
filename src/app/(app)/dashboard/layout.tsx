import {
  Bell, Building2, CalendarRange, CreditCard, FileText, Heart,
  LayoutDashboard, LifeBuoy, MessageSquare, Receipt, Settings, Sparkles,
} from 'lucide-react';
import { AppShell, type NavSection } from '@/components/app/app-shell';
import { requireUserPage } from '@/features/auth/session';
import { getUnreadNotificationCount } from '@/features/customer/queries';
import { signOut } from '@/features/auth/actions';

export default async function CustomerDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage('/dashboard');
  const unread = await getUnreadNotificationCount().catch(() => 0);

  const company = user.customerOrgs[0];

  const sections: NavSection[] = [
    {
      links: [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
        { label: 'My requests', href: '/dashboard/requests', icon: FileText },
        { label: 'Proposals', href: '/dashboard/proposals', icon: Sparkles },
        { label: 'My events', href: '/dashboard/events', icon: CalendarRange },
        { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      ],
    },
    {
      title: 'Money',
      links: [
        { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
        { label: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Saved partners', href: '/dashboard/saved', icon: Heart },
        ...(company
          ? [{ label: 'Company & team', href: '/dashboard/company', icon: Building2 }]
          : []),
        { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: unread || null },
        { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
        { label: 'Settings', href: '/account/settings', icon: Settings },
      ],
    },
  ];

  return (
    <AppShell
      surface="customer"
      sections={sections}
      unreadCount={unread}
      onSignOut={signOut}
      user={{
        name: user.profile.full_name || user.email || 'Your account',
        email: user.email,
        roleLabel: company ? 'Company account' : 'Personal account',
        contextLabel: company?.organizationName ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
