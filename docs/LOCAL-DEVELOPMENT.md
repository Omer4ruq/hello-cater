# Local development

**Audience:** you, or any developer joining the project. Assumes you can use a terminal and have built a Next.js site before, but have not run a Supabase-backed app locally.

---

## 1. What you need installed

| Tool | Version | Why |
|---|---|---|
| Node.js | 20.11+ (24 LTS recommended) | Runs the app and the tooling |
| npm | 10+ | Ships with Node |
| PostgreSQL | 15+ | Only for the database test suite; the app itself talks to Supabase |
| Docker *(optional)* | — | Only if you want the full Supabase stack locally |

Check what you have:

```bash
node -v
npm -v
psql --version   # optional
```

---

## 2. First run

```bash
git clone <your-repo-url>
cd hello-cater
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

**It works with an empty `.env.local`.** The marketing site, the request wizard UI, the SEO endpoints and the error pages all render, because the content layer falls back to built-in copy when there is no database. Anything that needs real data shows a clear "not configured" message rather than crashing.

To get sign-in, dashboards and the full workflow, connect Supabase — next section.

---

## 3. Connecting Supabase

You need a Supabase project. Creating one takes about three minutes and the free tier is enough for development. Full walkthrough with screenshots-worth-of-detail is in **[DEPLOYMENT.md](./DEPLOYMENT.md#2-create-your-supabase-project)**; the short version:

1. Sign up at <https://supabase.com> → **New project**.
2. Choose the **Singapore** region (closest to Bangladesh).
3. Save the database password somewhere safe — you cannot see it again.
4. Wait for provisioning (~2 minutes).
5. Go to **Project Settings → API Keys** and copy the keys into `.env.local`. Newer projects show a **Publishable key** (`sb_publishable_…`, use it as the anon key) and a **Secret key** (`sb_secret_…`, use it as the service-role key); older ones show `anon` and `service_role`. Either style works. The Project URL is `https://<project-id>.supabase.co` (Project ID is under **Settings → General**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co   # "Project URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...                # "anon public"
SUPABASE_URL=https://xxxxxxxx.supabase.co                # same as the first
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...                    # "service_role" — secret
```

> **The service-role key bypasses all security.** It must never appear in client code, a `NEXT_PUBLIC_` variable, a log line, or a git commit. Treat it exactly like your database password.

6. Add a direct database connection to `.env.local` (used only by the commands below, never by the app). In Supabase click **Connect** and copy the **Session pooler** string; the "Direct connection" host (`db.<ref>.supabase.co`) is IPv6-only on the free plan and usually fails:

```bash
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

7. Apply the schema, then the reference data and (development only) the demo data:

```bash
set -a; . ./.env.local; set +a
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 -f "$f" || break; done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -1 -f supabase/seed.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed_demo.sql   # never on production
```

(`npx supabase link` + `npx supabase db push` also works for the schema if you use the Supabase CLI.)

Restart `npm run dev`.

---

## 4. Demo accounts

Created by `supabase/seed_demo.sql`. **Password for all of them: `DemoPassword2026!`**

| Role | Email | What you can see |
|---|---|---|
| Super admin | `super@demo.eventlybd.test` | Everything |
| Operations | `ops@demo.eventlybd.test` | Request queue, matching, proposals, events |
| Finance | `finance@demo.eventlybd.test` | Payments, invoices, payouts, reports |
| Support | `support@demo.eventlybd.test` | Tickets, disputes, reviews |
| Company admin | `company.admin@demo.eventlybd.test` | ABC Technologies corporate account |
| Company staff | `company.staff@demo.eventlybd.test` | Same company, limited spend |
| Individual customer | `customer@demo.eventlybd.test` | A confirmed holud event |
| Caterer | `caterer@demo.eventlybd.test` | Partner dashboard with live quotes |
| Decorator | `decorator@demo.eventlybd.test` | Partner dashboard |
| Photographer | `photographer@demo.eventlybd.test` | Partner dashboard |

These addresses use the reserved `.test` TLD, so they can never receive real mail.

> **This file must never run against production.** It contains a published password. `seed_demo.sql` refuses to run when the `app.environment` database setting is `production`, but the real protection is not running it.

---

## 5. Everyday commands

```bash
npm run dev            # development server
npm run build          # production build
npm start              # serve the production build

npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # unit + database tests
npm run test:unit      # pure logic only (no database needed)
npm run e2e            # Playwright, builds and serves automatically
npm run verify         # lint + typecheck + test + build, in that order
```

