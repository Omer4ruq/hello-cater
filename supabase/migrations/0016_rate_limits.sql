-- =====================================================================
-- Evently BD — 0016 Rate limiting
--
-- Durable, database-backed counters. An in-memory limiter is useless on
-- serverless because each invocation may get a fresh process; this gives
-- one shared view of abuse across every region.
-- =====================================================================

create table rate_limits (
  bucket       text not null,
  identifier   text not null,
  window_start timestamptz not null,
  count        integer not null default 0 check (count >= 0),
  primary key (bucket, identifier, window_start)
);
create index rate_limits_cleanup_idx on rate_limits (window_start);

alter table rate_limits enable row level security;
alter table rate_limits force row level security;
create policy service_role_all on rate_limits for all to service_role using (true) with check (true);
revoke all on rate_limits from anon, authenticated;

/**
 * Consume one unit from a fixed window. Returns true when the caller is
 * still within budget. Atomic: concurrent requests cannot both squeeze
 * past the limit.
 */
create or replace function app.consume_rate_limit(
  p_bucket text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  integer;
begin
  insert into rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function app.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function app.consume_rate_limit(text, text, integer, integer) to service_role;

/** Housekeeping, called from the scheduled maintenance route. */
create or replace function app.prune_rate_limits()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  delete from rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
grant execute on function app.prune_rate_limits() to service_role;
