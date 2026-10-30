import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentProvider } from '@/features/payments';
import {
  confirmPayment, markWebhookProcessed, recordWebhookDelivery,
} from '@/features/payments/service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Gateway IPN / webhook endpoint.
 *
 * Contract with the gateway: always answer 200 once the delivery has been
 * durably recorded. Returning an error would make the gateway retry a
 * delivery we have already stored, and the work is idempotent anyway.
 *
 * Processing order:
 *   1. Store the raw delivery (unique per provider event id → replays are
 *      recognised and dropped).
 *   2. Re-verify with the gateway's validation API.
 *   3. Settle only if the verified amount matches our record.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerName } = await context.params;
  const provider = getPaymentProvider();

  if (providerName !== provider.name) {
    logger.warn('Webhook for an inactive provider', { providerName, active: provider.name });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let body: Record<string, string> = {};
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Record<string, string>;
    } else {
      body = Object.fromEntries(
        [...(await request.formData()).entries()].map(([k, v]) => [k, String(v)]),
      );
    }
  } catch (error) {
    logger.warn('Unparseable webhook body', { error });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const parsed = provider.parseWebhook(body);

  const delivery = await recordWebhookDelivery({
    provider: provider.name,
    deliveryId: parsed.deliveryId,
    eventType: body.status ?? 'unknown',
    payload: body,
    signatureValid: parsed.signatureValid,
  });

  if (!delivery.isNew) {
    // Already handled — this is a replay.
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  if (!parsed.signatureValid) {
    // Advisory only: the validation API below is the real authority.
    logger.warn('Webhook signature did not verify; relying on validation API', {
      provider: provider.name,
      transactionId: parsed.transactionId,
    });
  }

  try {
    if (!parsed.transactionId) {
      await markWebhookProcessed(delivery.id, 'No transaction id in payload');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const result = await confirmPayment({
      transactionId: parsed.transactionId,
      validationId: parsed.validationId,
    });

    await markWebhookProcessed(delivery.id, result.ok ? undefined : result.error);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error('Webhook processing failed', { error, transactionId: parsed.transactionId });
    await markWebhookProcessed(delivery.id, error instanceof Error ? error.message : 'unknown');
    // Still 200: the delivery is stored and can be reprocessed by an admin.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
