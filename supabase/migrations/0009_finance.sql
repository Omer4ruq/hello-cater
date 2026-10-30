-- =====================================================================
-- Evently BD — 0009 Money
-- Configurable commercial rules, payments, refunds, invoices, a
-- double-entry ledger and partner payouts.
--
-- CONVENTION: every monetary column is a BIGINT in *poisha*
-- (1 BDT = 100 poisha). Floating point is never used for money.
-- =====================================================================

-- ---------------------------------------------------------------------
-- pricing_rules — the single source of commercial truth. Rules are
-- resolved most-specific-first: organization > partner > category > global.
-- ---------------------------------------------------------------------
create table pricing_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  scope           text not null default 'global'
                  check (scope in ('global', 'category', 'partner', 'organization', 'event_type')),
  category_id     uuid references service_categories(id) on delete cascade,
  partner_id      uuid references partner_profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  event_type_id   uuid references event_types(id) on delete cascade,

  -- Partner side
  commission_bps        integer not null default 1200 check (commission_bps between 0 and 5000),
  -- Customer side
  service_fee_bps       integer not null default 0 check (service_fee_bps between 0 and 5000),
  service_fee_flat_minor bigint not null default 0 check (service_fee_flat_minor >= 0),
  service_fee_min_minor bigint check (service_fee_min_minor is null or service_fee_min_minor >= 0),
  service_fee_max_minor bigint check (service_fee_max_minor is null or service_fee_max_minor >= 0),
  coordination_fee_minor bigint not null default 0 check (coordination_fee_minor >= 0),
  -- Managed-event coordination fee as a percentage, for large weddings.
  coordination_fee_bps  integer not null default 0 check (coordination_fee_bps between 0 and 5000),

  vat_bps               integer not null default 0 check (vat_bps between 0 and 3000),
  vat_label             text not null default 'VAT',
  -- Who absorbs the payment gateway charge.
  gateway_fee_bearer    fee_bearer not null default 'platform',
  gateway_fee_bps       integer not null default 0 check (gateway_fee_bps between 0 and 2000),

  deposit_bps           integer not null default 5000 check (deposit_bps between 0 and 10000),
  min_order_minor       bigint not null default 0 check (min_order_minor >= 0),

  priority        integer not null default 100,
  effective_from  timestamptz not null default now(),
  effective_to    timestamptz,
  is_active       boolean not null default true,
  notes           text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint pricing_rule_scope_target check (
    (scope = 'global'       and category_id is null and partner_id is null and organization_id is null and event_type_id is null)
 or (scope = 'category'     and category_id is not null)
 or (scope = 'partner'      and partner_id is not null)
 or (scope = 'organization' and organization_id is not null)
 or (scope = 'event_type'   and event_type_id is not null)),
  constraint pricing_rule_fee_bounds check (
    service_fee_min_minor is null or service_fee_max_minor is null
    or service_fee_max_minor >= service_fee_min_minor),
  constraint pricing_rule_window check (effective_to is null or effective_to > effective_from)
);
create index pricing_rules_lookup_idx on pricing_rules (scope, is_active, priority desc);
create unique index pricing_rules_one_global on pricing_rules (scope)
  where scope = 'global' and is_active and effective_to is null;

-- Resolve the effective commercial rule for a given context.
create or replace function app.resolve_pricing_rule(
  p_category uuid default null,
  p_partner uuid default null,
  p_organization uuid default null,
  p_event_type uuid default null,
  p_at timestamptz default now()
) returns pricing_rules
language sql stable security definer set search_path = public, pg_temp
as $$
  select r.* from pricing_rules r
  where r.is_active
    and r.effective_from <= p_at
    and (r.effective_to is null or r.effective_to > p_at)
    and (
      (r.scope = 'organization' and r.organization_id = p_organization)
   or (r.scope = 'partner'      and r.partner_id = p_partner)
   or (r.scope = 'category'     and r.category_id = p_category)
   or (r.scope = 'event_type'   and r.event_type_id = p_event_type)
   or  r.scope = 'global'
    )
  order by case r.scope
             when 'organization' then 1 when 'partner' then 2
             when 'category' then 3 when 'event_type' then 4 else 5 end,
           r.priority desc, r.created_at desc
  limit 1;
