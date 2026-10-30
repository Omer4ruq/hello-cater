import { PageHeader } from '@/components/app/page-header';
import { ThreadList } from '@/features/messaging/components/thread-list';
import { listThreads } from '@/features/messaging/queries';
import { requireUserPage } from '@/features/auth/session';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Messages', description: 'Your conversations.',
  path: '/admin/messages', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  await requireUserPage('/admin/messages');
  const threads = await listThreads('admin');

  return (
    <>
      <PageHeader
        title="Messages"
        description="Every request and event has its own thread, so nothing gets lost across phone calls and WhatsApp."
      />
      <ThreadList threads={threads} basePath="/admin/messages" />
    </>
  );
}
