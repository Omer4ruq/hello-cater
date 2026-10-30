'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { cn } from '@/lib/utils';
import { relativeDate } from '@/lib/dates';
import { markAllNotificationsRead, markNotificationRead } from '../actions';

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  typeKey: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationList({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markAll() {
    setPending(true);
    await markAllNotificationsRead();
    setPending(false);
    router.refresh();
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You will be notified here when a proposal arrives, a payment clears, an event approaches, or someone messages you."
      />
    );
  }

  return (
    <>
      {unreadCount > 0 ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-600">
            {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
          </p>
          <Button variant="secondary" size="sm" loading={pending} onClick={markAll}>
            <Check aria-hidden /> Mark all read
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <ul className="divide-y divide-ink-100">
          {notifications.map((notification) => {
            const content = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    notification.readAt ? 'bg-transparent' : 'bg-clay-500',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', notification.readAt ? 'text-ink-800' : 'font-semibold text-ink-950')}>
                    {notification.title}
                  </span>
                  {notification.body ? (
                    <span className="mt-0.5 block text-sm text-ink-600">{notification.body}</span>
                  ) : null}
                  <span className="mt-1 block text-xs text-ink-500">{relativeDate(notification.createdAt)}</span>
                </span>
              </>
            );

            return (
              <li key={notification.id}>
                {notification.url ? (
                  <Link
                    href={notification.url}
                    onClick={() => void markNotificationRead(notification.id)}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
