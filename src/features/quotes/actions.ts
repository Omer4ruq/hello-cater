'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { AppError, toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { formatMinor } from '@/lib/money';
import { recordAudit } from '@/features/audit/log';
import { notifyStaff } from '@/features/notifications/service';
import { quoteDraftSchema, type QuoteDraftInput } from './schema';

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Confirms the caller belongs to the partner and was actually invited. */
async function assertPartnerOnRequest(partnerId: string, requestId: string, userId: string) {
  const admin = createAdminSupabase();

  // Members belong to the partner's organization, not to the partner profile.
  const { data: partner } = await admin
    .from('partner_profiles')
    .select('id, verification_status, organization_id')
    .eq('id', partnerId)
    .maybeSingle();
  const { data: membership } = partner
    ? await admin
        .from('organization_members')
        .select('id')
        .eq('organization_id', partner.organization_id)
        .eq('profile_id', userId)
        .eq('status', 'active')
        .maybeSingle()
    : { data: null };

  if (!partner || !membership) throw new AppError('forbidden', 'You do not have access to this partner account.');
  if (partner.verification_status !== 'approved') {
    throw new AppError('forbidden', 'Your account must be verified before you can submit quotes.');
  }

  const { data: invite } = await admin
    .from('request_partner_invites')
    .select('id, status')
    .eq('request_id', requestId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!invite || invite.status === 'withdrawn') {
    throw new AppError('forbidden', 'You have not been invited to quote on this request.');
  }
  return invite;
}

