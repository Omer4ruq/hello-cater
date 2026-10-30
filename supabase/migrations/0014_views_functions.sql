-- =====================================================================
-- Evently BD — 0014 Public projections and transactional domain functions
-- =====================================================================

-- anon needs INSERT on analytics_events for first-party page analytics.
grant insert on analytics_events to anon;
grant usage, select on all sequences in schema public to anon;

-- ---------------------------------------------------------------------
-- public_partners: the only partner projection anonymous visitors touch.
-- A definer's-rights view, so commercial and verification columns simply
-- do not exist from the browser's point of view.
-- ---------------------------------------------------------------------
create view public_partners
with (security_invoker = false) as
select
  p.id, p.slug, p.display_name, p.tagline, p.about, p.logo_url, p.cover_image_url,
  p.business_type, p.year_established, p.min_guests, p.max_guests,
  p.min_order_minor, p.lead_time_hours,
  p.rating_avg, p.rating_count, p.completed_bookings,
  p.is_featured, p.is_accepting_orders, p.cancellation_policy, p.payment_terms,
  p.seo_title, p.seo_description, p.published_at,
  o.name as organization_name, o.city, o.area
from partner_profiles p
join organizations o on o.id = p.organization_id
where p.verification_status = 'approved'
  and p.published_at is not null
  and o.is_active;

grant select on public_partners to anon, authenticated;

-- Searchable, denormalised partner index used by the marketplace listing.
create view partner_search_index
with (security_invoker = false) as
select
  p.id as partner_id,
  p.slug, p.display_name, p.tagline, p.logo_url, p.cover_image_url,
  p.rating_avg, p.rating_count, p.completed_bookings, p.is_featured,
  p.min_guests, p.max_guests, p.min_order_minor,
  coalesce(array_agg(distinct pc.category_id) filter (where pc.category_id is not null), '{}') as category_ids,
  coalesce(array_agg(distinct psa.city_id)    filter (where psa.city_id is not null), '{}')   as city_ids,
  coalesce(array_agg(distinct psa.area_id)    filter (where psa.area_id is not null), '{}')   as area_ids,
  coalesce(array_agg(distinct pcu.cuisine_id) filter (where pcu.cuisine_id is not null), '{}') as cuisine_ids,
  coalesce(array_agg(distinct pet.event_type_id) filter (where pet.event_type_id is not null), '{}') as event_type_ids,
  min(pc.price_from_minor) as price_from_minor
from partner_profiles p
left join partner_categories pc on pc.partner_id = p.id
left join partner_service_areas psa on psa.partner_id = p.id
left join partner_cuisines pcu on pcu.partner_id = p.id
left join partner_event_types pet on pet.partner_id = p.id
where p.verification_status = 'approved' and p.published_at is not null
group by p.id;

grant select on partner_search_index to anon, authenticated;

