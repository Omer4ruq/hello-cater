-- =====================================================================
-- Evently BD — 0008 Events, bookings and the operations workspace
-- Accepting a proposal creates ONE event (the customer's commercial
-- agreement) and ONE booking per partner (the fulfilment record).
-- =====================================================================

create table events (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique,
  request_id        uuid references service_requests(id) on delete set null,
  proposal_id       uuid references proposals(id) on delete set null,

  customer_profile_id uuid not null references profiles(id) on delete restrict,
  organization_id   uuid references organizations(id) on delete set null,

  title             text not null,
  event_type_id     uuid references event_types(id) on delete set null,
  stage             event_stage not null default 'confirmed',
  event_date        date not null,
  event_end_date    date,
  start_time        time,
  end_time          time,
  guest_count       integer check (guest_count is null or guest_count > 0),

  city_id           uuid references cities(id) on delete set null,
  area_id           uuid references areas(id) on delete set null,
  venue_name        text,
  address_line      text,
  venue_notes       text,

  -- Commercial snapshot at acceptance.
  total_minor       bigint not null default 0 check (total_minor >= 0),
  paid_minor        bigint not null default 0 check (paid_minor >= 0),
  refunded_minor    bigint not null default 0 check (refunded_minor >= 0),

  event_manager_id  uuid references profiles(id) on delete set null,
  customer_notes    text,
  internal_notes    text,      -- staff only
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index events_customer_idx on events (customer_profile_id, event_date desc);
create index events_org_idx on events (organization_id, event_date desc);
create index events_stage_idx on events (stage, event_date);
create index events_manager_idx on events (event_manager_id) where stage not in ('completed','closed');
create index events_date_idx on events (event_date);

create table bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default app.next_ref('BK', 'app.ref_booking_seq'),
  event_id          uuid not null references events(id) on delete cascade,
  partner_id        uuid not null references partner_profiles(id) on delete restrict,
  category_id       uuid references service_categories(id) on delete set null,
  quote_id          uuid references quotes(id) on delete set null,
  quote_version_id  uuid references quote_versions(id) on delete set null,
  proposal_line_id  uuid references proposal_lines(id) on delete set null,

  status            booking_status not null default 'draft',

  -- Frozen commercial terms for this partner's share of the event.
  gross_minor           bigint not null default 0 check (gross_minor >= 0),
  commission_bps        integer not null default 0 check (commission_bps between 0 and 5000),
  commission_minor      bigint not null default 0 check (commission_minor >= 0),
  adjustment_minor      bigint not null default 0,
  partner_payable_minor bigint not null default 0,

  service_date      date not null,
  service_time      time,
  delivery_window   text,
  headcount         integer check (headcount is null or headcount > 0),
  fulfilment_notes  text,
  partner_notes     text,
  internal_notes    text,

  confirmed_at      timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz,
  cancelled_by      uuid references profiles(id) on delete set null,
  cancellation_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint booking_commission_le_gross check (commission_minor <= gross_minor),
  constraint booking_payable check (partner_payable_minor = gross_minor - commission_minor + adjustment_minor)
);
create index bookings_event_idx on bookings (event_id);
create index bookings_partner_idx on bookings (partner_id, status, service_date desc);
create index bookings_status_idx on bookings (status, service_date);
create index bookings_date_idx on bookings (service_date);

create table booking_items (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references bookings(id) on delete cascade,
  charge_kind      charge_kind not null default 'food',
  label            text not null,
  description      text,
  unit             text not null default 'per_person',
  quantity         numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_minor bigint not null default 0 check (unit_price_minor >= 0),
  line_total_minor bigint generated always as (round(quantity * unit_price_minor)::bigint) stored,
  sort_order       integer not null default 100,
  created_at       timestamptz not null default now()
);
create index booking_items_booking_idx on booking_items (booking_id, sort_order);

create table booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  from_status booking_status,
  to_status   booking_status not null,
  note        text,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index booking_status_history_idx on booking_status_history (booking_id, created_at desc);

create or replace function app.log_booking_status()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into booking_status_history (booking_id, from_status, to_status, actor_id)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_booking_status_history
  after insert or update of status on bookings
  for each row execute function app.log_booking_status();

-- Allowed booking transitions. Keeps the workflow honest regardless of
-- which surface (customer, partner, admin, webhook) issues the update.
create or replace function app.guard_booking_transition()
returns trigger
language plpgsql
as $$
declare
  allowed booking_status[];
