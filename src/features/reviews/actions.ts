'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { notify } from '@/features/notifications/service';

export const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1, 'Choose an overall rating').max(5),
  qualityRating: z.number().int().min(1).max(5).nullable().optional(),
  communicationRating: z.number().int().min(1).max(5).nullable().optional(),
  punctualityRating: z.number().int().min(1).max(5).nullable().optional(),
  valueRating: z.number().int().min(1).max(5).nullable().optional(),
  title: z.string().trim().max(160).optional().default(''),
  comment: z.string().trim().max(4000).optional().default(''),
  isAnonymous: z.boolean().default(false),
});

export type ReviewInput = z.input<typeof reviewSchema>;

/**
 * Submits a review for a delivered booking.
 *
 * Eligibility is enforced by a database trigger, not here: the review
 * must belong to a completed booking that the author actually owns.
 * This action resolves the partner from the booking rather than
 * accepting it from the client, so a review cannot be redirected onto a
 * different partner.
 */
export async function submitReview(
  input: ReviewInput,
): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const data = parsed.data;

    const supabase = await createServerSupabase();

    // RLS already limits this to bookings on the caller's own events.
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, partner_id, event_id, events(organization_id)')
      .eq('id', data.bookingId)
      .maybeSingle();

    if (!booking) return { ok: false, error: 'We could not find that booking.' };
    if (!['completed', 'closed'].includes(booking.status)) {
      return { ok: false, error: 'You can review a booking once the event has been delivered.' };
    }

    const organizationId = (booking.events as unknown as { organization_id: string | null } | null)
      ?.organization_id ?? null;

    const { error } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      event_id: booking.event_id,
      partner_id: booking.partner_id,
      author_id: user.id,
      organization_id: organizationId,
      // Published immediately; moderation removes abuse, not negativity.
      status: 'published',
      rating: data.rating,
      quality_rating: data.qualityRating ?? null,
      communication_rating: data.communicationRating ?? null,
      punctuality_rating: data.punctualityRating ?? null,
      value_rating: data.valueRating ?? null,
      title: data.title || null,
      comment: data.comment || null,
      is_anonymous: data.isAnonymous,
    });

    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'You have already reviewed this booking.' };
      }
      logger.warn('Review insert rejected', { error });
      return { ok: false, error: 'We could not save your review. Please try again.' };
    }

    // Let the partner know, so they can reply.
    const admin = createAdminSupabase();
    const { data: members } = await admin
      .from('partner_profiles')
      .select('display_name, organizations(organization_members(profile_id, role, status))')
      .eq('id', booking.partner_id)
      .maybeSingle();

    const org = members?.organizations as unknown as {
      organization_members: { profile_id: string; role: string; status: string }[];
    } | null;

    for (const member of org?.organization_members ?? []) {
      if (member.status !== 'active' || !['owner', 'admin'].includes(member.role)) continue;
      await notify({
        profileId: member.profile_id,
        type: 'review.received',
        title: `New ${data.rating}-star review`,
        body: data.title || data.comment?.slice(0, 140),
        url: '/partner/reviews',
      });
    }

    revalidatePath('/dashboard/events');
    revalidatePath('/partner/reviews');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}
