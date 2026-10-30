# Database

**Audience:** developers writing queries or migrations.

PostgreSQL 15+ via Supabase. 85 tables, 240 RLS policies, ~240 indexes, 19 versioned migrations.

---

## Conventions

| Rule | Why |
|---|---|
| UUID primary keys (`gen_random_uuid()`) | No enumerable ids in URLs; safe to generate client-side |
| Money is `BIGINT` in **poisha**, suffixed `_minor` | 1 BDT = 100 poisha. Floating point never touches money |
| Rates are **basis points** (`_bps`), 10000 = 100% | Integer arithmetic, no rounding drift |
| `created_at` / `updated_at` on every mutable table | `updated_at` maintained by trigger |
| Enums for closed sets | The database rejects a typo that a `text` column would accept |
| Human references (`REQ-2026-00001`) alongside UUIDs | What people quote on the phone |
| Helper functions live in the `app` schema | Not exposed through PostgREST unless explicitly wrapped |

---

## Migrations

| File | Contents |
|---|---|
| `0001_foundation` | Extensions, `app` schema, 32 enums, shared triggers, reference generator |
| `0002_identity` | Profiles, organizations, members, platform staff, permissions, RLS helpers |
| `0003_catalog` | Service categories, event types, cuisines, districts → cities → areas |
| `0004_partners` | Partner profiles, documents, coverage, availability, packages, menus, portfolio |
| `0005_requests` | Service requests, service lines, match candidates, invitations, status history |
| `0006_quotes` | Quotes, immutable versions, line items, change requests, total recalculation |
| `0007_proposals` | Master proposals, lines with commission snapshots, immutability guard |
| `0008_bookings_events` | Events, bookings, state machine, capacity guard, tasks, timeline |
| `0009_finance` | Pricing rules, cancellation policies, payments, refunds, invoices, ledger, payouts |
| `0010_messaging_notifications` | Threads, contact masking, notification types, preferences, outbound spool |
| `0011_reviews_support` | Reviews with eligibility guard, favourites, tickets, disputes |
| `0012_cms_settings_audit` | System settings, CMS, FAQs, testimonials, audit log, analytics |
| `0013_rls` | Row Level Security across every table; internal notes extracted |
| `0014_views_functions` | Public views, `accept_proposal`, `submit_quote_version`, summaries |
| `0015_storage` | Seven buckets and their access policies |
| `0016_rate_limits` | Durable rate-limit counters |
| `0017_rpc_surface` | The explicit, reviewable list of client-callable functions |
| `0018_partner_scope_guard` | Fixes partner self-approval; `next_ref` privilege fix |
| `0019_service_context` | `app.is_service_context()`; unblocks trusted server writes |

**Never edit an applied migration.** Add a new one. The schema must be reproducible on a fresh project from these files alone.

---

## Domain map

### Identity

`profiles` mirrors `auth.users` 1:1, created by a trigger on sign-up.

`organizations` covers both sides of the marketplace via `kind` (`customer` | `partner`). `organization_members` carries the role (`owner`/`admin`/`manager`/`staff`), plus corporate controls: `spend_limit_minor` and `requires_approval`.

`platform_staff` is separate from organisation membership — internal roles are not organisation roles.

### Catalogue

`service_categories` is a two-level tree with three roots (Catering, Event Management, Event Vendors) and an optional `commission_bps` override per category.

Locations are `districts → cities → areas`. A city needs both `is_active` and `is_launched` before customers can select it, which is how a new district opens without a deploy.

### Partners

`partner_profiles` is 1:1 with a partner organisation. Verification, publication, commission and reputation columns are **platform-owned** — enforced by `app.guard_partner_platform_fields`.

Coverage is `partner_service_areas`; a row with `area_id IS NULL` means the whole city.

`partner_availability` holds blackout dates and per-day capacity overrides.

### Requests → quotes → proposals

`service_requests` carries a `request_submitted_complete` CHECK: a submitted request must have an event type, date, guest count, city and contact details. Drafts are exempt.

**Quote versioning is the important part.** `quotes` is the container; `quote_versions` are immutable snapshots; `quote_items` belong to a version. Once a version is submitted, items cannot be added, changed or deleted — a revision is a new version. Totals are recomputed by trigger from the items; the client never supplies them.

`proposals` combine quote versions into one customer-facing document. `proposal_lines` snapshot `commission_bps` at build time, so changing a rate later never rewrites an accepted proposal. A sent proposal is immutable; revisions are new rows linked by `supersedes_id`.

### Events and bookings

