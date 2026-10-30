import 'server-only';

import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { paginationRange, type ListParams } from '@/features/customer/queries';

/**
 * Admin reads.
 *
 * Staff-facing queries use the RLS-enforced client wherever the policies
 * already express the right access (staff have broad SELECT policies), so
 * a permission bug degrades to "sees nothing" rather than "sees
 * everything". The service-role client is reserved for the few reads that
 * genuinely need to cross every tenant, such as the matching candidate
 * pool and platform-wide financial roll-ups.
 */

export async function getAdminOverview() {
  const supabase = await createServerSupabase();
  const admin = createAdminSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const [
    openRequests, activeEvents, upcomingEvents, pendingPartners,
    pendingPayouts, recentRequests, gmvRows, priorGmvRows,
    unpaidInvoices, activeCustomers, activePartners, funnel,
  ] = await Promise.all([
    supabase.from('service_requests').select('id', { count: 'exact', head: true })
      .in('status', ['submitted', 'under_review', 'matching', 'partners_invited', 'quotes_received', 'proposal_sent']),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .not('stage', 'in', '(completed,closed)'),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('event_date', today).not('stage', 'in', '(completed,closed)'),
    supabase.from('partner_profiles').select('id', { count: 'exact', head: true })
      .in('verification_status', ['pending', 'under_review']),
    supabase.from('payouts').select('id, net_minor', { count: 'exact' })
      .in('status', ['pending', 'approved']),
    supabase.from('service_requests')
      .select('id, reference, title, status, event_date, guest_count, created_at, assigned_to, event_types(name), cities(name)')
      .order('created_at', { ascending: false }).limit(8),
    admin.from('events').select('total_minor, created_at').gte('created_at', thirtyDaysAgo),
    admin.from('events').select('total_minor, created_at').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    supabase.from('invoices').select('total_minor, paid_minor')
      .eq('kind', 'customer_invoice').in('status', ['issued', 'partially_paid', 'overdue']),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('partner_profiles').select('id', { count: 'exact', head: true })
      .eq('verification_status', 'approved'),
    admin.from('service_requests').select('status, created_at').gte('created_at', thirtyDaysAgo),
  ]);

  const gmvMinor = (gmvRows.data ?? []).reduce((sum, e) => sum + e.total_minor, 0);
  const priorGmvMinor = (priorGmvRows.data ?? []).reduce((sum, e) => sum + e.total_minor, 0);

  // Platform revenue is commission + customer-side fees, taken straight
  // from the ledger rather than recomputed.
  const { data: revenueRows } = await admin
    .from('financial_transactions')
    .select('amount_minor, direction')
    .eq('account', 'platform_revenue')
    .gte('occurred_at', thirtyDaysAgo);

  const platformRevenueMinor = (revenueRows ?? []).reduce(
    (sum, r) => sum + (r.direction === 'credit' ? r.amount_minor : -r.amount_minor),
    0,
  );

  const funnelRows = funnel.data ?? [];
  const submitted = funnelRows.length;
  const quoted = funnelRows.filter((r) =>
    ['quotes_received', 'proposal_sent', 'won'].includes(r.status),
  ).length;
  const won = funnelRows.filter((r) => r.status === 'won').length;

  // Daily GMV series for the chart.
  const byDay = new Map<string, number>();
  for (const row of gmvRows.data ?? []) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + row.total_minor);
  }
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date: d, gmvMinor: byDay.get(d) ?? 0 };
  });

  return {
    openRequestCount: openRequests.count ?? 0,
    activeEventCount: activeEvents.count ?? 0,
    upcomingEventCount: upcomingEvents.count ?? 0,
    pendingVerificationCount: pendingPartners.count ?? 0,
    pendingPayoutCount: pendingPayouts.count ?? 0,
    pendingPayoutMinor: (pendingPayouts.data ?? []).reduce((s, p) => s + p.net_minor, 0),
    outstandingMinor: (unpaidInvoices.data ?? []).reduce((s, i) => s + (i.total_minor - i.paid_minor), 0),
    gmvMinor,
    gmvDeltaPct: priorGmvMinor > 0 ? ((gmvMinor - priorGmvMinor) / priorGmvMinor) * 100 : null,
    platformRevenueMinor,
    activeCustomerCount: activeCustomers.count ?? 0,
    activePartnerCount: activePartners.count ?? 0,
    recentRequests: recentRequests.data ?? [],
    funnel: {
      submitted,
      quoted,
      won,
      quoteRatePct: submitted ? (quoted / submitted) * 100 : 0,
      winRatePct: submitted ? (won / submitted) * 100 : 0,
    },
    gmvSeries: series,
  };
}