begin
  if new.status is not distinct from old.status then return new; end if;

  allowed := case old.status
    when 'draft'           then array['pending_payment','confirmed','cancelled']::booking_status[]
    when 'pending_payment' then array['partially_paid','confirmed','cancelled','disputed']::booking_status[]
    when 'partially_paid'  then array['confirmed','cancelled','disputed','refunded']::booking_status[]
    when 'confirmed'       then array['in_preparation','cancelled','disputed','in_progress']::booking_status[]
    when 'in_preparation'  then array['ready','in_progress','cancelled','disputed']::booking_status[]
    when 'ready'           then array['in_progress','completed','cancelled','disputed']::booking_status[]
    when 'in_progress'     then array['completed','disputed']::booking_status[]
    when 'completed'       then array['closed','disputed']::booking_status[]
    when 'cancelled'       then array['refunded','closed']::booking_status[]
    when 'disputed'        then array['completed','refunded','cancelled','closed']::booking_status[]
    when 'refunded'        then array['closed']::booking_status[]
    when 'closed'          then array[]::booking_status[]
  end;

  if not (new.status = any (allowed)) then
    raise exception 'Illegal booking transition % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_booking_transition
  before update of status on bookings
  for each row execute function app.guard_booking_transition();

-- ---------------------------------------------------------------------
-- Event workspace: tasks, notes, documents and a customer-safe timeline.
-- ---------------------------------------------------------------------
create table event_tasks (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete set null,
  title        text not null,
  detail       text,
  status       task_status not null default 'todo',
  due_at       timestamptz,
  assignee_id  uuid references profiles(id) on delete set null,
  -- Internal tasks stay hidden from the customer timeline.
  is_customer_visible boolean not null default false,
  completed_at timestamptz,
  sort_order   integer not null default 100,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index event_tasks_event_idx on event_tasks (event_id, status, due_at);
create index event_tasks_assignee_idx on event_tasks (assignee_id, status) where status <> 'done';

create table event_timeline (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  kind        text not null,
  title       text not null,
  detail      text,
  visibility  text not null default 'internal'
              check (visibility in ('internal', 'customer', 'partner', 'all')),
  actor_id    uuid references profiles(id) on delete set null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index event_timeline_event_idx on event_timeline (event_id, created_at desc);

create table event_documents (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  title        text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint,
  visibility   text not null default 'internal'
               check (visibility in ('internal', 'customer', 'partner', 'all')),
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index event_documents_event_idx on event_documents (event_id);

do $$ begin perform app.attach_touch_many('events', 'bookings', 'event_tasks'); end $$;

-- ---------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------
create or replace function app.can_view_event(p_event uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from events e
    where e.id = p_event
      and (e.customer_profile_id = auth.uid()
           or (e.organization_id is not null and app.is_org_member(e.organization_id)))
  );
$$;

create or replace function app.partner_on_event(p_event uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from bookings b
    where b.event_id = p_event
      and b.partner_id in (select app.my_partner_ids())
  );
$$;

grant execute on function app.can_view_event(uuid), app.partner_on_event(uuid)
  to authenticated, service_role;

-- Prevent a partner being double-booked beyond their declared daily
-- capacity, and refuse dates they have blocked.
create or replace function app.guard_partner_capacity()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_blocked  boolean;
  v_override integer;
  v_taken    integer;
begin
  if new.status in ('cancelled', 'draft', 'refunded', 'closed') then return new; end if;
  if tg_op = 'UPDATE' and new.status = old.status and new.service_date = old.service_date then
    return new;
  end if;

  select daily_event_capacity into v_capacity
  from partner_profiles where id = new.partner_id;

  select is_blocked, capacity_override into v_blocked, v_override
  from partner_availability
  where partner_id = new.partner_id and on_date = new.service_date;

  if coalesce(v_blocked, false) then
    raise exception 'Partner has blocked %', new.service_date using errcode = 'check_violation';
  end if;

  v_capacity := coalesce(v_override, v_capacity, 1);

  select count(*) into v_taken
  from bookings b
  where b.partner_id = new.partner_id
    and b.service_date = new.service_date
    and b.id <> new.id
    and b.status in ('pending_payment','partially_paid','confirmed','in_preparation','ready','in_progress');

  if v_taken >= v_capacity then
    raise exception 'Partner is at capacity (% of %) on %', v_taken, v_capacity, new.service_date
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_booking_capacity
  before insert or update of status, service_date on bookings
  for each row execute function app.guard_partner_capacity();