$$;
grant execute on function app.resolve_pricing_rule(uuid, uuid, uuid, uuid, timestamptz)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Cancellation policies (configurable, never hardcoded in the app).
-- ---------------------------------------------------------------------
create table cancellation_policies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index cancellation_policy_default_uniq on cancellation_policies (is_default) where is_default;

create table cancellation_tiers (
  id                uuid primary key default gen_random_uuid(),
  policy_id         uuid not null references cancellation_policies(id) on delete cascade,
  -- Cancelling at least this many hours before the event.
  hours_before      integer not null check (hours_before >= 0),
  refund_bps        integer not null check (refund_bps between 0 and 10000),
  keeps_deposit     boolean not null default false,
  description       text,
  unique (policy_id, hours_before)
);

alter table partner_profiles
  add column cancellation_policy_id uuid references cancellation_policies(id) on delete set null;
alter table bookings
  add column cancellation_policy_id uuid references cancellation_policies(id) on delete set null;

-- ---------------------------------------------------------------------
-- Payments. The platform collects; partners are paid separately.
-- ---------------------------------------------------------------------
create table payments (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default app.next_ref('PAY', 'app.ref_payment_seq'),
  event_id          uuid references events(id) on delete set null,
  proposal_id       uuid references proposals(id) on delete set null,
  invoice_id        uuid,     -- FK added after invoices exists
  customer_profile_id uuid not null references profiles(id) on delete restrict,
  organization_id   uuid references organizations(id) on delete set null,

  purpose           payment_purpose not null default 'deposit',
  status            payment_status not null default 'initiated',
  amount_minor      bigint not null check (amount_minor > 0),
  currency          text not null default 'BDT' check (currency = 'BDT'),
  -- Gateway charge, recorded for reconciliation.
  gateway_fee_minor bigint not null default 0 check (gateway_fee_minor >= 0),
  net_received_minor bigint not null default 0 check (net_received_minor >= 0),
  refunded_minor    bigint not null default 0 check (refunded_minor >= 0),

  provider          text not null default 'sslcommerz',
  provider_ref      text,          -- gateway transaction id (val_id / bank tran id)
  provider_session  text,          -- gateway session token
  method            text,          -- card / bkash / nagad / bank
  -- Our own id sent to the gateway; unique so a retry cannot double-charge.
  idempotency_key   text not null unique,

  initiated_at      timestamptz not null default now(),
  paid_at           timestamptz,
  failed_at         timestamptz,
  failure_reason    text,
  expires_at        timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint payment_refund_le_amount check (refunded_minor <= amount_minor),
  constraint payment_paid_has_ref check (status <> 'paid' or provider_ref is not null)
);
create index payments_event_idx on payments (event_id, status);
create index payments_customer_idx on payments (customer_profile_id, created_at desc);
create index payments_status_idx on payments (status, created_at desc);
create index payments_provider_ref_idx on payments (provider, provider_ref);

-- Every interaction with the gateway, success or failure.
create table payment_transactions (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references payments(id) on delete cascade,
  kind          text not null check (kind in ('init', 'redirect', 'validate', 'ipn', 'query', 'refund', 'manual')),
  status        text not null,
  amount_minor  bigint check (amount_minor is null or amount_minor >= 0),
  provider_ref  text,
  request_body  jsonb,
  response_body jsonb,
  error_message text,
  created_at    timestamptz not null default now()
);
create index payment_transactions_payment_idx on payment_transactions (payment_id, created_at desc);

