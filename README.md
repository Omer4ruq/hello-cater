# Evently BD

A production-grade **managed marketplace** for catering and event services in Bangladesh.

Not a vendor directory. A customer submits one requirement; the platform shortlists verified partners, collects comparable written quotations, combines them into a single proposal, collects payment, coordinates delivery and settles partners.

> **`Evently BD` is a placeholder brand.** Everything user-visible comes from `src/config/brand.ts` and the `brand.*` rows in `system_settings`. Change those two and the rebrand is done.

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. **It works with an empty `.env.local`** — the public site falls back to built-in content when there is no database. Add Supabase credentials to unlock sign-in, dashboards and the full workflow.

Full setup, including demo accounts: **[docs/LOCAL-DEVELOPMENT.md](./docs/LOCAL-DEVELOPMENT.md)**

---

## What is in here

**Three product surfaces**

- **Public marketplace** — homepage, service and event landing pages, partner search and profiles, a ten-step request wizard, legal pages, full SEO
- **Customer dashboard** — requests, proposals with side-by-side breakdowns, event workspace, payments, invoices, messaging, company accounts with spending limits
- **Partner back-office** — matched request inbox, versioned quote builder, bookings, capacity calendar, customer history, earnings, payouts, reviews, team
- **Admin operations console** — request triage, explainable partner matching, master proposal builder, verification, payments, payouts, disputes, CMS, reports, audit log

**Underneath**

- 85 tables, 240 RLS policies, 19 versioned migrations
- Double-entry ledger; all money as integer poisha, never floating point
- Pure, exhaustively tested pricing and matching engines
- Payment and email provider abstractions, with working offline fallbacks
- 143 unit and database tests, 42 end-to-end tests across Chrome and Safari

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Radix · Supabase (PostgreSQL, Auth, Storage, Realtime) · Vercel · Vitest · Playwright

---

## Commands

```bash
npm run dev             # development server
npm run build           # production build
npm run verify          # lint + typecheck + test + build

npm test                # unit + database tests
npm run test:unit       # pure logic, no database needed
npm run e2e             # Playwright, builds and serves automatically

npm run db:verify       # rebuild the schema on local PostgreSQL and check it
npm run db:types        # regenerate TypeScript types from the schema
npm run db:test:setup   # build the database the security tests run against
```

---

## Documentation

| Document | For |
|---|---|
| [LOCAL-DEVELOPMENT.md](./docs/LOCAL-DEVELOPMENT.md) | Getting it running, demo accounts, everyday commands |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Step-by-step first production deploy — Supabase, Vercel, domain, email, payments |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | How it is put together and why |
| [DATABASE.md](./docs/DATABASE.md) | Schema, conventions, migrations, functions |
| [SECURITY.md](./docs/SECURITY.md) | The security model, and the bugs testing found |
| [PAYMENTS.md](./docs/PAYMENTS.md) | Payment trust model, gateway integration, payouts |
| [BUSINESS-FLOW.md](./docs/BUSINESS-FLOW.md) | What the product actually does, end to end |
| [OPERATIONS.md](./docs/OPERATIONS.md) | Daily runbook for the operations team |
| [PARTNER-ONBOARDING.md](./docs/PARTNER-ONBOARDING.md) | Recruiting and verifying supply |
| [PRODUCTION-CHECKLIST.md](./docs/PRODUCTION-CHECKLIST.md) | Launch day, including the legal items |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Symptom-first debugging |
| [IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) | What was planned, what was built, what was deliberately left out |

---

## Before you take real money

The legal pages ship as **clearly-marked drafts** and display a "pending legal review" banner until you clear it. They were written as a starting point, not as advice.

Have a Bangladesh-qualified lawyer review the Terms, Privacy Policy, Cancellation & Refund Policy and Partner Agreement, and confirm your VAT treatment with an accountant, before launch. The full list is in [PRODUCTION-CHECKLIST.md](./docs/PRODUCTION-CHECKLIST.md#business-and-legal).

---

## Licence

Proprietary. All rights reserved.
