'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser, requirePermission } from '@/features/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { toPublicError } from '@/lib/errors';
import { startPayment, confirmPayment } from './service';

const startSchema = z.object({
  eventId: z.string().uuid(),
  purpose: z.enum(['deposit', 'balance', 'full']).default('balance'),
});

/**
 * Starts a checkout for an event.
 *
 * Note what is NOT in the input: the amount. It is always derived from
 * the event's outstanding balance server-side.
 */
export async function startEventPayment(input: {
  eventId: string;
  purpose?: 'deposit' | 'balance' | 'full';
}): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const parsed = startSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid payment request.' };

    await enforceRateLimit('payment_init', user.id);

    const result = await startPayment({
      eventId: parsed.data.eventId,
      purpose: parsed.data.purpose,
      actorId: user.id,
    });

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, redirectUrl: result.redirectUrl };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Finance records an offline settlement (bank transfer, cheque, cash). */
export async function recordManualPayment(input: {
  reference: string;
  amountMinor: number;
  method: string;
  providerRef: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requirePermission('payments.manage');
    const parsed = z
      .object({
        reference: z.string().min(3),
        amountMinor: z.number().int().positive(),
        method: z.string().min(2).max(60),
        providerRef: z.string().min(1).max(120),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Check the amount and reference.' };

    const result = await confirmPayment({
      transactionId: parsed.data.reference,
      manual: {
        actorId: user.id,
        method: parsed.data.method,
        providerRef: parsed.data.providerRef,
        amountMinor: parsed.data.amountMinor,
      },
    });

    revalidatePath('/admin/payments');
    return result.ok ? { ok: true } : { ok: false, error: result.error ?? 'Could not record the payment.' };
  } catch (error) {
    return { ok: false, error: toPublicError(error).message };
  }
}
