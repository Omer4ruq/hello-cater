-- =====================================================================
-- Evently BD — 0004 Partner supply side
-- Partner business profile, verification, coverage, capacity,
-- availability, packages, menus and portfolio.
-- =====================================================================

create table partner_profiles (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null unique references organizations(id) on delete cascade,
  slug                text not null unique,
  display_name        text not null,
  tagline             text,
  about               text,
  business_type       text check (business_type in
                        ('sole_proprietor', 'partnership', 'private_limited', 'individual', 'other')),
  year_established    integer check (year_established is null or year_established between 1900 and 2100),
  logo_url            text,
  cover_image_url     text,

  verification_status verification_status not null default 'unsubmitted',
  verified_at         timestamptz,
  verified_by         uuid references profiles(id) on delete set null,
  verification_notes  text,          -- internal only, never exposed publicly
  rejection_reason    text,

  -- Commercial defaults; NULL falls back to platform settings.
  commission_bps      integer check (commission_bps is null or commission_bps between 0 and 5000),
  min_order_minor     bigint not null default 0 check (min_order_minor >= 0),
  min_guests          integer check (min_guests is null or min_guests > 0),
  max_guests          integer check (max_guests is null or max_guests > 0),
  lead_time_hours     integer not null default 24 check (lead_time_hours >= 0),
  -- Concurrent events the partner can staff on a single day.
  daily_event_capacity integer not null default 2 check (daily_event_capacity > 0),

  -- Denormalised aggregates, maintained by trigger (see 0012).
  rating_avg          numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count        integer not null default 0 check (rating_count >= 0),
  completed_bookings  integer not null default 0 check (completed_bookings >= 0),
  response_rate_bps   integer not null default 0 check (response_rate_bps between 0 and 10000),
  avg_response_minutes integer,

  cancellation_policy text,
  payment_terms       text,
  is_featured         boolean not null default false,
  is_accepting_orders boolean not null default true,
  published_at        timestamptz,
  seo_title           text,
  seo_description     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint partner_guest_range check (min_guests is null or max_guests is null or max_guests >= min_guests)
);
create index partner_profiles_status_idx on partner_profiles (verification_status);
create index partner_profiles_public_idx on partner_profiles (rating_avg desc, completed_bookings desc)
  where verification_status = 'approved' and published_at is not null;
create index partner_profiles_name_trgm on partner_profiles using gin (display_name gin_trgm_ops);

-- Which categories a partner serves, with an optional per-category price hint.
create table partner_categories (
  partner_id       uuid not null references partner_profiles(id) on delete cascade,
  category_id      uuid not null references service_categories(id) on delete cascade,
  is_primary       boolean not null default false,
  price_from_minor bigint check (price_from_minor is null or price_from_minor >= 0),
  price_to_minor   bigint check (price_to_minor is null or price_to_minor >= 0),
  created_at       timestamptz not null default now(),
  primary key (partner_id, category_id),
  constraint partner_categories_price_range check (
    price_from_minor is null or price_to_minor is null or price_to_minor >= price_from_minor)
);
create index partner_categories_category_idx on partner_categories (category_id);

create table partner_cuisines (
  partner_id uuid not null references partner_profiles(id) on delete cascade,
  cuisine_id uuid not null references cuisines(id) on delete cascade,
  primary key (partner_id, cuisine_id)
);

create table partner_event_types (
  partner_id    uuid not null references partner_profiles(id) on delete cascade,
  event_type_id uuid not null references event_types(id) on delete cascade,
  primary key (partner_id, event_type_id)
);

