import 'server-only';

import { randomUUID } from 'node:crypto';
import { createAdminSupabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { formatMinor, type Minor } from '@/lib/money';
import { notify, notifyStaff } from '@/features/notifications/service';
import { recordAudit } from '@/features/audit/log';
import { getPaymentProvider } from './index';
import type { Json } from '@/types/database';

/**
 * Payment orchestration.
 *
 * Invariants this module exists to hold:
 *  - The amount charged is ALWAYS computed server-side from the event's
 *    outstanding balance. A client-supplied amount is never used.
 *  - A payment is only marked paid after the gateway confirms it through
 *    a server-to-server call, with the amount cross-checked.
 *  - Confirmation is idempotent. Redirect, IPN and a manual retry can all
 *    arrive for the same transaction; only the first one moves money.
 *  - Every confirmed payment writes balanced double-entry ledger rows.
 */

export type StartPaymentInput = {
  eventId: string;
  purpose: 'deposit' | 'balance' | 'full';
  actorId: string;
};

export type StartPaymentResult =
  | { ok: true; redirectUrl: string; paymentId: string; reference: string }
  | { ok: false; error: string };

/** Creates a payment row and a gateway session for an event's balance. */
export async function startPayment(input: StartPaymentInput): Promise<StartPaymentResult> {
  const supabase = createAdminSupabase();

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, reference, title, total_minor, paid_minor, customer_profile_id, organization_id, proposal_id, event_date',
    )
    .eq('id', input.eventId)
    .maybeSingle();

  if (eventError || !event) return { ok: false, error: 'We could not find that event.' };

  // Authorisation: the payer must own the event or belong to its company.
  const { data: canPay } = await supabase
    .from('events')
    .select('id')
    .eq('id', input.eventId)
    .or(`customer_profile_id.eq.${input.actorId}`)
    .maybeSingle();

  if (!canPay) {
    const { data: membership } = event.organization_id
      ? await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', event.organization_id)
          .eq('profile_id', input.actorId)
          .eq('status', 'active')
          .maybeSingle()
      : { data: null };
    if (!membership) throw new AppError('forbidden', 'You cannot pay for this event.');
  }

  // ---- Amount is derived, never supplied -------------------------------
  const outstanding = event.total_minor - event.paid_minor;
  if (outstanding <= 0) return { ok: false, error: 'This event is already fully paid.' };

  let amountMinor: Minor = outstanding;
  if (input.purpose === 'deposit' && event.proposal_id) {
    const { data: proposal } = await supabase
      .from('proposals')
      .select('deposit_minor')
      .eq('id', event.proposal_id)
      .maybeSingle();
    if (proposal?.deposit_minor) {
      amountMinor = Math.min(proposal.deposit_minor - event.paid_minor, outstanding);
    }
  }
  if (amountMinor <= 0) amountMinor = outstanding;

  // Reuse a still-valid pending payment rather than stacking sessions.
  const { data: existing } = await supabase
    .from('payments')
    .select('id, reference, status, amount_minor, expires_at')
    .eq('event_id', input.eventId)
    .in('status', ['initiated', 'pending'])
    .gt('expires_at', new Date().toISOString())
    .eq('amount_minor', amountMinor)
    .maybeSingle();

  const { data: customer } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', event.customer_profile_id)
    .maybeSingle();

  const paymentId = existing?.id ?? randomUUID();
  const reference = existing?.reference ?? `PAY-${Date.now().toString(36).toUpperCase()}-${paymentId.slice(0, 6)}`;

  if (!existing) {
    const { error: insertError } = await supabase.from('payments').insert({
      id: paymentId,
      reference,
      event_id: event.id,
      proposal_id: event.proposal_id,
      customer_profile_id: event.customer_profile_id,
      organization_id: event.organization_id,
      purpose: input.purpose,
      status: 'initiated',
      amount_minor: amountMinor,
      provider: getPaymentProvider().name,
      // One idempotency key per attempt makes double-submit harmless.
      idempotency_key: `${event.id}:${input.purpose}:${amountMinor}:${randomUUID()}`,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    });

    if (insertError) {
      logger.error('Could not create payment row', { error: insertError });
      return { ok: false, error: 'We could not start the payment. Please try again.' };
    }
  }

  const provider = getPaymentProvider();
  const result = await provider.createPayment({
    paymentId,
    reference,
    amountMinor,
    currency: 'BDT',
    description: `${event.title} (${event.reference})`,
    customer: {
      name: customer?.full_name || 'Customer',
      email: customer?.email || 'noreply@eventlybd.com',
      phone: customer?.phone || '+8801700000000',
      city: 'Dhaka',
    },
    urls: {
      success: `${appUrl}/api/payments/callback/success`,
      fail: `${appUrl}/api/payments/callback/fail`,
      cancel: `${appUrl}/api/payments/callback/cancel`,
      ipn: `${appUrl}/api/payments/webhook/${provider.name}`,
    },
    metadata: { eventId: event.id, purpose: input.purpose },
  });

  await supabase.from('payment_transactions').insert({
    payment_id: paymentId,
    kind: 'init',
    status: result.ok ? 'session_created' : 'session_failed',
    amount_minor: amountMinor,
    response_body: (result.raw ?? null) as Json,
    error_message: result.ok ? null : result.error,
  });

  if (!result.ok) {
    await supabase
      .from('payments')
      .update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: result.error })
      .eq('id', paymentId);
    return { ok: false, error: result.error };
  }

  await supabase
    .from('payments')
    .update({ status: 'pending', provider_session: result.providerSession })
    .eq('id', paymentId);

  await recordAudit({
    actorId: input.actorId,
    action: 'payment.initiated',
    entity: 'payments',
    entityId: paymentId,
    summary: `${formatMinor(amountMinor)} for ${event.reference} via ${provider.name}`,
  });

  return { ok: true, redirectUrl: result.redirectUrl, paymentId, reference };
}