-- Raw webhook/IPN deliveries. The unique key makes replay a no-op.
create table payment_events (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  provider_event_id text not null,
  payment_id        uuid references payments(id) on delete set null,
  event_type        text,
  signature_valid   boolean not null default false,
  payload           jsonb not null,
  processed_at      timestamptz,
  process_error     text,
  received_at       timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create index payment_events_unprocessed_idx on payment_events (received_at) where processed_at is null;

create table refunds (
  id             uuid primary key default gen_random_uuid(),
  payment_id     uuid not null references payments(id) on delete restrict,
  event_id       uuid references events(id) on delete set null,
  booking_id     uuid references bookings(id) on delete set null,
  status         refund_status not null default 'requested',
  amount_minor   bigint not null check (amount_minor > 0),
  reason         text not null,
  policy_note    text,
  provider_ref   text,
  requested_by   uuid references profiles(id) on delete set null,
  approved_by    uuid references profiles(id) on delete set null,
  approved_at    timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index refunds_payment_idx on refunds (payment_id);
create index refunds_status_idx on refunds (status, created_at desc);

-- ---------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique default app.next_ref('INV', 'app.ref_invoice_seq'),
  kind            invoice_kind not null default 'customer_invoice',
  status          invoice_status not null default 'draft',

  event_id        uuid references events(id) on delete set null,
  booking_id      uuid references bookings(id) on delete set null,
  proposal_id     uuid references proposals(id) on delete set null,
  customer_profile_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  partner_id      uuid references partner_profiles(id) on delete set null,

  bill_to_name    text not null,
  bill_to_address text,
  bill_to_email   citext,
  bill_to_phone   text,
  bill_to_tin     text,

  subtotal_minor  bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor  bigint not null default 0 check (discount_minor >= 0),
  tax_minor       bigint not null default 0 check (tax_minor >= 0),
  total_minor     bigint not null default 0 check (total_minor >= 0),
  paid_minor      bigint not null default 0 check (paid_minor >= 0),

  currency        text not null default 'BDT',
  issue_date      date not null default (now() at time zone 'Asia/Dhaka')::date,
  due_date        date,
  notes           text,
  terms           text,
  pdf_path        text,
  issued_at       timestamptz,
  voided_at       timestamptz,
  void_reason     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint invoice_customer_or_partner check (
    (kind = 'partner_statement' and partner_id is not null)
 or (kind <> 'partner_statement' and customer_profile_id is not null))
);
create index invoices_event_idx on invoices (event_id);
create index invoices_customer_idx on invoices (customer_profile_id, issue_date desc);
create index invoices_partner_idx on invoices (partner_id, issue_date desc);
create index invoices_status_idx on invoices (status, due_date);

create table invoice_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  label            text not null,
  description      text,
  quantity         numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_minor bigint not null default 0,
  line_total_minor bigint generated always as (round(quantity * unit_price_minor)::bigint) stored,
  sort_order       integer not null default 100,
  created_at       timestamptz not null default now()
);
create index invoice_items_invoice_idx on invoice_items (invoice_id, sort_order);

alter table payments
  add constraint payments_invoice_fk foreign key (invoice_id) references invoices(id) on delete set null;

