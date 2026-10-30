# Security

**Audience:** developers, and anyone reviewing this before it handles real money.

---

## The model in one sentence

Four independent layers, each written on the assumption that the one above it has a bug: the proxy is convenience, server-side checks are the intent, **Row Level Security is the boundary**, and database triggers enforce what must be true regardless of caller.

| Layer | Where | What it stops | If it fails |
|---|---|---|---|
| 1. Proxy | `src/proxy.ts` | Signed-out users reaching private routes | RLS still returns nothing |
| 2. Server authorisation | `features/auth/session.ts` | Wrong role performing an action | RLS still filters rows |
| 3. Row Level Security | 85 tables, 240 policies | One tenant reading another's data | Nothing below it |
| 4. Triggers & constraints | Migrations `0005`–`0019` | Illegal states, tampered money, self-approval | Nothing below it |

Layer 3 is the one that matters. Layers 1 and 2 exist so failures are graceful and auditable, not so that layer 3 can be skipped.

---

## What testing found

The database test suite (`tests/db/`) runs as the real `anon` and `authenticated` PostgreSQL roles with the JWT claim Supabase sets. Writing it found four genuine defects that code review had not:

### 1. Partner privilege escalation — critical

A partner owner could run:

```sql
update partner_profiles
   set verification_status = 'approved', published_at = now()
 where id = <their own id>;
```

…and it succeeded. The `member_update` policy correctly let a partner admin edit their own row — but RLS is row-level, not column-level, so it also permitted the verification columns. Any partner could bypass verification entirely and appear in the public marketplace wearing a Verified badge, which is the one thing customers are actually paying for.

**Fix** — migration `0018`: a trigger pins the platform-owned columns (`verification_status`, `published_at`, `commission_bps`, `is_featured`, `rating_avg`, `rating_count`, `completed_bookings`, `response_rate_bps`, `organization_id`, `slug`). Partners can still edit everything descriptive.

**Lesson:** whenever a policy grants row-level write to a party who does not own every column, a column guard is required.

### 2. The guards blocked the platform's own writes

`app.guard_partner_booking_scope` and `app.accept_proposal` asked `app.is_platform_staff()`, which reads `auth.uid()`. The service role has no JWT subject, so our own server actions were rejected — admin could not adjust a booking, and `accept_proposal` could not be invoked server-side.

The obvious fix, testing `auth.uid() is null`, would have been **wrong**: an anonymous visitor also has no subject, so it would have handed `anon` the same privileges if a `GRANT` were ever loosened.

**Fix** — migration `0019`: `app.is_service_context()` reads only the request-scoped JWT role claim, which survives `SECURITY DEFINER` and is never `service_role` for an anon or authenticated session.

A first attempt used `current_user`, which the tests immediately caught: inside a `SECURITY DEFINER` function `current_user` is the function *owner*, so the check returned true for everybody.

### 3. Legitimate inserts were blocked by a missing grant

A customer inserting their own request hit `permission denied for sequence ref_request_seq`. `app.next_ref()` called `nextval()` as the caller. It had not broken the product because requests are created server-side — but it made the INSERT policy a lie and would have broken the moment any insert ran under a user session.

**Fix** — `app.next_ref()` is now `SECURITY DEFINER`, so references generate without handing clients raw sequence access.

### 4. A scoring bug that could destabilise rankings

The matching engine's rating signal could exceed 1.0, producing a total score above 100 and making rankings non-comparable. Found by a property-style test sweeping the input space.

**Fix** — the rating signal now blends quality toward a neutral 0.5 in proportion to review volume, and is provably bounded in [0, 1]. A test sweeps 100 combinations and asserts every signal stays in range.

### Bundle inspection found a hardening gap

