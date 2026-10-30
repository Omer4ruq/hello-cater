import 'server-only';

import { headers } from 'next/headers';
import { createAdminSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Json } from '@/types/database';

export type AuditAction =
  | 'auth.login' | 'auth.logout' | 'auth.register' | 'auth.password_reset'
  | 'request.submitted' | 'request.status_changed' | 'request.assigned'
  | 'partner.invited' | 'partner.verified' | 'partner.rejected' | 'partner.suspended'
  | 'quote.submitted' | 'quote.revised' | 'quote.changes_requested'
  | 'proposal.created' | 'proposal.sent' | 'proposal.accepted' | 'proposal.rejected'
  | 'booking.created' | 'booking.status_changed' | 'booking.cancelled'
  | 'payment.initiated' | 'payment.confirmed' | 'payment.failed' | 'payment.refunded'
  | 'payout.created' | 'payout.approved' | 'payout.paid' | 'payout.adjusted'
  | 'invoice.issued' | 'invoice.voided'
  | 'role.changed' | 'settings.changed' | 'pricing_rule.changed'
  | 'admin.override' | 'data.exported';

/**
 * Writes an entry to the append-only audit log.
 *
 * Complements the database-level audit triggers: those capture *what*
 * changed at row level, this captures the *intent* behind an action
 * along with request context. Never throws — auditing must not be able
 * to fail a business operation, and a failure here is itself logged.
 */
export async function recordAudit(input: {
  actorId: string | null;
  actorRole?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    const h = await headers().catch(() => null);
    const supabase = createAdminSupabase();

    await supabase.from('audit_logs').insert({
      actor_id: input.actorId,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      summary: input.summary ?? null,
      before_data: (input.before ?? null) as Json,
      after_data: (input.after ?? null) as Json,
      ip_address: h?.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: h?.get('user-agent') ?? null,
      request_id: h?.get('x-vercel-id') ?? null,
    });
  } catch (error) {
    logger.error('Failed to write audit log', { error, action: input.action });
  }
}
