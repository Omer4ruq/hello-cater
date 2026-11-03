import 'server-only';

import { createAdminSupabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { formatMinor } from '@/lib/money';
import { brand } from '@/config/brand';
import { recordAudit } from '@/features/audit/log';

/**
 * Invoice generation.
 *
 * Invoices are derived from committed records (event, proposal lines,
 * payouts) rather than re-computed from rules, so reissuing an invoice
 * can never produce a different number from the one the customer already
 * accepted.
 */

/** Issues the customer invoice for a confirmed event. Idempotent per event. */
export async function issueCustomerInvoice(eventId: string): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const admin = createAdminSupabase();

  const { data: existing } = await admin
    .from('invoices')
    .select('id')
    .eq('event_id', eventId)
    .eq('kind', 'customer_invoice')
    .maybeSingle();

  if (existing) return { ok: true, invoiceId: existing.id };

  const { data: event } = await admin
    .from('events')
    .select('id, reference, title, total_minor, paid_minor, event_date, customer_profile_id, organization_id, proposal_id, profiles!events_customer_profile_id_fkey(full_name, email, phone), organizations(name, address_line, area, city, tin, billing_email)')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return { ok: false, error: 'Event not found' };

  const customer = event.profiles as unknown as { full_name: string; email: string | null; phone: string | null } | null;
  const org = event.organizations as unknown as {
    name: string; address_line: string | null; area: string | null;
    city: string | null; tin: string | null; billing_email: string | null;
  } | null;

  const { data: proposal } = event.proposal_id
    ? await admin
        .from('proposals')
        .select('partner_gross_minor, service_fee_minor, coordination_fee_minor, delivery_fee_minor, discount_minor, tax_minor, total_minor, balance_due_days')
        .eq('id', event.proposal_id)
        .maybeSingle()
    : { data: null };

  const { data: lines } = event.proposal_id
    ? await admin
        .from('proposal_lines')
        .select('label, description, amount_minor, sort_order')
        .eq('proposal_id', event.proposal_id)
        .order('sort_order')
    : { data: [] };

  const dueDate = new Date(
    new Date(event.event_date).getTime() - (proposal?.balance_due_days ?? 3) * 86_400_000,
  ).toISOString().slice(0, 10);

  const { data: invoice, error } = await admin
    .from('invoices')
    .insert({
      kind: 'customer_invoice',
      status: 'issued',
      event_id: event.id,
      proposal_id: event.proposal_id,
      customer_profile_id: event.customer_profile_id,
      organization_id: event.organization_id,
      bill_to_name: org?.name ?? customer?.full_name ?? 'Customer',
      bill_to_address: org
        ? [org.address_line, org.area, org.city].filter(Boolean).join(', ')
        : null,
      bill_to_email: org?.billing_email ?? customer?.email ?? null,
      bill_to_phone: customer?.phone ?? null,
      bill_to_tin: org?.tin ?? null,
      subtotal_minor: (proposal?.partner_gross_minor ?? event.total_minor)
        + (proposal?.service_fee_minor ?? 0)
        + (proposal?.coordination_fee_minor ?? 0)
        + (proposal?.delivery_fee_minor ?? 0),
      discount_minor: proposal?.discount_minor ?? 0,
      tax_minor: proposal?.tax_minor ?? 0,
      total_minor: event.total_minor,
      paid_minor: event.paid_minor,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      notes: `Event ${event.reference} — ${event.title}`,
      terms: `Payable to ${brand.legalName}. Please quote invoice number on your transfer.`,
      issued_at: new Date().toISOString(),
    })
    .select('id, number')
    .single();

  if (error || !invoice) {
    logger.error('Customer invoice creation failed', { error, eventId });
    return { ok: false, error: 'Could not issue the invoice' };
  }

  const items = (lines ?? []).map((line, index) => ({
    invoice_id: invoice.id,
    label: line.label,
    description: line.description,
    quantity: 1,
    unit_price_minor: line.amount_minor,
    sort_order: (index + 1) * 10,
  }));

  if (proposal?.service_fee_minor) {
    items.push({
      invoice_id: invoice.id, label: 'Platform service fee', description: null,
      quantity: 1, unit_price_minor: proposal.service_fee_minor, sort_order: 900,
    });
  }
  if (proposal?.coordination_fee_minor) {
    items.push({
      invoice_id: invoice.id, label: 'Event coordination fee', description: null,
      quantity: 1, unit_price_minor: proposal.coordination_fee_minor, sort_order: 910,
    });
  }
  if (proposal?.delivery_fee_minor) {
    items.push({
      invoice_id: invoice.id, label: 'Delivery & setup', description: null,
      quantity: 1, unit_price_minor: proposal.delivery_fee_minor, sort_order: 920,
    });
  }

  if (items.length > 0) {
    await admin.from('invoice_items').insert(items);
  }

  await recordAudit({
    actorId: null, action: 'invoice.issued', entity: 'invoices', entityId: invoice.id,
    summary: `${invoice.number} for ${event.reference} — ${formatMinor(event.total_minor)}`,
  });

  return { ok: true, invoiceId: invoice.id };
}

