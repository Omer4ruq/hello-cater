import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { ThreadList } from '@/features/messaging/components/thread-list';
import { ThreadView } from '@/features/messaging/components/thread-view';
import { getThread, listThreads } from '@/features/messaging/queries';
import { requireUserPage } from '@/features/auth/session';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Conversation', description: 'Message thread.',
  path: '/admin/messages', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/admin/messages/${id}`);

  const [data, threads] = await Promise.all([getThread(id), listThreads('admin')]);
  if (!data) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Messages', href: '/admin/messages' },
          { label: data.thread.subject || 'Conversation' },
        ]}
        title="Messages"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="hidden lg:block">
          <ThreadList threads={threads} basePath="/admin/messages" activeId={id} />
        </div>
        <ThreadView
          threadId={id}
          subject={data.thread.subject || 'Conversation'}
          initialMessages={data.messages}
          currentUserId={user.id}
          isLocked={data.thread.is_locked}
          contactSharingAllowed={data.thread.contact_sharing_allowed}
        />
      </div>
    </>
  );
}