export async function listAdminRequests(params: ListParams & { assigned?: string }) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('service_requests')
    .select(
      'id, reference, title, status, event_date, guest_count, budget_mode, budget_total_minor, budget_per_person_minor, created_at, submitted_at, assigned_to, contact_name, event_types(name), cities(name), areas(name), organizations(name)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.or(`reference.ilike.%${params.q}%,title.ilike.%${params.q}%,contact_name.ilike.%${params.q}%`);
  if (params.from) query = query.gte('event_date', params.from);
  if (params.to) query = query.lte('event_date', params.to);
  if (params.assigned === 'unassigned') query = query.is('assigned_to', null);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

/** Everything the operations workspace needs for one request. */
export async function getAdminRequestWorkspace(requestId: string) {
  const supabase = await createServerSupabase();

  const [request, services, cuisines, candidates, invites, quotes, proposals, notes, history] =
    await Promise.all([
      supabase
        .from('service_requests')
        .select(
          'id, reference, title, status, event_date, event_end_date, start_time, end_time, is_date_flexible, guest_count, guest_count_max, venue_name, address_line, venue_notes, budget_mode, budget_total_minor, budget_per_person_minor, budget_min_minor, budget_max_minor, dietary_notes, requirements, contact_name, contact_phone, contact_email, preferred_channel, source, assigned_to, quote_deadline, created_at, submitted_at, customer_profile_id, organization_id, city_id, area_id, event_type_id, event_types(name), cities(name), areas(name), organizations(id, name), profiles!service_requests_customer_profile_id_fkey(full_name, email, phone)',
        )
        .eq('id', requestId)
        .maybeSingle(),
      supabase
        .from('request_services')
        .select('category_id, notes, budget_minor, is_primary, service_categories(id, name, kind)')
        .eq('request_id', requestId),
      supabase
        .from('request_cuisines')
        .select('cuisine_id, cuisines(name)')
        .eq('request_id', requestId),
      supabase
        .from('request_match_candidates')
        .select('id, partner_id, category_id, score, reasons, disqualified, disqualify_reason, breakdown, partner_profiles(id, display_name, slug, rating_avg, rating_count, completed_bookings, response_rate_bps, min_order_minor, max_guests, logo_url), service_categories(name)')
        .eq('request_id', requestId)
        .order('score', { ascending: false })
        .limit(40),
      supabase
        .from('request_partner_invites')
        .select('id, partner_id, category_id, status, invited_at, viewed_at, responded_at, respond_by, decline_reason, partner_profiles(display_name, slug), service_categories(name)')
        .eq('request_id', requestId),
      supabase
        .from('quotes')
        .select('id, reference, partner_id, category_id, status, current_version, partner_profiles(display_name, slug, rating_avg, rating_count), service_categories(name)')
        .eq('request_id', requestId),
      supabase
        .from('proposals')
        .select('id, reference, status, version_no, total_minor, partner_gross_minor, service_fee_minor, coordination_fee_minor, discount_minor, tax_minor, deposit_bps, valid_until, sent_at, accepted_at, created_at')
        .eq('request_id', requestId)
        .order('version_no', { ascending: false }),
      supabase
        .from('internal_notes')
        .select('id, body, is_pinned, created_at, profiles(full_name)')
        .eq('entity', 'service_request')
        .eq('entity_id', requestId)
        .order('created_at', { ascending: false }),
      supabase
        .from('request_status_history')
        .select('id, from_status, to_status, note, created_at, profiles(full_name)')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false }),
    ]);

  if (!request.data) return null;

  // Attach each quote's current version totals for side-by-side comparison.
  const quoteIds = (quotes.data ?? []).map((q) => q.id);
  const { data: versions } = quoteIds.length
    ? await supabase
        .from('quote_versions')
        .select('id, quote_id, version_no, subtotal_minor, discount_minor, tax_minor, total_minor, per_person_minor, guest_count, notes, payment_terms, cancellation_policy, valid_until, submitted_at, status, quote_items(id, charge_kind, label, unit, quantity, unit_price_minor, line_total_minor, is_optional)')
        .in('quote_id', quoteIds)
        .order('version_no', { ascending: false })
    : { data: [] };

  const currentVersionByQuote = new Map<string, NonNullable<typeof versions>[number]>();
  for (const version of versions ?? []) {
    if (!currentVersionByQuote.has(version.quote_id)) currentVersionByQuote.set(version.quote_id, version);
  }

  return {
    request: request.data,
    services: services.data ?? [],
    cuisines: cuisines.data ?? [],
    candidates: candidates.data ?? [],
    invites: invites.data ?? [],
    quotes: (quotes.data ?? []).map((q) => ({ ...q, current: currentVersionByQuote.get(q.id) ?? null })),
    proposals: proposals.data ?? [],
    notes: notes.data ?? [],
    history: history.data ?? [],
  };
}

