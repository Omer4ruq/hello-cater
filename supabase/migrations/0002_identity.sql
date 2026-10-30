-- =====================================================================
-- Evently BD — 0002 Identity, organizations and the permission model
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: 1:1 with auth.users. Every actor in the system has one.
-- ---------------------------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  email          citext,
  phone          text,
  avatar_url     text,
  locale         text not null default 'en' check (locale in ('en', 'bn')),
  timezone       text not null default 'Asia/Dhaka',
  is_active      boolean not null default true,
  last_seen_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_phone_bd check (phone is null or phone ~ '^\+8801[3-9][0-9]{8}$')
);
comment on table profiles is 'Application-level user record mirroring auth.users.';

create index profiles_email_idx on profiles (email);
create index profiles_phone_idx on profiles (phone);

-- ---------------------------------------------------------------------
-- organizations: both customer companies and partner businesses.
-- ---------------------------------------------------------------------
create table organizations (
  id             uuid primary key default gen_random_uuid(),
  kind           org_kind not null,
  name           text not null check (length(btrim(name)) between 2 and 160),
  slug           text not null unique,
  legal_name     text,
  logo_url       text,
  website        text,
  phone          text,
  email          citext,
  address_line   text,
  area           text,
  city           text not null default 'Dhaka',
  district       text,
  postcode       text,
  country        text not null default 'BD',
  tin            text,
  bin_vat        text,
  trade_license  text,
  billing_email  citext,
  is_active      boolean not null default true,
  settings       jsonb not null default '{}'::jsonb,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index organizations_kind_idx on organizations (kind) where is_active;
create index organizations_name_trgm on organizations using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- organization_members: multi-tenant membership + role.
-- ---------------------------------------------------------------------
create table organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  role            org_member_role not null default 'staff',
  status          member_status not null default 'active',
  title           text,
  department      text,
  -- Corporate spend guardrail, in poisha. NULL = no cap.
  spend_limit_minor bigint check (spend_limit_minor is null or spend_limit_minor >= 0),
  requires_approval boolean not null default false,
  invited_by      uuid references profiles(id) on delete set null,
  invited_at      timestamptz,
  joined_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, profile_id)
);
create index org_members_profile_idx on organization_members (profile_id, status);
create index org_members_org_idx on organization_members (organization_id, status);

-- ---------------------------------------------------------------------
-- organization_invites: email invitations before an account exists.
-- ---------------------------------------------------------------------
create table organization_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           citext not null,
  role            org_member_role not null default 'staff',
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references profiles(id) on delete set null,
  invited_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index org_invites_email_idx on organization_invites (email) where accepted_at is null;

