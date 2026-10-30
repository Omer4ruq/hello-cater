'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { requireUser } from '@/features/auth/session';
import { AppError, toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { formatMinor } from '@/lib/money';
import { recordAudit } from '@/features/audit/log';
import { notify, notifyStaff } from '@/features/notifications/service';

const respondSchema = z.object({
  proposalId: z.string().uuid(),
  message: z.string().trim().max(2000).optional(),
});

export type ProposalActionResult =
  | { ok: true; eventId?: string }
  | { ok: false; error: string };

/** Records that the customer has opened the proposal. Idempotent. */
export async function markProposalViewed(proposalId: string): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from('proposals')
      .select('id, status, viewed_at')
      .eq('id', proposalId)
      .maybeSingle();

    if (!data || data.viewed_at || data.status !== 'sent') return;

    await supabase
      .from('proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', proposalId);

    await supabase.from('proposal_events').insert({ proposal_id: proposalId, kind: 'viewed' });
  } catch (error) {
    // Read receipts are not worth failing a page render for.
    logger.debug('markProposalViewed failed', { proposalId, error });
  }
}

/**
 * Accepts a proposal.
 *
 * Delegates to the `accept_proposal` database function, which does the
 * whole thing in one transaction: creates the event, one booking per
 * partner line, closes the losing quotes and opens the event thread. If
 * any part fails, none of it happens.
 */
export async function acceptProposal(input: { proposalId: string }): Promise<ProposalActionResult> {
  try {
    const user = await requireUser();
    const parsed = respondSchema.safeParse(input);
    if (!parsed.success) throw new AppError('validation_failed', 'Invalid proposal.');

    const supabase = await createServerSupabase();

    const { data: eventId, error } = await supabase.rpc('accept_proposal', {
      p_proposal: parsed.data.proposalId,
    });

    if (error) {
      logger.warn('accept_proposal rejected', { error, proposalId: parsed.data.proposalId });
      // The database raises a readable message for every guard it enforces.
      return { ok: false, error: friendlyDbError(error.message) };
    }

    const admin = createAdminSupabase();
    const { data: proposal } = await admin
      .from('proposals')
      .select('reference, total_minor, deposit_minor, request_id')
      .eq('id', parsed.data.proposalId)
      .maybeSingle();

    await Promise.all([
      recordAudit({
        actorId: user.id, action: 'proposal.accepted',
        entity: 'proposals', entityId: parsed.data.proposalId,
        summary: `Accepted ${proposal?.reference ?? ''} — ${formatMinor(proposal?.total_minor ?? 0)}`,
      }),
      notifyStaff({
        permission: 'proposals.manage',
        type: 'proposal.accepted',
        title: `Proposal ${proposal?.reference ?? ''} accepted`,
        body: `${formatMinor(proposal?.total_minor ?? 0)} · deposit ${formatMinor(proposal?.deposit_minor ?? 0)}`,
        url: `/admin/events/${eventId}`,
      }),
      notify({
        profileId: user.id,
        type: 'booking.confirmed',
        title: 'Your event is confirmed',
        body: 'We have created your event workspace with every vendor and deliverable.',
        url: `/dashboard/events/${eventId}`,
      }),
    ]);

    revalidatePath('/dashboard/proposals');
    revalidatePath('/dashboard/events');
    revalidatePath('/admin/events');

    return { ok: true, eventId: eventId as string };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Declines a proposal with a reason, so operations can learn from it. */
export async function rejectProposal(input: {
  proposalId: string;
  reason: string;
}): Promise<ProposalActionResult> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({ proposalId: z.string().uuid(), reason: z.string().trim().min(3).max(1000) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Please tell us briefly why.' };

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('proposals')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
        rejected_reason: parsed.data.reason,
      })
      .eq('id', parsed.data.proposalId);

    if (error) return { ok: false, error: 'We could not record your response. Please try again.' };

    await supabase.from('proposal_events').insert({
      proposal_id: parsed.data.proposalId, kind: 'rejected', note: parsed.data.reason,
    });

    await Promise.all([
      recordAudit({
        actorId: user.id, action: 'proposal.rejected',
        entity: 'proposals', entityId: parsed.data.proposalId, summary: parsed.data.reason,
      }),
      notifyStaff({
        permission: 'proposals.manage',
        type: 'proposal.rejected',
        title: 'A proposal was declined',
        body: parsed.data.reason,
        url: `/admin/proposals/${parsed.data.proposalId}`,
      }),
    ]);

    revalidatePath('/dashboard/proposals');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Asks for changes; keeps the proposal open so ops can revise it. */
export async function requestProposalChanges(input: {
  proposalId: string;
  message: string;
}): Promise<ProposalActionResult> {
  try {
    const user = await requireUser();
    const parsed = z
      .object({ proposalId: z.string().uuid(), message: z.string().trim().min(5).max(2000) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Tell us what you would like changed.' };

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from('proposals')
      .update({
        status: 'changes_requested',
        responded_at: new Date().toISOString(),
        change_request: parsed.data.message,
      })
      .eq('id', parsed.data.proposalId);

    if (error) return { ok: false, error: 'We could not send your request. Please try again.' };

    await supabase.from('proposal_events').insert({
      proposal_id: parsed.data.proposalId, kind: 'changes_requested', note: parsed.data.message,
    });

    await notifyStaff({
      permission: 'proposals.manage',
      type: 'proposal.rejected',
      title: 'Customer requested proposal changes',
      body: parsed.data.message,
      url: `/admin/proposals/${parsed.data.proposalId}`,
    });

    await recordAudit({
      actorId: user.id, action: 'proposal.rejected',
      entity: 'proposals', entityId: parsed.data.proposalId,
      summary: `Changes requested: ${parsed.data.message.slice(0, 200)}`,
    });

    revalidatePath('/dashboard/proposals');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Turns database guard messages into something a customer can act on. */
function friendlyDbError(message: string): string {
  if (/expired on/i.test(message)) {
    return 'This proposal has expired. Ask our team for a refreshed version and we will reissue it.';
  }
  if (/cannot be accepted from status/i.test(message)) {
    return 'This proposal has already been responded to. Refresh the page to see its current state.';
  }
  if (/Not authorised/i.test(message)) {
    return 'You do not have permission to accept this proposal.';
  }
  if (/capacity|blocked/i.test(message)) {
    return 'One of the partners is no longer available for this date. Our team has been notified and will send a revised proposal.';
  }
  return 'We could not accept this proposal. Our team has been notified — please try again shortly.';
}
