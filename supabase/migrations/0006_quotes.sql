-- =====================================================================
-- Evently BD — 0006 Partner quotations
-- A quote is a container per (request, partner, category). Every edit
-- after submission produces a new immutable version, so negotiation
-- history is never destroyed.
-- =====================================================================

create table quotes (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique default app.next_ref('QT', 'app.ref_quote_seq'),
  request_id   uuid not null references service_requests(id) on delete cascade,
  partner_id   uuid not null references partner_profiles(id) on delete cascade,
  category_id  uuid references service_categories(id) on delete set null,
  invite_id    uuid references request_partner_invites(id) on delete set null,
  status       quote_status not null default 'draft',
  current_version integer not null default 1 check (current_version >= 1),
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (request_id, partner_id, category_id)
);
create index quotes_request_idx on quotes (request_id, status);
create index quotes_partner_idx on quotes (partner_id, status, updated_at desc);

create table quote_versions (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references quotes(id) on delete cascade,
  version_no      integer not null check (version_no >= 1),
  status          quote_status not null default 'draft',

  -- Totals are recomputed from quote_items by trigger; the client never
  -- supplies them.
  subtotal_minor  bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor  bigint not null default 0 check (discount_minor >= 0),
  tax_minor       bigint not null default 0 check (tax_minor >= 0),
  total_minor     bigint not null default 0 check (total_minor >= 0),

  guest_count     integer check (guest_count is null or guest_count > 0),
  per_person_minor bigint check (per_person_minor is null or per_person_minor >= 0),

  menu_id         uuid references menus(id) on delete set null,
  package_id      uuid references partner_packages(id) on delete set null,
  notes           text,
  payment_terms   text,
  cancellation_policy text,
  valid_until     date,
  change_summary  text,          -- what changed vs the previous version
  submitted_at    timestamptz,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (quote_id, version_no),
  constraint quote_version_discount_sane check (discount_minor <= subtotal_minor + tax_minor)
);
create index quote_versions_quote_idx on quote_versions (quote_id, version_no desc);

create table quote_items (
  id                uuid primary key default gen_random_uuid(),
  quote_version_id  uuid not null references quote_versions(id) on delete cascade,
  charge_kind       charge_kind not null default 'food',
  label             text not null check (length(btrim(label)) > 0),
  description       text,
  unit              text not null default 'per_person'
                    check (unit in ('per_person', 'per_piece', 'per_kg', 'per_tray', 'per_item', 'flat', 'per_hour', 'per_day')),
  quantity          numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_minor  bigint not null default 0 check (unit_price_minor >= 0),
  line_total_minor  bigint generated always as (round(quantity * unit_price_minor)::bigint) stored,
  menu_item_id      uuid references menu_items(id) on delete set null,
  is_optional       boolean not null default false,
  sort_order        integer not null default 100,
  created_at        timestamptz not null default now()
);
create index quote_items_version_idx on quote_items (quote_version_id, sort_order);

create table quote_attachments (
  id               uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references quote_versions(id) on delete cascade,
  storage_path     text not null,
  file_name        text not null,
  mime_type        text,
  size_bytes       bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by      uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- Customer/ops asking the partner for a revision.
create table quote_change_requests (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references quotes(id) on delete cascade,
  quote_version_id uuid references quote_versions(id) on delete set null,
  message          text not null check (length(btrim(message)) > 0),
  requested_by     uuid references profiles(id) on delete set null,
  requested_side   participant_side not null default 'platform',
  resolved_at      timestamptz,
  resolved_version_id uuid references quote_versions(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index quote_change_requests_quote_idx on quote_change_requests (quote_id, created_at desc);

-- ---------------------------------------------------------------------
-- Server-side total recalculation. Totals are derived, never trusted
-- from the client. Optional items are excluded from the subtotal.
-- ---------------------------------------------------------------------
create or replace function app.recalc_quote_version(p_version uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_subtotal bigint;
  v_guests   integer;
begin
  select coalesce(sum(line_total_minor), 0) into v_subtotal
  from quote_items where quote_version_id = p_version and not is_optional;

  update quote_versions qv
     set subtotal_minor = v_subtotal,
         total_minor    = greatest(v_subtotal + qv.tax_minor - qv.discount_minor, 0),
         updated_at     = now()
   where qv.id = p_version
   returning qv.guest_count into v_guests;

  if v_guests is not null and v_guests > 0 then
    update quote_versions
       set per_person_minor = round(total_minor::numeric / v_guests)::bigint
     where id = p_version;
  end if;
end;
$$;

create or replace function app.trg_recalc_quote_items()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform app.recalc_quote_version(coalesce(new.quote_version_id, old.quote_version_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_quote_items_recalc
  after insert or update or delete on quote_items
  for each row execute function app.trg_recalc_quote_items();

-- Keep totals honest when discount/tax change directly on the version.
create or replace function app.trg_recalc_quote_version()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  new.total_minor := greatest(new.subtotal_minor + new.tax_minor - new.discount_minor, 0);
  if new.guest_count is not null and new.guest_count > 0 then
    new.per_person_minor := round(new.total_minor::numeric / new.guest_count)::bigint;
  end if;
  return new;
end;
$$;

create trigger trg_quote_version_totals
  before insert or update of subtotal_minor, discount_minor, tax_minor, guest_count on quote_versions
  for each row execute function app.trg_recalc_quote_version();

-- A submitted version is frozen: edits must create a new version instead.
create or replace function app.guard_quote_version_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.submitted_at is not null and old.status not in ('draft', 'changes_requested') then
    if new.status is not distinct from old.status
       and (new.subtotal_minor, new.discount_minor, new.tax_minor, new.notes)
           is distinct from (old.subtotal_minor, old.discount_minor, old.tax_minor, old.notes) then
      raise exception 'Quote version % is submitted and immutable; create a new version', old.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_quote_version_immutable
  before update on quote_versions
  for each row execute function app.guard_quote_version_immutable();

create or replace function app.guard_quote_items_immutable()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_status quote_status; v_submitted timestamptz;
begin
  select status, submitted_at into v_status, v_submitted
  from quote_versions where id = coalesce(new.quote_version_id, old.quote_version_id);

  if v_submitted is not null and v_status not in ('draft', 'changes_requested') then
    raise exception 'Cannot modify line items of a submitted quote version'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_quote_items_immutable
  before insert or update or delete on quote_items
  for each row execute function app.guard_quote_items_immutable();

do $$ begin perform app.attach_touch_many('quotes', 'quote_versions'); end $$;

-- Access helper used by RLS and by the proposal builder.
create or replace function app.can_view_quote(p_quote uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from quotes q
    where q.id = p_quote
      and (
        q.partner_id in (select app.my_partner_ids())
        or app.is_platform_staff()
      )
  );
$$;
grant execute on function app.can_view_quote(uuid) to authenticated, service_role;
