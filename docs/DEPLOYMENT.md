# Deployment

**Audience:** you — comfortable deploying a static Next.js site to Vercel, deploying a full-stack SaaS with a database, auth, payments and background jobs for the first time. Every step has the exact command or the exact button.

Work through it in order. Budget about 90 minutes for staging, then 30 for production once you have done it once.

---

## The shape of what you are deploying

Three services, each doing one job:

| Service | Holds | If it goes down |
|---|---|---|
| **Vercel** | The Next.js app — pages, server actions, API routes, cron | Site is unreachable; data is safe |
| **Supabase** | PostgreSQL, authentication, file storage, realtime | Site loads but nothing works; this is your system of record |
| **SSLCOMMERZ** | Card and mobile-money processing | Online payment fails; offline settlement still works |

Plus optionally an email provider (Resend) and error tracking (Sentry).

**Three environments, never mixed:**

| Environment | Vercel | Supabase project | Payments |
|---|---|---|---|
| Local | `npm run dev` | Your dev project | Sandbox or manual |
| Staging | Preview deployments | A **separate** Supabase project | Sandbox only |
| Production | Production deployment | Production Supabase project | Live |

> **Use two Supabase projects.** They are free to create. Pointing staging at production is how test bookings end up in real financial reports and how a careless `db reset` destroys real data.

---

## 1. Put the code on GitHub

```bash
cd hello-cater
git init                       # skip if already a repo
git add .
git commit -m "Initial commit"
```

Create an empty repository on GitHub (**no** README, .gitignore or licence — you already have them), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

**Before pushing, confirm no secrets are in the repo:**

```bash
git ls-files | grep -E '^\.env' || echo "OK — no env files tracked"
```

If that prints a filename, stop and remove it: `git rm --cached .env.local`.

---

## 2. Create your Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. **Name**: `evently-bd-production` (make a second one called `evently-bd-staging`).
3. **Database password**: generate a strong one and store it in a password manager. You cannot retrieve it later.
4. **Region**: **Southeast Asia (Singapore)** — the lowest latency to Bangladesh.
5. **Create new project**, then wait ~2 minutes.

### Collect the four values you need

**Project Settings → API**:

| Dashboard label | Environment variable | Secret? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` **and** `SUPABASE_URL` | No |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No — RLS protects the data |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | **Yes — bypasses all security** |

---

## 3. Apply the database schema

Install and authenticate the CLI:

```bash
npm install -g supabase
supabase login
```

Link and push. The project ref is the subdomain of your project URL (`https://abcdefgh.supabase.co` → `abcdefgh`):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

You should see each migration from `0001_foundation` through `0019_service_context` applied in order.

### Load reference data

Categories, event types, Dhaka areas, cancellation policies, default pricing and CMS copy. **Safe in production:**

```bash
supabase db execute --file supabase/seed.sql
```

### Do NOT load demo data in production

`supabase/seed_demo.sql` creates accounts with a publicly documented password. Staging only.

### Verify

Supabase dashboard → **Table Editor**. You should see ~85 tables. Check `service_categories` has 46 rows and `areas` has 30.

---

## 4. Configure authentication

**Authentication → URL Configuration:**

- **Site URL**: `https://eventlybd.com` (your real domain; use the Vercel URL until DNS is ready)
- **Redirect URLs** — add each on its own line:
  ```
  https://eventlybd.com/auth/callback
  https://eventlybd.com/reset-password
  http://localhost:3000/auth/callback
  http://localhost:3000/reset-password
  ```
  For staging, also add your preview domain.

> Getting this wrong is the single most common deployment mistake. A password-reset link that redirects to `localhost` from a production email is this setting.

**Authentication → Providers → Email:**

- Enable **Email**
- Enable **Confirm email** for production
- Set **Minimum password length** to `10` to match the application's own rule

**Authentication → Rate Limits:** leave the defaults; they are sensible.

---

## 5. Create the storage buckets

Migration `0015_storage.sql` creates all seven buckets and their access policies automatically. Confirm in **Storage**:

| Bucket | Public? | Holds |
|---|---|---|
| `public-assets` | **Yes** | Logos, cover images, portfolio |
| `partner-documents` | No | Trade licences, NID, bank proof |
| `request-attachments` | No | Customer uploads |
| `quote-attachments` | No | Partner quote attachments |
| `event-documents` | No | Contracts, run sheets |
| `message-attachments` | No | Conversation attachments |
| `invoices` | No | Generated PDFs |

Only `public-assets` may be public. If any other bucket shows "Public", switch it off immediately — private files are served through short-lived signed URLs minted by `/api/files/[bucket]` after an ownership check.

---

## 6. Deploy to Vercel

1. <https://vercel.com> → **Add New → Project** → **Import Git Repository** → pick your repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings alone.
3. **Do not deploy yet** — add the environment variables first.

### Environment variables

**Project Settings → Environment Variables.** Add each one and tick the right environments.

