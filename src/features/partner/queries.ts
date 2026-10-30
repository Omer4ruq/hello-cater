import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { SessionUser } from '@/features/auth/session';
import { paginationRange, type ListParams } from '@/features/customer/queries';

/**
 * Partner back-office reads.
 *
 * All queries use the RLS-enforced client and are additionally scoped by
 * partner id, so a partner can never see another partner's pipeline even
 * if a policy were mis-specified.
 */

export function activePartner(user: SessionUser): { partnerId: string; organizationId: string; name: string; role: string } {
  const membership = user.partnerOrgs.find((m) => m.partnerId);
  if (!membership?.partnerId) notFound();
  return {
    partnerId: membership.partnerId,
    organizationId: membership.organizationId,
    name: membership.organizationName,
    role: membership.role,
  };
}

export async function getPartnerProfile(partnerId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('partner_profiles')
    .select(
      'id, slug, display_name, tagline, about, business_type, year_established, logo_url, cover_image_url, verification_status, verified_at, rejection_reason, min_order_minor, min_guests, max_guests, lead_time_hours, daily_event_capacity, rating_avg, rating_count, completed_bookings, response_rate_bps, avg_response_minutes, cancellation_policy, payment_terms, is_accepting_orders, is_featured, published_at, commission_bps, organization_id',
    )
    .eq('id', partnerId)
    .maybeSingle();
  return data;
}

