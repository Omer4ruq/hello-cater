-- =====================================================================
-- Evently BD — 0012 Platform settings, CMS content, audit log, analytics
-- =====================================================================

-- Typed key/value settings so business rules are never hardcoded.
create table system_settings (
  key          text primary key,
  value        jsonb not null,
  value_type   text not null default 'string'
               check (value_type in ('string', 'number', 'boolean', 'json', 'secret_ref')),
  label        text not null,
  description  text,
  category     text not null default 'general',
  is_public    boolean not null default false,   -- safe to expose to the browser
  updated_by   uuid references profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

insert into system_settings (key, value, value_type, label, description, category, is_public) values
  ('brand.name',            '"Evently BD"',      'string',  'Platform name',        'Shown across the site and on documents.', 'brand',   true),
  ('brand.tagline',         '"Plan your event. We handle the rest."', 'string', 'Tagline', null, 'brand', true),
  ('brand.support_email',   '"support@eventlybd.com"', 'string', 'Support email',   null, 'brand', true),
  ('brand.support_phone',   '"+8801700000000"',  'string',  'Support phone',        null, 'brand', true),
  ('brand.address',         '"Gulshan 1, Dhaka 1212, Bangladesh"', 'string', 'Business address', null, 'brand', true),
  ('locale.currency',       '"BDT"',             'string',  'Currency',             'ISO code. Amounts are stored in poisha.', 'locale', true),
  ('locale.currency_symbol','"৳"',               'string',  'Currency symbol',      null, 'locale', true),
  ('locale.default',        '"en"',              'string',  'Default language',     null, 'locale', true),
  ('locale.timezone',       '"Asia/Dhaka"',      'string',  'Timezone',             null, 'locale', true),
  ('finance.default_commission_bps', '1200',     'number',  'Default commission (bps)', '1200 bps = 12%.', 'finance', false),
  ('finance.default_service_fee_bps','300',      'number',  'Customer service fee (bps)', null, 'finance', false),
  ('finance.default_vat_bps',        '0',        'number',  'VAT (bps)',            'Confirm with your accountant before enabling.', 'finance', false),
  ('finance.default_deposit_bps',    '5000',     'number',  'Default deposit (bps)', null, 'finance', false),
  ('finance.min_order_minor',        '500000',   'number',  'Minimum order (poisha)', '৳5,000 default floor.', 'finance', false),
  ('ops.quote_window_hours',         '48',       'number',  'Partner quote window (hours)', null, 'operations', false),
  ('ops.max_partners_per_invite',    '5',        'number',  'Max partners invited per service line', null, 'operations', false),
  ('ops.auto_invite_enabled',        'false',    'boolean', 'Auto-invite matched partners', 'Off by default: operations curates.', 'operations', false),
  ('payments.provider',              '"sslcommerz"', 'string', 'Active payment provider', null, 'payments', false),
  ('payments.enabled',               'false',    'boolean', 'Payments enabled',     'Turns on once gateway credentials are configured.', 'payments', true),
  ('features.corporate_portal',      'true',     'boolean', 'Corporate portals',    null, 'features', true),
  ('features.partner_signup',        'true',     'boolean', 'Partner self-signup',  null, 'features', true);

-- ---------------------------------------------------------------------
-- Database-backed CMS
-- ---------------------------------------------------------------------
create table cms_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  subtitle     text,
  body         text,
  kind         text not null default 'page'
               check (kind in ('page', 'landing', 'legal', 'help')),
  hero_image_url text,
  seo_title    text,
  seo_description text,
  is_published boolean not null default false,
  -- Legal pages carry an explicit review flag until a BD-qualified lawyer signs off.
  needs_legal_review boolean not null default false,
  published_at timestamptz,
  updated_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table cms_sections (
  id          uuid primary key default gen_random_uuid(),
  page_slug   text not null,
  key         text not null,
  kind        text not null default 'rich_text',
  heading     text,
  subheading  text,
  body        text,
  image_url   text,
  cta_label   text,
  cta_href    text,
  items       jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 100,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (page_slug, key)
);
create index cms_sections_page_idx on cms_sections (page_slug, sort_order) where is_published;

create table faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  audience    text not null default 'customer'
              check (audience in ('customer', 'partner', 'all')),
  topic       text not null default 'general',
  sort_order  integer not null default 100,
  is_published boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table testimonials (
  id            uuid primary key default gen_random_uuid(),
  author_name   text not null,
  author_title  text,
  company       text,
  avatar_url    text,
  quote         text not null,
  rating        smallint check (rating between 1 and 5),
  event_type    text,
  is_published  boolean not null default false,
  sort_order    integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Audit log — append only, never updated or deleted.
-- ---------------------------------------------------------------------
create table audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references profiles(id) on delete set null,
  actor_role   text,
  action       text not null,
  entity       text not null,
  entity_id    text,
  summary      text,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   inet,
  user_agent   text,
  request_id   text,
  created_at   timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity, entity_id, created_at desc);
create index audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx on audit_logs (action, created_at desc);

create or replace function app.guard_audit_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = 'insufficient_privilege';
end;
$$;
create trigger trg_audit_no_update before update or delete on audit_logs
  for each row execute function app.guard_audit_append_only();

-- Generic auditing trigger for high-value tables.
create or replace function app.audit_row_change()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id text;
begin
  v_id := case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id') else (to_jsonb(new) ->> 'id') end;
  insert into audit_logs (actor_id, actor_role, action, entity, entity_id, before_data, after_data)
  values (
    auth.uid(),
    coalesce(app.platform_role()::text, 'user'),
    lower(tg_op),
    tg_table_name,
    v_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_partner_profiles
  after update of verification_status, commission_bps on partner_profiles
  for each row execute function app.audit_row_change();
create trigger trg_audit_platform_staff
  after insert or update or delete on platform_staff
  for each row execute function app.audit_row_change();
create trigger trg_audit_pricing_rules
  after insert or update or delete on pricing_rules
  for each row execute function app.audit_row_change();
create trigger trg_audit_payouts
  after insert or update on payouts
  for each row execute function app.audit_row_change();
create trigger trg_audit_refunds
  after insert or update on refunds
  for each row execute function app.audit_row_change();
create trigger trg_audit_org_members
  after insert or update or delete on organization_members
  for each row execute function app.audit_row_change();
create trigger trg_audit_system_settings
  after update on system_settings
  for each row execute function app.audit_row_change();

-- ---------------------------------------------------------------------
-- Product analytics (first-party, no PII beyond the actor id).
-- ---------------------------------------------------------------------
create table analytics_events (
  id          bigint generated always as identity primary key,
  name        text not null,
  profile_id  uuid references profiles(id) on delete set null,
  anonymous_id text,
  properties  jsonb not null default '{}'::jsonb,
  path        text,
  referrer    text,
  created_at  timestamptz not null default now()
);
create index analytics_events_name_idx on analytics_events (name, created_at desc);

do $$ begin perform app.attach_touch_many(
  'cms_pages', 'cms_sections', 'faqs', 'testimonials'); end $$;
