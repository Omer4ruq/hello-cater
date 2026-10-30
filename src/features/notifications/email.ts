import 'server-only';

import { appUrl } from '@/lib/env';
import { integrations, isEmailConfigured } from '@/lib/env.server';
import { logger } from '@/lib/logger';
import { brand } from '@/config/brand';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Prevents duplicate sends when a workflow is retried. */
  dedupeKey?: string;
};

export type EmailResult = {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
  skipped?: boolean;
};

/**
 * Transactional email provider abstraction.
 *
 * Swapping providers means adding a branch here — nothing else in the
 * codebase talks to an email API directly. With no provider configured
 * the message is logged instead of sent, so local development and
 * preview deployments work end to end without credentials.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(message: EmailMessage): Promise<EmailResult> {
    logger.info('[email:console] message not sent — no provider configured', {
      to: message.to,
      subject: message.subject,
      preview: message.text.slice(0, 240),
    });
    return { ok: true, provider: this.name, skipped: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(message.dedupeKey ? { 'Idempotency-Key': message.dedupeKey } : {}),
      },
      body: JSON.stringify({
        from: integrations.email.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo ?? integrations.email.replyTo,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, provider: this.name, error: `${response.status}: ${body.slice(0, 500)}` };
    }
    const data = (await response.json()) as { id?: string };
    return { ok: true, provider: this.name, id: data.id };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  async send(message: EmailMessage): Promise<EmailResult> {
    // nodemailer is loaded lazily so it is not bundled unless SMTP is the
    // configured provider.
    try {
      const { createTransport } = (await import('nodemailer')) as typeof import('nodemailer');
      const { host, port, user, pass } = integrations.email.smtp;
      const transport = createTransport({
        host, port, secure: port === 465,
        auth: user ? { user, pass } : undefined,
      });
      const info = await transport.sendMail({
        from: integrations.email.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo ?? integrations.email.replyTo,
      });
      return { ok: true, provider: this.name, id: info.messageId };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        error: error instanceof Error ? error.message : 'SMTP send failed',
      };
    }
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  if (!isEmailConfigured) {
    provider = new ConsoleEmailProvider();
  } else if (integrations.email.provider === 'resend') {
    provider = new ResendEmailProvider(integrations.email.resendApiKey!);
  } else {
    provider = new SmtpEmailProvider();
  }
  return provider;
}

/* ------------------------------------------------------------ Templates */

const styles = {
  wrapper: 'margin:0;padding:24px;background:#fbf9f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#23211e;',
  card: 'max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dcd8d0;border-radius:12px;overflow:hidden;',
  header: 'padding:24px 28px;border-bottom:1px solid #eeece7;',
  body: 'padding:28px;font-size:15px;line-height:1.65;',
  button: 'display:inline-block;background:#0e4f3c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;',
  footer: 'padding:20px 28px;background:#f7f6f3;font-size:12px;color:#6b655a;line-height:1.6;',
  table: 'width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;',
  th: 'text-align:left;padding:8px 0;border-bottom:1px solid #eeece7;color:#6b655a;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;',
  td: 'padding:10px 0;border-bottom:1px solid #f4f3f0;',
};

export type TemplateKey =
  | 'welcome' | 'verify_email' | 'password_reset' | 'magic_link'
  | 'request_received' | 'request_internal_alert' | 'partner_invitation'
  | 'quote_received' | 'proposal_ready' | 'booking_confirmed'
  | 'payment_receipt' | 'payment_failed' | 'event_reminder'
  | 'payout_notification' | 'review_request' | 'support_update'
  | 'partner_approved' | 'partner_rejected' | 'team_invitation';

type TemplateInput = {
  heading: string;
  greeting?: string;
  paragraphs: string[];
  rows?: { label: string; value: string }[];
  cta?: { label: string; href: string };
  footnote?: string;
};

