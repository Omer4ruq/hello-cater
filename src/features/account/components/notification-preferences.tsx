'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { updateNotificationPreference } from '@/features/notifications/actions';

type NotificationType = {
  key: string;
  description: string;
  isTransactional: boolean;
  inApp: boolean;
  email: boolean;
};

/**
 * Per-type notification channel toggles.
 *
 * Transactional types (money, confirmed bookings) cannot be disabled —
 * silently missing a payment failure or a booking confirmation is worse
 * than an unwanted email.
 */
export function NotificationPreferences({ types }: { types: NotificationType[] }) {
  const [state, setState] = React.useState(types);

  async function toggle(key: string, channel: 'in_app' | 'email', enabled: boolean) {
    setState((current) =>
      current.map((t) => (t.key === key ? { ...t, [channel === 'in_app' ? 'inApp' : 'email']: enabled } : t)),
    );
    const result = await updateNotificationPreference({ typeKey: key, channel, enabled });
    if (!result.ok) {
      toast.error('Could not save that preference.');
      setState(types);
    }
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Notification preferences by type and channel</caption>
      <thead>
        <tr className="border-b border-ink-200 text-left">
          <th scope="col" className="pb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Notification</th>
          <th scope="col" className="w-20 pb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">In app</th>
          <th scope="col" className="w-20 pb-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">Email</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {state.map((type) => (
          <tr key={type.key}>
            <td className="py-3">
              <span className="block text-ink-900">{type.description}</span>
              {type.isTransactional ? (
                <Badge tone="neutral" className="mt-1">Always sent</Badge>
              ) : null}
            </td>
            <td className="py-3 text-center">
              <input
                type="checkbox"
                className="size-4 accent-brand-700"
                checked={type.inApp}
                disabled={type.isTransactional}
                aria-label={`In-app notifications for ${type.description}`}
                onChange={(e) => toggle(type.key, 'in_app', e.target.checked)}
              />
            </td>
            <td className="py-3 text-center">
              <input
                type="checkbox"
                className="size-4 accent-brand-700"
                checked={type.email}
                disabled={type.isTransactional}
                aria-label={`Email notifications for ${type.description}`}
                onChange={(e) => toggle(type.key, 'email', e.target.checked)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
