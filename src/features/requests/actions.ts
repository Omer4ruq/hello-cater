'use server';

import { revalidatePath } from 'next/cache';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { getSessionUser } from '@/features/auth/session';
import { enforceRateLimit, clientIdentifier } from '@/lib/rate-limit';
import { AppError, toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { formatMinor } from '@/lib/money';
import { notify, notifyStaff } from '@/features/notifications/service';
import { recordAudit } from '@/features/audit/log';
import { computeMatchesForRequest } from '@/features/matching/service';
import { eventRequestSchema, type EventRequestInput } from './schema';

export type SubmitRequestResult =
  | { ok: true; reference: string; requestId: string; accountCreated: boolean; needsSignIn: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Submits an event requirement.
 *
 * Deliberately open to signed-out visitors: requiring an account before
 * a non-binding enquiry would cost most of the demand. For a new email
 * we provision a real account so the customer gets a dashboard to track
 * proposals, and email them a sign-in link rather than a password.
 */
export async function submitEventRequest(input: EventRequestInput): Promise<SubmitRequestResult> {
  try {
    const parsed = eventRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const data = parsed.data;

    // Bots fill hidden fields; humans do not. Fail silently so the bot
    // cannot tell it was detected.
    if (data.company_website) {
      logger.warn('Honeypot triggered on request submission');
      return { ok: true, reference: 'REQ-0000-00000', requestId: '', accountCreated: false, needsSignIn: false };
    }

    const sessionUser = await getSessionUser().catch(() => null);
    await enforceRateLimit(
      'request_submit',
      sessionUser?.id ?? (await clientIdentifier(data.contactEmail)),
      'You have submitted several requests recently. Please give us a little time to respond, or call us directly.',
    );

    const admin = createAdminSupabase();

    // ---- Resolve the owning profile -----------------------------------
    let profileId = sessionUser?.id ?? null;
    let accountCreated = false;

    if (!profileId) {
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('email', data.contactEmail)
        .maybeSingle();

      if (existing) {
        profileId = existing.id;
      } else {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: data.contactEmail,
          email_confirm: false,
          user_metadata: { full_name: data.contactName, phone: data.contactPhone },
        });
        if (createError || !created.user) {
          logger.error('Could not provision an account for a request', { error: createError });
          throw new AppError('internal', 'We could not create your account. Please try again or call us.');
        }
        profileId = created.user.id;
        accountCreated = true;
      }
    }

    // ---- Organisation scope -------------------------------------------
    // Never trust a client-supplied organisation id: confirm membership.
    let organizationId: string | null = null;
    if (data.organizationId && sessionUser) {
      const membership = sessionUser.customerOrgs.find((m) => m.organizationId === data.organizationId);
      if (!membership) throw new AppError('forbidden', 'You are not a member of that company account.');
      organizationId = membership.organizationId;
    }

    // ---- Create the request -------------------------------------------
    const { data: request, error: insertError } = await admin
      .from('service_requests')
      .insert({
        status: 'submitted',
        customer_profile_id: profileId,
        organization_id: organizationId,
        event_type_id: data.eventTypeId,
        title: data.title || '',
        event_date: data.eventDate,
        event_end_date: data.eventEndDate ?? null,
        start_time: data.startTime ?? null,
        end_time: data.endTime ?? null,
        is_date_flexible: data.isDateFlexible,
        guest_count: data.guestCount,
        guest_count_max: data.guestCountMax ?? null,
        city_id: data.cityId,
        area_id: data.areaId ?? null,
        venue_name: data.venueName || null,
        address_line: data.addressLine || null,
        venue_notes: data.venueNotes || null,
        budget_mode: data.budgetMode,
        budget_total_minor: data.budgetTotalMinor ?? null,
        budget_per_person_minor: data.budgetPerPersonMinor ?? null,
        budget_min_minor: data.budgetMinMinor ?? null,
        budget_max_minor: data.budgetMaxMinor ?? null,
        dietary_notes: data.dietaryNotes || null,
        requirements: data.requirements || null,
        contact_name: data.contactName,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail,
        preferred_channel: data.preferredChannel,
        source: 'web_wizard',
        submitted_at: new Date().toISOString(),
      })
      .select('id, reference')
      .single();

    if (insertError || !request) {
      logger.error('Failed to insert service request', { error: insertError });
      throw new AppError('internal', 'We could not save your request. Please try again.');
    }

    // ---- Service lines and cuisines ------------------------------------
    await admin.from('request_services').insert(
      data.categoryIds.map((categoryId, index) => ({
        request_id: request.id,
        category_id: categoryId,
        is_primary: index === 0,
      })),
    );

    if (data.cuisineIds.length) {
      await admin.from('request_cuisines').insert(
        data.cuisineIds.map((cuisineId) => ({ request_id: request.id, cuisine_id: cuisineId })),
      );
    }

    // ---- Matching (best effort; ops can always rerun it) ---------------
    let matchCount = 0;
    try {
      const matches = await computeMatchesForRequest(request.id, { limit: 40 });
      matchCount = matches.filter((m) => !m.disqualified).length;
      if (matchCount > 0) {
        await admin.from('service_requests').update({ status: 'matching' }).eq('id', request.id);
      }
    } catch (error) {
      logger.warn('Matching failed at submission time', { requestId: request.id, error });
    }

    // ---- Open a conversation with the customer -------------------------
    const { data: thread } = await admin
      .from('message_threads')
      .insert({
        kind: 'customer_platform',
        subject: `Request ${request.reference}`,
        request_id: request.id,
        organization_id: organizationId,
        created_by: profileId,
        contact_sharing_allowed: true,
      })
      .select('id')
      .single();

    if (thread) {
      await admin.from('thread_participants').insert({
        thread_id: thread.id, profile_id: profileId, side: 'customer',
      });
      await admin.from('messages').insert({
        thread_id: thread.id,
        sender_id: null,
        sender_side: 'platform',
        kind: 'system',
        body: `Request ${request.reference} received. Our event team is reviewing your requirement and will arrange suitable partners.`,
      });
    }

    // ---- Notifications --------------------------------------------------
    const budgetLabel =
      data.budgetMode === 'total' && data.budgetTotalMinor
        ? formatMinor(data.budgetTotalMinor)
        : data.budgetMode === 'per_person' && data.budgetPerPersonMinor
          ? `${formatMinor(data.budgetPerPersonMinor)} / person`
          : data.budgetMode === 'range' && data.budgetMinMinor && data.budgetMaxMinor
            ? `${formatMinor(data.budgetMinMinor)} – ${formatMinor(data.budgetMaxMinor)}`
            : 'Flexible';

    const [{ data: eventType }, { data: city }] = await Promise.all([
      admin.from('event_types').select('name').eq('id', data.eventTypeId).maybeSingle(),
      admin.from('cities').select('name').eq('id', data.cityId).maybeSingle(),
    ]);

    await notify({
      profileId,
      type: 'request.submitted',
      title: `Request ${request.reference} received`,
      body: 'Our event team is reviewing your requirement.',
      url: `/dashboard/requests/${request.id}`,
      email: {
        to: data.contactEmail,
        template: 'request_received',
        dedupeKey: `request_received:${request.id}`,
        data: {
          name: data.contactName,
          reference: request.reference,
          eventType: eventType?.name ?? 'Event',
          eventDate: data.eventDate,
          guestCount: String(data.guestCount),
          location: city?.name ?? '',
        },
      },
    });

    await notifyStaff({
      permission: 'requests.manage',
      type: 'request.new_internal',
      title: `New request ${request.reference}`,
      body: `${eventType?.name ?? 'Event'} · ${data.guestCount} guests · ${matchCount} matched partners`,
      url: `/admin/requests/${request.id}`,
      email: {
        template: 'request_internal_alert',
        data: {
          reference: request.reference,
          requestId: request.id,
          customer: data.contactName,
          eventType: eventType?.name ?? '',
          eventDate: data.eventDate,
          guestCount: String(data.guestCount),
          budget: budgetLabel,
        },
      },
    });

    await recordAudit({
      actorId: profileId,
      action: 'request.submitted',
      entity: 'service_requests',
      entityId: request.id,
      summary: `Request ${request.reference} submitted (${matchCount} candidates matched)`,
    });

    revalidatePath('/dashboard/requests');
    revalidatePath('/admin/requests');

    return {
      ok: true,
      reference: request.reference,
      requestId: request.id,
      accountCreated,
      needsSignIn: !sessionUser,
    };
  } catch (error) {
    const appError = toPublicError(error);
    if (appError.code === 'internal') {
      logger.error('submitEventRequest failed', { error });
    }
    return { ok: false, error: appError.message };
  }
}

/** Cancels a request the customer owns. RLS is the backstop; this is the gate. */
export async function cancelRequest(requestId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const user = await getSessionUser();
    if (!user) throw new AppError('unauthenticated', 'Please sign in.');

    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'cancelled', closed_at: new Date().toISOString(), lost_reason: reason.slice(0, 500) })
      .eq('id', requestId)
      .eq('customer_profile_id', user.id);

    if (error) throw new AppError('forbidden', 'We could not cancel this request.');

    await recordAudit({
      actorId: user.id, action: 'request.status_changed',
      entity: 'service_requests', entityId: requestId, summary: `Cancelled by customer: ${reason}`,
    });

    revalidatePath('/dashboard/requests');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}
