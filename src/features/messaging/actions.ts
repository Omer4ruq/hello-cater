'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { toPublicError, AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { notify } from '@/features/notifications/service';

const sendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1, 'Write a message').max(5000),
});

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Posts a message to a thread.
 *
 * The database trigger decides what the other side actually sees: in
 * customer↔partner threads, phone numbers, emails and WhatsApp links are
 * masked unless operations has explicitly opened the channel. The
 * original text is retained for dispute resolution.
 */
export async function sendMessage(input: { threadId: string; body: string }): Promise<SendResult> {
  try {
    const user = await requireUser();
    const parsed = sendSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write a message.' };
    }

    await enforceRateLimit('message_send', user.id);

    const supabase = await createServerSupabase();

    const { data: participant } = await supabase
      .from('thread_participants')
      .select('side, message_threads!inner(is_locked)')
      .eq('thread_id', parsed.data.threadId)
      .eq('profile_id', user.id)
      .is('left_at', null)
      .maybeSingle();

    if (!participant) throw new AppError('forbidden', 'You are not part of this conversation.');
    if ((participant.message_threads as unknown as { is_locked: boolean }).is_locked) {
      return { ok: false, error: 'This conversation has been closed.' };
    }

    const { error } = await supabase.from('messages').insert({
      thread_id: parsed.data.threadId,
      sender_id: user.id,
      sender_side: participant.side,
      kind: 'user',
      body: parsed.data.body,
    });

    if (error) {
      logger.warn('Message insert failed', { error });
      return { ok: false, error: 'We could not send your message.' };
    }

    // Notify the other participants.
    const admin = createAdminSupabase();
    const { data: others } = await admin
      .from('thread_participants')
      .select('profile_id')
      .eq('thread_id', parsed.data.threadId)
      .is('left_at', null)
      .neq('profile_id', user.id);

    await Promise.all(
      (others ?? []).map((p) =>
        notify({
          profileId: p.profile_id,
          type: 'message.received',
          title: 'New message',
          body: parsed.data.body.slice(0, 140),
          url: `/dashboard/messages/${parsed.data.threadId}`,
        }),
      ),
    );

    revalidatePath(`/dashboard/messages/${parsed.data.threadId}`);
    revalidatePath(`/partner/messages/${parsed.data.threadId}`);
    revalidatePath(`/admin/messages/${parsed.data.threadId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Marks a thread read for the current participant. */
export async function markThreadRead(threadId: string): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    await supabase.rpc('mark_thread_read', { p_thread: threadId });
  } catch (error) {
    logger.debug('markThreadRead failed', { threadId, error });
  }
}