-- ---------------------------------------------------------------------
-- Accepting a master proposal. Runs as one transaction so a customer can
-- never end up with an accepted proposal and no bookings (or vice versa).
-- ---------------------------------------------------------------------
create or replace function app.accept_proposal(p_proposal uuid, p_actor uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor    uuid := coalesce(p_actor, auth.uid());
  v_proposal proposals%rowtype;
  v_request  service_requests%rowtype;
  v_event_id uuid;
  v_event_ref text;
  v_line     record;
  v_thread   uuid;
begin
  select * into v_proposal from proposals where id = p_proposal for update;
  if not found then
    raise exception 'Proposal not found' using errcode = 'no_data_found';
  end if;

  -- Authorisation: the accepting user must own the underlying request
  -- (directly or through their company), unless platform staff act for them.
  if not (app.can_view_request(v_proposal.request_id) or app.is_platform_staff()) then
    raise exception 'Not authorised to accept this proposal' using errcode = 'insufficient_privilege';
  end if;

  if v_proposal.status not in ('sent', 'viewed', 'changes_requested') then
    raise exception 'Proposal % cannot be accepted from status %', v_proposal.reference, v_proposal.status
      using errcode = 'check_violation';
  end if;
  if v_proposal.valid_until is not null
     and v_proposal.valid_until < (now() at time zone 'Asia/Dhaka')::date then
    raise exception 'Proposal % expired on %', v_proposal.reference, v_proposal.valid_until
      using errcode = 'check_violation';
  end if;

  select * into v_request from service_requests where id = v_proposal.request_id;

  v_event_ref := app.next_ref('EV', 'app.ref_booking_seq');

  insert into events (
    reference, request_id, proposal_id, customer_profile_id, organization_id,
    title, event_type_id, stage, event_date, event_end_date, start_time, end_time,
    guest_count, city_id, area_id, venue_name, address_line, venue_notes,
    total_minor, customer_notes)
  values (
    v_event_ref, v_request.id, v_proposal.id, v_request.customer_profile_id, v_request.organization_id,
    coalesce(nullif(v_proposal.title, ''), nullif(v_request.title, ''), 'Event ' || v_event_ref),
    v_request.event_type_id, 'confirmed', v_request.event_date, v_request.event_end_date,
    v_request.start_time, v_request.end_time, v_request.guest_count,
    v_request.city_id, v_request.area_id, v_request.venue_name, v_request.address_line,
    v_request.venue_notes, v_proposal.total_minor, v_request.requirements)
  returning id into v_event_id;

  -- One booking per partner line; platform-only lines (coordination fee,
  -- service charge) do not create a fulfilment record.
  for v_line in
    select * from proposal_lines
    where proposal_id = p_proposal and partner_id is not null and not is_platform_line
    order by sort_order
  loop
    insert into bookings (
      event_id, partner_id, category_id, quote_id, quote_version_id, proposal_line_id,
      status, gross_minor, commission_bps, commission_minor, partner_payable_minor,
      service_date, service_time, headcount, cancellation_policy_id)
    values (
      v_event_id, v_line.partner_id, v_line.category_id, v_line.quote_id, v_line.quote_version_id,
      v_line.id,
      case when v_proposal.deposit_minor > 0 then 'pending_payment'::booking_status
           else 'confirmed'::booking_status end,
      v_line.amount_minor, v_line.commission_bps, v_line.commission_minor,
      v_line.partner_payable_minor,
      v_request.event_date, v_request.start_time, v_request.guest_count,
      (select cancellation_policy_id from partner_profiles where id = v_line.partner_id));

    -- Accepted quote wins; sibling quotes for the same line are closed out.
    if v_line.quote_id is not null then
      update quotes set status = 'accepted' where id = v_line.quote_id;
    end if;
  end loop;

  update quotes q set status = 'rejected'
  where q.request_id = v_proposal.request_id
    and q.status in ('submitted', 'shared', 'under_review', 'changes_requested')
    and q.id not in (select quote_id from proposal_lines
                     where proposal_id = p_proposal and quote_id is not null);

  update proposals set status = 'accepted', accepted_at = now(), accepted_by = v_actor,
                       responded_at = now()
   where id = p_proposal;

  update proposals set status = 'cancelled'
   where request_id = v_proposal.request_id and id <> p_proposal
     and status in ('draft', 'sent', 'viewed', 'changes_requested');

  update service_requests set status = 'won', closed_at = now()
   where id = v_proposal.request_id;

  insert into proposal_events (proposal_id, kind, actor_id, note)
  values (p_proposal, 'accepted', v_actor, 'Proposal accepted by customer');

  insert into event_timeline (event_id, kind, title, detail, visibility, actor_id)
  values (v_event_id, 'proposal_accepted', 'Proposal accepted',
          'Event created from proposal ' || v_proposal.reference, 'all', v_actor);

  -- Give every confirmed event a customer<->platform thread straight away.
  insert into message_threads (kind, subject, event_id, request_id, organization_id, created_by, contact_sharing_allowed)
  values ('customer_platform', 'Event ' || v_event_ref, v_event_id, v_request.id,
          v_request.organization_id, v_actor, true)
  returning id into v_thread;

  insert into thread_participants (thread_id, profile_id, side)
  values (v_thread, v_request.customer_profile_id, 'customer')
  on conflict do nothing;

  return v_event_id;
end;
$$;

revoke all on function app.accept_proposal(uuid, uuid) from public;
grant execute on function app.accept_proposal(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Submitting a quote version: freezes it and advances the request.
-- ---------------------------------------------------------------------
create or replace function app.submit_quote_version(p_version uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_quote quotes%rowtype; v_items integer; v_total bigint;
begin
  select q.* into v_quote from quote_versions v join quotes q on q.id = v.quote_id
  where v.id = p_version;
  if not found then raise exception 'Quote version not found' using errcode = 'no_data_found'; end if;

  if not (app.is_partner_member(v_quote.partner_id) or app.is_platform_staff()) then
    raise exception 'Not authorised' using errcode = 'insufficient_privilege';
  end if;

  select count(*), max(total_minor) into v_items, v_total
  from quote_items i join quote_versions v on v.id = i.quote_version_id
  where i.quote_version_id = p_version group by v.total_minor;

  if coalesce(v_items, 0) = 0 then
    raise exception 'A quote needs at least one line item' using errcode = 'check_violation';
  end if;

  update quote_versions set status = 'submitted', submitted_at = now() where id = p_version;
  update quotes set status = 'submitted', current_version =
    (select version_no from quote_versions where id = p_version)
   where id = v_quote.id;

  update request_partner_invites set status = 'accepted', responded_at = coalesce(responded_at, now())
   where request_id = v_quote.request_id and partner_id = v_quote.partner_id
     and status in ('invited', 'viewed');

  update service_requests set status = 'quotes_received'
   where id = v_quote.request_id and status in ('partners_invited', 'matching', 'under_review', 'submitted');
end;
$$;
grant execute on function app.submit_quote_version(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Aggregates for dashboards. Views keep heavy SQL out of the app layer.
-- ---------------------------------------------------------------------
create view partner_earnings_summary
with (security_invoker = true) as
select
  b.partner_id,
  count(*) filter (where b.status in ('completed', 'closed'))                       as completed_count,
  count(*) filter (where b.status in ('confirmed', 'in_preparation', 'ready'))      as upcoming_count,
  coalesce(sum(b.partner_payable_minor) filter (where b.status in ('completed','closed')), 0) as lifetime_earned_minor,
  coalesce(sum(b.partner_payable_minor) filter (
    where b.status in ('completed','closed')
      and not exists (select 1 from payout_items pi where pi.booking_id = b.id)), 0) as pending_payout_minor
from bookings b
group by b.partner_id;

grant select on partner_earnings_summary to authenticated;

create view event_financials
with (security_invoker = true) as
select
  e.id as event_id,
  e.total_minor,
  coalesce(sum(p.amount_minor) filter (where p.status = 'paid'), 0) as collected_minor,
  coalesce(sum(p.refunded_minor), 0)                                as refunded_minor,
  e.total_minor - coalesce(sum(p.amount_minor) filter (where p.status = 'paid'), 0) as outstanding_minor
from events e
left join payments p on p.event_id = e.id
group by e.id, e.total_minor;

grant select on event_financials to authenticated;
