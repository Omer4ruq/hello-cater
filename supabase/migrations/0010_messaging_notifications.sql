-- =====================================================================
-- Evently BD — 0010 Messaging and notifications
-- =====================================================================

create table message_threads (
  id              uuid primary key default gen_random_uuid(),
  kind            thread_kind not null,
  subject         text not null default '',
  request_id      uuid references service_requests(id) on delete cascade,
  event_id        uuid references events(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete cascade,
  quote_id        uuid references quotes(id) on delete cascade,
  partner_id      uuid references partner_profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  -- Direct contact details are masked unless operations opens the thread.
  contact_sharing_allowed boolean not null default false,
  is_locked       boolean not null default false,
  last_message_at timestamptz,
  last_message_preview text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index message_threads_request_idx on message_threads (request_id);
create index message_threads_event_idx on message_threads (event_id);
create index message_threads_recent_idx on message_threads (last_message_at desc nulls last);

create table thread_participants (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null references message_threads(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  side         participant_side not null,
  last_read_at timestamptz,
  is_muted     boolean not null default false,
  joined_at    timestamptz not null default now(),
  left_at      timestamptz,
  unique (thread_id, profile_id)
);
create index thread_participants_profile_idx on thread_participants (profile_id) where left_at is null;

create table messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references message_threads(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,
  sender_side participant_side not null default 'platform',
  kind        message_kind not null default 'user',
  -- Exactly as submitted; retained for audit and dispute resolution.
  body        text not null check (length(btrim(body)) > 0),
  -- Contact details masked; what customer↔partner threads actually render.
  body_public text not null default '',
  flagged_contact boolean not null default false,
  metadata    jsonb not null default '{}'::jsonb,
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index messages_thread_idx on messages (thread_id, created_at desc);
create index messages_flagged_idx on messages (created_at desc) where flagged_contact;

create table message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references messages(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes is null or size_bytes >= 0),
  created_at   timestamptz not null default now()
);
create index message_attachments_message_idx on message_attachments (message_id);

-- ---------------------------------------------------------------------
-- Contact-detail masking. Marketplace disintermediation protection: we
-- keep the original for audit, and publish a masked copy to the other
-- side unless operations has explicitly opened the channel.
-- ---------------------------------------------------------------------
create or replace function app.mask_contact_details(p_text text)
returns text
language sql immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(coalesce(p_text, ''),
               '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[contact hidden]', 'g'),
             '(\+?88)?0?1[3-9][0-9]{8}', '[contact hidden]', 'g'),
           '(?:https?://)?(?:wa\.me|api\.whatsapp\.com)/\S+', '[contact hidden]', 'g');
$$;

create or replace function app.trg_mask_message()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_allowed boolean; v_kind thread_kind;
begin
  select contact_sharing_allowed, kind into v_allowed, v_kind
  from message_threads where id = new.thread_id;

  new.body_public := case
    when coalesce(v_allowed, false) or v_kind in ('internal', 'support') then new.body
    else app.mask_contact_details(new.body)
  end;
  new.flagged_contact := new.body_public is distinct from new.body;

  update message_threads
     set last_message_at = new.created_at,
         last_message_preview = left(regexp_replace(new.body_public, '\s+', ' ', 'g'), 160),
         updated_at = now()
   where id = new.thread_id;
  return new;
end;
$$;

create trigger trg_message_mask
  before insert on messages
  for each row execute function app.trg_mask_message();

-- Messages are not editable after the fact; corrections are new messages.
create or replace function app.guard_message_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body or new.thread_id is distinct from old.thread_id then
    raise exception 'Messages are immutable' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger trg_message_immutable before update on messages
  for each row execute function app.guard_message_immutable();

create or replace function app.in_thread(p_thread uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from thread_participants tp
    where tp.thread_id = p_thread and tp.profile_id = auth.uid() and tp.left_at is null
  );
$$;
grant execute on function app.in_thread(uuid), app.mask_contact_details(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table notification_types (
  key            text primary key,
  description    text not null,
  audience       text not null check (audience in ('customer', 'partner', 'platform', 'all')),
  default_in_app boolean not null default true,
  default_email  boolean not null default true,
  default_sms    boolean not null default false,
  is_transactional boolean not null default true
);

insert into notification_types (key, description, audience, default_email, is_transactional) values
  ('request.submitted',     'Your event request was received',            'customer', true,  true),
  ('request.invite',        'You were invited to quote for a request',    'partner',  true,  true),
  ('request.new_internal',  'A new request needs triage',                 'platform', true,  true),
  ('invite.accepted',       'A partner accepted an invitation',           'platform', true,  true),
  ('invite.declined',       'A partner declined an invitation',           'platform', false, true),
  ('quote.submitted',       'A partner submitted a quote',                'platform', true,  true),
  ('quote.updated',         'A quote was revised',                        'platform', false, true),
  ('quote.changes_requested','Changes were requested on your quote',      'partner',  true,  true),
  ('proposal.sent',         'Your proposal is ready',                     'customer', true,  true),
  ('proposal.accepted',     'A proposal was accepted',                    'platform', true,  true),
  ('proposal.rejected',     'A proposal was declined',                    'platform', false, true),
  ('booking.confirmed',     'Booking confirmed',                          'all',      true,  true),
  ('booking.cancelled',     'Booking cancelled',                          'all',      true,  true),
  ('booking.reminder',      'Upcoming event reminder',                    'all',      true,  true),
  ('booking.completed',     'Event completed',                            'all',      true,  true),
  ('payment.received',      'Payment received',                           'customer', true,  true),
  ('payment.failed',        'Payment failed',                             'customer', true,  true),
  ('payment.due',           'Balance payment due',                        'customer', true,  true),
  ('payout.approved',       'Your payout was approved',                   'partner',  true,  true),
  ('payout.paid',           'Your payout has been sent',                  'partner',  true,  true),
  ('review.requested',      'How did it go?',                             'customer', true,  false),
  ('review.received',       'You received a new review',                  'partner',  true,  false),
  ('message.received',      'New message',                                'all',      true,  true),
  ('ticket.updated',        'Support ticket updated',                     'all',      true,  true),
  ('partner.approved',      'Your partner account was approved',          'partner',  true,  true),
  ('partner.rejected',      'Your partner application needs attention',   'partner',  true,  true);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  type_key     text not null references notification_types(key) on delete cascade,
  title        text not null,
  body         text,
  url          text,
  data         jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_profile_idx on notifications (profile_id, created_at desc);
create index notifications_unread_idx on notifications (profile_id) where read_at is null;

create table notification_preferences (
  profile_id uuid not null references profiles(id) on delete cascade,
  type_key   text not null references notification_types(key) on delete cascade,
  in_app     boolean not null default true,
  email      boolean not null default true,
  sms        boolean not null default false,
  whatsapp   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (profile_id, type_key)
);

-- Outbound email/SMS spool. Gives us delivery history and retry control
-- without depending on the provider's dashboard.
create table outbound_messages (
  id            uuid primary key default gen_random_uuid(),
  channel       notification_channel not null default 'email',
  template_key  text not null,
  to_address    text not null,
  to_profile_id uuid references profiles(id) on delete set null,
  subject       text,
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
                check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider      text,
  provider_ref  text,
  attempts      integer not null default 0 check (attempts >= 0),
  last_error    text,
  -- Deduplicates retries of the same logical notification.
  dedupe_key    text unique,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index outbound_messages_status_idx on outbound_messages (status, created_at);

do $$ begin perform app.attach_touch_many(
  'message_threads', 'outbound_messages'); end $$;