function renderTemplate(input: TemplateInput): { html: string; text: string } {
  const rows = input.rows?.length
    ? `<table style="${styles.table}"><tbody>${input.rows
        .map(
          (r) =>
            `<tr><td style="${styles.td};color:#6b655a;width:45%">${escapeHtml(r.label)}</td>` +
            `<td style="${styles.td};font-weight:600;text-align:right">${escapeHtml(r.value)}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.heading)}</title></head>
<body style="${styles.wrapper}">
  <div style="${styles.card}">
    <div style="${styles.header}">
      <span style="font-size:18px;font-weight:700;color:#0e4f3c;letter-spacing:-0.02em;">${brand.name}</span>
    </div>
    <div style="${styles.body}">
      <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#14110e;">${escapeHtml(input.heading)}</h1>
      ${input.greeting ? `<p style="margin:0 0 14px;">${escapeHtml(input.greeting)}</p>` : ''}
      ${input.paragraphs.map((p) => `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`).join('')}
      ${rows}
      ${input.cta ? `<p style="margin:24px 0 8px;"><a href="${input.cta.href}" style="${styles.button}">${escapeHtml(input.cta.label)}</a></p>` : ''}
      ${input.footnote ? `<p style="margin:20px 0 0;font-size:13px;color:#6b655a;">${escapeHtml(input.footnote)}</p>` : ''}
    </div>
    <div style="${styles.footer}">
      <p style="margin:0 0 6px;">${brand.legalName} · ${brand.address.line1}, ${brand.address.city}</p>
      <p style="margin:0;">Questions? Reply to this email or write to ${brand.supportEmail}.</p>
    </div>
  </div>
