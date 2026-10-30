import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** The customer abandoned checkout. Nothing was charged. */
async function handle(request: NextRequest) {
  const body =
    request.method === 'POST'
      ? Object.fromEntries((await request.formData()).entries())
      : Object.fromEntries(request.nextUrl.searchParams.entries());

  const transactionId = String(body.tran_id ?? '');
  if (transactionId) {
    const supabase = createAdminSupabase();
    await supabase
      .from('payments')
      .update({ status: 'cancelled', failure_reason: 'Cancelled by customer at the gateway' })
      .eq('reference', transactionId)
      .in('status', ['initiated', 'pending']);
  }
  return NextResponse.redirect(`${appUrl}/dashboard/payments?status=cancelled`, { status: 303 });
}

export const GET = handle;
export const POST = handle;
