-- =====================================================================
-- Evently BD — 0011 Reviews, favourites, support and disputes
-- =====================================================================

create table reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references bookings(id) on delete cascade,
  event_id     uuid references events(id) on delete set null,
  partner_id   uuid not null references partner_profiles(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,

  status       review_status not null default 'pending',
  rating       smallint not null check (rating between 1 and 5),
  quality_rating       smallint check (quality_rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  punctuality_rating   smallint check (punctuality_rating between 1 and 5),
  value_rating         smallint check (value_rating between 1 and 5),
  title        text,
  comment      text,
  photos       text[] not null default '{}',
  is_anonymous boolean not null default false,
  moderated_by uuid references profiles(id) on delete set null,
  moderated_at timestamptz,
  moderation_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index reviews_partner_idx on reviews (partner_id, status, created_at desc);
create index reviews_author_idx on reviews (author_id);

create table review_responses (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null unique references reviews(id) on delete cascade,
  partner_id  uuid not null references partner_profiles(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null check (length(btrim(body)) > 0),
  status      review_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- A review may only be written by the customer on their own completed booking.
create or replace function app.guard_review_eligibility()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_ok boolean;
begin
  select exists (
    select 1 from bookings b join events e on e.id = b.event_id
    where b.id = new.booking_id
      and b.partner_id = new.partner_id
      and b.status in ('completed', 'closed')
      and (e.customer_profile_id = new.author_id
           or (e.organization_id is not null and exists (
                 select 1 from organization_members m
                 where m.organization_id = e.organization_id
                   and m.profile_id = new.author_id and m.status = 'active')))
  ) into v_ok;

  if not v_ok then
    raise exception 'Reviews require a completed booking that belongs to the author'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger trg_review_eligibility before insert on reviews
  for each row execute function app.guard_review_eligibility();

-- Maintain the partner's public rating aggregate from published reviews.
create or replace function app.refresh_partner_rating()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_partner uuid := coalesce(new.partner_id, old.partner_id);
begin
  update partner_profiles p set
    rating_avg = coalesce(t.avg_rating, 0),
    rating_count = coalesce(t.n, 0)
  from (
    select round(avg(rating)::numeric, 2) avg_rating, count(*) n
    from reviews where partner_id = v_partner and status = 'published'
  ) t
  where p.id = v_partner;
  return coalesce(new, old);
end;
$$;
create trigger trg_review_rating after insert or update or delete on reviews
  for each row execute function app.refresh_partner_rating();

create table favorites (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  partner_id uuid references partner_profiles(id) on delete cascade,
  package_id uuid references partner_packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_target check (num_nonnulls(partner_id, package_id) = 1)
);
create unique index favorites_partner_uniq on favorites (profile_id, partner_id) where partner_id is not null;
create unique index favorites_package_uniq on favorites (profile_id, package_id) where package_id is not null;

-- ---------------------------------------------------------------------
-- Support and disputes
-- ---------------------------------------------------------------------
create table support_tickets (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique default app.next_ref('TK', 'app.ref_ticket_seq'),
  subject      text not null check (length(btrim(subject)) > 2),
  category     text not null default 'other'
               check (category in ('payment', 'delivery', 'service_quality', 'cancellation',
                                   'refund', 'account', 'technical', 'other')),
  status       ticket_status not null default 'open',
  priority     ticket_priority not null default 'normal',

  opened_by    uuid not null references profiles(id) on delete cascade,
  opener_side  participant_side not null,
  organization_id uuid references organizations(id) on delete set null,
  partner_id   uuid references partner_profiles(id) on delete set null,
  event_id     uuid references events(id) on delete set null,
  booking_id   uuid references bookings(id) on delete set null,
  payment_id   uuid references payments(id) on delete set null,

  assigned_to  uuid references profiles(id) on delete set null,
  thread_id    uuid references message_threads(id) on delete set null,
  resolution   text,
  resolved_at  timestamptz,
  closed_at    timestamptz,
  first_response_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index support_tickets_status_idx on support_tickets (status, priority, created_at desc);
create index support_tickets_opener_idx on support_tickets (opened_by, created_at desc);
create index support_tickets_assignee_idx on support_tickets (assigned_to) where status not in ('resolved','closed');

create table ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references support_tickets(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null check (length(btrim(body)) > 0),
  is_internal boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index ticket_messages_ticket_idx on ticket_messages (ticket_id, created_at);

create table disputes (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid references support_tickets(id) on delete set null,
  event_id      uuid references events(id) on delete set null,
  booking_id    uuid not null references bookings(id) on delete cascade,
  raised_by     uuid references profiles(id) on delete set null,
  raiser_side   participant_side not null,
  reason        text not null,
  detail        text,
  status        text not null default 'open'
                check (status in ('open', 'investigating', 'awaiting_response', 'resolved', 'rejected')),
  claim_minor   bigint check (claim_minor is null or claim_minor >= 0),
  resolution    text,
  resolution_kind text check (resolution_kind in
                  ('full_refund', 'partial_refund', 'partner_penalty', 'goodwill_credit', 'no_action')),
  settlement_minor bigint check (settlement_minor is null or settlement_minor >= 0),
  resolved_by   uuid references profiles(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index disputes_booking_idx on disputes (booking_id);
create index disputes_status_idx on disputes (status, created_at desc);

do $$ begin perform app.attach_touch_many(
  'reviews', 'review_responses', 'support_tickets', 'disputes'); end $$;
