import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { relativeDate } from '@/lib/dates';
import type { ThreadSummary } from '../queries';

const KIND_LABELS: Record<string, string> = {
  customer_platform: 'With Evently BD',
  partner_platform: 'With Evently BD',
  customer_partner: 'With the partner',
  internal: 'Internal',
  support: 'Support',
};

export function ThreadList({
  threads, basePath, activeId,
}: {
  threads: ThreadSummary[];
  basePath: string;
  activeId?: string;
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="Every request and event gets its own thread, so questions, changes and commitments stay in one place."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <ul className="divide-y divide-ink-100">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`${basePath}/${thread.id}`}
              aria-current={activeId === thread.id ? 'page' : undefined}
              className={cn(
                'flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50',
                activeId === thread.id && 'bg-ink-50',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  thread.unread ? 'bg-clay-500' : 'bg-transparent',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className={cn('truncate text-sm', thread.unread ? 'font-semibold text-ink-950' : 'font-medium text-ink-800')}>
                    {thread.subject}
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">
                    {thread.lastMessageAt ? relativeDate(thread.lastMessageAt) : ''}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <Badge tone="neutral" className="shrink-0">{KIND_LABELS[thread.kind] ?? thread.kind}</Badge>
                  {thread.lastMessagePreview ? (
                    <span className="truncate text-xs text-ink-500">{thread.lastMessagePreview}</span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
