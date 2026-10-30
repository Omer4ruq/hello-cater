# Troubleshooting

**Audience:** whoever is debugging at the time. Organised by symptom.

---

## Setup and build

### `Supabase is not configured`

`.env.local` is missing or incomplete, or you edited it without restarting.

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# then restart the dev server — Next reads env at boot
```

### `Missing server environment variables: SUPABASE_SERVICE_ROLE_KEY`

A server action needs the service role. Copy it from **Project Settings → API → service_role**. Never prefix it with `NEXT_PUBLIC_`.

### Build fails with type errors after a schema change

The generated types are stale.

```bash
npm run db:types
npm run typecheck
```

### `next build` fails on a page that reads the database

Pages that need per-user data must not be statically prerendered. Add `export const dynamic = 'force-dynamic'`. Public pages should instead degrade — see `features/content/queries.ts` for the fallback pattern.

### The whole site is unstyled in Safari, fine in Chrome

Almost certainly `upgrade-insecure-requests` in the CSP while serving plain HTTP. Chromium exempts localhost; WebKit does not, so every asset fails.

The directive keys off `NEXT_PUBLIC_APP_URL` starting with `https://`. Check that value for the environment you are running.

---

## Database

### `permission denied for table …`

The role has no `GRANT`, or the migration that grants it has not been applied.

```bash
npm run db:verify      # does the schema build from scratch?
supabase db push       # is the remote up to date?
```

### A query returns no rows, but the data exists

Almost always RLS working correctly. Confirm who you are:

```sql
select auth.uid(), app.is_platform_staff(), app.platform_role();
```

Then check the policy for that table in `supabase/migrations/0013_rls.sql`. If you believe the policy is wrong, add a test in `tests/db/rls.test.ts` that proves it before changing it.

### `permission denied for sequence …`

A default value calls `nextval()` as the caller. Reference generation is handled by `app.next_ref()`, which is `SECURITY DEFINER` for exactly this reason. If you add a new sequence-backed default, wrap it the same way rather than granting raw sequence access.

### `Cannot modify line items of a submitted quote version`

Working as intended. Submitted versions are immutable. Create a new version:

```sql
insert into quote_versions (quote_id, version_no, status, change_summary)
values (<quote>, <current + 1>, 'draft', 'What changed');
```

### `Proposal … has been sent; create a revision instead of editing it`

Same principle. Build a new proposal with `supersedes_id` pointing at the old one. The UI does this automatically when you edit a sent proposal.

### `Illegal booking transition X -> Y`

