# Architecture

**Audience:** developers working on the codebase, and anyone assessing whether the design will hold up.

---

## What this is

A **managed marketplace**, not a directory. The platform sits between customers and independent service providers and takes responsibility for the transaction: shortlisting, collecting comparable written quotations, combining them into one proposal, collecting payment, coordinating delivery and settling partners.

That single product decision drives most of the architecture:

| Because the platform is managed… | …the system needs |
|---|---|
| Operations curate the shortlist | A matching engine that *ranks*, and an admin workflow that *decides* |
| Several vendors, one customer agreement | A master proposal that fans out into per-partner bookings |
| The platform holds the money | A double-entry ledger and a payout workflow it controls |
| Commitments must be provable | Immutable quote versions, an append-only audit log, retained message originals |
| Partners must prefer the platform | A partner back-office good enough to replace their spreadsheets |

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components keep data access on the server; one deployable unit |
| Language | TypeScript, strict | Money and permissions benefit from a type checker |
| UI | Tailwind CSS v4, Radix primitives | Design tokens in CSS; accessible behaviour without reinventing it |
| Database | PostgreSQL via Supabase | Row Level Security is the security model, not an add-on |
| Auth | Supabase Auth | Sessions, email confirmation and password reset without writing them |
| Storage | Supabase Storage | Private buckets with policy-based access and signed URLs |
| Realtime | Supabase Realtime | Message threads update without polling |
| Hosting | Vercel | Matches Next.js; previews per branch |
| Testing | Vitest, Playwright | Unit, real-database, and cross-browser end-to-end |

**A modular monolith, deliberately.** One repository, one deployment, domain-separated internally. At this stage the cost of microservices — network failure modes, distributed transactions, deployment choreography — buys nothing. The `features/` boundaries are where services would later be carved out if that ever becomes necessary.

---

## Layout

```
src/
  app/            routing only — pages compose features, they do not contain logic
  components/
    ui/           design system primitives (button, field, table, money, …)
    app/          dashboard shell, page header, filter toolbar
    marketing/    public site chrome
  features/       one folder per business domain
    <domain>/
      queries.ts     server-only reads
      actions.ts     server actions — the write boundary
      schema.ts      Zod schemas shared by client and server
      engine.ts      pure business logic where one exists
      components/    domain UI
  lib/            cross-cutting: money, dates, env, errors, logger, rate limit, seo
  types/          generated database types
```

### The layering rule

```
page  →  feature query / action  →  Supabase client  →  PostgreSQL (RLS)
```

- **Pages** fetch and compose. No business rules.
- **Queries** are `server-only` reads. They use the request-scoped (RLS-enforced) client.
- **Actions** are the only write path. They validate with Zod, check permissions, then write.
- **Engines** (`pricing/engine.ts`, `matching/engine.ts`) are pure functions with no I/O — which is why they are cheap to test exhaustively.
- **The database** enforces the invariants that must hold no matter what calls it.

---

## The security model, in one page

Four layers. Each assumes the one above it may fail.

1. **`proxy.ts`** refreshes the session and bounces signed-out users away from private routes. *Convenience, not security.*
2. **Server-side authorisation** — `requireUser`, `requirePermission`, `requirePartnerAccess` — runs inside every action before it touches data.
3. **Row Level Security** on all 85 tables, with an intentional policy each. This is the real boundary. A bug in layers 1–2 degrades to "sees nothing", never "sees everything".
4. **Triggers and constraints** enforce what must be true regardless of caller: legal state transitions, immutable submitted quotes, an append-only ledger, capacity limits, review eligibility.

### Two clients, two meanings

```ts
createServerSupabase()  // carries the user's session; every query hits RLS
createAdminSupabase()   // service role; bypasses RLS entirely
```

The admin client is used only after an explicit permission check, or in a trusted context like a verified payment webhook. Whether a statement is running in that trusted context is decided by `app.is_service_context()`, which reads the request's JWT role claim — deliberately *not* `auth.uid() is null`, which an anonymous visitor also satisfies.

### Keeping secrets out of the browser

`lib/env.ts` holds public values only. `lib/env.server.ts` holds the secrets and is marked `server-only`, so importing it from a client component fails the build. Next never inlines a non-public variable, so values could not leak either way — but publishing the *names* of your secrets tells an attacker what to look for, and makes a future careless rename dangerous.

### Where column-level protection was needed

RLS is row-level. Three places needed more:

- **Internal notes** live in their own `internal_notes` table with a staff-only policy, rather than as a column on requests and events. Column grants cannot separate staff from customers — both are the `authenticated` role.
- **Raw message text** — `SELECT` on `messages.body` is revoked from `authenticated`; clients read `body_public`, the contact-masked copy. Only server code with the service role can read the original, for dispute resolution.
- **Partner commercial terms** — `partner_profiles` is not readable by `anon` at all. The public site reads `public_partners`, a definer's-rights view exposing only publishable columns.

---

## Money

**Every monetary value is an integer count of poisha** (1 BDT = 100 poisha), `BIGINT` in the database and `number` in TypeScript. Floating point never touches money.

All arithmetic goes through `src/lib/money.ts`: `applyBps`, `sumMinor`, `allocateByWeight`, `splitEvenly`. Rounding is half-away-from-zero, matching the database's `round()`, so client preview and server result always agree.

