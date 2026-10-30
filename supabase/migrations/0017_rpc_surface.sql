-- =====================================================================
-- Evently BD — 0017 RPC surface
--
-- PostgREST only exposes the `public` schema, and our domain logic lives
-- in `app` so it is not callable by default. These thin wrappers are the
-- deliberate, reviewable list of what a client may invoke — each with
-- its own grant. Everything else in `app` stays unreachable over HTTP.
-- =====================================================================

-- --------------------------------------------------------- service_role only
create or replace function public.consume_rate_limit(
  p_bucket text, p_identifier text, p_limit integer, p_window_seconds integer
) returns boolean
language sql volatile security definer set search_path = public, pg_temp
as $$ select app.consume_rate_limit(p_bucket, p_identifier, p_limit, p_window_seconds); $$;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.prune_rate_limits() returns integer
language sql volatile security definer set search_path = public, pg_temp
as $$ select app.prune_rate_limits(); $$;
revoke all on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_rate_limits() to service_role;

create or replace function public.post_ledger_entries(p_entries jsonb, p_description text default null)
returns uuid
language sql volatile security definer set search_path = public, pg_temp
as $$ select app.post_ledger_entries(p_entries, p_description); $$;
revoke all on function public.post_ledger_entries(jsonb, text) from public, anon, authenticated;
grant execute on function public.post_ledger_entries(jsonb, text) to service_role;

-- ------------------------------------------------------- authenticated users
-- accept_proposal re-checks authorisation internally against the caller's
-- auth.uid(), so exposing it to authenticated is safe.
create or replace function public.accept_proposal(p_proposal uuid)
returns uuid
language sql volatile security definer set search_path = public, pg_temp
as $$ select app.accept_proposal(p_proposal, auth.uid()); $$;
revoke all on function public.accept_proposal(uuid) from public, anon;
grant execute on function public.accept_proposal(uuid) to authenticated, service_role;

create or replace function public.submit_quote_version(p_version uuid)
returns void
language sql volatile security definer set search_path = public, pg_temp
as $$ select app.submit_quote_version(p_version); $$;
revoke all on function public.submit_quote_version(uuid) from public, anon;
grant execute on function public.submit_quote_version(uuid) to authenticated, service_role;

-- Resolve the commercial rule for a context. Staff-only: the rates are
-- commercially sensitive and must not leak to customers or partners.
create or replace function public.resolve_pricing_rule(
  p_category uuid default null,
  p_partner uuid default null,
  p_organization uuid default null,
  p_event_type uuid default null
) returns pricing_rules
language sql stable security definer set search_path = public, pg_temp
as $$
  select case when app.is_platform_staff()
              then app.resolve_pricing_rule(p_category, p_partner, p_organization, p_event_type)
         end;
$$;
revoke all on function public.resolve_pricing_rule(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.resolve_pricing_rule(uuid, uuid, uuid, uuid) to authenticated, service_role;

-- Marks every message in a thread as read for the calling participant.
create or replace function public.mark_thread_read(p_thread uuid)
returns void
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  update thread_participants
     set last_read_at = now()
   where thread_id = p_thread and profile_id = auth.uid();
end;
$$;
revoke all on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.mark_thread_read(uuid) to authenticated, service_role;

-- Health probe used by /api/health. Deliberately returns no schema detail.
create or replace function public.health_check()
returns jsonb
language sql stable security definer set search_path = public, pg_temp
as $$ select jsonb_build_object('ok', true, 'at', now()); $$;
grant execute on function public.health_check() to anon, authenticated, service_role;
