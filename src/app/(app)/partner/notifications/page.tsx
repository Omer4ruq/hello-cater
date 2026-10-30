import { PageHeader } from '@/components/app/page-header';
import { NotificationList } from '@/features/notifications/components/notification-list';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Notifications', description: 'Your notifications.',
  path: '/partner/notifications', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireUserPage('/partner/notifications');
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from('notifications')
    .select('id, title, body, url, type_key, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Everything that needed your attention, newest first."
      />
      <NotificationList
        notifications={(data ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          url: n.url,
          typeKey: n.type_key,
          readAt: n.read_at,
          createdAt: n.created_at,
        }))}
      />
    </>
  );
}
