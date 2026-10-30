import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled maintenance.
 *
 * Wired up in vercel.json as a daily cron. Protected by CRON_SECRET so a
 * public request cannot trigger it — Vercel sends the secret as a bearer
 * token on scheduled invocations.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    const supabase = createAdminSupabase();

    // 1. Prune spent rate-limit windows.
    const { data: pruned } = await supabase.rpc('prune_rate_limits');
    results.rateLimitsPruned = pruned ?? 0;

    // 2. Expire quotes and proposals that are past their validity date.
    const today = new Date().toISOString().slice(0, 10);

    const { data: expiredProposals } = await supabase
      .from('proposals')
      .update({ status: 'expired' })
      .in('status', ['sent', 'viewed'])
      .lt('valid_until', today)
      .select('id');
    results.proposalsExpired = expiredProposals?.length ?? 0;

    const { data: expiredInvites } = await supabase
      .from('request_partner_invites')
      .update({ status: 'expired' })
      .in('status', ['invited', 'viewed'])
      .lt('respond_by', new Date().toISOString())
      .select('id');
    results.invitesExpired = expiredInvites?.length ?? 0;

    // 3. Flag overdue invoices so finance sees them.
    const { data: overdue } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .in('status', ['issued', 'partially_paid'])
      .lt('due_date', today)
      .select('id');
    results.invoicesMarkedOverdue = overdue?.length ?? 0;

    logger.info('Maintenance cron completed', results);
    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    logger.error('Maintenance cron failed', { error });
    return NextResponse.json({ ok: false, error: 'Maintenance failed' }, { status: 500 });
  }
}
