'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { requirePermission } from '@/features/auth/session';
import { toPublicError } from '@/lib/errors';
import { recordAudit } from '@/features/audit/log';

/** Moderates a review. Publishing recalculates the partner's rating via trigger. */
export async function moderateReview(input: {
  reviewId: string;
  status: 'published' | 'hidden' | 'rejected';
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requirePermission('reviews.moderate');
    const parsed = z
      .object({
        reviewId: z.string().uuid(),
        status: z.enum(['published', 'hidden', 'rejected']),
        note: z.string().trim().max(500).optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid moderation request.' };

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('reviews')
      .update({
        status: parsed.data.status,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_note: parsed.data.note ?? null,
      })
      .eq('id', parsed.data.reviewId);

    if (error) return { ok: false, error: 'We could not update this review.' };

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'admin.override',
      entity: 'reviews', entityId: parsed.data.reviewId,
      summary: `Review ${parsed.data.status}${parsed.data.note ? `: ${parsed.data.note}` : ''}`,
    });

    revalidatePath('/admin/reviews');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}
