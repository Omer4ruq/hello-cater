-- =====================================================================
-- Evently BD — 0003 Public catalogue
-- Service categories, event types, cuisines and the Bangladesh location
-- tree. All admin-editable so the platform can expand beyond Dhaka
-- without a code change.
-- =====================================================================

create table service_categories (
  id                uuid primary key default gen_random_uuid(),
  parent_id         uuid references service_categories(id) on delete set null,
  slug              text not null unique,
  name              text not null,
  name_bn           text,
  kind              text not null default 'catering'
                    check (kind in ('catering', 'event_service', 'vendor')),
  short_description text,
  description       text,
  icon              text,
  image_url         text,
  -- Commission override for this category, in basis points (100 bps = 1%).
  commission_bps    integer check (commission_bps is null or commission_bps between 0 and 5000),
  sort_order        integer not null default 100,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  seo_title         text,
  seo_description   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint service_categories_no_self_parent check (parent_id is null or parent_id <> id)
);
create index service_categories_parent_idx on service_categories (parent_id);
create index service_categories_kind_idx on service_categories (kind, sort_order) where is_active;

create table event_types (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  name_bn           text,
  segment           text not null default 'private'
                    check (segment in ('corporate', 'wedding', 'private', 'social', 'government')),
  short_description text,
  description       text,
  icon              text,
  image_url         text,
  typical_guests_min integer check (typical_guests_min is null or typical_guests_min > 0),
  typical_guests_max integer check (typical_guests_max is null or typical_guests_max > 0),
  sort_order        integer not null default 100,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  seo_title         text,
  seo_description   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint event_types_guest_range check (
    typical_guests_min is null or typical_guests_max is null or typical_guests_max >= typical_guests_min)
);
create index event_types_segment_idx on event_types (segment, sort_order) where is_active;

create table cuisines (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  name_bn    text,
  sort_order integer not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Location tree: district → city → area. Seeded with Dhaka but designed
-- so operations can open new districts from the admin UI.
create table districts (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  name_bn    text,
  division   text,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cities (
  id          uuid primary key default gen_random_uuid(),
  district_id uuid not null references districts(id) on delete cascade,
  slug        text not null unique,
  name        text not null,
  name_bn     text,
  is_active   boolean not null default false,
  is_launched boolean not null default false,
  seo_title   text,
  seo_description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index cities_district_idx on cities (district_id) where is_active;

create table areas (
  id         uuid primary key default gen_random_uuid(),
  city_id    uuid not null references cities(id) on delete cascade,
  slug       text not null unique,
  name       text not null,
  name_bn    text,
  postcode   text,
  latitude   numeric(9,6),
  longitude  numeric(9,6),
  sort_order integer not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index areas_city_idx on areas (city_id) where is_active;
create index areas_name_trgm on areas using gin (name gin_trgm_ops);

do $$ begin perform app.attach_touch_many(
  'service_categories', 'event_types', 'cuisines',
  'districts', 'cities', 'areas'); end $$;