### Where amounts are decided

```
Partner quotes a price
        ↓
pricing/engine.ts  (pure, tested)     ← commission, fees, tax, deposit
        ↓
proposal_lines     (commission snapshot per line)
        ↓
Database triggers recompute the totals from the lines
        ↓
bookings           (frozen terms; payable = gross − commission + adjustment, enforced by CHECK)
```

The client never supplies a total. The pricing engine runs on the server, and the database recomputes independently — a tampered request changes nothing.

### The ledger

Every money movement writes a balanced group to `financial_transactions` through `app.post_ledger_entries()`, which refuses to commit if debits and credits disagree. The table is append-only: `UPDATE` and `DELETE` raise.

Accounts: `customer_receivable`, `gateway_clearing`, `platform_revenue`, `partner_payable`, `tax_payable`, `refund_clearing`, `discount_expense`.

---

## The core workflow

```
Customer submits a requirement          service_requests
        ↓
Matching engine scores partners         request_match_candidates   (ranked, explainable)
        ↓
Operations selects and invites          request_partner_invites    (a human decides)
        ↓
Partners accept and quote               quotes → quote_versions → quote_items
        ↓                                        (versions immutable once submitted)
Operations builds a master proposal     proposals → proposal_lines (commission snapshot)
        ↓
Customer accepts                        app.accept_proposal()  ← one transaction
        ↓
        ├─ events      (one commercial agreement)
        └─ bookings    (one fulfilment record per partner)
        ↓
Payment → ledger → delivery → review → payout
```

`accept_proposal` is a single database function on purpose. Creating the event, the bookings, closing the losing quotes and opening the message thread must all happen or none of them — a customer with an accepted proposal and no bookings would be a support incident every time.

---

## Matching

`features/matching/engine.ts` is a pure, rule-based scorer. **It is not machine learning and the product never claims it is.**

- **Hard gates** remove a partner: unverified, not accepting orders, wrong category, outside the service area, date blocked, at capacity, insufficient lead time, guest count outside range.
- **Weighted signals**, each normalised to 0–1: location, service coverage, capacity fit, budget fit, availability, cuisine, event type, rating, reliability, experience.
- **Output** is a 0–100 score plus a breakdown and human-readable reasons, persisted so an operator can see *why* a partner was suggested — and so can an auditor.

Disqualified candidates are kept, with their reason, so operations can see the whole consideration set and override the engine when they know something it does not.

Weights are data, not constants. An AI layer could later re-rank the same candidate set without touching anything else.

---

## Provider abstractions

Two integrations are abstracted behind interfaces so a change of vendor is a new file, not a refactor:

**Payments** (`features/payments/provider.ts`) — `createPayment`, `verifyPayment`, `parseWebhook`, `refundPayment`. Implementations: SSLCOMMERZ and manual/offline. The manual provider is not a stub: corporate customers in Bangladesh genuinely pay by bank transfer, and finance confirming receipt runs the identical settlement path as a gateway callback.

**Email** (`features/notifications/email.ts`) — `send`. Implementations: Resend, SMTP, console. With none configured, messages are logged, so local development exercises the whole notification path.

Deliberately **not** assumed: gateway split settlement. The platform collects in full and controls payouts itself. Split settlement is not reliably available to new merchants here, and it would put partner money on the gateway's schedule rather than ours.

---

## Rendering strategy

| Route group | Strategy | Why |
|---|---|---|
| Marketing pages | ISR (`revalidate`) | Fast and cacheable; content changes without a deploy |
| Category / event / partner pages | SSG + ISR | SEO surface; generated from the live catalogue |
| Wizard, dashboards | `force-dynamic` | Per-user data; nothing cacheable |
| API routes | Dynamic, `no-store` | Money and webhooks must never be cached |

The public site renders without a database: `features/content/queries.ts` falls back to built-in copy on any read failure. An outage degrades the front door to static marketing rather than taking it down. Dashboard queries deliberately do **not** do this — there, failing loudly is correct.

---

## Testing

| Suite | What it proves | Needs |
|---|---|---|
| `tests/unit` | Money, pricing and matching are correct, including edge cases | Nothing |
| `tests/db` | RLS, tenant isolation and every workflow guard actually hold | Local PostgreSQL |
| `e2e` | The product works in Chrome and Safari, desktop and mobile | A build |

The database suite connects as the real `anon` and `authenticated` PostgreSQL roles with the JWT claim Supabase sets, so it tests the policies that will run in production rather than a mock of them. It has already found real bugs — see [SECURITY.md](./SECURITY.md#what-testing-found).

---

## Deliberate constraints

Things that are *not* built, with the reason:

- **No microservices.** Nothing here needs independent scaling; the coordination cost would dominate.
- **No client-side state library.** Server Components plus URL state cover it. Dashboard filters live in the URL, so a filtered view is shareable and survives a refresh.
- **No ORM.** The typed Supabase client plus generated types gives type safety without a second schema definition that can drift.
- **No AI in the MVP.** Interfaces are shaped so a recommendation layer can be added later; adding it now would mean latency and cost on every request for an unproven gain.
- **No headless CMS.** Content lives in the database the application already has, so a copy change is a row update rather than a second system to operate and secure.