/** Produces the partner statement that accompanies a payout. */
export async function issuePartnerStatement(payoutId: string): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const admin = createAdminSupabase();

  const { data: existing } = await admin
    .from('payouts').select('statement_invoice_id').eq('id', payoutId).maybeSingle();
  if (existing?.statement_invoice_id) return { ok: true, invoiceId: existing.statement_invoice_id };

  const { data: payout } = await admin
    .from('payouts')
    .select('id, reference, partner_id, gross_minor, commission_minor, adjustment_minor, net_minor, period_start, period_end, partner_profiles(display_name, organizations(name, address_line, city, email, tin))')
    .eq('id', payoutId)
    .maybeSingle();

  if (!payout) return { ok: false, error: 'Payout not found' };

  const partner = payout.partner_profiles as unknown as {
    display_name: string;
    organizations: { name: string; address_line: string | null; city: string | null; email: string | null; tin: string | null } | null;
  } | null;

  const { data: items } = await admin
    .from('payout_items')
    .select('label, gross_minor, commission_minor, adjustment_minor, net_minor')
    .eq('payout_id', payoutId);

  const { data: invoice, error } = await admin
    .from('invoices')
    .insert({
      kind: 'partner_statement',
      status: 'issued',
      partner_id: payout.partner_id,
      bill_to_name: partner?.organizations?.name ?? partner?.display_name ?? 'Partner',
      bill_to_address: [partner?.organizations?.address_line, partner?.organizations?.city].filter(Boolean).join(', '),
      bill_to_email: partner?.organizations?.email ?? null,
      bill_to_tin: partner?.organizations?.tin ?? null,
      subtotal_minor: payout.gross_minor,
      discount_minor: payout.commission_minor,
      tax_minor: 0,
      total_minor: Math.max(payout.net_minor, 0),
      paid_minor: 0,
      notes: `Settlement statement for payout ${payout.reference}`,
      terms: 'This statement summarises amounts settled to your registered account.',
      issued_at: new Date().toISOString(),
    })
    .select('id, number')
    .single();

  if (error || !invoice) {
    logger.error('Partner statement creation failed', { error, payoutId });
    return { ok: false, error: 'Could not issue the statement' };
  }

  if (items?.length) {
    await admin.from('invoice_items').insert(
      items.map((item, index) => ({
        invoice_id: invoice.id,
        label: item.label,
        description: `Gross ${formatMinor(item.gross_minor)} · commission ${formatMinor(item.commission_minor)}`,
        quantity: 1,
        unit_price_minor: item.net_minor,
        sort_order: (index + 1) * 10,
      })),
    );
  }

  await admin.from('payouts').update({ statement_invoice_id: invoice.id }).eq('id', payoutId);

  return { ok: true, invoiceId: invoice.id };
}
