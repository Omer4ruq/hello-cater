-- =====================================================================
-- Evently BD — 0005 Demand side
-- Service requests captured by the event wizard, the rule-based matching
-- output, and partner invitations.
-- =====================================================================

create table service_requests (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default app.next_ref('REQ', 'app.ref_request_seq'),
  status            request_status not null default 'draft',

  -- Requester. organization_id is set for corporate accounts only.
  customer_profile_id uuid not null references profiles(id) on delete restrict,
  organization_id     uuid references organizations(id) on delete set null,

  event_type_id     uuid references event_types(id) on delete set null,
  title             text not null default '',
  event_date        date,
  event_end_date    date,
  start_time        time,
  end_time          time,
  is_date_flexible  boolean not null default false,

  guest_count       integer check (guest_count is null or guest_count > 0),
  guest_count_max   integer check (guest_count_max is null or guest_count_max > 0),

  city_id           uuid references cities(id) on delete set null,
  area_id           uuid references areas(id) on delete set null,
  venue_name        text,
  address_line      text,
  venue_notes       text,

  -- Budget, always stored in poisha (BDT minor units).
  budget_mode       budget_mode not null default 'flexible',
  budget_total_minor      bigint check (budget_total_minor is null or budget_total_minor >= 0),
  budget_per_person_minor bigint check (budget_per_person_minor is null or budget_per_person_minor >= 0),
  budget_min_minor  bigint check (budget_min_minor is null or budget_min_minor >= 0),
  budget_max_minor  bigint check (budget_max_minor is null or budget_max_minor >= 0),

  dietary_notes     text,
  requirements      text,
  internal_notes    text,               -- staff only, never returned to customers

  contact_name      text,
  contact_phone     text,
  contact_email     citext,
  preferred_channel text not null default 'phone'
                    check (preferred_channel in ('phone', 'email', 'whatsapp', 'platform')),

  source            text not null default 'web_wizard',
  assigned_to       uuid references profiles(id) on delete set null,
  quote_deadline    timestamptz,
  submitted_at      timestamptz,
  closed_at         timestamptz,
  lost_reason       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint request_guest_range check (
    guest_count_max is null or guest_count is null or guest_count_max >= guest_count),
  constraint request_budget_range check (
    budget_min_minor is null or budget_max_minor is null or budget_max_minor >= budget_min_minor),
  constraint request_date_range check (
    event_end_date is null or event_date is null or event_end_date >= event_date),
  -- A submitted request must carry the facts operations needs to match on.
  constraint request_submitted_complete check (
    status = 'draft' or (
      event_type_id is not null and event_date is not null
      and guest_count is not null and city_id is not null
      and length(btrim(coalesce(contact_name, ''))) > 1
      and contact_phone is not null))
);
create index service_requests_customer_idx on service_requests (customer_profile_id, created_at desc);
create index service_requests_org_idx on service_requests (organization_id, created_at desc);
create index service_requests_status_idx on service_requests (status, event_date);
create index service_requests_assigned_idx on service_requests (assigned_to) where status not in ('won','lost','cancelled','expired');
create index service_requests_date_idx on service_requests (event_date);
create index service_requests_city_idx on service_requests (city_id, area_id);

-- Which service lines the customer asked for (catering, decoration, ...).
create table request_services (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references service_requests(id) on delete cascade,
  category_id   uuid not null references service_categories(id) on delete restrict,
  notes         text,
  quantity      integer,
  -- Optional per-line budget so multi-vendor events can be split sensibly.
  budget_minor  bigint check (budget_minor is null or budget_minor >= 0),
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (request_id, category_id)
);
create index request_services_category_idx on request_services (category_id);

create table request_cuisines (
  request_id uuid not null references service_requests(id) on delete cascade,
  cuisine_id uuid not null references cuisines(id) on delete cascade,
  primary key (request_id, cuisine_id)
);

create table request_attachments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references service_requests(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index request_attachments_request_idx on request_attachments (request_id);

-- ---------------------------------------------------------------------
-- Matching output. The engine scores candidates; operations decides who
-- actually gets invited. Scores are persisted so a decision can be
-- explained later.
-- ---------------------------------------------------------------------
create table request_match_candidates (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references service_requests(id) on delete cascade,
  partner_id   uuid not null references partner_profiles(id) on delete cascade,
  category_id  uuid references service_categories(id) on delete set null,
  score        numeric(6,2) not null default 0 check (score >= 0),
  breakdown    jsonb not null default '{}'::jsonb,
  reasons      text[] not null default '{}',
  disqualified boolean not null default false,
  disqualify_reason text,
  computed_at  timestamptz not null default now(),
  unique (request_id, partner_id, category_id)
);
create index match_candidates_request_idx on request_match_candidates (request_id, score desc);

create table request_partner_invites (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references service_requests(id) on delete cascade,
  partner_id    uuid not null references partner_profiles(id) on delete cascade,
  category_id   uuid references service_categories(id) on delete set null,
  status        invite_status not null default 'invited',
  message       text,
  respond_by    timestamptz,
  invited_by    uuid references profiles(id) on delete set null,
  invited_at    timestamptz not null default now(),
  viewed_at     timestamptz,
  responded_at  timestamptz,
  decline_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (request_id, partner_id, category_id)
);
create index request_invites_partner_idx on request_partner_invites (partner_id, status, invited_at desc);
create index request_invites_request_idx on request_partner_invites (request_id, status);

create table request_status_history (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references service_requests(id) on delete cascade,
  from_status request_status,
  to_status   request_status not null,
  note        text,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index request_status_history_idx on request_status_history (request_id, created_at desc);

-- Record every status transition automatically.
create or replace function app.log_request_status()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into request_status_history (request_id, from_status, to_status, actor_id)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_request_status_history
  after insert or update of status on service_requests
  for each row execute function app.log_request_status();

do $$ begin perform app.attach_touch_many(
  'service_requests', 'request_partner_invites'); end $$;

-- Helper: does the caller own (or co-own via their company) this request?
create or replace function app.can_view_request(p_request uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from service_requests r
    where r.id = p_request
      and (
        r.customer_profile_id = auth.uid()
        or (r.organization_id is not null and app.is_org_member(r.organization_id))
      )
  );
$$;

-- Helper: has this partner been invited to the request? Gates a partner's
-- access to request detail — uninvited partners see nothing.
create or replace function app.partner_invited_to_request(p_request uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from request_partner_invites i
    where i.request_id = p_request
      and i.partner_id in (select app.my_partner_ids())
      and i.status <> 'withdrawn'
  );
$$;

grant execute on function app.can_view_request(uuid), app.partner_invited_to_request(uuid)
  to authenticated, service_role;
