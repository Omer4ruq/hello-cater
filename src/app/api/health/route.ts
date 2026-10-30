import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isEmailConfigured, isPaymentConfigured, integrations } from '@/lib/env.server';

export const dynamic = 'force-dynamic';

/**
 * Health probe for uptime monitoring and deploy verification.
 *
 * Reports whether each dependency is reachable and configured, without
 * leaking versions, connection strings, row counts or schema detail. A
 * failing database makes the endpoint return 503 so a monitor can alert.
 */
export async function GET() {
  const startedAt = Date.now();

  const checks: Record<string, { ok: boolean; detail?: string }> = {
    app: { ok: true },
    database: { ok: false, detail: 'not configured' },
    email: { ok: isEmailConfigured, detail: isEmailConfigured ? integrations.email.provider : 'not configured' },
    payments: {
      ok: isPaymentConfigured,
      detail: isPaymentConfigured
        ? `${integrations.payments.provider} (${integrations.payments.sandbox ? 'sandbox' : 'live'})`
        : 'manual settlement only',
    },
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = createAdminSupabase();
      const { error } = await supabase.rpc('health_check');
      checks.database = error ? { ok: false, detail: 'query failed' } : { ok: true };
    } catch {
      checks.database = { ok: false, detail: 'unreachable' };
    }
  }

  // Only the database is load-bearing; email and payments degrade
  // gracefully, so they must not take the health check down.
  const healthy = checks.app.ok && checks.database.ok;

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
