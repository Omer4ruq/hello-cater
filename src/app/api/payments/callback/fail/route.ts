import { NextResponse, type NextRequest } from 'next/server';
import { confirmPayment } from '@/features/payments/service';
import { appUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Gateway failure return. Re-verified server-side like every other signal. */
async function handle(request: NextRequest) {
  const body =
    request.method === 'POST'
      ? Object.fromEntries((await request.formData()).entries())
      : Object.fromEntries(request.nextUrl.searchParams.entries());

  const transactionId = String(body.tran_id ?? '');
  if (transactionId) {
    await confirmPayment({ transactionId, validationId: body.val_id ? String(body.val_id) : null })
      .catch(() => undefined);
  }
  return NextResponse.redirect(`${appUrl}/dashboard/payments?status=failed`, { status: 303 });
}

export const GET = handle;
export const POST = handle;
