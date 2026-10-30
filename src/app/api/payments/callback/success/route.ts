import { NextResponse, type NextRequest } from 'next/server';
import { confirmPayment } from '@/features/payments/service';
import { appUrl } from '@/lib/env';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Browser return URL after a successful gateway checkout.
 *
 * IMPORTANT: this is a *hint*, not proof. The gateway posts the customer
 * back here through their browser, so the payload is attacker-controlled.
 * We re-verify server-to-server before anything is marked paid, and the
 * IPN does the same independently — whichever arrives first wins, and the
 * second is a no-op.
 */
async function handle(request: NextRequest) {
  const body =
    request.method === 'POST'
      ? Object.fromEntries((await request.formData()).entries())
      : Object.fromEntries(request.nextUrl.searchParams.entries());

  const transactionId = String(body.tran_id ?? '');
  const validationId = body.val_id ? String(body.val_id) : null;

  if (!transactionId) {
    return NextResponse.redirect(`${appUrl}/dashboard/payments?status=unknown`, { status: 303 });
  }

  try {
    const result = await confirmPayment({ transactionId, validationId });
    const status = result.ok ? 'success' : 'pending';
    return NextResponse.redirect(
      `${appUrl}/dashboard/payments/${result.paymentId ?? ''}/result?status=${status}`,
      { status: 303 },
    );
  } catch (error) {
    logger.error('Payment success callback failed', { error, transactionId });
    return NextResponse.redirect(`${appUrl}/dashboard/payments?status=pending`, { status: 303 });
  }
}

export const GET = handle;
export const POST = handle;