/**
 * Confirms a payment against the gateway and, if genuinely settled,
 * applies it to the event and the ledger.
 *
 * Safe to call repeatedly and concurrently — the first successful call
 * transitions the row, every later one returns the same answer without
 * double-counting.
 */
export async function confirmPayment(input: {
  transactionId: string;
  validationId?: string | null;
  /** Set when a finance admin is recording an offline settlement. */
  manual?: { actorId: string; method: string; providerRef: string; amountMinor: Minor };
}): Promise<{ ok: boolean; status: string; paymentId?: string; error?: string }> {
  const supabase = createAdminSupabase();

  const { data: payment } = await supabase
    .from('payments')
    .select('id, reference, status, amount_minor, currency, event_id, customer_profile_id, organization_id, purpose, provider')
    .eq('reference', input.transactionId)
    .maybeSingle();

  if (!payment) {
    logger.warn('Confirmation for an unknown transaction', { transactionId: input.transactionId });
    return { ok: false, status: 'unknown', error: 'Unknown transaction' };
  }

  // Already settled: return success without touching anything again.
  if (payment.status === 'paid') {
    return { ok: true, status: 'paid', paymentId: payment.id };
  }

  let verification;
  if (input.manual) {
    verification = {
      status: 'paid' as const,
      amountMinor: input.manual.amountMinor,
      currency: 'BDT',
      transactionId: payment.reference,
      providerRef: input.manual.providerRef,
      bankTransactionId: input.manual.providerRef,
      method: input.manual.method,
      feeMinor: 0,
      raw: { manual: true, recordedBy: input.manual.actorId },
    };
  } else {
    verification = await getPaymentProvider().verifyPayment({
      validationId: input.validationId,
      transactionId: payment.reference,
    });
  }

  await supabase.from('payment_transactions').insert({
    payment_id: payment.id,
    kind: input.manual ? 'manual' : 'validate',
    status: verification.status,
    amount_minor: verification.amountMinor,
    provider_ref: verification.providerRef,
    response_body: (verification.raw ?? null) as Json,
  });

  if (verification.status !== 'paid') {
    const failureStatus =
      verification.status === 'cancelled' ? 'cancelled'
      : verification.status === 'expired' ? 'expired'
      : verification.status === 'pending' ? 'pending'
      : 'failed';

    if (failureStatus !== 'pending') {
      await supabase
        .from('payments')
        .update({
          status: failureStatus,
          failed_at: new Date().toISOString(),
          failure_reason: `Gateway reported ${verification.status}`,
        })
        .eq('id', payment.id)
        .neq('status', 'paid');

      await notifyOfFailure(payment.customer_profile_id, payment.reference, verification.status);
    }
    return { ok: false, status: failureStatus, paymentId: payment.id };
  }

  // ---- Cross-check what the gateway says against what we asked for -----
  if (verification.amountMinor != null && verification.amountMinor !== payment.amount_minor) {
    logger.error('Payment amount mismatch — refusing to settle', {
      reference: payment.reference,
      expected: payment.amount_minor,
      reported: verification.amountMinor,
    });
    await supabase
      .from('payments')
      .update({ status: 'failed', failed_at: new Date().toISOString(), failure_reason: 'Amount mismatch on validation' })
      .eq('id', payment.id);

    await notifyStaff({
      permission: 'payments.manage',
      type: 'payment.failed',
      title: `Amount mismatch on ${payment.reference}`,
      body: `Expected ${formatMinor(payment.amount_minor)}, gateway reported ${formatMinor(verification.amountMinor)}. Held for review.`,
      url: `/admin/payments/${payment.id}`,
    });
    return { ok: false, status: 'failed', paymentId: payment.id, error: 'Amount mismatch' };
  }

  if (verification.currency && verification.currency !== 'BDT') {
    logger.error('Payment currency mismatch', { reference: payment.reference, currency: verification.currency });
    return { ok: false, status: 'failed', paymentId: payment.id, error: 'Currency mismatch' };
  }

  // ---- Settle. The `.neq('status','paid')` guard makes this a no-op if
  // a concurrent confirmation won the race. ------------------------------
  const { data: settled } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      provider_ref: verification.providerRef ?? verification.bankTransactionId,
      method: verification.method,
      gateway_fee_minor: verification.feeMinor ?? 0,
      net_received_minor: payment.amount_minor - (verification.feeMinor ?? 0),
    })
    .eq('id', payment.id)
    .neq('status', 'paid')
    .select('id')
    .maybeSingle();

  if (!settled) {
    // Another call settled it first; nothing further to do.
    return { ok: true, status: 'paid', paymentId: payment.id };
  }

  await applySettledPayment({ paymentId: payment.id, eventId: payment.event_id, amountMinor: payment.amount_minor });

  await recordAudit({
    actorId: input.manual?.actorId ?? null,
    action: 'payment.confirmed',
    entity: 'payments',
    entityId: payment.id,
    summary: `${formatMinor(payment.amount_minor)} confirmed via ${input.manual ? 'manual settlement' : payment.provider}`,
  });

  return { ok: true, status: 'paid', paymentId: payment.id };
}

