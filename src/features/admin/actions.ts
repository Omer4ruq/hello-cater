'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { requirePermission } from '@/features/auth/session';
import { toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { formatMinor } from '@/lib/money';
import { recordAudit } from '@/features/audit/log';
import { notify, sendTransactionalEmail } from '@/features/notifications/service';
import { computeMatchesForRequest } from '@/features/matching/service';
import { priceEvent, DEFAULT_PRICING_RULE, type PartnerLineInput } from '@/features/pricing/engine';

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string };

/* ------------------------------------------------------------- Requests */

export async function assignRequest(input: { requestId: string; assigneeId: string | null }): Promise<Result> {
  try {
    const user = await requirePermission('requests.manage');
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('service_requests')
      .update({ assigned_to: input.assigneeId })
      .eq('id', input.requestId);
    if (error) return { ok: false, error: 'We could not assign this request.' };

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'request.assigned',
      entity: 'service_requests', entityId: input.requestId,
      summary: input.assigneeId ? `Assigned to ${input.assigneeId}` : 'Unassigned',
    });

    revalidatePath(`/admin/requests/${input.requestId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

export async function updateRequestStatus(input: {
  requestId: string;
  status: string;
  note?: string;
}): Promise<Result> {
  try {
    const user = await requirePermission('requests.manage');
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: input.status as never,
        ...(['won', 'lost', 'cancelled'].includes(input.status)
          ? { closed_at: new Date().toISOString(), lost_reason: input.note ?? null }
          : {}),
      })
      .eq('id', input.requestId);

    if (error) return { ok: false, error: 'We could not update this request.' };

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'request.status_changed',
      entity: 'service_requests', entityId: input.requestId,
      summary: `Status → ${input.status}${input.note ? `: ${input.note}` : ''}`,
    });

    revalidatePath(`/admin/requests/${input.requestId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Re-runs the matching engine for a request and stores fresh scores. */
export async function recomputeMatches(requestId: string): Promise<Result<{ qualified: number }>> {
  try {
    await requirePermission('requests.manage');
    const results = await computeMatchesForRequest(requestId, { limit: 40 });
    revalidatePath(`/admin/requests/${requestId}`);
    return { ok: true, data: { qualified: results.filter((r) => !r.disqualified).length } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/**
 * Invites partners to quote.
 *
 * Operations decides who is approached — the matching engine only ranks
 * candidates. This is deliberate for launch: a human curating the
 * shortlist is more reliable than auto-blasting every match, and it keeps
 * partner goodwill.
 */
export async function invitePartners(input: {
  requestId: string;
  partners: { partnerId: string; categoryId: string | null }[];
  message?: string;
  respondByHours?: number;
}): Promise<Result<{ invited: number }>> {
  try {
    const user = await requirePermission('requests.manage');
    const parsed = z
      .object({
        requestId: z.string().uuid(),
        partners: z.array(z.object({
          partnerId: z.string().uuid(),
          categoryId: z.string().uuid().nullable(),
        })).min(1, 'Choose at least one partner').max(20),
        message: z.string().trim().max(2000).optional(),
        respondByHours: z.number().int().min(1).max(720).optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Choose at least one partner.' };
    }

    const admin = createAdminSupabase();
    const respondBy = new Date(
      Date.now() + (parsed.data.respondByHours ?? 48) * 3_600_000,
    ).toISOString();

    const { data: invites, error } = await admin
      .from('request_partner_invites')
      .upsert(
        parsed.data.partners.map((p) => ({
          request_id: parsed.data.requestId,
          partner_id: p.partnerId,
          category_id: p.categoryId,
          status: 'invited' as const,
          message: parsed.data.message ?? null,
          respond_by: respondBy,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })),
        { onConflict: 'request_id,partner_id,category_id' },
      )
      .select('id, partner_id');

    if (error) {
      logger.error('Partner invitation failed', { error });
      return { ok: false, error: 'We could not send those invitations.' };
    }

    await admin
      .from('service_requests')
      .update({ status: 'partners_invited', quote_deadline: respondBy })
      .eq('id', parsed.data.requestId);

    // Notify each partner's owners and admins.
    const { data: request } = await admin
      .from('service_requests')
      .select('reference, event_date, guest_count, venue_name, event_types(name), cities(name)')
      .eq('id', parsed.data.requestId)
      .maybeSingle();

    const eventTypeName = (request?.event_types as unknown as { name: string } | null)?.name ?? 'Event';
    const cityName = (request?.cities as unknown as { name: string } | null)?.name ?? '';

    for (const invite of invites ?? []) {
      const { data: members } = await admin
        .from('partner_profiles')
        .select('display_name, organization_members:organizations(organization_members(profile_id, role, status, profiles!organization_members_profile_id_fkey(email, full_name)))')
        .eq('id', invite.partner_id)
        .maybeSingle();

      const org = members?.organization_members as unknown as {
        organization_members: {
          profile_id: string; role: string; status: string;
          profiles: { email: string | null; full_name: string } | null;
        }[];
      } | null;

      for (const member of org?.organization_members ?? []) {
        if (member.status !== 'active' || !['owner', 'admin', 'manager'].includes(member.role)) continue;
        await notify({
          profileId: member.profile_id,
          type: 'request.invite',
          title: `New quotation request — ${eventTypeName}`,
          body: `${request?.guest_count ?? ''} guests${cityName ? ` in ${cityName}` : ''}`,
          url: `/partner/requests/${invite.id}`,
          email: member.profiles?.email
            ? {
                to: member.profiles.email,
                template: 'partner_invitation',
                dedupeKey: `invite:${invite.id}:${member.profile_id}`,
                data: {
                  partnerName: members?.display_name ?? 'partner',
                  inviteId: invite.id,
                  eventType: eventTypeName,
                  eventDate: request?.event_date ?? 'To be confirmed',
                  guestCount: String(request?.guest_count ?? ''),
                  location: request?.venue_name ?? cityName,
                  respondBy: new Date(respondBy).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
                },
              }
            : undefined,
        });
      }
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'partner.invited',
      entity: 'service_requests', entityId: parsed.data.requestId,
      summary: `Invited ${invites?.length ?? 0} partners to quote`,
    });

    revalidatePath(`/admin/requests/${parsed.data.requestId}`);
    return { ok: true, data: { invited: invites?.length ?? 0 } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/* ------------------------------------------------------------ Proposals */

const proposalLineSchema = z.object({
  quoteId: z.string().uuid().nullable(),
  quoteVersionId: z.string().uuid().nullable(),
  partnerId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  label: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  amountMinor: z.number().int().nonnegative(),
  commissionBps: z.number().int().min(0).max(5000),
  isPlatformLine: z.boolean().default(false),
});

const proposalSchema = z.object({
  requestId: z.string().uuid(),
  proposalId: z.string().uuid().optional(),
  title: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(4000).optional(),
  terms: z.string().trim().max(8000).optional(),
  cancellationPolicy: z.string().trim().max(4000).optional(),
  lines: z.array(proposalLineSchema).min(1, 'A proposal needs at least one line'),
  serviceFeeMinor: z.number().int().nonnegative(),
  coordinationFeeMinor: z.number().int().nonnegative(),
  deliveryFeeMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  depositBps: z.number().int().min(0).max(10000),
  balanceDueDays: z.number().int().min(0).max(365),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/**
 * Builds or updates a master proposal from selected partner quotes.
 *
 * Every monetary figure is recomputed here through the pricing engine and
 * again by database triggers. The client's numbers are only ever used as
 * the operator's *intent* (which lines, which fees); the authoritative
 * totals come from the server.
 */
export async function saveProposal(
  input: z.input<typeof proposalSchema>,
): Promise<Result<{ proposalId: string }>> {
  try {
    const user = await requirePermission('proposals.manage');
    const parsed = proposalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the proposal fields.' };
    }
    const data = parsed.data;
    const admin = createAdminSupabase();

    // Recompute from the pricing engine so the persisted line economics
    // are derived, not accepted.
    const lineInputs: PartnerLineInput[] = data.lines.map((line, i) => ({
      key: String(i),
      partnerId: line.partnerId,
      categoryId: line.categoryId,
      label: line.label,
      amountMinor: line.amountMinor,
      commissionBps: line.commissionBps,
      isPlatformLine: line.isPlatformLine,
    }));

    const breakdown = priceEvent(lineInputs, DEFAULT_PRICING_RULE, {
      serviceFeeMinorOverride: data.serviceFeeMinor,
      coordinationFeeMinorOverride: data.coordinationFeeMinor,
      deliveryFeeMinor: data.deliveryFeeMinor,
      discountMinor: data.discountMinor,
      depositBpsOverride: data.depositBps,
    });

    // ---- Create the proposal (or a revision of a sent one) -------------
    let proposalId = data.proposalId ?? null;
    let versionNo = 1;

    if (proposalId) {
      const { data: existing } = await admin
        .from('proposals')
        .select('id, status, sent_at, version_no')
        .eq('id', proposalId)
        .maybeSingle();

      if (existing?.sent_at && !['draft', 'changes_requested'].includes(existing.status)) {
        // Sent proposals are immutable — supersede with a new version.
        versionNo = existing.version_no + 1;
        proposalId = null;
      } else {
        versionNo = existing?.version_no ?? 1;
      }
    }

    const payload = {
      request_id: data.requestId,
      title: data.title || '',
      summary: data.summary || null,
      terms: data.terms || null,
      cancellation_policy: data.cancellationPolicy || null,
      service_fee_minor: data.serviceFeeMinor,
      coordination_fee_minor: data.coordinationFeeMinor,
      delivery_fee_minor: data.deliveryFeeMinor,
      discount_minor: breakdown.discountMinor,
      tax_minor: data.taxMinor,
      deposit_bps: data.depositBps,
      balance_due_days: data.balanceDueDays,
      valid_until: data.validUntil ?? null,
      prepared_by: user.id,
    };

    if (proposalId) {
      const { error } = await admin.from('proposals').update(payload).eq('id', proposalId);
      if (error) {
        logger.error('Proposal update failed', { error });
        return { ok: false, error: 'We could not save this proposal.' };
      }
      await admin.from('proposal_lines').delete().eq('proposal_id', proposalId);
    } else {
      const { data: created, error } = await admin
        .from('proposals')
        .insert({
          ...payload,
          version_no: versionNo,
          supersedes_id: data.proposalId ?? null,
          status: 'draft',
        })
        .select('id')
        .single();
      if (error || !created) {
        logger.error('Proposal creation failed', { error });
        return { ok: false, error: 'We could not create this proposal.' };
      }
      proposalId = created.id;
    }

    const { error: linesError } = await admin.from('proposal_lines').insert(
      breakdown.lines.map((line, index) => {
        const source = data.lines[Number(line.key)];
        return {
          proposal_id: proposalId!,
          quote_id: source.quoteId,
          quote_version_id: source.quoteVersionId,
          partner_id: line.partnerId,
          category_id: line.categoryId,
          label: line.label,
          description: source.description || null,
          amount_minor: line.amountMinor,
          commission_bps: line.commissionBps,
          commission_minor: line.commissionMinor,
          partner_payable_minor: line.partnerPayableMinor,
          is_platform_line: line.isPlatformLine,
          sort_order: (index + 1) * 10,
        };
      }),
    );

    if (linesError) {
      logger.error('Proposal lines insert failed', { error: linesError });
      return { ok: false, error: 'We could not save the proposal lines.' };
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'proposal.created',
      entity: 'proposals', entityId: proposalId!,
      summary: `v${versionNo} · ${formatMinor(breakdown.customerTotalMinor)} across ${data.lines.length} lines`,
    });

    revalidatePath(`/admin/requests/${data.requestId}`);
    return { ok: true, data: { proposalId: proposalId! } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Sends a drafted proposal to the customer. */
export async function sendProposal(proposalId: string): Promise<Result> {
  try {
    const user = await requirePermission('proposals.manage');
    const admin = createAdminSupabase();

    const { data: proposal } = await admin
      .from('proposals')
      .select('id, reference, status, total_minor, valid_until, request_id, service_requests(customer_profile_id, contact_name, contact_email, reference)')
      .eq('id', proposalId)
      .maybeSingle();

    if (!proposal) return { ok: false, error: 'Proposal not found.' };
    if (!['draft', 'changes_requested'].includes(proposal.status)) {
      return { ok: false, error: 'This proposal has already been sent.' };
    }

    const { count: lineCount } = await admin
      .from('proposal_lines')
      .select('id', { count: 'exact', head: true })
      .eq('proposal_id', proposalId);

    if (!lineCount) return { ok: false, error: 'Add at least one line before sending.' };

    const { error } = await admin
      .from('proposals')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', proposalId);
    if (error) return { ok: false, error: 'We could not send this proposal.' };

    await admin.from('proposal_events').insert({
      proposal_id: proposalId, kind: 'sent', actor_id: user.id,
    });
    await admin
      .from('service_requests')
      .update({ status: 'proposal_sent' })
      .eq('id', proposal.request_id);

    const request = proposal.service_requests as unknown as {
      customer_profile_id: string; contact_name: string | null;
      contact_email: string | null; reference: string;
    } | null;

    if (request?.customer_profile_id) {
      await notify({
        profileId: request.customer_profile_id,
        type: 'proposal.sent',
        title: 'Your proposal is ready',
        body: `${formatMinor(proposal.total_minor)} — review the full breakdown.`,
        url: `/dashboard/proposals/${proposalId}`,
        email: request.contact_email
          ? {
              to: request.contact_email,
              template: 'proposal_ready',
              dedupeKey: `proposal_sent:${proposalId}`,
              data: {
                name: request.contact_name ?? 'there',
                reference: proposal.reference,
                proposalId,
                total: formatMinor(proposal.total_minor),
                validUntil: proposal.valid_until ?? 'See the proposal',
              },
            }
          : undefined,
      });
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'proposal.sent',
      entity: 'proposals', entityId: proposalId,
      summary: `Sent ${proposal.reference} — ${formatMinor(proposal.total_minor)}`,
    });

    revalidatePath(`/admin/requests/${proposal.request_id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/* ------------------------------------------------- Partner verification */

export async function setPartnerVerification(input: {
  partnerId: string;
  status: 'under_review' | 'approved' | 'rejected' | 'suspended';
  notes?: string;
  publish?: boolean;
}): Promise<Result> {
  try {
    const user = await requirePermission('partners.verify');
    const admin = createAdminSupabase();

    const { data: before } = await admin
      .from('partner_profiles')
      .select('id, display_name, verification_status, published_at, organization_id')
      .eq('id', input.partnerId)
      .maybeSingle();

    if (!before) return { ok: false, error: 'Partner not found.' };

    const { error } = await admin
      .from('partner_profiles')
      .update({
        verification_status: input.status,
        verified_at: input.status === 'approved' ? new Date().toISOString() : null,
        verified_by: input.status === 'approved' ? user.id : null,
        rejection_reason: input.status === 'rejected' ? (input.notes ?? null) : null,
        published_at:
          input.status === 'approved' && input.publish
            ? (before.published_at ?? new Date().toISOString())
            : input.status === 'approved'
              ? before.published_at
              : null,
      })
      .eq('id', input.partnerId);

    if (error) {
      logger.error('Verification update failed', { error });
      return { ok: false, error: 'We could not update the verification status.' };
    }

    await admin.from('partner_verification_events').insert({
      partner_id: input.partnerId,
      from_status: before.verification_status,
      to_status: input.status,
      notes: input.notes ?? null,
      actor_id: user.id,
    });

    // Tell the partner's owners.
    const { data: members } = await admin
      .from('organization_members')
      .select('profile_id, role, profiles!organization_members_profile_id_fkey(email, full_name)')
      .eq('organization_id', before.organization_id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);

    for (const member of members ?? []) {
      const profile = member.profiles as unknown as { email: string | null } | null;
      if (input.status === 'approved') {
        await notify({
          profileId: member.profile_id,
          type: 'partner.approved',
          title: 'Your partner account is approved',
          body: 'You can now receive quotation requests.',
          url: '/partner',
          email: profile?.email
            ? {
                to: profile.email, template: 'partner_approved',
                dedupeKey: `approved:${input.partnerId}`,
                data: { partnerName: before.display_name },
              }
            : undefined,
        });
      } else if (input.status === 'rejected') {
        await notify({
          profileId: member.profile_id,
          type: 'partner.rejected',
          title: 'Your partner application needs attention',
          body: input.notes ?? 'Some details could not be verified.',
          url: '/partner/profile',
          email: profile?.email
            ? {
                to: profile.email, template: 'partner_rejected',
                dedupeKey: `rejected:${input.partnerId}:${Date.now()}`,
                data: { reason: input.notes ?? 'Some details could not be verified.' },
              }
            : undefined,
        });
      }
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole,
      action: input.status === 'approved' ? 'partner.verified'
        : input.status === 'rejected' ? 'partner.rejected' : 'partner.suspended',
      entity: 'partner_profiles', entityId: input.partnerId,
      summary: `${before.verification_status} → ${input.status}${input.notes ? `: ${input.notes}` : ''}`,
      before: { status: before.verification_status },
      after: { status: input.status },
    });

    revalidatePath(`/admin/partners/${input.partnerId}`);
    revalidatePath('/admin/partners');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Sets a partner-specific commission rate. Always audited. */
export async function setPartnerCommission(input: {
  partnerId: string;
  commissionBps: number | null;
  reason: string;
}): Promise<Result> {
  try {
    const user = await requirePermission('settings.manage');
    const parsed = z
      .object({
        commissionBps: z.number().int().min(0).max(5000).nullable(),
        reason: z.string().trim().min(3).max(500),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Enter a rate between 0 and 50% and a reason.' };

    const admin = createAdminSupabase();
    const { data: before } = await admin
      .from('partner_profiles').select('commission_bps').eq('id', input.partnerId).maybeSingle();

    const { error } = await admin
      .from('partner_profiles')
      .update({ commission_bps: parsed.data.commissionBps })
      .eq('id', input.partnerId);
    if (error) return { ok: false, error: 'We could not update the commission rate.' };

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'pricing_rule.changed',
      entity: 'partner_profiles', entityId: input.partnerId,
      summary: `Commission ${before?.commission_bps ?? 'default'} → ${parsed.data.commissionBps ?? 'default'} bps: ${parsed.data.reason}`,
      before: { commission_bps: before?.commission_bps ?? null },
      after: { commission_bps: parsed.data.commissionBps },
    });

    revalidatePath(`/admin/partners/${input.partnerId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/* --------------------------------------------------------- Internal notes */

export async function addInternalNote(input: {
  entity: string;
  entityId: string;
  body: string;
}): Promise<Result> {
  try {
    const user = await requirePermission('requests.view');
    const parsed = z
      .object({
        entity: z.enum(['service_request', 'event', 'booking', 'partner', 'payout', 'customer', 'dispute', 'ticket', 'quote']),
        entityId: z.string().uuid(),
        body: z.string().trim().min(1).max(4000),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Write a note first.' };

    const supabase = await createServerSupabase();
    const { error } = await supabase.from('internal_notes').insert({
      entity: parsed.data.entity,
      entity_id: parsed.data.entityId,
      body: parsed.data.body,
      author_id: user.id,
    });
    if (error) return { ok: false, error: 'We could not save that note.' };

    revalidatePath(`/admin/requests/${parsed.data.entityId}`);
    revalidatePath(`/admin/partners/${parsed.data.entityId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/* ------------------------------------------------------------- Payouts */

/** Creates a payout covering a partner's unsettled delivered bookings. */
export async function createPayout(input: {
  partnerId: string;
  bookingIds: string[];
  adjustmentMinor?: number;
  adjustmentReason?: string;
  notes?: string;
}): Promise<Result<{ payoutId: string }>> {
  try {
    const user = await requirePermission('payouts.approve');
    const parsed = z
      .object({
        partnerId: z.string().uuid(),
        bookingIds: z.array(z.string().uuid()).min(1, 'Choose at least one booking'),
        adjustmentMinor: z.number().int().optional(),
        adjustmentReason: z.string().trim().max(500).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Choose at least one booking.' };
    }

    const admin = createAdminSupabase();

    const { data: bookings } = await admin
      .from('bookings')
      .select('id, reference, partner_id, status, gross_minor, commission_minor, partner_payable_minor, service_date, event_id, events(title)')
      .in('id', parsed.data.bookingIds)
      .eq('partner_id', parsed.data.partnerId);

    if (!bookings?.length) return { ok: false, error: 'Those bookings could not be found.' };

    const ineligible = bookings.filter((b) => !['completed', 'closed'].includes(b.status));
    if (ineligible.length) {
      return {
        ok: false,
        error: `${ineligible.length} of those bookings are not delivered yet. Only completed bookings can be paid out.`,
      };
    }

    // Refuse to double-pay a booking.
    const { data: alreadyPaid } = await admin
      .from('payout_items')
      .select('booking_id')
      .in('booking_id', parsed.data.bookingIds);
    if (alreadyPaid?.length) {
      return { ok: false, error: 'One or more of those bookings is already in a payout.' };
    }

    const dates = bookings.map((b) => b.service_date).sort();

    const { data: payout, error } = await admin
      .from('payouts')
      .insert({
        partner_id: parsed.data.partnerId,
        status: 'pending',
        period_start: dates[0],
        period_end: dates[dates.length - 1],
        notes: parsed.data.notes ?? null,
        created_by: user.id,
      })
      .select('id, reference')
      .single();

    if (error || !payout) {
      logger.error('Payout creation failed', { error });
      return { ok: false, error: 'We could not create this payout.' };
    }

    const { error: itemsError } = await admin.from('payout_items').insert([
      ...bookings.map((b) => ({
        payout_id: payout.id,
        booking_id: b.id,
        event_id: b.event_id,
        label: `${(b.events as unknown as { title: string } | null)?.title ?? b.reference} (${b.reference})`,
        gross_minor: b.gross_minor,
        commission_minor: b.commission_minor,
        adjustment_minor: 0,
        net_minor: b.partner_payable_minor,
      })),
      ...(parsed.data.adjustmentMinor
        ? [{
            payout_id: payout.id,
            booking_id: null,
            event_id: null,
            label: parsed.data.adjustmentReason || 'Adjustment',
            gross_minor: 0,
            commission_minor: 0,
            adjustment_minor: parsed.data.adjustmentMinor,
            net_minor: parsed.data.adjustmentMinor,
          }]
        : []),
    ]);

    if (itemsError) {
      logger.error('Payout items failed', { error: itemsError });
      return { ok: false, error: 'We could not add the bookings to this payout.' };
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'payout.created',
      entity: 'payouts', entityId: payout.id,
      summary: `${payout.reference} covering ${bookings.length} bookings`,
    });

    revalidatePath('/admin/payouts');
    return { ok: true, data: { payoutId: payout.id } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Approves, settles or fails a payout. Settlement posts to the ledger. */
export async function updatePayoutStatus(input: {
  payoutId: string;
  status: 'approved' | 'processing' | 'paid' | 'failed' | 'cancelled';
  method?: string;
  providerRef?: string;
  failureReason?: string;
}): Promise<Result> {
  try {
    const user = await requirePermission('payouts.approve');
    const admin = createAdminSupabase();

    const { data: payout } = await admin
      .from('payouts')
      .select('id, reference, status, partner_id, net_minor, gross_minor, commission_minor')
      .eq('id', input.payoutId)
      .maybeSingle();

    if (!payout) return { ok: false, error: 'Payout not found.' };
    if (payout.status === 'paid') return { ok: false, error: 'This payout is already settled.' };

    if (input.status === 'paid' && !input.method) {
      return { ok: false, error: 'Record how the payout was sent before marking it paid.' };
    }

    const { error } = await admin
      .from('payouts')
      .update({
        status: input.status,
        method: input.method as never,
        provider_ref: input.providerRef ?? null,
        failure_reason: input.failureReason ?? null,
        ...(input.status === 'approved' ? { approved_by: user.id, approved_at: new Date().toISOString() } : {}),
        ...(input.status === 'paid' ? { paid_by: user.id, paid_at: new Date().toISOString() } : {}),
      })
      .eq('id', input.payoutId);

    if (error) {
      logger.error('Payout status update failed', { error });
      return { ok: false, error: 'We could not update this payout.' };
    }

    // Settling clears the partner payable and moves cash out.
    if (input.status === 'paid') {
      const { error: ledgerError } = await admin.rpc('post_ledger_entries', {
        p_entries: [
          {
            account: 'partner_payable', direction: 'debit', amount_minor: payout.net_minor,
            payout_id: payout.id, partner_id: payout.partner_id,
            description: `Payout ${payout.reference} settled`,
          },
          {
            account: 'gateway_clearing', direction: 'credit', amount_minor: payout.net_minor,
            payout_id: payout.id, partner_id: payout.partner_id,
            description: `Funds released for payout ${payout.reference}`,
          },
        ] as never,
        p_description: `Payout ${payout.reference}`,
      });
      if (ledgerError) {
        logger.error('Payout ledger posting failed', { error: ledgerError, payoutId: payout.id });
      }
    }

    // Tell the partner.
    const { data: members } = await admin
      .from('partner_profiles')
      .select('display_name, organizations(organization_members(profile_id, role, status, profiles!organization_members_profile_id_fkey(email)))')
      .eq('id', payout.partner_id)
      .maybeSingle();

    const org = members?.organizations as unknown as {
      organization_members: {
        profile_id: string; role: string; status: string; profiles: { email: string | null } | null;
      }[];
    } | null;

    if (['approved', 'paid'].includes(input.status)) {
      for (const member of org?.organization_members ?? []) {
        if (member.status !== 'active' || !['owner', 'admin'].includes(member.role)) continue;
        await notify({
          profileId: member.profile_id,
          type: input.status === 'paid' ? 'payout.paid' : 'payout.approved',
          title: input.status === 'paid' ? 'Your payout has been sent' : 'Your payout was approved',
          body: formatMinor(payout.net_minor),
          url: '/partner/payouts',
          email: member.profiles?.email
            ? {
                to: member.profiles.email, template: 'payout_notification',
                dedupeKey: `payout:${payout.id}:${input.status}`,
                data: {
                  status: input.status, reference: payout.reference,
                  gross: formatMinor(payout.gross_minor),
                  commission: formatMinor(payout.commission_minor),
                  amount: formatMinor(payout.net_minor),
                },
              }
            : undefined,
        });
      }
    }

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole,
      action: input.status === 'paid' ? 'payout.paid' : 'payout.approved',
      entity: 'payouts', entityId: payout.id,
      summary: `${payout.status} → ${input.status} · ${formatMinor(payout.net_minor)}${input.method ? ` via ${input.method}` : ''}`,
    });

    revalidatePath('/admin/payouts');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/* ------------------------------------------------------------- Settings */

export async function updateSystemSetting(input: { key: string; value: unknown }): Promise<Result> {
  try {
    const user = await requirePermission('settings.manage');
    const admin = createAdminSupabase();

    const { data: before } = await admin
      .from('system_settings').select('value').eq('key', input.key).maybeSingle();

    const { error } = await admin
      .from('system_settings')
      .update({ value: input.value as never, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('key', input.key);

    if (error) return { ok: false, error: 'We could not save that setting.' };

    await recordAudit({
      actorId: user.id, actorRole: user.platformRole, action: 'settings.changed',
      entity: 'system_settings', entityId: input.key,
      summary: `${input.key} changed`,
      before: before?.value, after: input.value,
    });

    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Sends a customer their proposal link again. */
export async function resendProposalEmail(proposalId: string): Promise<Result> {
  try {
    await requirePermission('proposals.manage');
    const admin = createAdminSupabase();
    const { data: proposal } = await admin
      .from('proposals')
      .select('reference, total_minor, valid_until, service_requests(contact_email, contact_name)')
      .eq('id', proposalId)
      .maybeSingle();

    const request = proposal?.service_requests as unknown as {
      contact_email: string | null; contact_name: string | null;
    } | null;
    if (!request?.contact_email) return { ok: false, error: 'No contact email on this request.' };

    await sendTransactionalEmail({
      to: request.contact_email,
      template: 'proposal_ready',
      data: {
        name: request.contact_name ?? 'there',
        reference: proposal!.reference,
        proposalId,
        total: formatMinor(proposal!.total_minor),
        validUntil: proposal!.valid_until ?? 'See the proposal',
      },
      dedupeKey: `proposal_resend:${proposalId}:${Date.now()}`,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

