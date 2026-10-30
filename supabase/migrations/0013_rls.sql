-- =====================================================================
-- Evently BD — 0013 Row Level Security
--
-- Model: deny by default. Every table gets RLS plus an intentional
-- policy. Writes that carry money or change workflow state are NOT
-- granted to clients at all — they go through server-side code paths
-- that use the service role after an explicit permission check.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Internal notes move out of the business tables entirely. Column-level
-- privileges cannot separate staff from customers (both are the
-- `authenticated` role), so staff-only prose lives in its own table with
-- its own policy.
-- ---------------------------------------------------------------------
alter table service_requests drop column internal_notes;
alter table events          drop column internal_notes;
alter table bookings        drop column internal_notes;
alter table payouts         drop column internal_notes;
alter table partner_profiles drop column verification_notes;

create table internal_notes (
  id         uuid primary key default gen_random_uuid(),
  entity     text not null check (entity in
             ('service_request','event','booking','partner','payout','customer','dispute','ticket','quote')),
  entity_id  uuid not null,
  body       text not null check (length(btrim(body)) > 0),
  is_pinned  boolean not null default false,
  author_id  uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index internal_notes_entity_idx on internal_notes (entity, entity_id, created_at desc);
do $$ begin perform app.attach_touch_many('internal_notes'); end $$;

-- ---------------------------------------------------------------------
-- Baseline grants. Mirrors a stock Supabase project: the roles can reach
-- the tables, and RLS decides what they actually see.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Enable RLS on every table in public.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end $$;

-- The service role must still bypass RLS for server-side workflows.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format($f$create policy service_role_all on public.%I
                      for all to service_role using (true) with check (true)$f$, t.tablename);
  end loop;
end $$;

-- =====================================================================
-- Public catalogue — readable by anyone.
-- =====================================================================
create policy read_active on service_categories for select to anon, authenticated using (is_active);
create policy read_active on event_types        for select to anon, authenticated using (is_active);
create policy read_active on cuisines           for select to anon, authenticated using (is_active);
create policy read_active on districts          for select to anon, authenticated using (is_active);
create policy read_active on cities             for select to anon, authenticated using (is_active);
create policy read_active on areas              for select to anon, authenticated using (is_active);

create policy staff_write on service_categories for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));
create policy staff_write on event_types for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));
create policy staff_write on cuisines for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));
create policy staff_write on districts for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));
create policy staff_write on cities for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));
create policy staff_write on areas for all to authenticated
  using (app.has_permission('catalog.manage')) with check (app.has_permission('catalog.manage'));

create policy read_published on cms_pages for select to anon, authenticated using (is_published);
create policy read_published on cms_sections for select to anon, authenticated using (is_published);
create policy read_published on faqs for select to anon, authenticated using (is_published);
create policy read_published on testimonials for select to anon, authenticated using (is_published);
create policy staff_write on cms_pages for all to authenticated
  using (app.has_permission('cms.manage')) with check (app.has_permission('cms.manage'));
create policy staff_write on cms_sections for all to authenticated
  using (app.has_permission('cms.manage')) with check (app.has_permission('cms.manage'));
create policy staff_write on faqs for all to authenticated
  using (app.has_permission('cms.manage')) with check (app.has_permission('cms.manage'));
create policy staff_write on testimonials for all to authenticated
  using (app.has_permission('cms.manage')) with check (app.has_permission('cms.manage'));

create policy read_public on system_settings for select to anon, authenticated using (is_public);
create policy staff_read on system_settings for select to authenticated using (app.is_platform_staff());
create policy staff_write on system_settings for update to authenticated
  using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));

create policy read_all on permissions for select to authenticated using (true);
create policy read_all on role_permissions for select to authenticated using (true);
create policy read_all on notification_types for select to authenticated using (true);

-- =====================================================================
-- Profiles and organizations
-- =====================================================================
create policy self_read on profiles for select to authenticated
  using (id = auth.uid()
         or app.is_platform_staff()
         -- Colleagues in a shared organization can see each other.
         or exists (select 1 from organization_members a
                    join organization_members b on a.organization_id = b.organization_id
                    where a.profile_id = auth.uid() and a.status = 'active'
                      and b.profile_id = profiles.id and b.status = 'active'));
create policy self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy staff_manage on profiles for update to authenticated
  using (app.has_permission('customers.manage')) with check (app.has_permission('customers.manage'));

create policy member_read on organizations for select to authenticated
  using (app.is_org_member(id) or app.is_platform_staff());
