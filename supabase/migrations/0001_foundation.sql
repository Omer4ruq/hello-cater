-- =====================================================================
-- Evently BD — 0001 Foundation
-- Extensions, schemas, enums, shared helper functions and triggers.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gin";

-- `app` holds internal helper functions used by RLS policies and triggers.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, anon, service_role;

-- ---------------------------------------------------------------------
-- Enumerated domains
-- ---------------------------------------------------------------------
create type org_kind          as enum ('customer', 'partner');
create type org_member_role   as enum ('owner', 'admin', 'manager', 'staff');
create type member_status     as enum ('invited', 'active', 'suspended', 'removed');
create type platform_role     as enum ('super_admin', 'ops_admin', 'finance_admin', 'support_admin', 'content_admin');

create type verification_status as enum ('unsubmitted', 'pending', 'under_review', 'approved', 'rejected', 'suspended');

create type request_status    as enum (
  'draft', 'submitted', 'under_review', 'matching', 'partners_invited',
  'quotes_received', 'proposal_sent', 'won', 'lost', 'cancelled', 'expired'
);
create type invite_status     as enum ('invited', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn');
create type quote_status      as enum ('draft', 'submitted', 'under_review', 'shared', 'changes_requested', 'accepted', 'rejected', 'withdrawn', 'expired');
create type proposal_status   as enum ('draft', 'sent', 'viewed', 'changes_requested', 'accepted', 'rejected', 'expired', 'cancelled');

create type booking_status    as enum (
  'draft', 'pending_payment', 'partially_paid', 'confirmed', 'in_preparation',
  'ready', 'in_progress', 'completed', 'cancelled', 'disputed', 'refunded', 'closed'
);
create type event_stage       as enum (
  'inquiry', 'proposal', 'confirmed', 'planning', 'vendor_preparation',
  'pre_event', 'event_day', 'completed', 'closed'
);
create type task_status       as enum ('todo', 'in_progress', 'blocked', 'done', 'cancelled');

create type payment_status    as enum ('initiated', 'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded');
create type payment_purpose   as enum ('deposit', 'balance', 'full', 'addon', 'penalty');
create type refund_status     as enum ('requested', 'approved', 'processing', 'completed', 'rejected', 'failed');
create type invoice_kind      as enum ('customer_invoice', 'partner_statement', 'credit_note');
create type invoice_status    as enum ('draft', 'issued', 'partially_paid', 'paid', 'void', 'overdue');
create type payout_status     as enum ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled');
create type payout_method     as enum ('bank_transfer', 'bkash', 'nagad', 'rocket', 'cash', 'adjustment');

create type ledger_direction  as enum ('debit', 'credit');
create type ledger_account    as enum (
  'customer_receivable', 'platform_revenue', 'partner_payable',
  'gateway_clearing', 'tax_payable', 'refund_clearing', 'discount_expense'
);

create type thread_kind       as enum ('customer_platform', 'partner_platform', 'customer_partner', 'internal', 'support');
create type participant_side  as enum ('customer', 'partner', 'platform');
create type message_kind      as enum ('user', 'system', 'note');

create type notification_channel as enum ('in_app', 'email', 'sms', 'whatsapp');
create type ticket_status     as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');
create type ticket_priority   as enum ('low', 'normal', 'high', 'urgent');
create type review_status     as enum ('pending', 'published', 'hidden', 'rejected');

create type budget_mode       as enum ('total', 'per_person', 'range', 'flexible');
create type charge_kind       as enum (
  'food', 'beverage', 'delivery', 'setup', 'service_staff', 'equipment',
  'decoration', 'venue', 'transport', 'rental', 'other'
);
create type fee_bearer        as enum ('customer', 'partner', 'platform');
create type document_kind     as enum (
  'trade_license', 'nid', 'tin', 'bin_vat', 'bank_statement', 'food_license',
  'insurance', 'contract', 'portfolio', 'other'
);

-- ---------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Convenience: attach the updated_at trigger to a table.
create or replace function app.attach_touch(p_table regclass)
returns void
language plpgsql
as $$
begin
  execute format(
    'create trigger trg_touch_updated_at before update on %s
       for each row execute function app.touch_updated_at()', p_table);
end;
$$;

-- Attach the trigger to many tables at once (keeps migrations terse).
create or replace function app.attach_touch_many(variadic p_tables text[])
returns void
language plpgsql
as $$
declare t text;
begin
  foreach t in array p_tables loop
    perform app.attach_touch(t::regclass);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Reference generator — human readable business identifiers
-- e.g. REQ-2026-0001, QT-2026-0042, BK-2026-0007
-- ---------------------------------------------------------------------
create sequence if not exists app.ref_request_seq;
create sequence if not exists app.ref_quote_seq;
create sequence if not exists app.ref_proposal_seq;
create sequence if not exists app.ref_booking_seq;
create sequence if not exists app.ref_invoice_seq;
create sequence if not exists app.ref_payout_seq;
create sequence if not exists app.ref_ticket_seq;
create sequence if not exists app.ref_payment_seq;

create or replace function app.next_ref(p_prefix text, p_seq regclass)
returns text
language sql
volatile
as $$
  select p_prefix || '-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-'
         || lpad(nextval(p_seq)::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- Slug helper
-- ---------------------------------------------------------------------
create or replace function app.slugify(p_input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g'));
$$;