export async function listAdminPartners(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('partner_profiles')
    .select(
      'id, slug, display_name, verification_status, published_at, rating_avg, rating_count, completed_bookings, response_rate_bps, min_order_minor, max_guests, is_accepting_orders, commission_bps, created_at, organizations!inner(name, city, phone, email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('verification_status', params.status as never);
  if (params.q) query = query.ilike('display_name', `%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

export async function getAdminPartner(partnerId: string) {
  const supabase = await createServerSupabase();

  const [profile, documents, categories, areas, verification, bookings, payouts, notes] =
    await Promise.all([
      supabase
        .from('partner_profiles')
        .select('*, organizations(id, name, legal_name, slug, phone, email, address_line, area, city, trade_license, tin, bin_vat)')
        .eq('id', partnerId)
        .maybeSingle(),
      supabase
        .from('partner_documents')
        .select('id, kind, title, storage_path, mime_type, size_bytes, expires_on, is_verified, reviewed_at, review_notes, created_at')
        .eq('partner_id', partnerId),
      supabase
        .from('partner_categories')
        .select('category_id, is_primary, price_from_minor, price_to_minor, service_categories(name, kind)')
        .eq('partner_id', partnerId),
      supabase
        .from('partner_service_areas')
        .select('id, delivery_fee_minor, cities(name), areas(name)')
        .eq('partner_id', partnerId),
      supabase
        .from('partner_verification_events')
        .select('id, from_status, to_status, notes, created_at, profiles(full_name)')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, reference, status, service_date, gross_minor, partner_payable_minor, events(title)')
        .eq('partner_id', partnerId)
        .order('service_date', { ascending: false })
        .limit(20),
      supabase
        .from('payouts')
        .select('id, reference, status, net_minor, paid_at, created_at')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('internal_notes')
        .select('id, body, created_at, profiles(full_name)')
        .eq('entity', 'partner')
        .eq('entity_id', partnerId)
        .order('created_at', { ascending: false }),
    ]);

  if (!profile.data) return null;
  return {
    profile: profile.data,
    documents: documents.data ?? [],
    categories: categories.data ?? [],
    serviceAreas: areas.data ?? [],
    verification: verification.data ?? [],
    bookings: bookings.data ?? [],
    payouts: payouts.data ?? [],
    notes: notes.data ?? [],
  };
}

export async function listAdminPayouts(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('payouts')
    .select(
      'id, reference, status, gross_minor, commission_minor, adjustment_minor, net_minor, method, period_start, period_end, approved_at, paid_at, created_at, provider_ref, partner_profiles!inner(id, display_name, slug)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

/** Delivered bookings with no payout row yet, grouped by partner. */
export async function getPayoutCandidates() {
  const admin = createAdminSupabase();

  const [{ data: bookings }, { data: paid }] = await Promise.all([
    admin
      .from('bookings')
      .select('id, reference, partner_id, service_date, gross_minor, commission_minor, partner_payable_minor, events(title, reference), partner_profiles(display_name)')
      .in('status', ['completed', 'closed'])
      .order('service_date', { ascending: true }),
    admin.from('payout_items').select('booking_id').not('booking_id', 'is', null),
  ]);

  const settled = new Set((paid ?? []).map((p) => p.booking_id));
  const pending = (bookings ?? []).filter((b) => !settled.has(b.id));

  const grouped = new Map<string, {
    partnerId: string; partnerName: string;
    bookings: typeof pending; grossMinor: number; commissionMinor: number; netMinor: number;
  }>();

  for (const booking of pending) {
    const name = (booking.partner_profiles as unknown as { display_name: string } | null)?.display_name ?? 'Partner';
    const entry = grouped.get(booking.partner_id) ?? {
      partnerId: booking.partner_id, partnerName: name,
      bookings: [], grossMinor: 0, commissionMinor: 0, netMinor: 0,
    };
    entry.bookings.push(booking);
    entry.grossMinor += booking.gross_minor;
    entry.commissionMinor += booking.commission_minor;
    entry.netMinor += booking.partner_payable_minor;
    grouped.set(booking.partner_id, entry);
  }

  return [...grouped.values()].sort((a, b) => b.netMinor - a.netMinor);
}

export async function listAdminPayments(params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('payments')
    .select(
      'id, reference, status, purpose, amount_minor, refunded_minor, gateway_fee_minor, provider, provider_ref, method, paid_at, created_at, events(id, title, reference), profiles(full_name, email)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.ilike('reference', `%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}