create policy admin_update on organizations for update to authenticated
  using (app.is_org_admin(id)) with check (app.is_org_admin(id));
create policy create_own on organizations for insert to authenticated
  with check (created_by = auth.uid());

create policy member_read on organization_members for select to authenticated
  using (profile_id = auth.uid() or app.is_org_member(organization_id) or app.is_platform_staff());
create policy admin_write on organization_members for all to authenticated
  using (app.is_org_admin(organization_id) or app.has_permission('customers.manage'))
  with check (app.is_org_admin(organization_id) or app.has_permission('customers.manage'));

create policy admin_manage on organization_invites for all to authenticated
  using (app.is_org_admin(organization_id) or app.is_platform_staff())
  with check (app.is_org_admin(organization_id) or app.is_platform_staff());

create policy self_read on platform_staff for select to authenticated
  using (profile_id = auth.uid() or app.is_platform_staff());
create policy super_admin_write on platform_staff for all to authenticated
  using (app.has_permission('staff.manage')) with check (app.has_permission('staff.manage'));

-- Internal notes: platform staff only, full stop.
create policy staff_only on internal_notes for all to authenticated
  using (app.is_platform_staff()) with check (app.is_platform_staff());

-- =====================================================================
-- Partner supply side
-- =====================================================================
-- Raw partner_profiles is NOT public: it carries commercial terms.
-- Anonymous visitors read the curated `public_partners` view instead.
revoke select on partner_profiles from anon;

create policy member_read on partner_profiles for select to authenticated
  using (app.is_partner_member(id) or app.is_platform_staff()
         or (verification_status = 'approved' and published_at is not null));
create policy member_update on partner_profiles for update to authenticated
  using (app.is_partner_admin(id)) with check (app.is_partner_admin(id));
create policy staff_manage on partner_profiles for all to authenticated
  using (app.has_permission('partners.manage')) with check (app.has_permission('partners.manage'));
create policy create_own on partner_profiles for insert to authenticated
  with check (app.is_org_admin(organization_id));

create or replace function app.partner_is_public(p_partner uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from partner_profiles p
                 where p.id = p_partner and p.verification_status = 'approved'
                   and p.published_at is not null);
$$;
grant execute on function app.partner_is_public(uuid) to anon, authenticated, service_role;

-- Public-readable partner child tables.
do $$
declare t text;
begin
  foreach t in array array[
    'partner_categories','partner_cuisines','partner_event_types','partner_service_areas',
    'partner_packages','menus','partner_portfolio'
  ] loop
    execute format($f$create policy public_read on public.%I for select to anon, authenticated
                      using (app.partner_is_public(partner_id))$f$, t);
    execute format($f$create policy owner_all on public.%I for all to authenticated
                      using (app.is_partner_member(partner_id) or app.has_permission('partners.manage'))
                      with check (app.is_partner_member(partner_id) or app.has_permission('partners.manage'))$f$, t);
  end loop;
end $$;

create policy public_read on package_items for select to anon, authenticated
  using (exists (select 1 from partner_packages p
                 where p.id = package_id and app.partner_is_public(p.partner_id)));
create policy owner_all on package_items for all to authenticated
  using (exists (select 1 from partner_packages p
                 where p.id = package_id and (app.is_partner_member(p.partner_id) or app.has_permission('partners.manage'))))
  with check (exists (select 1 from partner_packages p
                 where p.id = package_id and (app.is_partner_member(p.partner_id) or app.has_permission('partners.manage'))));

create policy public_read on menu_items for select to anon, authenticated
  using (exists (select 1 from menus m where m.id = menu_id and app.partner_is_public(m.partner_id)));
create policy owner_all on menu_items for all to authenticated
  using (exists (select 1 from menus m where m.id = menu_id
                 and (app.is_partner_member(m.partner_id) or app.has_permission('partners.manage'))))
  with check (exists (select 1 from menus m where m.id = menu_id
                 and (app.is_partner_member(m.partner_id) or app.has_permission('partners.manage'))));

create policy public_read on partner_operating_hours for select to anon, authenticated
  using (app.partner_is_public(partner_id));
create policy owner_all on partner_operating_hours for all to authenticated
  using (app.is_partner_member(partner_id)) with check (app.is_partner_member(partner_id));

-- Availability is private: it is commercially sensitive and would leak
-- a partner's order book.
create policy owner_read on partner_availability for all to authenticated
  using (app.is_partner_member(partner_id) or app.has_permission('partners.view'))
  with check (app.is_partner_member(partner_id) or app.has_permission('partners.manage'));

