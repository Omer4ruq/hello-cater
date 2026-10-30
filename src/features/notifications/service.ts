import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { buildEmail, getEmailProvider, type TemplateKey } from './email';
import type { Json } from '@/types/database';

/** Notification types, mirroring the `notification_types` seed rows. */
export type NotificationKey =
  | 'request.submitted' | 'request.invite' | 'request.new_internal'
  | 'invite.accepted' | 'invite.declined'
  | 'quote.submitted' | 'quote.updated' | 'quote.changes_requested'
  | 'proposal.sent' | 'proposal.accepted' | 'proposal.rejected'
  | 'booking.confirmed' | 'booking.cancelled' | 'booking.reminder' | 'booking.completed'
  | 'payment.received' | 'payment.failed' | 'payment.due'
  | 'payout.approved' | 'payout.paid'
  | 'review.requested' | 'review.received'
  | 'message.received' | 'ticket.updated'
  | 'partner.approved' | 'partner.rejected';

export type NotifyInput = {
  /** Who receives it. Omit for staff broadcasts (see `notifyStaff`). */
  profileId: string;
  type: NotificationKey;
  title: string;
  body?: string;
  url?: string;
  data?: Record<string, unknown>;
  email?: {
    to: string;
    template: TemplateKey;
    data: Record<string, string>;
    /** Deduplicates retries of the same logical notification. */
    dedupeKey?: string;
  };
};

/**
 * Delivers a notification in-app and, when the user's preferences allow,
 * by email.
 *
 * Never throws: a failed notification must not roll back the business
 * action that triggered it. Failures are logged and, for email, recorded
 * in `outbound_messages` so they can be retried or audited.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const supabase = createAdminSupabase();

    const { error: insertError } = await supabase.from('notifications').insert({
      profile_id: input.profileId,
      type_key: input.type,
      title: input.title,
      body: input.body ?? null,
      url: input.url ?? null,
      data: (input.data ?? {}) as Json,
    });
    if (insertError) logger.warn('Failed to write in-app notification', { error: insertError, type: input.type });

    if (!input.email) return;

    // Respect the recipient's preference; fall back to the type default.
    const [{ data: preference }, { data: typeRow }] = await Promise.all([
      supabase
        .from('notification_preferences')
        .select('email')
        .eq('profile_id', input.profileId)
        .eq('type_key', input.type)
        .maybeSingle(),
      supabase
        .from('notification_types')
        .select('default_email')
        .eq('key', input.type)
        .maybeSingle(),
    ]);

    const emailAllowed = preference?.email ?? typeRow?.default_email ?? true;
    if (!emailAllowed) return;

    await sendTransactionalEmail({
      to: input.email.to,
      template: input.email.template,
      data: input.email.data,
      profileId: input.profileId,
      dedupeKey: input.email.dedupeKey,
    });
  } catch (error) {
    logger.error('notify() failed', { error, type: input.type });
  }
}

/**
 * Sends an email through the configured provider and records the attempt.
 * The spool row is written first so a crash mid-send is still visible.
 */
export async function sendTransactionalEmail(input: {
  to: string;
  template: TemplateKey;
  data: Record<string, string>;
  profileId?: string | null;
  dedupeKey?: string;
}): Promise<void> {
  const supabase = createAdminSupabase();
  const { subject, html, text } = buildEmail(input.template, input.data);

  const { data: spooled, error: spoolError } = await supabase
    .from('outbound_messages')
    .insert({
      channel: 'email',
      template_key: input.template,
      to_address: input.to,
      to_profile_id: input.profileId ?? null,
      subject,
      payload: input.data as Json,
      dedupe_key: input.dedupeKey ?? null,
      status: 'queued',
    })
    .select('id')
    .single();

  // A unique violation on dedupe_key means we already sent this one.
  if (spoolError) {
    if (spoolError.code === '23505') {
      logger.debug('Email suppressed by dedupe key', { template: input.template, to: input.to });
      return;
    }
    logger.warn('Could not spool email', { error: spoolError });
  }

  const provider = getEmailProvider();
  const result = await provider.send({ to: input.to, subject, html, text, dedupeKey: input.dedupeKey });

  if (spooled?.id) {
    await supabase
      .from('outbound_messages')
      .update({
        status: result.ok ? (result.skipped ? 'skipped' : 'sent') : 'failed',
        provider: result.provider,
        provider_ref: result.id ?? null,
        last_error: result.error ?? null,
        attempts: 1,
        sent_at: result.ok && !result.skipped ? new Date().toISOString() : null,
      })
      .eq('id', spooled.id);
  }

  if (!result.ok) {
    logger.error('Email send failed', { template: input.template, error: result.error });
  }
}

/**
 * Notifies every active staff member holding a given permission.
 * Used for operational alerts like "a new request needs triage".
 */
export async function notifyStaff(input: {
  permission: string;
  type: NotificationKey;
  title: string;
  body?: string;
  url?: string;
  email?: { template: TemplateKey; data: Record<string, string> };
}): Promise<void> {
  try {
    const supabase = createAdminSupabase();
    const { data: staff } = await supabase
      .from('platform_staff')
      .select('profile_id, role, profiles!inner(email, full_name)')
      .eq('is_active', true);

    if (!staff?.length) return;

    const { data: roles } = await supabase
      .from('role_permissions')
      .select('role')
      .eq('permission_key', input.permission);

    const allowedRoles = new Set((roles ?? []).map((r) => r.role));
    const recipients = staff.filter((s) => allowedRoles.has(s.role));

    await Promise.all(
      recipients.map((recipient) => {
        const profile = recipient.profiles as unknown as { email: string | null; full_name: string };
        return notify({
          profileId: recipient.profile_id,
          type: input.type,
          title: input.title,
          body: input.body,
          url: input.url,
          email:
            input.email && profile.email
              ? { to: profile.email, template: input.email.template, data: input.email.data }
              : undefined,
        });
      }),
    );
  } catch (error) {
    logger.error('notifyStaff() failed', { error, type: input.type });
  }
}