-- ---------------------------------------------------------------------
-- platform_staff: internal Evently BD employees.
-- ---------------------------------------------------------------------
create table platform_staff (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  role        platform_role not null,
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Granular permission catalogue. Permissions are data, not code, so new
-- capabilities can be granted without a deploy.
-- ---------------------------------------------------------------------
create table permissions (
  key         text primary key,
  description text not null,
  category    text not null default 'general'
);

create table role_permissions (
  role           platform_role not null,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into permissions (key, description, category) values
  ('requests.view',        'View service requests',                     'operations'),
  ('requests.manage',      'Edit, assign and progress service requests','operations'),
  ('partners.view',        'View partner accounts',                     'partners'),
  ('partners.manage',      'Edit partner accounts and service data',    'partners'),
  ('partners.verify',      'Approve, reject or suspend partners',       'partners'),
  ('customers.view',       'View customer accounts',                    'customers'),
  ('customers.manage',     'Edit customer accounts',                    'customers'),
  ('quotes.view',          'View partner quotes',                       'operations'),
  ('quotes.manage',        'Review and moderate partner quotes',        'operations'),
  ('proposals.manage',     'Build and send master proposals',           'operations'),
  ('bookings.view',        'View bookings',                             'operations'),
  ('bookings.manage',      'Change booking state and assignments',      'operations'),
  ('events.manage',        'Run the event workspace',                   'operations'),
  ('payments.view',        'View payments',                             'finance'),
  ('payments.manage',      'Record, reconcile and refund payments',     'finance'),
  ('invoices.manage',      'Issue and void invoices',                   'finance'),
  ('payouts.view',         'View partner payouts',                      'finance'),
  ('payouts.approve',      'Approve and settle partner payouts',        'finance'),
  ('reports.view',         'View business reports',                     'finance'),
  ('disputes.manage',      'Handle disputes and refunds',               'support'),
  ('tickets.manage',       'Handle support tickets',                    'support'),
  ('reviews.moderate',     'Moderate reviews',                          'support'),
  ('messages.view_all',    'Read any conversation thread',              'support'),
  ('cms.manage',           'Edit site content',                         'content'),
  ('catalog.manage',       'Edit categories, event types and locations','content'),
  ('settings.manage',      'Change platform business settings',         'admin'),
  ('staff.manage',         'Add and remove platform staff',             'admin'),
  ('audit.view',           'Read the audit log',                        'admin');

-- Super admin gets everything.
insert into role_permissions (role, permission_key)
select 'super_admin'::platform_role, key from permissions;

insert into role_permissions (role, permission_key) values
  ('ops_admin','requests.view'),('ops_admin','requests.manage'),
  ('ops_admin','partners.view'),('ops_admin','partners.manage'),
  ('ops_admin','customers.view'),('ops_admin','customers.manage'),
  ('ops_admin','quotes.view'),('ops_admin','quotes.manage'),
  ('ops_admin','proposals.manage'),('ops_admin','bookings.view'),
  ('ops_admin','bookings.manage'),('ops_admin','events.manage'),
  ('ops_admin','payments.view'),('ops_admin','payouts.view'),
  ('ops_admin','reports.view'),('ops_admin','messages.view_all'),
  ('ops_admin','tickets.manage'),('ops_admin','catalog.manage'),

  ('finance_admin','requests.view'),('finance_admin','bookings.view'),
  ('finance_admin','payments.view'),('finance_admin','payments.manage'),
  ('finance_admin','invoices.manage'),('finance_admin','payouts.view'),
  ('finance_admin','payouts.approve'),('finance_admin','reports.view'),
  ('finance_admin','partners.view'),('finance_admin','customers.view'),
  ('finance_admin','disputes.manage'),('finance_admin','audit.view'),

  ('support_admin','requests.view'),('support_admin','bookings.view'),
  ('support_admin','partners.view'),('support_admin','customers.view'),
  ('support_admin','quotes.view'),('support_admin','tickets.manage'),
  ('support_admin','disputes.manage'),('support_admin','reviews.moderate'),
  ('support_admin','messages.view_all'),('support_admin','payments.view'),

  ('content_admin','cms.manage'),('content_admin','catalog.manage'),
  ('content_admin','partners.view'),('content_admin','reviews.moderate');

-- ---------------------------------------------------------------------
-- RLS helper functions.
-- SECURITY DEFINER so policies can consult membership tables without
-- recursing through those tables' own policies. search_path is pinned to
-- defeat search-path hijacking.
-- ---------------------------------------------------------------------
create or replace function app.is_platform_staff()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from platform_staff s
    where s.profile_id = auth.uid() and s.is_active
  );
$$;

create or replace function app.platform_role()
returns platform_role
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.role from platform_staff s
  where s.profile_id = auth.uid() and s.is_active;
$$;

create or replace function app.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from platform_staff s
    join role_permissions rp on rp.role = s.role
    where s.profile_id = auth.uid()
      and s.is_active
      and rp.permission_key = p_key
  );
$$;

create or replace function app.is_org_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = p_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function app.org_role(p_org uuid)
returns org_member_role
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.role from organization_members m
  where m.organization_id = p_org
    and m.profile_id = auth.uid()
    and m.status = 'active';
$$;

-- Owner/admin of the organization (can manage members, billing, settings).
create or replace function app.is_org_admin(p_org uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from organization_members m
    where m.organization_id = p_org
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

-- All organizations the caller belongs to; used by `in (...)` policies.
create or replace function app.my_org_ids()
returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.organization_id from organization_members m
  where m.profile_id = auth.uid() and m.status = 'active';
$$;

grant execute on function
  app.is_platform_staff(), app.platform_role(), app.has_permission(text),
  app.is_org_member(uuid), app.org_role(uuid), app.is_org_admin(uuid), app.my_org_ids()
  to authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Provision a profile automatically whenever an auth user is created.
-- ---------------------------------------------------------------------
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

do $$ begin perform app.attach_touch_many(
  'profiles', 'organizations', 'organization_members',
  'organization_invites', 'platform_staff'); end $$;