Required for **Production** and **Preview**:

```
NEXT_PUBLIC_APP_URL           https://eventlybd.com        (Production)
NEXT_PUBLIC_APP_URL           https://staging.eventlybd.com (Preview)
NEXT_PUBLIC_SUPABASE_URL      https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY eyJhbGci...
SUPABASE_URL                  https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY     eyJhbGci...                  ← mark as Sensitive
CRON_SECRET                   <see below>                  ← mark as Sensitive
```

Generate the cron secret:

```bash
openssl rand -base64 32
```

> Use your **staging** Supabase keys for Preview and your **production** keys for Production. Vercel keeps them separate; you must not paste the same values into both.

Optional (add when you are ready — the app runs without them):

```
EMAIL_PROVIDER      resend
RESEND_API_KEY      re_...                                  ← Sensitive
EMAIL_FROM          Evently BD <no-reply@eventlybd.com>
PAYMENT_PROVIDER    sslcommerz
PAYMENT_SANDBOX     false                                   (true for Preview)
SSLCOMMERZ_STORE_ID <your store id>
SSLCOMMERZ_STORE_PASSWORD <your store password>             ← Sensitive
SENTRY_DSN          https://...
```

4. Click **Deploy**. First build takes 2–4 minutes.

### Verify the deployment

```bash
curl -s https://<your-app>.vercel.app/api/health | jq
```

Expect:

```json
{
  "status": "ok",
  "checks": {
    "app":      { "ok": true },
    "database": { "ok": true },
    "email":    { "ok": false, "detail": "not configured" },
    "payments": { "ok": false, "detail": "manual settlement only" }
  }
}
```

`status: "ok"` requires the database only — email and payments are allowed to be unconfigured. If `database.ok` is `false`, your Supabase variables are wrong or the schema was not pushed.

---

## 7. Test staging before you touch production

Point a Preview deployment at your **staging** Supabase project, load the demo seed there:

```bash
supabase link --project-ref <staging-ref>
supabase db push
supabase db execute --file supabase/seed.sql
supabase db execute --file supabase/seed_demo.sql
```

Then walk the full path by hand:

1. Open the site signed out. Submit a requirement through `/plan`.
2. Sign in as `ops@demo.eventlybd.test` (`DemoPassword2026!`). The request is in the queue.
3. Open it → **Partners** tab → **Recompute** → select two partners → **Send invitations**.
4. Sign in as `caterer@demo.eventlybd.test`. Accept the invitation, build a quote, submit it.
5. Back as ops: **Proposal** tab → add the quote → set fees → **Save & send to customer**.
6. Sign in as the customer. Review the proposal and **Accept**.
7. Confirm an event and one booking per partner now exist.
8. Pay the deposit (sandbox card, or record it manually as finance).
9. As the partner, advance the booking to **Delivered**.
10. As finance: **Payouts** → create a payout run → approve → mark paid.

If all ten steps work on staging, production will work.

---

## 8. Connect your domain

### In Vercel

**Project Settings → Domains → Add** → enter `eventlybd.com`. Add `www.eventlybd.com` too and set it to redirect to the apex.

### In your DNS provider

Vercel shows the exact records. Typically:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

**Using Cloudflare?** Set the proxy status to **DNS only** (grey cloud) for both records. Orange-cloud proxying in front of Vercel causes redirect loops and breaks certificate issuance.

**Bangladeshi registrars** (BDIX, Exabytes, local resellers) often take longer to propagate. Check with:

```bash
dig eventlybd.com +short
dig www.eventlybd.com +short
```

### SSL

Vercel issues and renews a Let's Encrypt certificate automatically once DNS resolves — usually within minutes, occasionally up to an hour. The domain shows **Valid Configuration** when done. You do nothing.

### After the domain is live

1. Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://eventlybd.com` and **redeploy** (the value is baked in at build time).
2. Update **Site URL** and **Redirect URLs** in Supabase Authentication.
3. Re-check `https://eventlybd.com/api/health`.

---

## 9. Email

Without an email provider the app logs messages instead of sending them. Customers will not receive proposals or receipts, so configure this before launch.

### Resend (simplest)

1. <https://resend.com> → sign up → **Domains → Add Domain** → `eventlybd.com`.
2. Add the DKIM, SPF and DMARC records it gives you to your DNS.
3. Wait for **Verified** (usually under an hour).
4. **API Keys → Create** with *Sending access*. Copy it once.
5. In Vercel:
   ```
   EMAIL_PROVIDER = resend
   RESEND_API_KEY = re_...
   EMAIL_FROM     = Evently BD <no-reply@eventlybd.com>
   ```
6. Redeploy, then confirm `checks.email.ok` is `true` on `/api/health`.

> **Send from your own verified domain.** Mail sent from an unverified domain lands in spam, and a proposal in a spam folder is a lost booking.

### SMTP instead