Run `npm run verify` before you push. It is what a reviewer will run.

---

## 6. Working on the database

Migrations live in `supabase/migrations/`, numbered and applied in order. **Never edit an applied migration** — add a new one. The whole schema must be reproducible on a fresh project from these files alone.

### Checking a migration before you push it

The project can rebuild the entire schema on plain PostgreSQL, with a shim standing in for Supabase's `auth` and `storage` schemas. This catches syntax errors, bad constraints and broken policies in seconds, without Docker:

```bash
# Once: install and start PostgreSQL
brew install postgresql@17
brew services start postgresql@17

# Then, any time:
npm run db:verify
```

That drops and rebuilds `evently_check` from `supabase/migrations/*.sql` plus `supabase/seed.sql`. Any error fails the command.

### Regenerating TypeScript types

The types in `src/types/database.ts` are generated from the live schema. After a migration:

```bash
npm run db:types
```

> This uses a direct connection rather than `supabase gen types`, which requires Docker. The output covers tables, views, enums, RPC functions and foreign-key relationships, so embedded selects like `profiles!inner(...)` are type-checked.

### Running the database test suite

```bash
npm run db:test:setup   # builds the `evently_test` database with demo data
npm run test:db         # runs the RLS and workflow suites
```

These are the most valuable tests in the project. They connect as the `anon` and `authenticated` PostgreSQL roles with the same JWT claim Supabase sets, so they exercise the real policies — not a mock of them. They have already caught a partner-privilege-escalation bug and two others; see [SECURITY.md](./SECURITY.md#what-testing-found).

---

## 7. Optional: the full Supabase stack locally

If you have Docker and want Auth, Storage and Realtime running on your machine:

```bash
npx supabase start     # first run downloads several GB
npx supabase db reset  # applies migrations + supabase/seed.sql
```

`supabase start` prints local URL and keys — put them in `.env.local`. Stop with `npx supabase stop`.

This is not required. Most development is faster against a free hosted project.

---

## 8. Email and payments in development

Both degrade deliberately rather than breaking:

- **Email** — with `EMAIL_PROVIDER=console` (the default), messages are printed to your terminal with their subject and a preview instead of being sent. You can see exactly what a customer would receive.
- **Payments** — with `PAYMENT_PROVIDER=manual` (the default), checkout goes to a bank-transfer instructions page, and Finance marks payments received in **Admin → Payments**. This runs the identical confirmation path as a gateway callback, so booking states, the ledger and notifications all behave the same.

To test a real gateway, see [PAYMENTS.md](./PAYMENTS.md).

---

## 9. Project layout

```
src/
  app/
    (marketing)/     public site — home, services, events, partners, legal
    (auth)/          login, register, password reset
    (app)/           dashboard (customer), partner, admin, account, invoices
    api/             health, payments callbacks, file signing, analytics, cron
  components/
    ui/              design-system primitives
    app/             dashboard shell, page header, data toolbar
    marketing/       site header and footer
  features/          business domains — each owns its queries, actions and UI
    auth  requests  matching  quotes  proposals  pricing  payments
    payouts  invoices  messaging  notifications  partner  customer
    admin  marketplace  content  support  audit
  lib/               money, dates, env, errors, logger, rate limiting, seo
  types/             generated database types

supabase/
  migrations/        versioned schema — the source of truth
  seed.sql           reference data, safe in production
  seed_demo.sql      demo accounts and sample pipeline, NEVER in production
  tests/             PostgreSQL shim for local schema verification

tests/unit/          pure logic: money, pricing, matching
tests/db/            RLS and workflow integrity against real PostgreSQL
e2e/                 Playwright, desktop Chrome and mobile Safari
```

The rule of thumb: **anything that decides money or permissions lives in `features/*/actions.ts` or the database, never in a component.**

---

## 10. Common problems

| Symptom | Cause | Fix |
|---|---|---|
| `Supabase is not configured` | No `.env.local`, or you edited it without restarting | `cp .env.example .env.local`, fill it in, restart `npm run dev` |
| `Missing server environment variables` | `SUPABASE_SERVICE_ROLE_KEY` not set | Copy it from Project Settings → API |
| `npm run db:verify` cannot connect | PostgreSQL not running | `brew services start postgresql@17` |
| Types disagree with the database | Schema changed, types not regenerated | `npm run db:types` |
| Dashboard is empty after signing in | Reference and demo seeds not loaded | Run both seed files (section 3) |
| `permission denied for table …` | Working as the wrong role, or a missing policy | See [SECURITY.md](./SECURITY.md) |

More in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