</body></html>`;

  const text = [
    input.heading,
    '',
    input.greeting ?? '',
    ...input.paragraphs,
    ...(input.rows ?? []).map((r) => `${r.label}: ${r.value}`),
    input.cta ? `\n${input.cta.label}: ${input.cta.href}` : '',
    input.footnote ?? '',
    '',
    `— ${brand.name} · ${brand.supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function buildEmail(key: TemplateKey, data: Record<string, string>): { subject: string; html: string; text: string } {
  const link = (path: string) => `${appUrl}${path}`;

  const templates: Record<TemplateKey, () => { subject: string } & TemplateInput> = {
    welcome: () => ({
      subject: `Welcome to ${brand.name}`,
      heading: `Welcome to ${brand.name}`,
      greeting: `Hello ${data.name ?? 'there'},`,
      paragraphs: [
        'Your account is ready. You can submit event requirements, compare proposals from verified partners and manage everything from one dashboard.',
      ],
      cta: { label: 'Open your dashboard', href: link('/dashboard') },
    }),
    verify_email: () => ({
      subject: 'Confirm your email address',
      heading: 'Confirm your email address',
      paragraphs: ['Please confirm your email address to finish setting up your account.'],
      cta: { label: 'Confirm email', href: data.url ?? link('/') },
      footnote: 'This link expires in 24 hours. If you did not create an account, you can ignore this email.',
    }),
    password_reset: () => ({
      subject: 'Reset your password',
      heading: 'Reset your password',
      paragraphs: ['We received a request to reset your password. If it was not you, ignore this email and nothing will change.'],
      cta: { label: 'Choose a new password', href: data.url ?? link('/') },
      footnote: 'This link expires in 60 minutes.',
    }),
    magic_link: () => ({
      subject: `Your sign-in link for ${brand.name}`,
      heading: 'Your sign-in link',
      paragraphs: ['Use the button below to sign in. No password needed.'],
      cta: { label: 'Sign in', href: data.url ?? link('/') },
      footnote: 'This link expires in 60 minutes and can only be used once.',
    }),
    request_received: () => ({
      subject: `We have your event request (${data.reference})`,
      heading: 'Request received',
      greeting: `Hello ${data.name ?? 'there'},`,
      paragraphs: [
        'Thank you — your requirement is with our event team. We will review it, shortlist verified partners and come back with quotations.',
        'This request is non-binding. Nothing is confirmed until you accept a proposal.',
      ],
      rows: [
        { label: 'Reference', value: data.reference ?? '' },
        { label: 'Event', value: data.eventType ?? '' },
        { label: 'Date', value: data.eventDate ?? 'To be confirmed' },
        { label: 'Guests', value: data.guestCount ?? '—' },
        { label: 'Location', value: data.location ?? '—' },
      ],
      cta: { label: 'Track your request', href: link(`/dashboard/requests`) },
      footnote: 'Most requests receive their first quotations within 24–48 hours.',
    }),
    request_internal_alert: () => ({
      subject: `[Ops] New request ${data.reference} — ${data.eventType ?? 'event'}`,
      heading: 'New request needs triage',
      paragraphs: [`A new request was submitted and is waiting for partner matching.`],
      rows: [
        { label: 'Reference', value: data.reference ?? '' },
        { label: 'Customer', value: data.customer ?? '' },
        { label: 'Event', value: data.eventType ?? '' },
        { label: 'Date', value: data.eventDate ?? '' },
        { label: 'Guests', value: data.guestCount ?? '' },
        { label: 'Budget', value: data.budget ?? 'Not specified' },
      ],
      cta: { label: 'Open in admin', href: link(`/admin/requests/${data.requestId ?? ''}`) },
    }),
    partner_invitation: () => ({
      subject: `New quotation request — ${data.eventType ?? 'event'} on ${data.eventDate ?? 'TBC'}`,
      heading: 'You have been invited to quote',
      greeting: `Hello ${data.partnerName ?? 'partner'},`,
      paragraphs: [
        'A customer requirement matches your services. Review the brief and submit a quotation if you can deliver it.',
      ],
      rows: [
        { label: 'Event', value: data.eventType ?? '' },
        { label: 'Date', value: data.eventDate ?? '' },
        { label: 'Guests', value: data.guestCount ?? '' },
        { label: 'Location', value: data.location ?? '' },
        { label: 'Respond by', value: data.respondBy ?? 'As soon as possible' },
      ],
      cta: { label: 'View the request', href: link(`/partner/requests/${data.inviteId ?? ''}`) },
      footnote: 'Declining is one click and costs you nothing, but response rate affects future matching.',
    }),
    quote_received: () => ({
      subject: `[Ops] Quote ${data.reference} submitted`,
      heading: 'A partner submitted a quote',
      paragraphs: [`${data.partnerName ?? 'A partner'} submitted a quotation for ${data.requestReference ?? 'a request'}.`],
      rows: [{ label: 'Total', value: data.total ?? '' }],
      cta: { label: 'Review the quote', href: link('/admin/quotes') },
    }),
    proposal_ready: () => ({
      subject: `Your proposal is ready (${data.reference})`,
      heading: 'Your proposal is ready',
      greeting: `Hello ${data.name ?? 'there'},`,
      paragraphs: [
        'We have put together a proposal based on your requirement. You can review every line item, ask for changes, or accept it.',
      ],
      rows: [
        { label: 'Reference', value: data.reference ?? '' },
        { label: 'Total', value: data.total ?? '' },
        { label: 'Valid until', value: data.validUntil ?? '' },
      ],
      cta: { label: 'Review the proposal', href: link(`/dashboard/proposals/${data.proposalId ?? ''}`) },
    }),
    booking_confirmed: () => ({
      subject: `Booking confirmed — ${data.eventTitle ?? 'your event'}`,
      heading: 'Booking confirmed',
      paragraphs: ['Everything is confirmed. Your event workspace has the schedule, vendors and documents in one place.'],
      rows: [
        { label: 'Event', value: data.eventTitle ?? '' },
        { label: 'Date', value: data.eventDate ?? '' },
        { label: 'Reference', value: data.reference ?? '' },
      ],
      cta: { label: 'Open the event', href: link(`/dashboard/events/${data.eventId ?? ''}`) },
    }),
    payment_receipt: () => ({
      subject: `Payment received — ${data.amount ?? ''}`,
      heading: 'Payment received',
      paragraphs: ['Thank you. Your payment has been received and applied to your event.'],
      rows: [
        { label: 'Amount', value: data.amount ?? '' },
        { label: 'Reference', value: data.reference ?? '' },
        { label: 'Method', value: data.method ?? '' },
        { label: 'Paid at', value: data.paidAt ?? '' },
      ],
      cta: { label: 'Download invoice', href: link(`/dashboard/invoices`) },
    }),
    payment_failed: () => ({
      subject: 'Your payment did not go through',
      heading: 'Payment unsuccessful',
      paragraphs: [
        'We could not complete your payment. No amount has been taken. You can try again with the same or a different method.',
      ],
      rows: [{ label: 'Reference', value: data.reference ?? '' }, { label: 'Reason', value: data.reason ?? 'Declined by the payment provider' }],
      cta: { label: 'Try again', href: link(`/dashboard/payments`) },
    }),
    event_reminder: () => ({
      subject: `Reminder: ${data.eventTitle ?? 'your event'} on ${data.eventDate ?? ''}`,
      heading: 'Your event is coming up',
      paragraphs: ['A quick reminder with the key details. Let us know immediately if anything has changed.'],
      rows: [
        { label: 'Event', value: data.eventTitle ?? '' },
        { label: 'Date', value: data.eventDate ?? '' },
        { label: 'Time', value: data.eventTime ?? '' },
        { label: 'Venue', value: data.venue ?? '' },
        { label: 'Guests', value: data.guestCount ?? '' },
      ],
      cta: { label: 'Open the event', href: link(`/dashboard/events/${data.eventId ?? ''}`) },
    }),
    payout_notification: () => ({
      subject: `Payout ${data.status ?? 'update'} — ${data.amount ?? ''}`,
      heading: `Your payout has been ${data.status ?? 'updated'}`,
      paragraphs: ['Here is the summary. The full statement is available in your dashboard.'],
      rows: [
        { label: 'Reference', value: data.reference ?? '' },
        { label: 'Gross', value: data.gross ?? '' },
        { label: 'Commission', value: data.commission ?? '' },
        { label: 'Net payable', value: data.amount ?? '' },
      ],
      cta: { label: 'View payouts', href: link('/partner/payouts') },
    }),
    review_request: () => ({
      subject: 'How did your event go?',
      heading: 'How did it go?',
      paragraphs: [
        'Your event is complete. A short review helps other organisers choose well and helps good partners get more work.',
      ],
      cta: { label: 'Leave a review', href: link(`/dashboard/bookings/${data.bookingId ?? ''}/review`) },
    }),
    support_update: () => ({
      subject: `Support ticket ${data.reference ?? ''} updated`,
      heading: 'Your support ticket was updated',
      paragraphs: [data.message ?? 'Our team has responded to your ticket.'],
      cta: { label: 'View the ticket', href: link('/dashboard/support') },
    }),
    partner_approved: () => ({
      subject: `You are verified on ${brand.name}`,
      heading: 'Your partner account is approved',
      greeting: `Hello ${data.partnerName ?? 'partner'},`,
      paragraphs: [
        'Verification is complete. Your profile is live and you can now receive quotation requests.',
        'Complete your packages, menus, service areas and availability so our matching finds you for the right briefs.',
      ],
      cta: { label: 'Open your dashboard', href: link('/partner') },
    }),
    partner_rejected: () => ({
      subject: 'Your partner application needs attention',
      heading: 'We need a little more from you',
      paragraphs: [
        data.reason ?? 'Some details in your application could not be verified.',
        'Update the requested information and resubmit — we will review it again promptly.',
      ],
      cta: { label: 'Update your application', href: link('/partner/profile') },
    }),
    team_invitation: () => ({
      subject: `${data.inviterName ?? 'A colleague'} invited you to ${data.organizationName ?? 'their team'}`,
      heading: `Join ${data.organizationName ?? 'the team'} on ${brand.name}`,
      paragraphs: [`${data.inviterName ?? 'A colleague'} has invited you to join their team.`],
      cta: { label: 'Accept the invitation', href: data.url ?? link('/login') },
      footnote: 'This invitation expires in 7 days.',
    }),
  };

  const { subject, ...body } = templates[key]();
  return { subject, ...renderTemplate(body) };
}