```
EMAIL_PROVIDER = smtp
SMTP_HOST      = smtp.yourprovider.com
SMTP_PORT      = 587
SMTP_USER      = ...
SMTP_PASSWORD  = ...
```

Every send is recorded in the `outbound_messages` table with its status, so you can audit delivery without leaving the app.

---

## 10. Payments

Full detail, including the security model, is in **[PAYMENTS.md](./PAYMENTS.md)**. The deployment steps:

### Get merchant credentials

1. Apply at <https://sslcommerz.com>. You will need your trade licence, TIN, bank details and company documents. Approval typically takes several working days.
2. They issue **sandbox** credentials first, then **live** ones after review. They are different — do not mix them.

### Configure

Preview (staging):
```
PAYMENT_PROVIDER = sslcommerz
PAYMENT_SANDBOX  = true
SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD = sandbox values
```

Production:
```
PAYMENT_PROVIDER = sslcommerz
PAYMENT_SANDBOX  = false
SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD = live values
```

### Register the callback URLs

In the SSLCOMMERZ merchant panel, set:

| Purpose | URL |
|---|---|
| Success | `https://eventlybd.com/api/payments/callback/success` |
| Fail | `https://eventlybd.com/api/payments/callback/fail` |
| Cancel | `https://eventlybd.com/api/payments/callback/cancel` |
| **IPN** | `https://eventlybd.com/api/payments/webhook/sslcommerz` |

**Enable IPN.** The browser redirect can be lost — the customer closes the tab, the network drops. The IPN is what guarantees you learn about a payment. The application treats both as untrusted hints and confirms every transaction with a server-side validation call before marking it paid.

### Test before going live

With sandbox credentials, run a payment end to end on staging. Confirm:

- The payment row reaches `paid`
- The event's `paid_minor` increases
- Bookings move from `pending_payment` to `confirmed`
- A balanced pair of rows appears in `financial_transactions`
- The customer receives a receipt email

---

## 11. Scheduled jobs

`vercel.json` registers one cron:

```json
{ "path": "/api/cron/maintenance", "schedule": "0 2 * * *" }
```

It runs daily at 02:00 UTC (08:00 Dhaka) and expires stale proposals and invitations, flags overdue invoices and prunes rate-limit rows. It is protected by `CRON_SECRET`; Vercel sends it as a bearer token.

Verify after deploy: **Vercel → your project → Cron Jobs**. Trigger it manually once and check the response.

---

## 12. Monitoring and backups

### Uptime

Point any monitor (Better Stack, UptimeRobot, Pingdom) at:

```
https://eventlybd.com/api/health
```

Alert on non-200. The endpoint returns **503** when the database is unreachable, which is exactly what you want to be paged for.

### Errors

Vercel captures runtime logs automatically (**Deployments → Logs**). For grouped, alertable errors add Sentry:

```bash
npx @sentry/wizard@latest -i nextjs
```

then set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel. The logger already redacts anything that looks like a password, token, key or signature before it leaves the process.

### Backups

Supabase takes **daily automated backups** on paid plans. On the free tier there are none — for a system holding real financial records, move to Pro before launch.

Check: **Database → Backups**.

Take a manual backup before any risky change:

```bash
supabase db dump --file "backup-$(date +%F).sql"
```

Restore:

```bash
psql "<your-connection-string>" -f backup-2026-09-21.sql
```

Test a restore into a scratch project **before** you need it. An untested backup is a hope, not a plan.

---

## 13. Rolling back

### The app

Vercel keeps every deployment. **Deployments → find the last good one → ⋯ → Promote to Production.** Live in seconds, no rebuild.

### The database

Migrations are forward-only. There is no "undo" — that is deliberate, because an automatic rollback of a schema change can destroy data. To reverse a change, write a new migration that reverses it:

```bash
# supabase/migrations/0020_revert_something.sql
```

If a migration has corrupted data, restore from backup. This is why you take one before pushing schema changes to production.

---

## 14. Rotating secrets

Do this immediately if a key is ever exposed, and routinely every 6–12 months.

### Supabase service-role key

1. **Project Settings → API → service_role → Rotate**.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Production and Preview).
3. Redeploy. *The old key stops working the moment you rotate — expect brief errors between step 1 and step 3.* Do it in a quiet window.

### Supabase anon key

Same process, but it also invalidates active sessions, so users must sign in again. Rotate only if genuinely necessary.

### Payment credentials

Issued by SSLCOMMERZ; request new ones through their merchant panel, then update Vercel and redeploy.

### Cron secret

```bash
openssl rand -base64 32
```

Update in Vercel and redeploy. Nothing else references it.

### Database password

**Project Settings → Database → Reset password.** Update anything that uses a direct connection string (your local `.env`, any BI tool). The app itself uses the API keys, not this password.

---

## 15. Going live

Work through **[PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)**. Do not skip the business and legal section — the legal pages ship as clearly-marked drafts and must be reviewed by a Bangladesh-qualified lawyer before you take real money.