Grepping the built client bundle for secret names turned up `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `SSLCOMMERZ_STORE_PASSWORD` — as **variable names in a Zod schema**, not values. Next.js only inlines `NEXT_PUBLIC_*`, so no secret could actually have leaked. But `src/lib/env.ts` was reachable from client components, which meant the shape of every secret was published to the browser, and a single careless `NEXT_PUBLIC_` rename later would have turned that into a real leak.

**Fix**: split into `lib/env.ts` (public values only) and `lib/env.server.ts`, marked `server-only` so importing it from a client component is a build error rather than a silent problem. Verified with:

```bash
npm run build && grep -rl "SUPABASE_SERVICE_ROLE_KEY" .next/static/ || echo clean
```

### Cross-browser testing also found two real defects

- **The entire site was unstyled in Safari.** The CSP emitted `upgrade-insecure-requests` for any production build. Chromium exempts localhost; WebKit does not, so every stylesheet and script failed over plain HTTP. The directive now keys off whether the deployment actually serves HTTPS.
- **Horizontal page scroll on mobile.** The wizard's step rail is a grid item, which defaults to `min-width: auto`, so its `overflow-x-auto` never engaged and the whole page scrolled sideways instead.

---

## Row Level Security

Every table in `public` has RLS **enabled and forced**, plus an intentional policy. The `service_role` has an explicit bypass policy; it is the only way to cross tenants.

### Access summary

| Data | anon | Customer | Partner | Staff |
|---|---|---|---|---|
| Catalogue (categories, areas, cuisines) | Read | Read | Read | Manage with `catalog.manage` |
| `partner_profiles` | **No access** | Published only | Own | With `partners.view` |
| `public_partners` view | Read | Read | Read | Read |
| Service requests | No | Own + company | Only if invited | With `requests.view` |
| Match candidates | No | **No** | **No** | With `requests.view` |
| Quotes | No | Via proposal only | Own | With `quotes.view` |
| Proposals | No | Own, once sent | No | With `proposals.manage` |
| Events / bookings | No | Own | Own bookings | With `bookings.view` |
| Payments / invoices | No | Own | Own statements | With `payments.view` |
| Payouts | No | No | Own | With `payouts.view` |
| Pricing rules | No | **No** | **No** | Staff only |
| Internal notes | No | **No** | **No** | Staff only |
| Audit log | No | No | No | With `audit.view` |
| `messages.body` (raw) | No | **No** | **No** | Server only |

### Where RLS was not enough

**Internal notes** are a separate table, not a column. Column-level `GRANT`s cannot distinguish staff from customers, because both are the `authenticated` role.

**Raw message text** — `SELECT` on `messages.body` is revoked from `authenticated`; clients read `body_public`. `INSERT` on `body` *is* granted, since writing a column you cannot read is allowed and is exactly what is wanted.

**Partner commercial columns** — `anon` has no access to `partner_profiles`. The public site reads `public_partners`, a `security_invoker = false` view that exposes only publishable columns.

---

## Permissions

Five platform roles, 28 granular permissions, stored in `permissions` and `role_permissions` — data, not code, so a capability can be granted without a deploy.

| Role | Scope |
|---|---|
| `super_admin` | Everything |
| `ops_admin` | Requests, matching, quotes, proposals, events, bookings |
| `finance_admin` | Payments, invoices, payouts, refunds, reports, audit |
| `support_admin` | Tickets, disputes, reviews, read-only elsewhere |
| `content_admin` | CMS and catalogue only |

The TypeScript mirror in `features/auth/permissions.ts` gives compile-time checking; the database remains the enforcement point.

**Staff are added by inserting a row in `platform_staff`** against an existing account. There is deliberately no self-service screen — privilege escalation is kept off the web surface entirely.

---

## Input validation

Every server action validates with Zod before touching data. The same schemas run client-side for inline feedback, but the server never trusts that.

Never accepted from a client:

- **Prices and totals** — recomputed by the pricing engine, then again by database triggers
- **Commission rates** — resolved from `pricing_rules` server-side
- **Payment amounts** — derived from the event's outstanding balance
- **Organisation ids** — membership is re-checked before use
- **Roles and permissions** — read from the database per request
- **Partner ids** — `requirePartnerAccess` verifies membership

---

## Payments

The full threat model is in [PAYMENTS.md](./PAYMENTS.md). The core rules:

1. **Browser redirects are untrusted.** The gateway returns the customer through their own browser; that payload is attacker-influenceable.
2. **Webhook bodies are untrusted.** `verify_sign` is checked as defence in depth, but SSLCOMMERZ's published documentation does not fully specify its construction, so a mismatch is logged rather than used as the sole rejection criterion.
3. **The Validation API is the only authority.** Every state change makes a server-to-server call with `val_id` and cross-checks the amount, currency and transaction id against our record before marking anything paid.
4. **Confirmation is idempotent.** Redirect, IPN and a manual retry can all arrive for one transaction; `.neq('status','paid')` means only the first moves money. Webhook deliveries are stored against a unique `(provider, provider_event_id)`, so a replay is a no-op.
5. **Amount mismatches are held, not settled.** They fail the payment and alert finance.

---

## Files

Seven buckets; only `public-assets` is public.

Private files are served by `/api/files/[bucket]`, which:

1. Requires a session.
2. Re-checks ownership through the user's own RLS-scoped client — if they cannot see the owning row, they cannot have the file.
3. Mints a **60-second** signed URL and redirects.

Storage policies in migration `0015` enforce the same rules independently, keyed on the first path segment (the owning entity's id). Buckets carry MIME allow-lists and size limits; no bucket accepts executables.

---

## Abuse protection

**Rate limiting** is database-backed (`app.consume_rate_limit`), because an in-memory limiter is useless on serverless where each invocation may be a fresh process. Fixed windows, atomic increment.

| Bucket | Limit |
|---|---|
| Request submission | 5 / hour |
| Contact form | 5 / hour |
| Auth attempts | 10 / 15 min |
| Quote submission | 60 / hour |
| Messages | 120 / hour |
| Payment initiation | 20 / hour |

It **fails open** on infrastructure error: a limiter outage must not take down request submission. The failure is logged.

**Honeypots** on the public request and contact forms. A filled hidden field returns a success-shaped response so the bot cannot tell it was detected.

**Account enumeration** is closed: sign-in failures are generic, and password reset always reports success.

---

## Auditing

Two independent trails.

**Application level** (`audit_logs`) records intent: who did what, why, from which IP and user agent. Written by `recordAudit()` on every privileged action. It never throws — auditing must not be able to fail a business operation.

**Database level** — triggers capture row-level before/after on partner verification, pricing rules, payouts, refunds, role changes and settings.

Both are append-only: `UPDATE` and `DELETE` raise `insufficient_privilege`, including for staff.

---

## Headers

Set in `next.config.ts` for every response:

- `Content-Security-Policy` with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, and an explicit `connect-src`/`form-action` allow-list for Supabase and the gateway
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation and FLoC
- `Strict-Transport-Security` — **only when actually serving HTTPS**
- `X-Powered-By` removed

`'unsafe-inline'` is required for `script-src` by Next's inline bootstrap and for `style-src` by Tailwind's critical CSS. `'unsafe-eval'` is development only.

---

## Known limitations

Honest list, in priority order:

1. **No MFA for staff.** Supabase Auth supports TOTP; it is not wired up. Add it before the team grows past a handful of people.
2. **`verify_sign` verification is advisory.** The Validation API is the real control, which is sound — but a fully specified signature check would be better. Confirm the algorithm with SSLCOMMERZ support.
3. **No automated dependency scanning.** Add Dependabot or Renovate plus `npm audit` in CI.
4. **No penetration test.** The RLS suite is thorough but is written by the same person who wrote the policies. Commission an external review before handling significant volume.
5. **Rate limiting fails open.** Deliberate, but it means a database outage also disables abuse protection.
6. **CSP allows `'unsafe-inline'` for scripts.** A nonce-based policy would be stronger; it conflicts with Next's current inline bootstrap.
7. **Service-role usage is broad in admin paths.** Each call is preceded by a permission check, but a narrower set of `SECURITY DEFINER` functions would reduce the blast radius of a mistake.

---

## Reporting a vulnerability

Email `security@eventlybd.com` with steps to reproduce. Please do not open a public issue.