The state machine in `0008_bookings_events.sql` rejected it. Check the allowed transitions table in [DATABASE.md](./DATABASE.md#events-and-bookings). Partners can only move forward through delivery; cancellation and refund are platform actions.

### `Partner is at capacity (N of M) on <date>` / `Partner has blocked <date>`

Working as intended. Either the partner is genuinely full, or their `daily_event_capacity` is set too low. Check **Admin → Partners → Capability**.

### `Verification, publication, commission and reputation are set by the platform`

A partner session tried to change a platform-owned column. This is the fix for a real privilege-escalation bug — see [SECURITY.md](./SECURITY.md#what-testing-found). Staff should make the change in **Admin → Partners**.

### `Unbalanced ledger group: debit X <> credit Y`

A ledger posting did not balance and was refused. Find the caller and fix the amounts. To check the whole ledger:

```sql
select entry_group,
       sum(case when direction = 'debit' then amount_minor else -amount_minor end) as delta
from financial_transactions
group by entry_group
having sum(case when direction = 'debit' then amount_minor else -amount_minor end) <> 0;
```

Zero rows is healthy.

### `financial_transactions is append-only` / `audit_logs is append-only`

Deliberate. These tables reject `UPDATE` and `DELETE`, including from staff. To reverse a ledger entry, post a compensating one.

### `npm run db:verify` cannot connect

```bash
brew services start postgresql@17
# or
pg_ctl -D /opt/homebrew/var/postgresql@17 start
```

Set `PSQL_BIN` if `psql` is not on your PATH:

```bash
PSQL_BIN=/opt/homebrew/opt/postgresql@17/bin/psql npm run db:verify
```

---

## Authentication

### Reset email links to localhost from production

**Supabase → Authentication → URL Configuration → Site URL** is still `http://localhost:3000`. Set it to the production domain and add the production callback URLs.

### `That sign-in link has expired`

Either it genuinely expired (60 minutes), it was already used, or the redirect URL is not in the allow-list. Add both `/auth/callback` and `/reset-password` for every domain you use.

### Signed in but the dashboard is empty

No data yet, or you are signed in as an account with none. Load the demo seed on a development project:

```bash
supabase db execute --file supabase/seed_demo.sql
```

### Redirected to `/dashboard` when trying to reach `/admin`

Correct behaviour — the account is not staff. Add a row:

```sql
insert into platform_staff (profile_id, role)
values ('<profile-uuid>', 'super_admin');
```

There is deliberately no UI for this.

### Session lost on refresh

The proxy refreshes the auth cookie. Check `src/proxy.ts` is present (Next 16 renamed `middleware.ts` to `proxy.ts`) and that its matcher covers the route.

---

## Payments

### A payment is stuck at `pending`

The gateway never told us, or the verification call failed.

1. Is the delivery recorded?
   ```sql
   select * from payment_events order by received_at desc limit 10;
   ```
   Nothing there means the IPN URL is wrong or unreachable. Check the merchant panel.
2. Is there a failed validation attempt?
   ```sql
   select kind, status, error_message, created_at
   from payment_transactions where payment_id = '<id>' order by created_at;
   ```
3. Finance can settle it manually in **Admin → Payments → Record receipt** once the bank confirms.

### `Amount mismatch` in the logs

The gateway reported a different amount than we recorded. The payment is deliberately **failed and held**, not settled. Investigate before doing anything — this is either a gateway problem or an attempt to tamper.

```sql
select amount_minor, status, failure_reason from payments where reference = '<ref>';
select response_body from payment_transactions where payment_id = '<id>';
```

### Webhooks are not arriving locally

The gateway cannot reach `localhost`. Expose it:

```bash
npx localtunnel --port 3000
```

Then set the IPN URL in the merchant panel to the tunnel hostname.

### Customer paid but the booking is still `pending_payment`

Check the payment actually reached `paid`, then whether settlement ran:

```sql
select p.status, e.paid_minor, e.total_minor
from payments p join events e on e.id = p.event_id
where p.reference = '<ref>';
```

If the payment is paid but `paid_minor` did not move, the settlement step failed — look for a logged error and reconcile.

### A payout cannot be created

The booking is already in a payout (a unique index prevents double payment), or it is not `completed`/`closed` yet.

```sql
select booking_id, payout_id from payout_items where booking_id = '<id>';
select status from bookings where id = '<id>';
```

---

## Email

### Nothing is being sent

With `EMAIL_PROVIDER=console` (the default) that is expected — messages are logged. Check the terminal. For real sending, configure Resend or SMTP.

### Configured, but emails do not arrive

Check the spool first — every attempt is recorded:

```sql
select template_key, to_address, status, last_error, created_at
from outbound_messages order by created_at desc limit 20;
```

- `skipped` — no provider configured
- `failed` — read `last_error`
- `sent` — it left our system; the problem is delivery

### Emails land in spam

Almost always DNS. Verify SPF, DKIM and DMARC for your sending domain, and send from that domain — not from `gmail.com` or an unverified address.

---

## Frontend

### Hydration mismatch warnings

Something renders differently on the server and client. Usual causes: `Date.now()` or `new Date()` during render, reading `window`/`localStorage` in a render path, or a random value. Browser-only reads belong in an effect — see the draft restore in `event-wizard.tsx`.

### Horizontal scroll on mobile

A flex or grid child overflowing. Grid and flex items default to `min-width: auto`, so they refuse to shrink below their content. Add `min-w-0` to the child.

To find it:

```js
[...document.querySelectorAll('*')]
  .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
  .slice(0, 5);
```

### A dialog or dropdown does not open

Radix primitives need `'use client'`. Check the component has it, and that `<DialogTrigger asChild>` wraps exactly one element.

### `Slot failed to slot onto its children`

A `Button` with `asChild` received more than one child. `asChild` forwards styles to a single element — use a real `<button>` if you need a spinner or icon plus text in that position.

---

## Performance

### Dashboard pages are slow

Look for an N+1: a `.map()` issuing a query per row. Use a single query with an embedded select, or `.in()` with a lookup map — `features/partner/queries.ts` has examples of both.

### The marketplace listing is slow

It reads `partner_search_index`, which is denormalised for this. Confirm the filters are hitting it rather than joining the base tables, and that `limit`/`range` are applied.

---

## Getting more detail

```bash
# Local
npm run dev                       # server logs in the terminal

# Production
vercel logs <deployment-url> --follow

# Database
supabase db execute --file /dev/stdin <<'SQL'
select * from audit_logs order by created_at desc limit 20;
SQL
```

The audit log is usually the fastest way to answer "who changed this and when".
