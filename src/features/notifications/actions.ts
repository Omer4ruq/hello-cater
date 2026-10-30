'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { logger } from '@/lib/logger';

/** Marks one notification read. RLS restricts this to the owner. */
export async function markNotificationRead(id: string): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null);
  } catch (error) {
    logger.debug('markNotificationRead failed', { id, error });
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', user.id)
      .is('read_at', null);

    revalidatePath('/dashboard/notifications');
    revalidatePath('/partner/notifications');
    revalidatePath('/admin/notifications');
  } catch (error) {
    logger.debug('markAllNotificationsRead failed', { error });
  }
}

/** Updates a single channel preference for a notification type. */
export async function updateNotificationPreference(input: {
  typeKey: string;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
  enabled: boolean;
}): Promise<{ ok: boolean }> {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();

    // An explicit switch keeps the column name a literal, so the typed
    // client still checks it rather than accepting any string key.
    const patch =
      input.channel === 'in_app' ? { in_app: input.enabled }
      : input.channel === 'email' ? { email: input.enabled }
      : input.channel === 'sms' ? { sms: input.enabled }
      : { whatsapp: input.enabled };

    await supabase.from('notification_preferences').upsert(
      { profile_id: user.id, type_key: input.typeKey, ...patch },
      { onConflict: 'profile_id,type_key' },
    );

    revalidatePath('/account/settings');
    return { ok: true };
  } catch (error) {
    logger.warn('updateNotificationPreference failed', { error });
    return { ok: false };
  }
}
