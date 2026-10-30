-- =====================================================================
-- Evently BD — 0018 Close two gaps found by the RLS test suite
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PRIVILEGE ESCALATION: a partner owner could approve and publish
--    their own profile.
--
--    The `member_update` policy on partner_profiles lets a partner admin
--    update their row — correct for display name, capacity and terms.
--    But RLS is row-level, not column-level, so it also permitted
--    `verification_status = 'approved'` and `published_at = now()`,
--    letting any partner bypass verification entirely and appear in the
--    public marketplace wearing a Verified badge.
--
--    Verification, publication, commission and the denormalised
--    reputation counters are platform-owned. This trigger pins them.
-- ---------------------------------------------------------------------
create or replace function app.guard_partner_platform_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Server-side paths run as service_role with no JWT subject and have
  -- already done their own permission check. `app.internal` is set by
  -- trusted triggers (see refresh_partner_rating below).
  if auth.uid() is null
     or app.is_platform_staff()
     or coalesce(current_setting('app.internal', true), 'off') = 'on' then
    return new;
  end if;

  if (new.verification_status, new.verified_at, new.verified_by, new.published_at,
      new.commission_bps, new.rejection_reason, new.is_featured,
      new.rating_avg, new.rating_count, new.completed_bookings,
      new.response_rate_bps, new.organization_id, new.slug)
     is distinct from
     (old.verification_status, old.verified_at, old.verified_by, old.published_at,
      old.commission_bps, old.rejection_reason, old.is_featured,
      old.rating_avg, old.rating_count, old.completed_bookings,
      old.response_rate_bps, old.organization_id, old.slug) then
    raise exception
      'Verification, publication, commission and reputation are set by the platform, not the partner'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_partner_platform_fields on partner_profiles;
create trigger trg_partner_platform_fields
  before update on partner_profiles
  for each row execute function app.guard_partner_platform_fields();

-- The rating aggregate legitimately writes rating_avg/rating_count while
-- running as the reviewing user, so it announces itself as internal.
create or replace function app.refresh_partner_rating()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_partner uuid := coalesce(new.partner_id, old.partner_id);
begin
  perform set_config('app.internal', 'on', true);

  update partner_profiles p set
    rating_avg = coalesce(t.avg_rating, 0),
    rating_count = coalesce(t.n, 0)
  from (
    select round(avg(rating)::numeric, 2) avg_rating, count(*) n
    from reviews where partner_id = v_partner and status = 'published'
  ) t
  where p.id = v_partner;

  perform set_config('app.internal', 'off', true);
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------
-- 2. LATENT BUG: reference generation required raw sequence privileges.
--
--    `app.next_ref()` called nextval() as the caller, so a customer
--    inserting a request through their own session hit "permission
--    denied for sequence ref_request_seq". It did not break the product
--    because requests are created server-side, but it made the INSERT
--    policy a lie and would have broken any future user-session insert.
--    SECURITY DEFINER fixes it without handing clients sequence access.
-- ---------------------------------------------------------------------
create or replace function app.next_ref(p_prefix text, p_seq regclass)
returns text
language sql
volatile
security definer
set search_path = app, pg_temp
as $$
  select p_prefix || '-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-'
         || lpad(nextval(p_seq)::text, 5, '0');
$$;

grant execute on function app.next_ref(text, regclass) to authenticated, service_role;