export async function getPartnerDashboard(partnerId: string) {
  const supabase = await createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [invites, quotes, bookingsToday, upcoming, monthly, earnings, unreadThreads, reviews] =
    await Promise.all([
      supabase
        .from('request_partner_invites')
        .select('id, status, invited_at, respond_by, request_id, service_requests(reference, event_date, guest_count, event_types(name), cities(name))', { count: 'exact' })
        .eq('partner_id', partnerId)
        .in('status', ['invited', 'viewed'])
        .order('invited_at', { ascending: false })
        .limit(5),
      supabase
        .from('quotes')
        .select('id, reference, status, updated_at, request_id', { count: 'exact' })
        .eq('partner_id', partnerId)
        .in('status', ['draft', 'changes_requested'])
        .limit(5),
      supabase
        .from('bookings')
        .select('id, reference, status, service_time, headcount, delivery_window, events(title, venue_name)')
        .eq('partner_id', partnerId)
        .eq('service_date', today)
        .in('status', ['confirmed', 'in_preparation', 'ready', 'in_progress']),
      supabase
        .from('bookings')
        .select('id, reference, status, service_date, service_time, headcount, gross_minor, events(title, venue_name)')
        .eq('partner_id', partnerId)
        .gte('service_date', today)
        .in('status', ['pending_payment', 'partially_paid', 'confirmed', 'in_preparation', 'ready'])
        .order('service_date')
        .limit(6),
      supabase
        .from('bookings')
        .select('partner_payable_minor, status, service_date')
        .eq('partner_id', partnerId)
        .gte('service_date', monthStart),
      supabase
        .from('partner_earnings_summary')
        .select('completed_count, upcoming_count, lifetime_earned_minor, pending_payout_minor')
        .eq('partner_id', partnerId)
        .maybeSingle(),
      supabase
        .from('thread_participants')
        .select('thread_id, last_read_at, message_threads!inner(last_message_at)')
        .is('left_at', null),
      supabase
        .from('reviews')
        .select('id, rating, title, comment, created_at, status')
        .eq('partner_id', partnerId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

  const monthlyRevenue = (monthly.data ?? [])
    .filter((b) => ['completed', 'closed', 'in_progress', 'ready', 'confirmed', 'in_preparation'].includes(b.status))
    .reduce((sum, b) => sum + b.partner_payable_minor, 0);

  const unread = (unreadThreads.data ?? []).filter((t) => {
    const thread = t.message_threads as unknown as { last_message_at: string | null } | null;
    if (!thread?.last_message_at) return false;
    return !t.last_read_at || new Date(thread.last_message_at) > new Date(t.last_read_at);
  }).length;

  return {
    newInvites: invites.data ?? [],
    newInviteCount: invites.count ?? 0,
    pendingQuotes: quotes.data ?? [],
    pendingQuoteCount: quotes.count ?? 0,
    todayJobs: bookingsToday.data ?? [],
    upcomingBookings: upcoming.data ?? [],
    monthlyRevenueMinor: monthlyRevenue,
    lifetimeEarnedMinor: earnings.data?.lifetime_earned_minor ?? 0,
    pendingPayoutMinor: earnings.data?.pending_payout_minor ?? 0,
    completedCount: earnings.data?.completed_count ?? 0,
    unreadMessages: unread,
    recentReviews: reviews.data ?? [],
  };
}

export async function listPartnerInvites(partnerId: string, params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('request_partner_invites')
    .select(
      'id, status, message, invited_at, viewed_at, responded_at, respond_by, request_id, service_categories(name), service_requests!inner(reference, title, event_date, guest_count, guest_count_max, budget_mode, budget_total_minor, budget_per_person_minor, venue_name, event_types(name), cities(name), areas(name))',
      { count: 'exact' },
    )
    .eq('partner_id', partnerId)
    .order('invited_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

/** Full brief for one invitation, plus any quote the partner has started. */
export async function getPartnerInvite(partnerId: string, inviteId: string) {
  const supabase = await createServerSupabase();

  const { data: invite } = await supabase
    .from('request_partner_invites')
    .select(
      'id, status, message, invited_at, viewed_at, responded_at, respond_by, decline_reason, request_id, category_id, service_categories(id, name, kind)',
    )
    .eq('id', inviteId)
    .eq('partner_id', partnerId)
    .maybeSingle();

  if (!invite) return null;

  const [request, services, cuisines, quote] = await Promise.all([
    supabase
      .from('service_requests')
      .select(
        'id, reference, title, status, event_date, event_end_date, start_time, end_time, is_date_flexible, guest_count, guest_count_max, venue_name, venue_notes, budget_mode, budget_total_minor, budget_per_person_minor, budget_min_minor, budget_max_minor, dietary_notes, requirements, event_types(name), cities(name), areas(name)',
      )
      .eq('id', invite.request_id)
      .maybeSingle(),
    supabase
      .from('request_services')
      .select('category_id, notes, service_categories(name, kind)')
      .eq('request_id', invite.request_id),
    supabase
      .from('request_cuisines')
      .select('cuisine_id, cuisines(name)')
      .eq('request_id', invite.request_id),
    supabase
      .from('quotes')
      .select('id, reference, status, current_version')
      .eq('request_id', invite.request_id)
      .eq('partner_id', partnerId)
      .maybeSingle(),
  ]);

  return {
    invite,
    request: request.data,
    services: services.data ?? [],
    cuisines: cuisines.data ?? [],
    quote: quote.data,
  };
}

export async function listPartnerQuotes(partnerId: string, params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('quotes')
    .select(
      'id, reference, status, current_version, created_at, updated_at, request_id, service_categories(name), service_requests(reference, title, event_date, guest_count, event_types(name))',
      { count: 'exact' },
    )
    .eq('partner_id', partnerId)
    .order('updated_at', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.q) query = query.ilike('reference', `%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  // Attach the current version's total so the list is useful at a glance.
  const quoteIds = (data ?? []).map((q) => q.id);
  const { data: versions } = quoteIds.length
    ? await supabase
        .from('quote_versions')
        .select('quote_id, version_no, total_minor, valid_until')
        .in('quote_id', quoteIds)
    : { data: [] };

  const latestByQuote = new Map<string, { total_minor: number; valid_until: string | null; version_no: number }>();
  for (const version of versions ?? []) {
    const current = latestByQuote.get(version.quote_id);
    if (!current || version.version_no > current.version_no) {
      latestByQuote.set(version.quote_id, version);
    }
  }

  return {
    rows: (data ?? []).map((q) => ({ ...q, latest: latestByQuote.get(q.id) ?? null })),
    total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function listPartnerBookings(partnerId: string, params: ListParams) {
  const supabase = await createServerSupabase();
  const { start, end, page, pageSize } = paginationRange(params);

  let query = supabase
    .from('bookings')
    .select(
      'id, reference, status, service_date, service_time, delivery_window, headcount, gross_minor, commission_minor, partner_payable_minor, fulfilment_notes, service_categories(name), events(id, title, reference, venue_name, address_line, event_date, guest_count)',
      { count: 'exact' },
    )
    .eq('partner_id', partnerId)
    .order('service_date', { ascending: false })
    .range(start, end);

  if (params.status) query = query.eq('status', params.status as never);
  if (params.from) query = query.gte('service_date', params.from);
  if (params.to) query = query.lte('service_date', params.to);
  if (params.q) query = query.ilike('reference', `%${params.q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize, pageCount: Math.ceil((count ?? 0) / pageSize) };
}

/** Calendar data: confirmed load plus explicit blackout dates. */
export async function getPartnerCalendar(partnerId: string, from: string, to: string) {
  const supabase = await createServerSupabase();
  const [bookings, availability, capacity] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, reference, status, service_date, service_time, headcount, events(title)')
      .eq('partner_id', partnerId)
      .gte('service_date', from)
      .lte('service_date', to)
      .not('status', 'in', '(cancelled,refunded)'),
    supabase
      .from('partner_availability')
      .select('id, on_date, is_blocked, capacity_override, note')
      .eq('partner_id', partnerId)
      .gte('on_date', from)
      .lte('on_date', to),
    supabase.from('partner_profiles').select('daily_event_capacity').eq('id', partnerId).maybeSingle(),
  ]);

  return {
    bookings: bookings.data ?? [],
    availability: availability.data ?? [],
    dailyCapacity: capacity.data?.daily_event_capacity ?? 1,
  };
}

export async function getPartnerEarnings(partnerId: string) {
  const supabase = await createServerSupabase();

  const [summary, payouts, unpaid] = await Promise.all([
    supabase
      .from('partner_earnings_summary')
      .select('completed_count, upcoming_count, lifetime_earned_minor, pending_payout_minor')
      .eq('partner_id', partnerId)
      .maybeSingle(),
    supabase
      .from('payouts')
      .select('id, reference, status, gross_minor, commission_minor, adjustment_minor, net_minor, method, period_start, period_end, paid_at, created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('bookings')
      .select('id, reference, service_date, gross_minor, commission_minor, partner_payable_minor, events(title)')
      .eq('partner_id', partnerId)
      .in('status', ['completed', 'closed'])
      .order('service_date', { ascending: false })
      .limit(100),
  ]);

  const paidBookingIds = new Set<string>();
  const { data: payoutItems } = await supabase
    .from('payout_items')
    .select('booking_id')
    .not('booking_id', 'is', null);
  for (const item of payoutItems ?? []) if (item.booking_id) paidBookingIds.add(item.booking_id);

  return {
    summary: summary.data,
    payouts: payouts.data ?? [],
    awaitingPayout: (unpaid.data ?? []).filter((b) => !paidBookingIds.has(b.id)),
  };
}

export async function getPartnerCatalog(partnerId: string) {
  const supabase = await createServerSupabase();
  const [packages, menus, categories, areas, cuisines, portfolio] = await Promise.all([
    supabase
      .from('partner_packages')
      .select('id, slug, name, description, hero_image_url, base_price_minor, per_person_price_minor, min_guests, max_guests, is_active, is_featured, sort_order, category_id, service_categories(name), package_items(id, label, detail, is_optional, addon_price_minor, sort_order)')
      .eq('partner_id', partnerId)
      .order('sort_order'),
    supabase
      .from('menus')
      .select('id, name, description, is_active, sort_order, cuisine_id, cuisines(name), menu_items(id, name, description, unit, price_minor, is_vegetarian, is_active, sort_order)')
      .eq('partner_id', partnerId)
      .order('sort_order'),
    supabase
      .from('partner_categories')
      .select('category_id, is_primary, price_from_minor, price_to_minor, service_categories(id, name, kind)')
      .eq('partner_id', partnerId),
    supabase
      .from('partner_service_areas')
      .select('id, city_id, area_id, delivery_fee_minor, min_order_minor, cities(name), areas(name)')
      .eq('partner_id', partnerId),
    supabase
      .from('partner_cuisines')
      .select('cuisine_id, cuisines(id, name)')
      .eq('partner_id', partnerId),
    supabase
      .from('partner_portfolio')
      .select('id, title, caption, image_url, guest_count, taken_on, is_public, sort_order')
      .eq('partner_id', partnerId)
      .order('sort_order'),
  ]);

  return {
    packages: packages.data ?? [],
    menus: menus.data ?? [],
    categories: categories.data ?? [],
    serviceAreas: areas.data ?? [],
    cuisines: cuisines.data ?? [],
    portfolio: portfolio.data ?? [],
  };
}

/** A partner's own customer history — a focused CRM, not a full one. */
export async function getPartnerCustomers(partnerId: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('bookings')
    .select('id, status, service_date, gross_minor, events!inner(id, title, customer_profile_id, organization_id, guest_count, organizations(name))')
    .eq('partner_id', partnerId)
    .order('service_date', { ascending: false })
    .limit(300);

  type Row = {
    id: string; status: string; service_date: string; gross_minor: number;
    events: { id: string; title: string; customer_profile_id: string; organization_id: string | null; guest_count: number | null; organizations: { name: string } | null };
  };

  const grouped = new Map<string, {
    key: string; name: string; isCompany: boolean;
    bookings: number; completed: number; totalMinor: number;
    lastDate: string; events: { id: string; title: string; date: string; status: string }[];
  }>();

  for (const row of (data ?? []) as unknown as Row[]) {
    const key = row.events.organization_id ?? row.events.customer_profile_id;
    const name = row.events.organizations?.name ?? 'Individual customer';
    const entry = grouped.get(key) ?? {
      key, name, isCompany: Boolean(row.events.organization_id),
      bookings: 0, completed: 0, totalMinor: 0, lastDate: row.service_date, events: [],
    };
    entry.bookings += 1;
    if (['completed', 'closed'].includes(row.status)) entry.completed += 1;
    entry.totalMinor += row.gross_minor;
    if (row.service_date > entry.lastDate) entry.lastDate = row.service_date;
    entry.events.push({ id: row.events.id, title: row.events.title, date: row.service_date, status: row.status });
    grouped.set(key, entry);
  }

  return [...grouped.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}