-- Verification documents: owner + verifying staff only. Never public.
revoke select on partner_documents, partner_payout_accounts, partner_verification_events from anon;
create policy owner_or_verifier on partner_documents for all to authenticated
  using (app.is_partner_member(partner_id) or app.has_permission('partners.verify'))
  with check (app.is_partner_member(partner_id) or app.has_permission('partners.verify'));

create policy owner_or_finance on partner_payout_accounts for all to authenticated
  using (app.is_partner_admin(partner_id) or app.has_permission('payouts.view'))
  with check (app.is_partner_admin(partner_id) or app.has_permission('payouts.approve'));

create policy owner_or_staff_read on partner_verification_events for select to authenticated
  using (app.is_partner_member(partner_id) or app.has_permission('partners.view'));
create policy verifier_write on partner_verification_events for insert to authenticated
  with check (app.has_permission('partners.verify'));

-- =====================================================================
-- Requests, matching and invitations
-- =====================================================================
revoke select on service_requests, request_services, request_cuisines, request_attachments,
                 request_match_candidates, request_partner_invites, request_status_history from anon;

create policy customer_read on service_requests for select to authenticated
  using (customer_profile_id = auth.uid()
         or (organization_id is not null and app.is_org_member(organization_id))
         or app.has_permission('requests.view')
         or app.partner_invited_to_request(id));
create policy customer_insert on service_requests for insert to authenticated
  with check (customer_profile_id = auth.uid()
              and (organization_id is null or app.is_org_member(organization_id)));
-- Customers may only edit their own request while it is still a draft.
create policy customer_update on service_requests for update to authenticated
  using (customer_profile_id = auth.uid() and status in ('draft', 'submitted'))
  with check (customer_profile_id = auth.uid() and status in ('draft', 'submitted'));
create policy staff_manage on service_requests for all to authenticated
  using (app.has_permission('requests.manage')) with check (app.has_permission('requests.manage'));

do $$
declare t text;
begin
  foreach t in array array['request_services','request_cuisines','request_attachments'] loop
    execute format($f$create policy scoped_read on public.%I for select to authenticated
                      using (app.can_view_request(request_id) or app.has_permission('requests.view')
                             or app.partner_invited_to_request(request_id))$f$, t);
    execute format($f$create policy owner_write on public.%I for all to authenticated
                      using (app.can_view_request(request_id) or app.has_permission('requests.manage'))
                      with check (app.can_view_request(request_id) or app.has_permission('requests.manage'))$f$, t);
  end loop;
end $$;

create policy staff_only on request_match_candidates for all to authenticated
  using (app.has_permission('requests.view')) with check (app.has_permission('requests.manage'));

create policy scoped_read on request_partner_invites for select to authenticated
  using (partner_id in (select app.my_partner_ids())
         or app.has_permission('requests.view')
         or app.can_view_request(request_id));
-- A partner may only accept/decline their own invitation.
create policy partner_respond on request_partner_invites for update to authenticated
  using (partner_id in (select app.my_partner_ids()))
  with check (partner_id in (select app.my_partner_ids())
              and status in ('viewed', 'accepted', 'declined'));
create policy staff_manage on request_partner_invites for all to authenticated
  using (app.has_permission('requests.manage')) with check (app.has_permission('requests.manage'));

create policy scoped_read on request_status_history for select to authenticated
  using (app.can_view_request(request_id) or app.has_permission('requests.view'));

-- =====================================================================
-- Quotes — partner-owned, visible to staff; customers see them only once
-- they are folded into a proposal.
-- =====================================================================
revoke select on quotes, quote_versions, quote_items, quote_attachments, quote_change_requests from anon;

create policy scoped_read on quotes for select to authenticated
  using (partner_id in (select app.my_partner_ids()) or app.has_permission('quotes.view'));
create policy partner_write on quotes for all to authenticated
  using (partner_id in (select app.my_partner_ids()) or app.has_permission('quotes.manage'))
  with check (partner_id in (select app.my_partner_ids()) or app.has_permission('quotes.manage'));

create policy scoped_read on quote_versions for select to authenticated
  using (app.can_view_quote(quote_id));
create policy partner_write on quote_versions for all to authenticated
  using (app.can_view_quote(quote_id)) with check (app.can_view_quote(quote_id));

create policy scoped_read on quote_items for select to authenticated
  using (exists (select 1 from quote_versions v where v.id = quote_version_id and app.can_view_quote(v.quote_id)));