/**
 * Applies a settled payment: updates the event balance, advances any
 * bookings that were waiting on payment, and writes the ledger entries.
 */
async function applySettledPayment(input: {
  paymentId: string;
  eventId: string | null;
  amountMinor: Minor;
}) {
  const supabase = createAdminSupabase();
  if (!input.eventId) return;

  const { data: event } = await supabase
    .from('events')
    .select('id, reference, title, total_minor, paid_minor, customer_profile_id, organization_id')
    .eq('id', input.eventId)
    .maybeSingle();
  if (!event) return;

  const newPaid = event.paid_minor + input.amountMinor;
  await supabase.from('events').update({ paid_minor: newPaid }).eq('id', event.id);

  // Bookings awaiting payment become confirmed once the deposit lands.
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, gross_minor, commission_minor, partner_id')
    .eq('event_id', event.id);

  for (const booking of bookings ?? []) {
    if (booking.status === 'pending_payment') {
      await supabase
        .from('bookings')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', booking.id);
    }
  }

  // ---- Double-entry posting -------------------------------------------
  // Customer settles their receivable; the cash sits in gateway clearing
  // until it is split between platform revenue and partner payable.
  const totalCommission = (bookings ?? []).reduce((sum, b) => sum + b.commission_minor, 0);
  const totalPartnerPayable = (bookings ?? []).reduce(
    (sum, b) => sum + (b.gross_minor - b.commission_minor),
    0,
  );

  // Allocate this payment proportionally across revenue and payable, so a
  // partial payment does not over-credit either side.
  const share = event.total_minor > 0 ? input.amountMinor / event.total_minor : 1;
  const commissionShare = Math.round(totalCommission * share);
  const partnerShare = Math.round(totalPartnerPayable * share);
  const platformShare = input.amountMinor - partnerShare;

  const { error: ledgerError } = await supabase.rpc('post_ledger_entries', {
    p_entries: [
      {
        account: 'gateway_clearing', direction: 'debit', amount_minor: input.amountMinor,
        payment_id: input.paymentId, event_id: event.id, organization_id: event.organization_id,
        description: `Payment received for ${event.reference}`,
      },
      {
        account: 'partner_payable', direction: 'credit', amount_minor: partnerShare,
        payment_id: input.paymentId, event_id: event.id,
        description: `Partner payable accrued for ${event.reference}`,
      },
      {
        account: 'platform_revenue', direction: 'credit', amount_minor: platformShare,
        payment_id: input.paymentId, event_id: event.id,
        description: `Platform revenue for ${event.reference} (commission ${formatMinor(commissionShare)})`,
      },
    ] as unknown as Json,
    p_description: `Payment ${input.paymentId}`,
  });

  if (ledgerError) {
    // The money is real and recorded on the payment row; a ledger failure
    // must be visible to finance rather than silently swallowed.
    logger.error('Ledger posting failed for settled payment', { error: ledgerError, paymentId: input.paymentId });
    await notifyStaff({
      permission: 'payments.manage',
      type: 'payment.received',
      title: 'Ledger posting failed',
      body: `Payment ${input.paymentId} settled but the ledger entry failed. Reconcile manually.`,
      url: `/admin/payments/${input.paymentId}`,
    });
  }

  await supabase.from('event_timeline').insert({
    event_id: event.id,
    kind: 'payment_received',
    title: 'Payment received',
    detail: `${formatMinor(input.amountMinor)} received. ${formatMinor(Math.max(event.total_minor - newPaid, 0))} outstanding.`,
    visibility: 'all',
  });

  const { data: customer } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', event.customer_profile_id)
    .maybeSingle();

  await notify({
    profileId: event.customer_profile_id,
    type: 'payment.received',
    title: `Payment received — ${formatMinor(input.amountMinor)}`,
    body: newPaid >= event.total_minor ? 'Your event is fully paid.' : `${formatMinor(event.total_minor - newPaid)} remaining.`,
    url: `/dashboard/events/${event.id}`,
    email: customer?.email
      ? {
          to: customer.email,
          template: 'payment_receipt',
          dedupeKey: `receipt:${input.paymentId}`,
          data: {
            amount: formatMinor(input.amountMinor),
            reference: event.reference,
            method: 'Online payment',
            paidAt: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
          },
        }
      : undefined,
  });

  await notifyStaff({
    permission: 'payments.view',
    type: 'payment.received',
    title: `Payment received for ${event.reference}`,
    body: `${formatMinor(input.amountMinor)} · ${formatMinor(Math.max(event.total_minor - newPaid, 0))} outstanding`,
    url: `/admin/events/${event.id}`,
  });
}