Accepting a proposal creates **one `event`** (the customer's agreement) and **one `booking` per partner line** (the fulfilment record).

Bookings enforce a state machine — `app.guard_booking_transition` rejects anything not in the allowed set:

```
draft           → pending_payment, confirmed, cancelled
pending_payment → partially_paid, confirmed, cancelled, disputed
confirmed       → in_preparation, in_progress, cancelled, disputed
in_preparation  → ready, in_progress, cancelled, disputed
ready           → in_progress, completed, cancelled, disputed
in_progress     → completed, disputed
completed       → closed, disputed
cancelled       → refunded, closed
disputed        → completed, refunded, cancelled, closed
refunded        → closed
closed          → (terminal)
```

Every transition is written to `booking_status_history`.

`app.guard_partner_capacity` refuses a booking on a blocked date or beyond the partner's declared daily capacity. Cancelled and refunded bookings do not consume capacity.

### Money

`pricing_rules` resolve most-specific-first: organization → partner → category → event type → global. A partial unique index allows exactly one active global rule.

`payments` carry a unique `idempotency_key` so a retry cannot double-charge. `payment_events` is unique on `(provider, provider_event_id)`, which is what makes webhook replay a no-op.

`financial_transactions` is the double-entry ledger. `app.post_ledger_entries()` refuses to commit an unbalanced group. The table is append-only.

`payouts` and `payout_items` settle partners. A partial unique index on `payout_items.booking_id` makes it impossible to pay for the same booking twice. `net_minor = gross_minor − commission_minor + adjustment_minor` is a CHECK, not a convention.

### Messaging

`app.mask_contact_details()` strips phone numbers, emails and WhatsApp links. The trigger writes `body_public` alongside the original `body`; clients can only read the masked copy. Operations can open a channel per thread with `contact_sharing_allowed`.

---

## Functions worth knowing

### RLS helpers (`app` schema, `SECURITY DEFINER`)

`is_platform_staff()`, `platform_role()`, `has_permission(key)`, `is_org_member(org)`, `is_org_admin(org)`, `my_org_ids()`, `is_partner_member(partner)`, `is_partner_admin(partner)`, `my_partner_ids()`, `can_view_request(id)`, `partner_invited_to_request(id)`, `can_view_quote(id)`, `can_view_event(id)`, `partner_on_event(id)`, `in_thread(id)`, `partner_is_public(id)`.

All pin `search_path` to defeat search-path hijacking.

### `app.is_service_context()`

Returns true when the statement runs in a trusted server context. Reads **only** the request's JWT role claim — not `current_user`, which inside a `SECURITY DEFINER` function is the owner, and not `auth.uid() is null`, which an anonymous visitor also satisfies.

### Transactional domain functions

- `app.accept_proposal(proposal, actor)` — creates the event, one booking per partner line, closes losing quotes, opens the thread. All or nothing.
- `app.submit_quote_version(version)` — freezes a version and advances the request.
- `app.post_ledger_entries(entries, description)` — balanced posting or nothing.
- `app.consume_rate_limit(bucket, id, limit, window)` — atomic fixed-window counter.

### The RPC surface

PostgREST only exposes `public`. Migration `0017` declares the exact, reviewable list of client-callable wrappers, each with its own grant:

| Function | Callable by |
|---|---|
| `accept_proposal` | authenticated, service_role |
| `submit_quote_version` | authenticated, service_role |
| `mark_thread_read` | authenticated, service_role |
| `resolve_pricing_rule` | authenticated (returns null unless staff) |
| `health_check` | anon, authenticated, service_role |
| `consume_rate_limit` | **service_role only** |
| `post_ledger_entries` | **service_role only** |
| `prune_rate_limits` | **service_role only** |

Everything else in `app` is unreachable over HTTP.

---

## Views

| View | Purpose |
|---|---|
| `public_partners` | The only partner projection `anon` can read. Definer's rights; commercial and verification columns simply do not exist |
| `partner_search_index` | Denormalised arrays of category/city/area/cuisine ids for marketplace filtering |
| `partner_earnings_summary` | Per-partner lifetime and pending-payout totals |
| `event_financials` | Collected, refunded and outstanding per event |

> Views expose every column as nullable, because PostgreSQL does not carry `NOT NULL` through a view. Narrow once at the query boundary — see `features/matching/service.ts`.

---

## Indexing

Indexes exist on every foreign key, every status column used in a filter, event and service dates, location lookups, and the reference columns people search by. Trigram GIN indexes on `organizations.name`, `partner_profiles.display_name` and `areas.name` support fuzzy search.

Partial indexes carry the intent where it matters, for example:

```sql
create index partner_profiles_public_idx
  on partner_profiles (rating_avg desc, completed_bookings desc)
  where verification_status = 'approved' and published_at is not null;
```

---

## Working on the schema

```bash
# 1. Add a migration
$EDITOR supabase/migrations/0020_your_change.sql

# 2. Rebuild from scratch on local PostgreSQL and confirm it applies
npm run db:verify

# 3. Regenerate types
npm run db:types

# 4. Rebuild the test database and run the security suite
npm run db:test:setup
npm run test:db

# 5. Push
supabase db push
```

`db:verify` uses a shim (`supabase/tests/00_supabase_shim.sql`) that recreates the parts of Supabase's `auth` and `storage` schemas the migrations touch, so the whole schema can be validated on stock PostgreSQL in seconds without Docker. The shim is never applied to a real project.

---

## Seeds

| File | Contents | Production? |
|---|---|---|
| `seed.sql` | Categories, event types, cuisines, Dhaka areas, cancellation policies, default pricing rule, CMS copy, FAQs | **Yes** — idempotent |
| `seed_demo.sql` | 12 accounts, 5 companies, 10 partners, packages, menus, a full request→proposal→event→payment→review pipeline | **Never** |

The demo seed builds records in the same order the application does — quote drafts before line items before submission, proposal draft before lines before sending — because the immutability guards reject anything else. That is a useful property: the seed cannot drift from the real workflow without failing.