-- ---------------------------------------------------------------------
-- Double-entry ledger. Every money movement writes a balanced group of
-- entries, so the books can always be reconstructed and audited.
-- ---------------------------------------------------------------------
create table financial_transactions (
  id            uuid primary key default gen_random_uuid(),
  entry_group   uuid not null,
  account       ledger_account not null,
  direction     ledger_direction not null,
  amount_minor  bigint not null check (amount_minor > 0),
  currency      text not null default 'BDT',

  event_id      uuid references events(id) on delete set null,
  booking_id    uuid references bookings(id) on delete set null,
  payment_id    uuid references payments(id) on delete set null,
  refund_id     uuid references refunds(id) on delete set null,
  payout_id     uuid,   -- FK added after payouts
  invoice_id    uuid references invoices(id) on delete set null,
  partner_id    uuid references partner_profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,

  description   text not null,
  occurred_at   timestamptz not null default now(),
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index ledger_group_idx on financial_transactions (entry_group);
create index ledger_event_idx on financial_transactions (event_id, occurred_at);
create index ledger_partner_idx on financial_transactions (partner_id, occurred_at);
create index ledger_account_idx on financial_transactions (account, occurred_at);

-- Ledger rows are append-only.
create or replace function app.guard_ledger_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'financial_transactions is append-only' using errcode = 'insufficient_privilege';
end;
$$;
create trigger trg_ledger_no_update before update or delete on financial_transactions
  for each row execute function app.guard_ledger_append_only();

-- Post a balanced pair/set of entries atomically.
create or replace function app.post_ledger_entries(p_entries jsonb, p_description text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_group uuid := gen_random_uuid();
  v_debit bigint := 0;
  v_credit bigint := 0;
  e jsonb;
begin
  for e in select * from jsonb_array_elements(p_entries) loop
    if (e ->> 'direction') = 'debit'
      then v_debit := v_debit + (e ->> 'amount_minor')::bigint;
      else v_credit := v_credit + (e ->> 'amount_minor')::bigint;
    end if;

    insert into financial_transactions (
      entry_group, account, direction, amount_minor, description,
      event_id, booking_id, payment_id, refund_id, payout_id, invoice_id,
      partner_id, organization_id, created_by)
    values (
      v_group,
      (e ->> 'account')::ledger_account,
      (e ->> 'direction')::ledger_direction,
      (e ->> 'amount_minor')::bigint,
      coalesce(e ->> 'description', p_description, 'ledger entry'),
      (e ->> 'event_id')::uuid, (e ->> 'booking_id')::uuid, (e ->> 'payment_id')::uuid,
      (e ->> 'refund_id')::uuid, (e ->> 'payout_id')::uuid, (e ->> 'invoice_id')::uuid,
      (e ->> 'partner_id')::uuid, (e ->> 'organization_id')::uuid, auth.uid());
  end loop;

  if v_debit <> v_credit then
    raise exception 'Unbalanced ledger group: debit % <> credit %', v_debit, v_credit
      using errcode = 'check_violation';
  end if;
  return v_group;
end;
$$;

-- ---------------------------------------------------------------------
-- Partner payouts
-- ---------------------------------------------------------------------
create table payouts (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default app.next_ref('PO', 'app.ref_payout_seq'),
  partner_id     uuid not null references partner_profiles(id) on delete restrict,
  status         payout_status not null default 'pending',
  period_start   date,
  period_end     date,

  gross_minor      bigint not null default 0 check (gross_minor >= 0),
  commission_minor bigint not null default 0 check (commission_minor >= 0),
  adjustment_minor bigint not null default 0,
  net_minor        bigint not null default 0,

  method         payout_method,
  payout_account_id uuid references partner_payout_accounts(id) on delete set null,
  provider_ref   text,
  proof_path     text,
  statement_invoice_id uuid references invoices(id) on delete set null,

  notes          text,
  internal_notes text,
  approved_by    uuid references profiles(id) on delete set null,
  approved_at    timestamptz,
  paid_by        uuid references profiles(id) on delete set null,
  paid_at        timestamptz,
  failure_reason text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint payout_net check (net_minor = gross_minor - commission_minor + adjustment_minor),
  constraint payout_paid_requires_method check (status <> 'paid' or (method is not null and paid_at is not null))
);
create index payouts_partner_idx on payouts (partner_id, status, created_at desc);
create index payouts_status_idx on payouts (status, created_at desc);

create table payout_items (
  id               uuid primary key default gen_random_uuid(),
  payout_id        uuid not null references payouts(id) on delete cascade,
  booking_id       uuid references bookings(id) on delete set null,
  event_id         uuid references events(id) on delete set null,
  label            text not null,
  gross_minor      bigint not null default 0 check (gross_minor >= 0),
  commission_minor bigint not null default 0 check (commission_minor >= 0),
  adjustment_minor bigint not null default 0,
  net_minor        bigint not null default 0,
  created_at       timestamptz not null default now(),
  constraint payout_item_net check (net_minor = gross_minor - commission_minor + adjustment_minor)
);
create unique index payout_items_booking_uniq on payout_items (booking_id) where booking_id is not null;
create index payout_items_payout_idx on payout_items (payout_id);

alter table financial_transactions
  add constraint financial_transactions_payout_fk
  foreign key (payout_id) references payouts(id) on delete set null;

create or replace function app.recalc_payout(p_payout uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update payouts p set
    gross_minor      = coalesce(t.gross, 0),
    commission_minor = coalesce(t.commission, 0),
    adjustment_minor = coalesce(t.adjustment, 0),
    net_minor        = coalesce(t.gross, 0) - coalesce(t.commission, 0) + coalesce(t.adjustment, 0),
    updated_at       = now()
  from (
    select sum(gross_minor) gross, sum(commission_minor) commission, sum(adjustment_minor) adjustment
    from payout_items where payout_id = p_payout
  ) t
  where p.id = p_payout;
end;
$$;

create or replace function app.trg_recalc_payout()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform app.recalc_payout(coalesce(new.payout_id, old.payout_id));
  return coalesce(new, old);
end;
$$;
create trigger trg_payout_items_recalc
  after insert or update or delete on payout_items
  for each row execute function app.trg_recalc_payout();

-- A settled payout cannot be edited.
create or replace function app.guard_payout_settled()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'paid' and new.status <> 'paid' then
    raise exception 'Payout % is settled and cannot be reopened', old.reference
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger trg_payout_settled before update on payouts
  for each row execute function app.guard_payout_settled();

do $$ begin perform app.attach_touch_many(
  'pricing_rules', 'cancellation_policies', 'payments', 'refunds',
  'invoices', 'payouts'); end $$;
