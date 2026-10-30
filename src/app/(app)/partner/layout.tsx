import Link from 'next/link';
import {
  BadgeCheck, Bell, BookOpen, CalendarDays, ClipboardList, FileText, Inbox,
  LayoutDashboard, LifeBuoy, MessageSquare, Receipt, Settings, Star,
  UserCog, Users, Utensils, Wallet,
} from 'lucide-react';
import { AppShell, type NavSection } from '@/components/app/app-shell';
import { requireUserPage } from '@/features/auth/session';
import { signOut } from '@/features/auth/actions';
import { activePartner, getPartnerProfile } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { Alert } from '@/components/ui/feedback';

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage('/partner');
  const partner = activePartner(user);
  const profile = await getPartnerProfile(partner.partnerId);

  const supabase = await createServerSupabase();
  const [{ count: openInvites }, { count: draftQuotes }, { count: unread }] = await Promise.all([
    supabase
      .from('request_partner_invites')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.partnerId)
      .in('status', ['invited', 'viewed']),
    supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', partner.partnerId)
      .in('status', ['draft', 'changes_requested']),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
  ]);

  const sections: NavSection[] = [
    {
      links: [
        { label: 'Dashboard', href: '/partner', icon: LayoutDashboard, exact: true },
        { label: 'Requests', href: '/partner/requests', icon: Inbox, badge: openInvites || null },
        { label: 'Quotes', href: '/partner/quotes', icon: ClipboardList, badge: draftQuotes || null },
        { label: 'Bookings', href: '/partner/bookings', icon: BadgeCheck },
        { label: 'Calendar', href: '/partner/calendar', icon: CalendarDays },
      ],
    },
    {
      title: 'Catalogue',
      links: [
        { label: 'Packages', href: '/partner/services', icon: BookOpen },
        { label: 'Menus', href: '/partner/menus', icon: Utensils },
      ],
    },
    {
      title: 'Business',
      links: [
        { label: 'Customers', href: '/partner/customers', icon: Users },
        { label: 'Messages', href: '/partner/messages', icon: MessageSquare },
        { label: 'Earnings', href: '/partner/earnings', icon: Wallet },
        { label: 'Payouts', href: '/partner/payouts', icon: Receipt },
        { label: 'Reviews', href: '/partner/reviews', icon: Star },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Business profile', href: '/partner/profile', icon: UserCog },
        { label: 'Documents', href: '/partner/documents', icon: FileText },
        { label: 'Team', href: '/partner/team', icon: Users },
        { label: 'Notifications', href: '/partner/notifications', icon: Bell, badge: unread || null },
        { label: 'Help', href: '/dashboard/support', icon: LifeBuoy },
        { label: 'Settings', href: '/account/settings', icon: Settings },
      ],
    },
  ];

  const banner = (() => {
    if (!profile) return null;
    if (profile.verification_status === 'approved' && !profile.published_at) {
      return (
        <Alert tone="info" title="Your profile is approved but not published" className="mb-6">
          Add your packages, service areas and a cover image, then ask us to publish you to the public
          marketplace. You can still receive and quote on invitations in the meantime.
        </Alert>
      );
    }
    if (['pending', 'under_review', 'unsubmitted'].includes(profile.verification_status)) {
      return (
        <Alert tone="warning" title="Verification in progress" className="mb-6">
          Our team is reviewing your application. Upload your trade licence and business documents in{' '}
          <Link href="/partner/documents" className="font-medium underline underline-offset-4">Documents</Link>{' '}
          to speed this up. You will start receiving requests once you are verified.
        </Alert>
      );
    }
    if (profile.verification_status === 'rejected') {
      return (
        <Alert tone="danger" title="Your application needs attention" className="mb-6">
          {profile.rejection_reason ?? 'Some details could not be verified.'} Update your information and
          we will review it again.
        </Alert>
      );
    }
    if (profile.verification_status === 'suspended') {
      return (
        <Alert tone="danger" title="Your account is suspended" className="mb-6">
          You will not receive new requests. Contact our partner team to resolve this.
        </Alert>
      );
    }
    return null;
  })();

  return (
    <AppShell
      surface="partner"
      sections={sections}
      unreadCount={unread ?? 0}
      onSignOut={signOut}
      user={{
        name: user.profile.full_name || user.email || 'Partner',
        email: user.email,
        roleLabel: partner.role === 'owner' ? 'Owner' : partner.role === 'admin' ? 'Admin' : 'Team member',
        contextLabel: profile?.display_name ?? partner.name,
      }}
    >
      {banner}
      {children}
    </AppShell>
  );
}
