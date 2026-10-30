# Implementation plan

**Audience:** the record of what was planned and what was actually built. Written before implementation, updated at completion.

---

## Starting point

An empty directory. No existing code, stack or constraints to work around — so the plan could optimise for the product rather than for migration.

**Environment available:** Node 24, npm 11, PostgreSQL 17 (installed locally for schema verification), no Docker. That last one shaped two decisions: the type generator introspects PostgreSQL directly instead of using `supabase gen types`, and schema verification runs against local PostgreSQL with a shim for Supabase's `auth`/`storage` schemas.

---

## Phases, and what each delivered

### Phase 1 — Foundation
Next.js 16 App Router + TypeScript + Tailwind v4. Warm editorial design system with tokens for colour, type, spacing, radius, shadow and motion. 19 migrations covering 85 tables, 240 RLS policies and ~240 indexes. Supabase auth with email/password, confirmation and reset. Three application shells.

### Phase 2 — Public website
Homepage with 14 sections. Services and events indexes plus SEO landing pages generated from the catalogue. Marketplace search with URL-driven filters. Partner profiles with packages, menus, portfolio and reviews. Legal pages, CMS-backed, marked as drafts. Sitemap, robots, dynamic OG image, JSON-LD.

### Phase 3 — Customer workflow
Ten-step request wizard with per-step validation, draft persistence and prefill from the homepage. Customer dashboard: requests, proposals, events, payments, invoices, messages, saved partners, company account, support.

### Phase 4 — Partner back-office
Self-service signup with verification pipeline. Dashboard, request inbox, quote builder with versioning, bookings with fulfilment states, calendar with capacity and blackout dates, customers, earnings, payouts, reviews, documents, team.

### Phase 5 — Admin operations
Operations console with GMV chart and funnel. Request workspace combining triage, matching, invitations, quote comparison and the master proposal builder. Partner verification. Customers, quotes, proposals, events, reviews, support, catalogue, locations, CMS, settings, audit log, reports with CSV export.

### Phase 6 — Events, messaging, notifications
Event workspace with tasks, timeline, documents and per-audience visibility. Realtime messaging with contact masking. Notification system with per-type channel preferences and an outbound spool.

### Phase 7 — Money
Pricing engine, double-entry ledger, payment provider abstraction with SSLCOMMERZ and manual settlement, refunds against cancellation tiers, invoicing, payout runs.

### Phase 8 — Reviews, support, reports, CMS
Reviews with database-enforced eligibility. Support tickets and disputes. Reports with export. Database-backed CMS.

### Phase 9 — Testing, security, performance, SEO, accessibility
143 unit and database tests, 42 end-to-end tests across desktop Chrome and mobile Safari. Security headers, rate limiting, honeypots, signed file access. **Testing found and fixed eight real defects** — listed below.

### Phase 10 — Documentation
Twelve documents covering architecture, database, security, deployment, payments, operations, partner onboarding, business flow, troubleshooting, local development and the launch checklist.

---

## Decisions worth recording

| Decision | Why |
|---|---|
| Money as integer poisha | Floating-point money is a defect waiting to happen |
| Modular monolith | Microservices buy nothing at this stage and cost coordination |
| RLS as the security boundary | A bug in application code degrades to "sees nothing" |
| Quote versions immutable | Disputes about what was agreed are the norm in this market |
| Platform collects, platform settles | Gateway split settlement is unreliable here and removes dispute leverage |
| Operations curate the shortlist | Judgement beats a score at low volume; protects partner goodwill |
| Rule-based matching, never called AI | It is explainable and auditable, and claiming otherwise would be dishonest |
| Anonymous request submission | Requiring signup before a non-binding enquiry costs most of the demand |
| Legal pages ship as marked drafts | Better than silently presenting unreviewed terms as final |
| Print-to-PDF invoices | The browser renders them faithfully; a headless renderer is a heavy dependency |
| Generated types via direct introspection | `supabase gen types` needs Docker, which was not available |

---

## What testing found

Writing the tests was not a formality — it found eight genuine defects.

**Database suite:**
1. **Partner privilege escalation (critical)** — a partner could approve and publish themselves, bypassing verification entirely.
2. **Guards blocked the platform's own writes** — admin actions and `accept_proposal` were rejected when run with the service role.
3. **A missing grant blocked legitimate inserts** — reference generation needed raw sequence privileges.

**Unit suite:**
4. **Score could exceed 100** — the matching engine's rating signal was unbounded, making rankings unstable.

**End-to-end suite:**
5. **The entire site was unstyled in Safari** — `upgrade-insecure-requests` applied to any production build, including plain-HTTP local serving.
6. **Horizontal scroll on mobile** — a grid item's default `min-width: auto` defeated its own `overflow-x-auto`.

**Build:**
7. **Button crash** — `asChild` plus a loading spinner gave Radix Slot two children.

**Code review during fixes:**
8. **A `SECURITY DEFINER` service-context check returned true for everyone** — inside a definer function `current_user` is the owner. Caught by the tests within a minute of being written.

---

## Status

| Area | State |
|---|---|
| Database, RLS, triggers | Complete and tested |
| Auth and permissions | Complete |
| Public site and SEO | Complete |
| Request wizard and matching | Complete |
| Customer dashboard | Complete |
| Partner back-office | Complete |
| Admin operations | Complete |
| Pricing, ledger, payouts | Complete |
| Payments | Complete; needs live gateway credentials |
| Email | Complete; needs a provider |
| Messaging and notifications | Complete |
| Reviews, support, CMS, reports | Complete |
| Tests | 143 unit/DB, 42 E2E, all passing |
| Documentation | Complete |

**Not built, deliberately:** staff MFA, a dedicated corporate-portal UI, self-service partner document upload, server-side PDF rendering, SMS/WhatsApp delivery, an AI layer. Each is either premature or blocked on a business decision. See the known-gaps table in [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md#known-gaps-at-launch).