-- Coverage. A row with area_id NULL means "the whole city".
create table partner_service_areas (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references partner_profiles(id) on delete cascade,
  city_id           uuid not null references cities(id) on delete cascade,
  area_id           uuid references areas(id) on delete cascade,
  delivery_fee_minor bigint not null default 0 check (delivery_fee_minor >= 0),
  min_order_minor   bigint check (min_order_minor is null or min_order_minor >= 0),
  created_at        timestamptz not null default now()
);
create unique index partner_service_areas_uniq
  on partner_service_areas (partner_id, city_id, coalesce(area_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index partner_service_areas_lookup on partner_service_areas (city_id, area_id);

-- Verification paperwork. Stored in a PRIVATE bucket; only the owning
-- partner and verifying staff may generate signed URLs.
create table partner_documents (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references partner_profiles(id) on delete cascade,
  kind         document_kind not null,
  title        text not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  expires_on   date,
  is_verified  boolean not null default false,
  reviewed_by  uuid references profiles(id) on delete set null,
  reviewed_at  timestamptz,
  review_notes text,
  uploaded_by  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index partner_documents_partner_idx on partner_documents (partner_id, kind);

-- Immutable trail of verification decisions.
create table partner_verification_events (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partner_profiles(id) on delete cascade,
  from_status verification_status,
  to_status   verification_status not null,
  notes       text,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index partner_verification_events_partner_idx on partner_verification_events (partner_id, created_at desc);

-- Payout destination. Read restricted to the partner's own admins and
-- finance staff (see RLS in 0014).
create table partner_payout_accounts (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partner_profiles(id) on delete cascade,
  method         payout_method not null default 'bank_transfer',
  account_name   text not null,
  account_number text not null,
  bank_name      text,
  branch_name    text,
  routing_number text,
  mfs_number     text,
  is_default     boolean not null default true,
  is_verified    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint payout_account_mfs check (
    method not in ('bkash','nagad','rocket') or mfs_number is not null)
);
create unique index partner_payout_default_uniq on partner_payout_accounts (partner_id) where is_default;

-- Weekly operating hours.
create table partner_operating_hours (
  partner_id  uuid not null references partner_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at    time,
  closes_at   time,
  is_closed   boolean not null default false,
  primary key (partner_id, day_of_week),
  constraint operating_hours_valid check (is_closed or (opens_at is not null and closes_at is not null))
);

-- Explicit blackout dates and capacity overrides.
create table partner_availability (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references partner_profiles(id) on delete cascade,
  on_date       date not null,
  is_blocked    boolean not null default false,
  capacity_override integer check (capacity_override is null or capacity_override >= 0),
  note          text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (partner_id, on_date)
);
create index partner_availability_date_idx on partner_availability (on_date) where is_blocked;

-- ---------------------------------------------------------------------
-- Packages and menus — the partner's sellable catalogue.
-- ---------------------------------------------------------------------
create table partner_packages (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references partner_profiles(id) on delete cascade,
  category_id       uuid references service_categories(id) on delete set null,
  slug              text not null,
  name              text not null,
  description       text,
  hero_image_url    text,
  base_price_minor       bigint not null default 0 check (base_price_minor >= 0),
  per_person_price_minor bigint not null default 0 check (per_person_price_minor >= 0),
  min_guests        integer check (min_guests is null or min_guests > 0),
  max_guests        integer check (max_guests is null or max_guests > 0),
  lead_time_hours   integer,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  sort_order        integer not null default 100,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (partner_id, slug),
  constraint package_guest_range check (min_guests is null or max_guests is null or max_guests >= min_guests),
  constraint package_has_price check (base_price_minor > 0 or per_person_price_minor > 0)
);
create index partner_packages_partner_idx on partner_packages (partner_id) where is_active;
create index partner_packages_category_idx on partner_packages (category_id) where is_active;

create table package_items (
  id           uuid primary key default gen_random_uuid(),
  package_id   uuid not null references partner_packages(id) on delete cascade,
  label        text not null,
  detail       text,
  is_optional  boolean not null default false,
  addon_price_minor bigint check (addon_price_minor is null or addon_price_minor >= 0),
  sort_order   integer not null default 100,
  created_at   timestamptz not null default now()
);
create index package_items_package_idx on package_items (package_id, sort_order);

create table menus (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partner_profiles(id) on delete cascade,
  name        text not null,
  description text,
  cuisine_id  uuid references cuisines(id) on delete set null,
  is_active   boolean not null default true,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index menus_partner_idx on menus (partner_id) where is_active;

create table menu_items (
  id           uuid primary key default gen_random_uuid(),
  menu_id      uuid not null references menus(id) on delete cascade,
  name         text not null,
  description  text,
  unit         text not null default 'per_person'
               check (unit in ('per_person', 'per_piece', 'per_kg', 'per_tray', 'per_item')),
  price_minor  bigint not null default 0 check (price_minor >= 0),
  image_url    text,
  is_vegetarian boolean not null default false,
  is_halal     boolean not null default true,
  allergens    text[],
  sort_order   integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index menu_items_menu_idx on menu_items (menu_id, sort_order) where is_active;

create table partner_portfolio (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partner_profiles(id) on delete cascade,
  title       text,
  caption     text,
  image_url   text not null,
  event_type_id uuid references event_types(id) on delete set null,
  guest_count integer,
  taken_on    date,
  sort_order  integer not null default 100,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index partner_portfolio_partner_idx on partner_portfolio (partner_id, sort_order) where is_public;

do $$ begin perform app.attach_touch_many(
  'partner_profiles', 'partner_documents', 'partner_payout_accounts',
  'partner_availability', 'partner_packages', 'menus', 'menu_items',
  'partner_portfolio'); end $$;

-- ---------------------------------------------------------------------
-- Membership helper for the partner side.
-- ---------------------------------------------------------------------
create or replace function app.is_partner_member(p_partner uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from partner_profiles pp
    join organization_members m on m.organization_id = pp.organization_id
    where pp.id = p_partner
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function app.is_partner_admin(p_partner uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from partner_profiles pp
    join organization_members m on m.organization_id = pp.organization_id
    where pp.id = p_partner
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function app.my_partner_ids()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select pp.id
  from partner_profiles pp
  join organization_members m on m.organization_id = pp.organization_id
  where m.profile_id = auth.uid() and m.status = 'active';
$$;

grant execute on function app.is_partner_member(uuid), app.is_partner_admin(uuid), app.my_partner_ids()
  to authenticated, anon, service_role;
