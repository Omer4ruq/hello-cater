import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';
import type { SessionUser } from '@/features/auth/session';

/**
 * Customer dashboard reads.
 *
 * Every query runs through the request-scoped (RLS-enforced) client, so a
 * customer can only ever see their own rows and those of companies they
 * belong to — the filters below are for correctness and performance, not
 * for security.
 */

export type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

export function paginationRange({ page = 1, pageSize = 20 }: ListParams) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(Math.max(1, Math.floor(pageSize)), 100);
  const start = (safePage - 1) * safeSize;
  return { start, end: start + safeSize - 1, page: safePage, pageSize: safeSize };
}

/** Org ids the user can see data for, plus their own profile id. */
function scopeFor(user: SessionUser) {
  return user.customerOrgs.map((o) => o.organizationId);
}

export async function getCustomerOverview(user: SessionUser) {
  const supabase = await createServerSupabase();
  const orgIds = scopeFor(user);
  const today = new Date().toISOString().slice(0, 10);

  const [requests, proposals, events, invoices, unread] = await Promise.all([
    supabase
      .from('service_requests')
      .select('id, reference, title, status, event_date, guest_count, created_at, event_types(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('proposals')
      .select('id, reference, title, status, total_minor, valid_until, sent_at, request_id')
      .in('status', ['sent', 'viewed'])
      .order('sent_at', { ascending: false })
      .limit(5),
    supabase
      .from('events')
      .select('id, reference, title, stage, event_date, start_time, guest_count, venue_name, total_minor, paid_minor')
      .gte('event_date', today)
      .order('event_date')
      .limit(5),
    supabase
      .from('invoices')
      .select('id, number, total_minor, paid_minor, status, due_date')
      .in('status', ['issued', 'partially_paid', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(5),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
  ]);

  const outstanding = (invoices.data ?? []).reduce(
    (sum, inv) => sum + (inv.total_minor - inv.paid_minor),
    0,
  );

  return {
    recentRequests: requests.data ?? [],
    requestCount: requests.count ?? 0,
    pendingProposals: proposals.data ?? [],
    upcomingEvents: events.data ?? [],
    openInvoices: invoices.data ?? [],
    outstandingMinor: outstanding,
    unreadNotifications: unread.count ?? 0,
    organizationCount: orgIds.length,
  };
}

export async function listCustomerRequests(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('service_requests')
    .select(
      'id, reference, title, status, event_date, guest_count, budget_mode, budget_total_minor, created_at, event_types(name), cities(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.or(`reference.ilike.%${params.q}%,title.ilike.%${params.q}%`);
  if (params.from) query = query.gte('event_date', params.from);
  if (params.to) query = query.lte('event_date', params.to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

export async function getCustomerRequest(requestId: string) {
  const supabase = await createServerSupabase();

  const [request, services, proposals, invites, history] = await Promise.all([
    supabase
      .from('service_requests')
      .select(
        'id, reference, title, status, event_date, event_end_date, start_time, end_time, is_date_flexible, guest_count, guest_count_max, venue_name, address_line, venue_notes, budget_mode, budget_total_minor, budget_per_person_minor, budget_min_minor, budget_max_minor, dietary_notes, requirements, contact_name, contact_phone, contact_email, created_at, submitted_at, event_types(name, slug), cities(name), areas(name)',
      )
      .eq('id', requestId)
      .maybeSingle(),
    supabase
      .from('request_services')
      .select('category_id, notes, is_primary, service_categories(name, slug, kind)')
      .eq('request_id', requestId),
    supabase
      .from('proposals')
      .select('id, reference, title, status, total_minor, valid_until, sent_at, version_no')
      .eq('request_id', requestId)
      .neq('status', 'draft')
      .order('version_no', { ascending: false }),
    supabase
      .from('request_partner_invites')
      .select('id, status, invited_at, responded_at')
      .eq('request_id', requestId),
    supabase
      .from('request_status_history')
      .select('id, from_status, to_status, note, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false }),
  ]);

  if (!request.data) return null;

  return {
    request: request.data,
    services: services.data ?? [],
    proposals: proposals.data ?? [],
    // Customers see the count of partners approached, not who they are —
    // that is the platform's supply relationship.
    invitesTotal: invites.data?.length ?? 0,
    invitesAccepted: (invites.data ?? []).filter((i) => i.status === 'accepted').length,
    history: history.data ?? [],
  };
}

export async function getProposalForCustomer(proposalId: string) {
  const supabase = await createServerSupabase();

  const [proposal, lines] = await Promise.all([
    supabase
      .from('proposals')
      .select(
        'id, reference, request_id, status, version_no, title, summary, terms, cancellation_policy, partner_gross_minor, service_fee_minor, coordination_fee_minor, delivery_fee_minor, discount_minor, tax_minor, total_minor, deposit_bps, deposit_minor, balance_due_days, valid_until, sent_at, viewed_at, accepted_at, created_at, service_requests(reference, event_date, guest_count, venue_name, event_types(name), cities(name))',
      )
      .eq('id', proposalId)
      .maybeSingle(),
    supabase
      .from('proposal_lines')
      .select(
        'id, label, description, amount_minor, is_platform_line, sort_order, partner_id, service_categories(name, kind), partner_profiles(display_name, slug, rating_avg, rating_count, logo_url)',
      )
      .eq('proposal_id', proposalId)
      .order('sort_order'),
  ]);

  if (!proposal.data) return null;
  return { proposal: proposal.data, lines: lines.data ?? [] };
}

export async function listCustomerEvents(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('events')
    .select(
      'id, reference, title, stage, event_date, start_time, guest_count, venue_name, total_minor, paid_minor, event_types(name), cities(name)',
      { count: 'exact' },
    )
    .order('event_date', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('stage', params.status as never);
  if (params.q) query = query.or(`reference.ilike.%${params.q}%,title.ilike.%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

export async function getCustomerEvent(eventId: string) {
  const supabase = await createServerSupabase();

  const [event, bookings, tasks, timeline, documents, payments] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, reference, title, stage, event_date, event_end_date, start_time, end_time, guest_count, venue_name, address_line, venue_notes, total_minor, paid_minor, refunded_minor, customer_notes, created_at, event_types(name), cities(name), areas(name)',
      )
      .eq('id', eventId)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select(
        'id, reference, status, gross_minor, service_date, service_time, delivery_window, headcount, fulfilment_notes, service_categories(name), partner_profiles(display_name, slug, logo_url, rating_avg)',
      )
      .eq('event_id', eventId),
    supabase
      .from('event_tasks')
      .select('id, title, detail, status, due_at, completed_at')
      .eq('event_id', eventId)
      .eq('is_customer_visible', true)
      .order('due_at', { nullsFirst: false }),
    supabase
      .from('event_timeline')
      .select('id, kind, title, detail, created_at')
      .eq('event_id', eventId)
      .in('visibility', ['customer', 'all'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('event_documents')
      .select('id, title, storage_path, mime_type, created_at')
      .eq('event_id', eventId)
      .in('visibility', ['customer', 'all']),
    supabase
      .from('payments')
      .select('id, reference, purpose, status, amount_minor, paid_at, method, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
  ]);

  if (!event.data) return null;
  return {
    event: event.data,
    bookings: bookings.data ?? [],
    tasks: tasks.data ?? [],
    timeline: timeline.data ?? [],
    documents: documents.data ?? [],
    payments: payments.data ?? [],
  };
}

export async function listCustomerInvoices(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('invoices')
    .select('id, number, kind, status, total_minor, paid_minor, issue_date, due_date, pdf_path, events(title, reference)', { count: 'exact' })
    .eq('kind', 'customer_invoice')
    .order('issue_date', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.ilike('number', `%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

export async function listCustomerPayments(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('payments')
    .select('id, reference, purpose, status, amount_minor, refunded_minor, method, provider, paid_at, created_at, events(title, reference)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

export async function listSavedPartners() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('favorites')
    .select('id, created_at, partner_profiles(id, slug, display_name, tagline, logo_url, cover_image_url, rating_avg, rating_count)')
    .not('partner_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadNotificationCount() {
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}
