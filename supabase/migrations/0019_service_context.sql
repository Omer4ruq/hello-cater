-- =====================================================================
-- Evently BD — 0019 Distinguish trusted server context from a user session
--
-- PROBLEM FOUND BY TESTS
-- Several guards asked `app.is_platform_staff()` to decide whether a
-- privileged change was allowed. That function reads auth.uid(), which
-- is NULL when our own server code runs with the service role. So the
-- guards rejected the platform's own writes:
--
--   * app.guard_partner_booking_scope  → admin could not adjust booking
--     commercial terms through a server action
--   * app.accept_proposal              → could not be invoked server-side
--
-- Testing "auth.uid() is null" instead would be wrong: an anonymous
-- visitor also has no subject, so that would hand `anon` the same
-- privileges if a GRANT were ever loosened.
--
-- The correct discriminator is the database role PostgREST switched to.
-- Supabase issues `SET LOCAL ROLE service_role` for service-key requests
-- and `authenticated`/`anon` otherwise, and `anon` is never a member of
-- service_role.
-- =====================================================================

-- IMPLEMENTATION NOTE
-- This reads ONLY request-scoped JWT claims, never `current_user`.
-- These guards are called from SECURITY DEFINER triggers, and inside a
-- definer function `current_user` is the function owner — so any
-- role-based check there would return true for every caller. The JWT
-- claim is set per request by PostgREST and survives definer context.
--
--   service-key request  → claim role = 'service_role' → true
--   signed-in user       → claim role = 'authenticated' → false
--   anonymous visitor    → claim role = 'anon'          → false
--   psql / migrations    → no claim at all              → true
create or replace function app.is_service_context()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'no_jwt')
         in ('service_role', 'no_jwt');
$$;

comment on function app.is_service_context() is
  'True when the statement runs in a trusted server context (service role, or a direct database connection such as a migration), which has already performed its own authorisation check. Never true for anon or authenticated sessions.';

grant execute on function app.is_service_context() to authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Partner platform fields: allow the trusted server context through.
-- ---------------------------------------------------------------------
create or replace function app.guard_partner_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app.is_service_context()
     or app.is_platform_staff()
     or coalesce(current_setting('app.internal', true), 'off') = 'on' then
    return new;
  end if;

  if (new.verification_status, new.verified_at, new.verified_by, new.published_at,
      new.commission_bps, new.rejection_reason, new.is_featured,
      new.rating_avg, new.rating_count, new.completed_bookings,
      new.response_rate_bps, new.organization_id, new.slug)
     is distinct from
     (old.verification_status, old.verified_at, old.verified_by, old.published_at,
      old.commission_bps, old.rejection_reason, old.is_featured,
      old.rating_avg, old.rating_count, old.completed_bookings,
      old.response_rate_bps, old.organization_id, old.slug) then
    raise exception
      'Verification, publication, commission and reputation are set by the platform, not the partner'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Booking commercial terms: same fix.
-- ---------------------------------------------------------------------
create or replace function app.guard_partner_booking_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app.is_service_context() or app.is_platform_staff() then
    return new;
  end if;

  if (new.gross_minor, new.commission_bps, new.commission_minor, new.adjustment_minor,
      new.partner_payable_minor, new.partner_id, new.event_id, new.service_date)
     is distinct from
     (old.gross_minor, old.commission_bps, old.commission_minor, old.adjustment_minor,
      old.partner_payable_minor, old.partner_id, old.event_id, old.service_date) then
    raise exception 'Only platform staff may change booking commercial terms'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- accept_proposal: allow trusted server invocation.
--
-- The public RPC wrapper still passes auth.uid(), so a signed-in
-- customer is authorised against their own request exactly as before.
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

  -- A signed-in user must own the underlying request. Platform staff and
  -- trusted server code (which has already authorised the caller) pass.
  if not (app.can_view_request(v_proposal.request_id)
          or app.is_platform_staff()
          or app.is_service_context()) then
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