/** Accept or decline an invitation to quote. */
export async function respondToInvite(input: {
  inviteId: string;
  partnerId: string;
  decision: 'accepted' | 'declined';
  reason?: string;
}): Promise<Result> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({
        inviteId: z.string().uuid(),
        partnerId: z.string().uuid(),
        decision: z.enum(['accepted', 'declined']),
        reason: z.string().trim().max(500).optional(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid response.' };

    const supabase = await createServerSupabase();
    const { data: invite, error } = await supabase
      .from('request_partner_invites')
      .update({
        status: parsed.data.decision,
        responded_at: new Date().toISOString(),
        decline_reason: parsed.data.decision === 'declined' ? (parsed.data.reason ?? null) : null,
      })
      .eq('id', parsed.data.inviteId)
      .eq('partner_id', parsed.data.partnerId)
      .select('id, request_id')
      .maybeSingle();

    if (error || !invite) {
      logger.warn('Invite response rejected', { error });
      return { ok: false, error: 'We could not record your response.' };
    }

    await Promise.all([
      recordAudit({
        actorId: user.id,
        action: 'partner.invited',
        entity: 'request_partner_invites',
        entityId: parsed.data.inviteId,
        summary: `Partner ${parsed.data.decision}${parsed.data.reason ? `: ${parsed.data.reason}` : ''}`,
      }),
      notifyStaff({
        permission: 'requests.manage',
        type: parsed.data.decision === 'accepted' ? 'invite.accepted' : 'invite.declined',
        title: `A partner ${parsed.data.decision} an invitation`,
        body: parsed.data.reason,
        url: `/admin/requests/${invite.request_id}`,
      }),
    ]);

    revalidatePath('/partner/requests');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/**
 * Saves a quote draft.
 *
 * Creates the quote container on first save. If the current version has
 * already been submitted, a NEW version is created rather than mutating
 * history — the database enforces this too, but doing it here gives the
 * partner a clear, intentional versioning model.
 */
export async function saveQuoteDraft(input: {
  partnerId: string;
  draft: QuoteDraftInput;
}): Promise<Result<{ quoteId: string; versionId: string; versionNo: number }>> {
  try {
    const user = await requireUser();
    const parsed = quoteDraftSchema.safeParse(input.draft);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const draft = parsed.data;

    await assertPartnerOnRequest(input.partnerId, draft.requestId, user.id);
    await enforceRateLimit('quote_submit', user.id);

    const admin = createAdminSupabase();

    // ---- Resolve or create the quote container -------------------------
    let quoteId = draft.quoteId ?? null;
    if (!quoteId) {
      const { data: existing } = await admin
        .from('quotes')
        .select('id')
        .eq('request_id', draft.requestId)
        .eq('partner_id', input.partnerId)
        .maybeSingle();

      if (existing) {
        quoteId = existing.id;
      } else {
        const { data: created, error: createError } = await admin
          .from('quotes')
          .insert({
            request_id: draft.requestId,
            partner_id: input.partnerId,
            category_id: draft.categoryId ?? null,
            invite_id: draft.inviteId ?? null,
            status: 'draft',
            created_by: user.id,
          })
          .select('id')
          .single();
        if (createError || !created) {
          logger.error('Quote creation failed', { error: createError });
          return { ok: false, error: 'We could not create your quote. Please try again.' };
        }
        quoteId = created.id;
      }
    }

    // ---- Find an editable version, or start a new one -------------------
    const { data: versions } = await admin
      .from('quote_versions')
      .select('id, version_no, status, submitted_at')
      .eq('quote_id', quoteId)
      .order('version_no', { ascending: false });

    const latest = versions?.[0];
    const isEditable = latest && (!latest.submitted_at || ['draft', 'changes_requested'].includes(latest.status));

    let versionId: string;
    let versionNo: number;

    if (isEditable) {
      versionId = latest.id;
      versionNo = latest.version_no;
      await admin
        .from('quote_versions')
        .update({
          guest_count: draft.guestCount ?? null,
          menu_id: draft.menuId ?? null,
          package_id: draft.packageId ?? null,
          discount_minor: draft.discountMinor,
          tax_minor: draft.taxMinor,
          notes: draft.notes || null,
          payment_terms: draft.paymentTerms || null,
          cancellation_policy: draft.cancellationPolicy || null,
          valid_until: draft.validUntil ?? null,
          change_summary: draft.changeSummary || null,
          status: 'draft',
        })
        .eq('id', versionId);

      // Line items are replaced wholesale: simpler and atomic enough,
      // since a version is only ever edited by one partner.
      await admin.from('quote_items').delete().eq('quote_version_id', versionId);
    } else {
      versionNo = (latest?.version_no ?? 0) + 1;
      const { data: created, error: versionError } = await admin
        .from('quote_versions')
        .insert({
          quote_id: quoteId,
          version_no: versionNo,
          status: 'draft',
          guest_count: draft.guestCount ?? null,
          menu_id: draft.menuId ?? null,
          package_id: draft.packageId ?? null,
          discount_minor: draft.discountMinor,
          tax_minor: draft.taxMinor,
          notes: draft.notes || null,
          payment_terms: draft.paymentTerms || null,
          cancellation_policy: draft.cancellationPolicy || null,
          valid_until: draft.validUntil ?? null,
          change_summary: draft.changeSummary || `Revision ${versionNo}`,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (versionError || !created) {
        logger.error('Quote version creation failed', { error: versionError });
        return { ok: false, error: 'We could not save this revision. Please try again.' };
      }
      versionId = created.id;
    }

    const { error: itemsError } = await admin.from('quote_items').insert(
      draft.items.map((item, index) => ({
        quote_version_id: versionId,
        charge_kind: item.chargeKind,
        label: item.label,
        description: item.description || null,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_minor: item.unitPriceMinor,
        is_optional: item.isOptional,
        sort_order: (index + 1) * 10,
      })),
    );

    if (itemsError) {
      logger.error('Quote items insert failed', { error: itemsError });
      return { ok: false, error: 'We could not save your line items. Please try again.' };
    }

    revalidatePath('/partner/quotes');
    return { ok: true, data: { quoteId, versionId, versionNo } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/**
 * Submits a quote to the platform.
 *
 * The version is frozen by the database at this point — further changes
 * must create a new version.
 */
export async function submitQuote(input: {
  partnerId: string;
  draft: QuoteDraftInput;
}): Promise<Result<{ quoteId: string; versionNo: number }>> {
  try {
    const saved = await saveQuoteDraft(input);
    if (!saved.ok) return saved;

    const user = await requireUser();
    const supabase = await createServerSupabase();

    const { error } = await supabase.rpc('submit_quote_version', {
      p_version: saved.data.versionId,
    });

    if (error) {
      logger.warn('submit_quote_version rejected', { error });
      return { ok: false, error: friendlySubmitError(error.message) };
    }

    const admin = createAdminSupabase();
    const [{ data: quote }, { data: version }] = await Promise.all([
      admin
        .from('quotes')
        .select('reference, request_id, partner_profiles(display_name)')
        .eq('id', saved.data.quoteId)
        .maybeSingle(),
      admin
        .from('quote_versions')
        .select('total_minor')
        .eq('id', saved.data.versionId)
        .maybeSingle(),
    ]);

    const partnerName = (quote?.partner_profiles as unknown as { display_name: string } | null)?.display_name;

    await Promise.all([
      recordAudit({
        actorId: user.id,
        action: saved.data.versionNo > 1 ? 'quote.revised' : 'quote.submitted',
        entity: 'quotes',
        entityId: saved.data.quoteId,
        summary: `${quote?.reference ?? ''} v${saved.data.versionNo} — ${formatMinor(version?.total_minor ?? 0)}`,
      }),
      notifyStaff({
        permission: 'quotes.view',
        type: saved.data.versionNo > 1 ? 'quote.updated' : 'quote.submitted',
        title: `${partnerName ?? 'A partner'} submitted a quote`,
        body: `${quote?.reference ?? ''} v${saved.data.versionNo} · ${formatMinor(version?.total_minor ?? 0)}`,
        url: `/admin/requests/${quote?.request_id ?? ''}`,
        email: {
          template: 'quote_received',
          data: {
            reference: quote?.reference ?? '',
            quoteId: saved.data.quoteId,
            partnerName: partnerName ?? 'Partner',
            requestReference: quote?.request_id ?? '',
            total: formatMinor(version?.total_minor ?? 0),
          },
        },
      }),
    ]);

    revalidatePath('/partner/quotes');
    revalidatePath('/admin/requests');
    return { ok: true, data: { quoteId: saved.data.quoteId, versionNo: saved.data.versionNo } };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Withdraws a quote the partner can no longer honour. */
export async function withdrawQuote(input: { quoteId: string; partnerId: string; reason: string }): Promise<Result> {
  try {
    const user = await requireUser();
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('quotes')
      .update({ status: 'withdrawn' })
      .eq('id', input.quoteId)
      .eq('partner_id', input.partnerId);

    if (error) return { ok: false, error: 'We could not withdraw this quote.' };

    await Promise.all([
      recordAudit({
        actorId: user.id, action: 'quote.revised', entity: 'quotes', entityId: input.quoteId,
        summary: `Withdrawn: ${input.reason}`,
      }),
      notifyStaff({
        permission: 'quotes.view', type: 'quote.updated',
        title: 'A partner withdrew a quote', body: input.reason,
        url: `/admin/quotes/${input.quoteId}`,
      }),
    ]);

    revalidatePath('/partner/quotes');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

function friendlySubmitError(message: string): string {
  if (/at least one line item/i.test(message)) return 'Add at least one line item before submitting.';
  if (/Not authorised/i.test(message)) return 'You are not able to submit this quote.';
  return 'We could not submit this quote. Please try again.';
}