async function notifyOfFailure(profileId: string, reference: string, status: string) {
  const supabase = createAdminSupabase();
  const { data: customer } = await supabase
    .from('profiles').select('email').eq('id', profileId).maybeSingle();

  await notify({
    profileId,
    type: 'payment.failed',
    title: 'Your payment did not go through',
    body: 'No amount has been taken. You can try again from your event page.',
    url: '/dashboard/payments',
    email: customer?.email
      ? {
          to: customer.email,
          template: 'payment_failed',
          dedupeKey: `payfail:${reference}:${status}`,
          data: { reference, reason: `Gateway reported ${status}` },
        }
      : undefined,
  });
}

/**
 * Records an incoming webhook delivery exactly once.
 * Returns false when this delivery has already been stored, which is how
 * replays become a no-op.
 */
export async function recordWebhookDelivery(input: {
  provider: string;
  deliveryId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureValid: boolean;
}): Promise<{ isNew: boolean; id: string | null }> {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from('payment_events')
    .insert({
      provider: input.provider,
      provider_event_id: input.deliveryId,
      event_type: input.eventType,
      signature_valid: input.signatureValid,
      payload: input.payload as Json,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    // 23505 = unique violation on (provider, provider_event_id): a replay.
    if (error.code === '23505') return { isNew: false, id: null };
    logger.error('Could not record webhook delivery', { error });
    return { isNew: true, id: null };
  }
  return { isNew: true, id: data?.id ?? null };
}

export async function markWebhookProcessed(id: string | null, error?: string) {
  if (!id) return;
  const supabase = createAdminSupabase();
  await supabase
    .from('payment_events')
    .update({ processed_at: new Date().toISOString(), process_error: error ?? null })
    .eq('id', id);
}