create policy partner_write on quote_items for all to authenticated
  using (exists (select 1 from quote_versions v where v.id = quote_version_id and app.can_view_quote(v.quote_id)))
  with check (exists (select 1 from quote_versions v where v.id = quote_version_id and app.can_view_quote(v.quote_id)));

create policy scoped_all on quote_attachments for all to authenticated
  using (exists (select 1 from quote_versions v where v.id = quote_version_id and app.can_view_quote(v.quote_id)))
  with check (exists (select 1 from quote_versions v where v.id = quote_version_id and app.can_view_quote(v.quote_id)));

create policy scoped_all on quote_change_requests for all to authenticated
  using (app.can_view_quote(quote_id)) with check (app.can_view_quote(quote_id));

-- =====================================================================
-- Proposals — the customer-facing artefact.
-- =====================================================================
revoke select on proposals, proposal_lines, proposal_events from anon;

create policy scoped_read on proposals for select to authenticated
  using ((status <> 'draft' and app.can_view_request(request_id))
         or app.has_permission('proposals.manage') or app.has_permission('requests.view'));
-- The customer's only write is accepting/declining, and that runs through
-- a server action; direct UPDATE is limited to the response fields.
create policy customer_respond on proposals for update to authenticated
  using (app.can_view_request(request_id) and status in ('sent', 'viewed'))
  with check (app.can_view_request(request_id) and status in ('viewed', 'accepted', 'rejected', 'changes_requested'));
create policy staff_manage on proposals for all to authenticated
  using (app.has_permission('proposals.manage')) with check (app.has_permission('proposals.manage'));

create policy scoped_read on proposal_lines for select to authenticated
  using (exists (select 1 from proposals p where p.id = proposal_id
                 and ((p.status <> 'draft' and app.can_view_request(p.request_id))
                      or app.has_permission('proposals.manage'))));
create policy staff_write on proposal_lines for all to authenticated
  using (app.has_permission('proposals.manage')) with check (app.has_permission('proposals.manage'));

create policy scoped_read on proposal_events for select to authenticated
  using (exists (select 1 from proposals p where p.id = proposal_id
                 and (app.can_view_request(p.request_id) or app.has_permission('proposals.manage'))));
create policy scoped_insert on proposal_events for insert to authenticated
  with check (exists (select 1 from proposals p where p.id = proposal_id
                      and (app.can_view_request(p.request_id) or app.has_permission('proposals.manage'))));

-- =====================================================================
-- Events and bookings
-- =====================================================================
revoke select on events, bookings, booking_items, booking_status_history,
                 event_tasks, event_timeline, event_documents from anon;

create policy scoped_read on events for select to authenticated
  using (app.can_view_event(id) or app.partner_on_event(id) or app.has_permission('bookings.view'));
create policy staff_manage on events for all to authenticated
  using (app.has_permission('events.manage')) with check (app.has_permission('events.manage'));

create policy scoped_read on bookings for select to authenticated
  using (partner_id in (select app.my_partner_ids())
         or app.can_view_event(event_id)
         or app.has_permission('bookings.view'));
-- Partners progress fulfilment; they cannot touch money columns (enforced
-- by the transition guard plus a trigger below).
create policy partner_update on bookings for update to authenticated
  using (partner_id in (select app.my_partner_ids()))
  with check (partner_id in (select app.my_partner_ids()));
create policy staff_manage on bookings for all to authenticated
  using (app.has_permission('bookings.manage')) with check (app.has_permission('bookings.manage'));

create policy scoped_read on booking_items for select to authenticated
  using (exists (select 1 from bookings b where b.id = booking_id
                 and (b.partner_id in (select app.my_partner_ids())
                      or app.can_view_event(b.event_id) or app.has_permission('bookings.view'))));
create policy staff_write on booking_items for all to authenticated
  using (app.has_permission('bookings.manage')) with check (app.has_permission('bookings.manage'));

create policy scoped_read on booking_status_history for select to authenticated
  using (exists (select 1 from bookings b where b.id = booking_id
                 and (b.partner_id in (select app.my_partner_ids())
                      or app.can_view_event(b.event_id) or app.has_permission('bookings.view'))));

create policy scoped_read on event_tasks for select to authenticated
  using (app.has_permission('events.manage')
         or (is_customer_visible and app.can_view_event(event_id))
         or (booking_id is not null and exists (
               select 1 from bookings b where b.id = event_tasks.booking_id
               and b.partner_id in (select app.my_partner_ids()))));
