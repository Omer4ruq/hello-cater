'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { requireUser, requirePartnerAccess } from '@/features/auth/session';
import { toPublicError, AppError } from '@/lib/errors';
import { recordAudit } from '@/features/audit/log';
import { notify, notifyStaff } from '@/features/notifications/service';
import { logger } from '@/lib/logger';

type Result = { ok: true } | { ok: false; error: string };

const ALLOWED_PARTNER_TRANSITIONS: Record<string, string[]> = {
  confirmed: ['in_preparation'],
  in_preparation: ['ready'],
  ready: ['in_progress'],
  in_progress: ['completed'],
};

/**
 * Partners progress fulfilment state only.
 *
 * The transition map here mirrors — and is narrower than — the database
 * guard: a partner can move a job forward through delivery, but cannot
 * cancel, refund or close it. Those require platform staff.
 */
export async function updateBookingStatus(input: {
  bookingId: string;
  partnerId: string;
  status: string;
  note?: string;
}): Promise<Result> {
  try {
    const { user } = await requirePartnerAccess(input.partnerId);
    const supabase = await createServerSupabase();

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, reference, event_id, partner_id')
      .eq('id', input.bookingId)
      .eq('partner_id', input.partnerId)
      .maybeSingle();

    if (!booking) throw new AppError('not_found', 'Booking not found.');

    const allowed = ALLOWED_PARTNER_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(input.status)) {
      return {
        ok: false,
        error: `You cannot move this booking from "${booking.status}" to "${input.status}". Contact our team if something has changed.`,
      };
    }

    const { error } = await supabase
      .from('bookings')
      .update({
        status: input.status as never,
        ...(input.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', input.bookingId);

    if (error) {
      logger.warn('Partner booking transition rejected', { error });
      return { ok: false, error: 'We could not update this booking.' };
    }

    await Promise.all([
      recordAudit({
        actorId: user.id, action: 'booking.status_changed',
        entity: 'bookings', entityId: input.bookingId,
        summary: `${booking.status} → ${input.status}${input.note ? `: ${input.note}` : ''}`,
      }),
      supabase.from('event_timeline').insert({
        event_id: booking.event_id,
        kind: 'booking_status',
        title: `Vendor marked the job ${input.status.replace(/_/g, ' ')}`,
        detail: input.note ?? null,
        visibility: 'all',
      }),
    ]);

    if (input.status === 'completed') {
      await notifyStaff({
        permission: 'bookings.view', type: 'booking.completed',
        title: `${booking.reference} marked completed`,
        url: `/admin/events/${booking.event_id}`,
      });
    }

    revalidatePath('/partner/bookings');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Block or unblock a date in the partner's calendar. */
export async function setAvailability(input: {
  partnerId: string;
  date: string;
  isBlocked: boolean;
  note?: string;
  capacityOverride?: number | null;
}): Promise<Result> {
  try {
    const { user } = await requirePartnerAccess(input.partnerId);
    const parsed = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        isBlocked: z.boolean(),
        note: z.string().trim().max(200).optional(),
        capacityOverride: z.number().int().min(0).max(50).nullable().optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid date.' };

    const supabase = await createServerSupabase();

    // Refuse to block a date that already carries live commitments.
    if (parsed.data.isBlocked) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', input.partnerId)
        .eq('service_date', parsed.data.date)
        .in('status', ['confirmed', 'in_preparation', 'ready', 'in_progress', 'pending_payment', 'partially_paid']);

      if ((count ?? 0) > 0) {
        return {
          ok: false,
          error: 'You already have confirmed bookings on that date. Contact our team to reschedule them first.',
        };
      }
    }

    const { error } = await supabase.from('partner_availability').upsert(
      {
        partner_id: input.partnerId,
        on_date: parsed.data.date,
        is_blocked: parsed.data.isBlocked,
        capacity_override: parsed.data.capacityOverride ?? null,
        note: parsed.data.note ?? null,
        created_by: user.id,
      },
      { onConflict: 'partner_id,on_date' },
    );

    if (error) return { ok: false, error: 'We could not update your calendar.' };

    revalidatePath('/partner/calendar');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(200).optional(),
  about: z.string().trim().max(4000).optional(),
  minOrderMinor: z.number().int().nonnegative(),
  minGuests: z.number().int().positive().nullable().optional(),
  maxGuests: z.number().int().positive().nullable().optional(),
  leadTimeHours: z.number().int().min(0).max(8760),
  dailyEventCapacity: z.number().int().min(1).max(50),
  cancellationPolicy: z.string().trim().max(2000).optional(),
  paymentTerms: z.string().trim().max(2000).optional(),
  isAcceptingOrders: z.boolean(),
});

/**
 * Updates the partner's business profile.
 *
 * Note what is NOT accepted here: verification_status, commission_bps,
 * published_at, rating or completed_bookings. Those are platform-owned
 * and a partner must never be able to set them.
 */
export async function updatePartnerProfile(input: {
  partnerId: string;
  values: z.input<typeof profileSchema>;
}): Promise<Result> {
  try {
    const { user, membership } = await requirePartnerAccess(input.partnerId);
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new AppError('forbidden', 'Only owners and admins can edit the business profile.');
    }

    const parsed = profileSchema.safeParse(input.values);
    if (!parsed.success) return { ok: false, error: 'Please check the highlighted fields.' };
    const values = parsed.data;

    if (values.minGuests && values.maxGuests && values.maxGuests < values.minGuests) {
      return { ok: false, error: 'Maximum guests must be at least the minimum.' };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('partner_profiles')
      .update({
        display_name: values.displayName,
        tagline: values.tagline || null,
        about: values.about || null,
        min_order_minor: values.minOrderMinor,
        min_guests: values.minGuests ?? null,
        max_guests: values.maxGuests ?? null,
        lead_time_hours: values.leadTimeHours,
        daily_event_capacity: values.dailyEventCapacity,
        cancellation_policy: values.cancellationPolicy || null,
        payment_terms: values.paymentTerms || null,
        is_accepting_orders: values.isAcceptingOrders,
      })
      .eq('id', input.partnerId);

    if (error) {
      logger.warn('Partner profile update failed', { error });
      return { ok: false, error: 'We could not save your profile.' };
    }

    await recordAudit({
      actorId: user.id, action: 'partner.verified',
      entity: 'partner_profiles', entityId: input.partnerId,
      summary: 'Partner updated their business profile',
    });

    revalidatePath('/partner/profile');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Publishes a reply to a customer review. */
export async function replyToReview(input: {
  reviewId: string;
  partnerId: string;
  body: string;
}): Promise<Result> {
  try {
    const { user } = await requirePartnerAccess(input.partnerId);
    const parsed = z.object({ body: z.string().trim().min(5).max(2000) }).safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Write at least a sentence.' };

    const supabase = await createServerSupabase();
    const { error } = await supabase.from('review_responses').upsert(
      {
        review_id: input.reviewId,
        partner_id: input.partnerId,
        author_id: user.id,
        body: parsed.data.body,
        status: 'published',
      },
      { onConflict: 'review_id' },
    );

    if (error) return { ok: false, error: 'We could not post your reply.' };

    revalidatePath('/partner/reviews');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Invites a colleague to the partner organisation. */
export async function invitePartnerTeamMember(input: {
  partnerId: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
}): Promise<Result> {
  try {
    const { user, membership } = await requirePartnerAccess(input.partnerId);
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new AppError('forbidden', 'Only owners and admins can invite team members.');
    }

    const parsed = z
      .object({
        email: z.string().trim().email().toLowerCase(),
        role: z.enum(['admin', 'manager', 'staff']),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Enter a valid email address.' };

    const admin = createAdminSupabase();

    // If they already have an account, add them directly.
    const { data: existing } = await admin
      .from('profiles').select('id').eq('email', parsed.data.email).maybeSingle();

    if (existing) {
      const { error } = await admin.from('organization_members').upsert(
        {
          organization_id: input.organizationId,
          profile_id: existing.id,
          role: parsed.data.role,
          status: 'active',
          invited_by: user.id,
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,profile_id' },
      );
      if (error) return { ok: false, error: 'We could not add that person to your team.' };

      await notify({
        profileId: existing.id,
        type: 'partner.approved',
        title: 'You were added to a partner team',
        body: `You now have access to ${membership.organizationName}.`,
        url: '/partner',
      });
    } else {
      // Otherwise store a pending invitation keyed by a hashed token.
      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);

      const { error } = await admin.from('organization_invites').insert({
        organization_id: input.organizationId,
        email: parsed.data.email,
        role: parsed.data.role,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        invited_by: user.id,
      });
      if (error) return { ok: false, error: 'We could not send that invitation.' };
    }

    await recordAudit({
      actorId: user.id, action: 'role.changed',
      entity: 'organization_members', entityId: input.organizationId,
      summary: `Invited ${parsed.data.email} as ${parsed.data.role}`,
    });

    revalidatePath('/partner/team');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Invitation tokens are stored hashed, never in plaintext. */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function removeTeamMember(input: {
  partnerId: string;
  organizationId: string;
  profileId: string;
}): Promise<Result> {
  try {
    const { user, membership } = await requirePartnerAccess(input.partnerId);
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new AppError('forbidden', 'Only owners and admins can remove team members.');
    }
    if (input.profileId === user.id) {
      return { ok: false, error: 'You cannot remove yourself.' };
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('organization_members')
      .update({ status: 'removed' })
      .eq('organization_id', input.organizationId)
      .eq('profile_id', input.profileId)
      .neq('role', 'owner');

    if (error) return { ok: false, error: 'We could not remove that team member.' };

    await recordAudit({
      actorId: user.id, action: 'role.changed',
      entity: 'organization_members', entityId: input.profileId,
      summary: 'Removed from partner team',
    });

    revalidatePath('/partner/team');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

export async function requireUserForPartner() {
  return requireUser();
}
