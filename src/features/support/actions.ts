'use server';

import { createAdminSupabase } from '@/lib/supabase/server';
import { getSessionUser } from '@/features/auth/session';
import { clientIdentifier, enforceRateLimit } from '@/lib/rate-limit';
import { toPublicError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { notifyStaff, sendTransactionalEmail } from '@/features/notifications/service';
import { brand } from '@/config/brand';
import { contactSchema, type ContactInput, type TicketInput } from './schema';

/**
 * Public contact form.
 *
 * Creates a support ticket when the sender is signed in (so it lands in
 * the same queue as everything else), and always emails the team.
 */
export async function submitContactForm(
  input: ContactInput,
): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  try {
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const data = parsed.data;
    if (data.company_website) return { ok: true };

    const user = await getSessionUser().catch(() => null);
    await enforceRateLimit('contact_form', user?.id ?? (await clientIdentifier(data.email)));

    const admin = createAdminSupabase();

    if (user) {
      await admin.from('support_tickets').insert({
        subject: `${data.topic}: enquiry from ${data.name}`,
        category: data.topic === 'support' ? 'other' : 'other',
        opened_by: user.id,
        opener_side: 'customer',
        priority: 'normal',
      });
    }

    await notifyStaff({
      permission: 'tickets.manage',
      type: 'ticket.updated',
      title: `Contact form: ${data.topic}`,
      body: `${data.name} (${data.email}${data.phone ? `, ${data.phone}` : ''}) — ${data.message.slice(0, 200)}`,
      url: '/admin/disputes',
    });

    await sendTransactionalEmail({
      to: data.email,
      template: 'support_update',
      data: {
        reference: 'your enquiry',
        ticketId: '',
        message: `Thank you for contacting ${brand.name}. We have received your message and will reply within one working day.`,
      },
      profileId: user?.id ?? null,
    });

    return { ok: true };
  } catch (error) {
    logger.error('Contact form failed', { error });
    return { ok: false, error: toPublicError(error).message };
  }
}

/** Creates a support ticket with its opening message. */
export async function createSupportTicket(
  input: TicketInput,
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  try {
    const { requireUser } = await import('@/features/auth/session');
    const { ticketSchema } = await import('./schema');
    const user = await requireUser();

    const parsed = ticketSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form.' };
    }

    await enforceRateLimit('contact_form', user.id);

    const admin = createAdminSupabase();
    const isPartner = user.partnerOrgs.length > 0;

    const { data: ticket, error } = await admin
      .from('support_tickets')
      .insert({
        subject: parsed.data.subject,
        category: parsed.data.category,
        opened_by: user.id,
        opener_side: isPartner ? 'partner' : 'customer',
        organization_id: user.customerOrgs[0]?.organizationId ?? null,
        partner_id: user.partnerOrgs[0]?.partnerId ?? null,
        event_id: parsed.data.eventId ?? null,
        booking_id: parsed.data.bookingId ?? null,
        priority: parsed.data.category === 'payment' || parsed.data.category === 'refund' ? 'high' : 'normal',
      })
      .select('id, reference')
      .single();

    if (error || !ticket) {
      logger.error('Ticket creation failed', { error });
      return { ok: false, error: 'We could not raise your ticket. Please try again.' };
    }

    await admin.from('ticket_messages').insert({
      ticket_id: ticket.id,
      author_id: user.id,
      body: parsed.data.message,
      is_internal: false,
    });

    await notifyStaff({
      permission: 'tickets.manage',
      type: 'ticket.updated',
      title: `New ticket: ${parsed.data.subject}`,
      body: parsed.data.message.slice(0, 200),
      url: '/admin/disputes',
    });

    return { ok: true, reference: ticket.reference };
  } catch (error) {
    logger.error('createSupportTicket failed', { error });
    return { ok: false, error: toPublicError(error).message };
  }
}