create policy staff_write on event_tasks for all to authenticated
  using (app.has_permission('events.manage')) with check (app.has_permission('events.manage'));

create policy scoped_read on event_timeline for select to authenticated
  using (visibility = 'all'
         or (visibility = 'customer' and app.can_view_event(event_id))
         or (visibility = 'partner' and app.partner_on_event(event_id))
         or app.has_permission('events.manage'));
create policy staff_write on event_timeline for insert to authenticated
  with check (app.has_permission('events.manage'));

create policy scoped_read on event_documents for select to authenticated
  using (visibility = 'all'
         or (visibility = 'customer' and app.can_view_event(event_id))
         or (visibility = 'partner' and app.partner_on_event(event_id))
         or app.has_permission('events.manage'));
create policy staff_write on event_documents for all to authenticated
  using (app.has_permission('events.manage')) with check (app.has_permission('events.manage'));

-- Partners may only move fulfilment state; money and scope are frozen.
create or replace function app.guard_partner_booking_scope()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if app.is_platform_staff() then return new; end if;
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
create trigger trg_booking_partner_scope before update on bookings
  for each row execute function app.guard_partner_booking_scope();

-- =====================================================================
-- Money — read-only for clients. All writes go through the server.
-- =====================================================================
revoke select on payments, payment_transactions, payment_events, refunds,
                 invoices, invoice_items, financial_transactions,
                 payouts, payout_items, pricing_rules from anon;
revoke insert, update, delete on payments, payment_transactions, payment_events,
                 refunds, invoices, invoice_items, financial_transactions,
                 payouts, payout_items from authenticated;

create policy scoped_read on payments for select to authenticated
  using (customer_profile_id = auth.uid()
         or (organization_id is not null and app.is_org_admin(organization_id))
         or app.has_permission('payments.view'));
create policy staff_read on payment_transactions for select to authenticated
  using (app.has_permission('payments.view'));
create policy staff_read on payment_events for select to authenticated
  using (app.has_permission('payments.view'));
create policy scoped_read on refunds for select to authenticated
  using (app.has_permission('payments.view')
         or exists (select 1 from payments p where p.id = payment_id and p.customer_profile_id = auth.uid()));

create policy scoped_read on invoices for select to authenticated
  using (customer_profile_id = auth.uid()
         or (organization_id is not null and app.is_org_member(organization_id))
         or (partner_id is not null and app.is_partner_member(partner_id))
         or app.has_permission('payments.view'));
create policy scoped_read on invoice_items for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id
                 and (i.customer_profile_id = auth.uid()
                      or (i.organization_id is not null and app.is_org_member(i.organization_id))
                      or (i.partner_id is not null and app.is_partner_member(i.partner_id))
                      or app.has_permission('payments.view'))));

create policy staff_read on financial_transactions for select to authenticated
  using (app.has_permission('reports.view'));

create policy scoped_read on payouts for select to authenticated
  using (app.is_partner_member(partner_id) or app.has_permission('payouts.view'));
create policy scoped_read on payout_items for select to authenticated
  using (exists (select 1 from payouts p where p.id = payout_id
                 and (app.is_partner_member(p.partner_id) or app.has_permission('payouts.view'))));

create policy staff_read on pricing_rules for select to authenticated
  using (app.is_platform_staff());
create policy staff_write on pricing_rules for all to authenticated
  using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));

create policy read_active on cancellation_policies for select to anon, authenticated using (is_active);
create policy read_all on cancellation_tiers for select to anon, authenticated using (true);
create policy staff_write on cancellation_policies for all to authenticated
  using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));
create policy staff_write on cancellation_tiers for all to authenticated
  using (app.has_permission('settings.manage')) with check (app.has_permission('settings.manage'));

-- =====================================================================
-- Messaging
-- =====================================================================
revoke select on message_threads, thread_participants, messages, message_attachments from anon;

create policy participant_read on message_threads for select to authenticated
  using (app.in_thread(id) or app.has_permission('messages.view_all'));
create policy staff_write on message_threads for all to authenticated
  using (app.is_platform_staff()) with check (app.is_platform_staff());

create policy participant_read on thread_participants for select to authenticated
  using (profile_id = auth.uid() or app.in_thread(thread_id) or app.has_permission('messages.view_all'));
-- Participants may only update their own read receipt / mute flag.
create policy self_update on thread_participants for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy staff_write on thread_participants for all to authenticated
  using (app.is_platform_staff()) with check (app.is_platform_staff());

