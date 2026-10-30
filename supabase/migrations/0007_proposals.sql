-- =====================================================================
-- Evently BD — 0007 Master proposals
-- Operations combine one or more partner quote versions into a single
-- customer-facing proposal. Accepting a proposal creates one booking per
-- partner line plus one event workspace.
-- =====================================================================

create table proposals (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default app.next_ref('PR', 'app.ref_proposal_seq'),
  request_id      uuid not null references service_requests(id) on delete cascade,
  status          proposal_status not null default 'draft',
  version_no      integer not null default 1 check (version_no >= 1),
  supersedes_id   uuid references proposals(id) on delete set null,

  title           text not null default '',
  summary         text,
  terms           text,
  cancellation_policy text,
  currency        text not null default 'BDT' check (currency = 'BDT'),

  -- Money, all in poisha. Recomputed from proposal_lines by trigger.
  partner_gross_minor   bigint not null default 0 check (partner_gross_minor >= 0),
  service_fee_minor     bigint not null default 0 check (service_fee_minor >= 0),
  coordination_fee_minor bigint not null default 0 check (coordination_fee_minor >= 0),
  delivery_fee_minor    bigint not null default 0 check (delivery_fee_minor >= 0),
  discount_minor        bigint not null default 0 check (discount_minor >= 0),
  tax_minor             bigint not null default 0 check (tax_minor >= 0),
  total_minor           bigint not null default 0 check (total_minor >= 0),
  -- Platform's own take: commission retained from partners + customer fees.
  commission_minor      bigint not null default 0 check (commission_minor >= 0),
  platform_revenue_minor bigint not null default 0 check (platform_revenue_minor >= 0),

  -- Payment schedule the customer is offered.
  deposit_bps     integer not null default 5000 check (deposit_bps between 0 and 10000),
  deposit_minor   bigint not null default 0 check (deposit_minor >= 0),
  balance_due_days integer not null default 3 check (balance_due_days >= 0),

  valid_until     date,
  sent_at         timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  accepted_at     timestamptz,
  accepted_by     uuid references profiles(id) on delete set null,
  rejected_reason text,
  change_request  text,
  prepared_by     uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint proposal_discount_sane check (discount_minor <= partner_gross_minor + service_fee_minor
      + coordination_fee_minor + delivery_fee_minor + tax_minor)
);
create index proposals_request_idx on proposals (request_id, version_no desc);
create index proposals_status_idx on proposals (status, created_at desc);

create table proposal_lines (
  id                uuid primary key default gen_random_uuid(),
  proposal_id       uuid not null references proposals(id) on delete cascade,
  quote_id          uuid references quotes(id) on delete set null,
  quote_version_id  uuid references quote_versions(id) on delete set null,
  partner_id        uuid references partner_profiles(id) on delete set null,
  category_id       uuid references service_categories(id) on delete set null,

  label             text not null,
  description       text,
  -- What the customer is charged for this line (partner gross for the line).
  amount_minor      bigint not null default 0 check (amount_minor >= 0),
  -- Commission snapshot taken when the line was built, so later changes to
  -- the rate never rewrite history.
  commission_bps    integer not null default 0 check (commission_bps between 0 and 5000),
  commission_minor  bigint not null default 0 check (commission_minor >= 0),
  partner_payable_minor bigint not null default 0 check (partner_payable_minor >= 0),
  is_platform_line  boolean not null default false,
  sort_order        integer not null default 100,
  created_at        timestamptz not null default now(),
  constraint proposal_line_commission_le_amount check (commission_minor <= amount_minor),
  constraint proposal_line_payable check (partner_payable_minor = amount_minor - commission_minor)
);
create index proposal_lines_proposal_idx on proposal_lines (proposal_id, sort_order);
create index proposal_lines_partner_idx on proposal_lines (partner_id);

create table proposal_events (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  kind        text not null check (kind in ('sent', 'viewed', 'accepted', 'rejected', 'changes_requested', 'expired', 'revised')),
  note        text,
  actor_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index proposal_events_idx on proposal_events (proposal_id, created_at desc);

-- ---------------------------------------------------------------------
-- Derived proposal totals. The only inputs the client may set are the
-- fee/discount/tax fields; everything else is summed from the lines.
-- ---------------------------------------------------------------------
create or replace function app.recalc_proposal(p_proposal uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_gross bigint;
  v_comm  bigint;
begin
  select coalesce(sum(amount_minor), 0), coalesce(sum(commission_minor), 0)
    into v_gross, v_comm
  from proposal_lines where proposal_id = p_proposal;

  update proposals p
     set partner_gross_minor = v_gross,
         commission_minor    = v_comm,
         total_minor = greatest(
           v_gross + p.service_fee_minor + p.coordination_fee_minor
           + p.delivery_fee_minor + p.tax_minor - p.discount_minor, 0),
         platform_revenue_minor = v_comm + p.service_fee_minor + p.coordination_fee_minor,
         updated_at = now()
   where p.id = p_proposal;

  update proposals
     set deposit_minor = round(total_minor::numeric * deposit_bps / 10000)::bigint
   where id = p_proposal;
end;
$$;

create or replace function app.trg_recalc_proposal_lines()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform app.recalc_proposal(coalesce(new.proposal_id, old.proposal_id));
  return coalesce(new, old);
end;
$$;

create trigger trg_proposal_lines_recalc
  after insert or update or delete on proposal_lines
  for each row execute function app.trg_recalc_proposal_lines();

create or replace function app.trg_proposal_totals()
returns trigger
language plpgsql
as $$
begin
  new.total_minor := greatest(
    new.partner_gross_minor + new.service_fee_minor + new.coordination_fee_minor
    + new.delivery_fee_minor + new.tax_minor - new.discount_minor, 0);
  new.platform_revenue_minor := new.commission_minor + new.service_fee_minor + new.coordination_fee_minor;
  new.deposit_minor := round(new.total_minor::numeric * new.deposit_bps / 10000)::bigint;
  return new;
end;
$$;

create trigger trg_proposal_totals
  before insert or update of partner_gross_minor, service_fee_minor, coordination_fee_minor,
                             delivery_fee_minor, discount_minor, tax_minor, commission_minor, deposit_bps
  on proposals
  for each row execute function app.trg_proposal_totals();

-- A sent proposal is frozen except for its lifecycle fields. Revisions
-- are new rows linked through supersedes_id.
create or replace function app.guard_proposal_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.sent_at is not null and old.status not in ('draft', 'changes_requested') then
    if (new.partner_gross_minor, new.service_fee_minor, new.coordination_fee_minor,
        new.delivery_fee_minor, new.discount_minor, new.tax_minor, new.terms)
       is distinct from
       (old.partner_gross_minor, old.service_fee_minor, old.coordination_fee_minor,
        old.delivery_fee_minor, old.discount_minor, old.tax_minor, old.terms) then
      raise exception 'Proposal % has been sent; create a revision instead of editing it', old.reference
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_proposal_immutable
  before update on proposals
  for each row execute function app.guard_proposal_immutable();

do $$ begin perform app.attach_touch_many('proposals'); end $$;