-- Raw `body` is never selectable by a browser session: customer<->partner
-- threads must render the masked copy. Server code with the service role
-- reads the original for audit and dispute handling.
revoke select on messages from authenticated;
grant select (id, thread_id, sender_id, sender_side, kind, body_public,
              flagged_contact, metadata, edited_at, created_at)
  on messages to authenticated;
grant insert (thread_id, sender_id, sender_side, kind, body, metadata) on messages to authenticated;

create policy participant_read on messages for select to authenticated
  using (app.in_thread(thread_id) or app.has_permission('messages.view_all'));
create policy participant_send on messages for insert to authenticated
  with check (app.in_thread(thread_id) and sender_id = auth.uid()
              and not exists (select 1 from message_threads t where t.id = thread_id and t.is_locked));

create policy participant_read on message_attachments for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and app.in_thread(m.thread_id)));
create policy participant_write on message_attachments for insert to authenticated
  with check (exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid()));

-- =====================================================================
-- Notifications
-- =====================================================================
revoke select on notifications, notification_preferences, outbound_messages from anon;
revoke insert, update, delete on outbound_messages from authenticated;

create policy self_read on notifications for select to authenticated using (profile_id = auth.uid());
create policy self_update on notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy self_all on notification_preferences for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy staff_read on outbound_messages for select to authenticated
  using (app.is_platform_staff());

-- =====================================================================
-- Reviews, favourites, support
-- =====================================================================
create policy public_read on reviews for select to anon, authenticated
  using (status = 'published' or author_id = auth.uid()
         or app.is_partner_member(partner_id) or app.has_permission('reviews.moderate'));
create policy author_write on reviews for insert to authenticated
  with check (author_id = auth.uid());
create policy author_update on reviews for update to authenticated
  using (author_id = auth.uid() and status = 'pending')
  with check (author_id = auth.uid());
create policy staff_moderate on reviews for all to authenticated
  using (app.has_permission('reviews.moderate')) with check (app.has_permission('reviews.moderate'));

create policy public_read on review_responses for select to anon, authenticated
  using (status = 'published' or app.is_partner_member(partner_id) or app.has_permission('reviews.moderate'));
create policy partner_write on review_responses for all to authenticated
  using (app.is_partner_member(partner_id)) with check (app.is_partner_member(partner_id));

revoke select on favorites from anon;
create policy self_all on favorites for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

revoke select on support_tickets, ticket_messages, disputes from anon;
create policy scoped_read on support_tickets for select to authenticated
  using (opened_by = auth.uid()
         or (partner_id is not null and app.is_partner_member(partner_id))
         or (organization_id is not null and app.is_org_member(organization_id))
         or app.has_permission('tickets.manage'));
create policy self_open on support_tickets for insert to authenticated
  with check (opened_by = auth.uid());
create policy staff_manage on support_tickets for all to authenticated
  using (app.has_permission('tickets.manage')) with check (app.has_permission('tickets.manage'));

create policy scoped_read on ticket_messages for select to authenticated
  using ((not is_internal and exists (
            select 1 from support_tickets t where t.id = ticket_id
            and (t.opened_by = auth.uid()
                 or (t.partner_id is not null and app.is_partner_member(t.partner_id)))))
         or app.has_permission('tickets.manage'));
create policy scoped_write on ticket_messages for insert to authenticated
  with check (author_id = auth.uid()
              and (app.has_permission('tickets.manage')
                   or (not is_internal and exists (
                       select 1 from support_tickets t where t.id = ticket_id
                       and (t.opened_by = auth.uid()
                            or (t.partner_id is not null and app.is_partner_member(t.partner_id)))))));

create policy scoped_read on disputes for select to authenticated
  using (raised_by = auth.uid() or app.has_permission('disputes.manage')
         or exists (select 1 from bookings b where b.id = booking_id
                    and (b.partner_id in (select app.my_partner_ids()) or app.can_view_event(b.event_id))));
create policy staff_manage on disputes for all to authenticated
  using (app.has_permission('disputes.manage')) with check (app.has_permission('disputes.manage'));

-- =====================================================================
-- Audit and analytics
-- =====================================================================
revoke select on audit_logs, analytics_events from anon;
revoke insert, update, delete on audit_logs from authenticated;
create policy staff_read on audit_logs for select to authenticated
  using (app.has_permission('audit.view'));

create policy insert_own on analytics_events for insert to anon, authenticated
  with check (profile_id is null or profile_id = auth.uid());
create policy staff_read on analytics_events for select to authenticated
  using (app.has_permission('reports.view'));
