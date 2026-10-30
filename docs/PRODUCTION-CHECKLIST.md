# Production launch checklist

**Audience:** you, on launch day. Work top to bottom. Do not skip the business and legal section — that is the one that can cost you money or a licence rather than an afternoon.

---

## Technical

### Build and code quality

- [ ] `npm run verify` passes — lint, typecheck, unit + database tests, build
- [ ] `npm run e2e` passes on desktop Chrome **and** mobile Safari
- [ ] `npm run db:verify` applies every migration cleanly from scratch
- [ ] No `TODO`, `FIXME` or placeholder copy on a customer-facing page
- [ ] `git ls-files | grep -E '^\.env'` returns nothing

### Database

- [ ] All 19 migrations applied to the production project (`supabase db push`)
- [ ] `supabase/seed.sql` loaded (categories, event types, Dhaka areas, policies, CMS)
- [ ] **`seed_demo.sql` NOT loaded** — verify: `select count(*) from profiles where email like '%@demo.eventlybd.test'` returns **0**
- [ ] Table Editor shows ~85 tables
- [ ] RLS is enabled on every table:
      ```sql
      select tablename from pg_tables
      where schemaname = 'public' and rowsecurity = false;
      -- must return zero rows
      ```
- [ ] The default pricing rule reflects your actual commercial terms
- [ ] Cancellation policy tiers match what your legal review approved
- [ ] Backups are enabled (**Database → Backups**; requires a paid plan)
- [ ] A restore has been tested into a scratch project

### Authentication

- [ ] **Site URL** is your production domain
- [ ] **Redirect URLs** include `/auth/callback` and `/reset-password` on the production domain
- [ ] Email confirmation is **on**
- [ ] Minimum password length is 10
- [ ] Sign-up tested end to end on production
- [ ] Password reset tested end to end — the email link lands on the production domain, not localhost
- [ ] At least one `super_admin` exists in `platform_staff`
- [ ] Staff accounts use real addresses and strong unique passwords

### Storage

- [ ] All seven buckets exist
- [ ] **Only `public-assets` is public** — check each one
- [ ] A private file downloads through `/api/files/[bucket]` when authorised
- [ ] The same URL returns 404 when signed in as a different user

### Environment variables (Vercel, Production scope)

- [ ] `NEXT_PUBLIC_APP_URL` is the production domain, with `https://` and no trailing slash
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` point at **production** Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set and marked **Sensitive**
- [ ] `CRON_SECRET` set and marked **Sensitive**
- [ ] Preview scope points at **staging** Supabase, not production
- [ ] Redeployed after the last variable change — `NEXT_PUBLIC_*` values are baked in at build time

### Domain and TLS

- [ ] Domain added in Vercel and showing **Valid Configuration**
- [ ] `www` redirects to the apex (or vice versa — pick one)
- [ ] `dig eventlybd.com +short` resolves
- [ ] HTTPS works; HTTP redirects to it
- [ ] If behind Cloudflare, records are **DNS only** (grey cloud)
- [ ] Certificate auto-renewal confirmed (Vercel handles it)

### Payments

- [ ] Live SSLCOMMERZ credentials in Vercel, `PAYMENT_SANDBOX=false`
- [ ] Success, fail, cancel and **IPN** URLs registered in the merchant panel
- [ ] **IPN is enabled**
- [ ] One real low-value transaction completed end to end
- [ ] That payment reached `paid`, the event balance updated, bookings confirmed
- [ ] A **balanced** ledger group exists for it:
      ```sql
      select entry_group, sum(case when direction='debit' then amount_minor else -amount_minor end) d
      from financial_transactions group by entry_group having sum(...) <> 0;
      -- must return zero rows
      ```
- [ ] The receipt email arrived
- [ ] A refund tested on the same transaction
- [ ] Bank account for receiving settlement configured in Admin → Settings

### Email

- [ ] Provider configured; `/api/health` shows `email.ok: true`
- [ ] Sending domain verified with SPF, DKIM and DMARC
- [ ] Test emails land in **inbox**, not spam — check Gmail and at least one local provider
- [ ] `EMAIL_FROM` uses your verified domain
- [ ] Reply-to reaches a monitored mailbox
- [ ] Every template rendered once and read for tone and correctness

### Operations

- [ ] `/api/health` returns 200 with `database.ok: true`
- [ ] Uptime monitor pointed at `/api/health`, alerting on non-200
- [ ] Cron job visible in Vercel → Cron Jobs, and triggered once successfully
- [ ] Error tracking receiving events (if using Sentry)
- [ ] Someone is on call and knows where the runbook is

### Security

- [ ] `npm run test:db` passes against the production **schema** (run it on staging with the same migrations)
- [ ] Security headers present:
      ```bash
      curl -sI https://eventlybd.com | grep -iE 'content-security|x-frame|x-content-type|strict-transport'
      ```
- [ ] `X-Powered-By` absent
- [ ] Signed out, `/dashboard`, `/partner` and `/admin` all redirect to login
- [ ] Signed in as a customer, `/admin` redirects away
- [ ] `robots.txt` disallows the private surfaces
- [ ] Service-role key does not appear in any client bundle:
      ```bash
      npm run build && grep -r "service_role" .next/static/ || echo "clean"
      ```

### SEO

- [ ] `/sitemap.xml` returns 200 and lists the real pages
- [ ] `/robots.txt` points at the sitemap
- [ ] `/opengraph-image` returns a PNG
- [ ] Share a link on WhatsApp and Facebook — the preview looks right
- [ ] Submitted to Google Search Console
- [ ] Every public page has a unique title and description

### Performance and accessibility

- [ ] Lighthouse on `/` — Performance and Accessibility both ≥ 90
- [ ] Homepage, `/plan`, `/partners` and a partner profile checked at 390px width
- [ ] No horizontal scroll on any public page on a phone
- [ ] Full keyboard walk of the request wizard
- [ ] Images have meaningful `alt` text, decorative ones have `alt=""`
- [ ] Skip link works

---

## Content

- [ ] Real brand name applied — or the `Evently BD` placeholder consciously kept
- [ ] `src/config/brand.ts` has your real address, phone and email
- [ ] `system_settings` brand rows match
- [ ] Support phone answers during stated hours
- [ ] Support email reaches a monitored inbox
- [ ] Placeholder artwork in `/public/img/` replaced with real photography, or accepted as a launch compromise
- [ ] Homepage copy reviewed by someone who is not you
- [ ] Testimonials are real, with permission, or removed
- [ ] FAQs answer what customers actually ask
- [ ] All copy proofread for Bangladeshi English usage

---

## Business and legal

> **The legal pages ship as clearly-marked drafts.** They were written as a starting point, not as advice, and they carry a visible "pending legal review" banner until you clear `needs_legal_review`. Do not take real money before a Bangladesh-qualified lawyer has reviewed them.

- [ ] **Terms of Service** reviewed by a Bangladesh-qualified lawyer
- [ ] **Privacy Policy** reviewed, and accurate about what you actually collect
- [ ] **Cancellation & Refund Policy** reviewed, and matches the tiers configured in the database
- [ ] **Partner Agreement** reviewed, and matches the commission you actually charge
- [ ] `needs_legal_review` cleared **only after** sign-off
- [ ] **VAT treatment confirmed with an accountant** — whether you charge VAT, on what base, and at what rate. `finance.default_vat_bps` defaults to 0; that is a placeholder, not advice.
- [ ] Commission rates agreed in writing with every launch partner
- [ ] Settlement timing communicated to partners
- [ ] Company registration, trade licence and TIN in order
- [ ] Merchant agreement with SSLCOMMERZ signed
- [ ] Business bank account able to receive settlement
- [ ] Refund process agreed internally — who can approve what, up to what value
- [ ] Dispute escalation path agreed and documented
- [ ] At least three verified partners per category you are advertising

---

## Launch day

**Before**

- [ ] Take a manual backup: `supabase db dump --file "pre-launch-$(date +%F).sql"`
- [ ] Note the current production deployment id, for a one-click rollback
- [ ] Confirm who is on call

**Deploy**

- [ ] Merge to `main`, confirm the build succeeds
- [ ] `/api/health` returns 200
- [ ] Sign in as each role once
- [ ] Submit one real request and walk it to a proposal

**First 24 hours**

- [ ] Watch Vercel logs for unexpected errors
- [ ] Confirm the first real email delivered
- [ ] Confirm the first real payment settled and the ledger balanced
- [ ] Check the cron ran at 02:00 UTC

**First week**

- [ ] Every request triaged within one working day
- [ ] Every proposal sent within 48 hours of the last quote
- [ ] First payout run completed
- [ ] Review the funnel in Admin → Reports

---

## Known gaps at launch

Ship with these written down, not forgotten:

| Gap | Impact | Plan |
|---|---|---|
| No MFA for staff | Staff account compromise is high-impact | Add TOTP before the team grows |
| `verify_sign` advisory only | Low — the Validation API is authoritative | Confirm the algorithm with SSLCOMMERZ |
| Invoices are print-to-PDF | Works everywhere; no server-side PDF | Add a renderer if volume demands |
| Corporate portal is data-model only | Enterprise feature not yet selling | Build when a customer asks |
| Self-service partner document upload not built | Team attaches documents manually | Fine at low volume |
| No automated dependency scanning | Vulnerable dependency could linger | Add Dependabot |
| Placeholder artwork | Looks intentional but is not photography | Replace with a real shoot |
| No external penetration test | RLS suite is self-authored | Commission before significant volume |

---

## Rolling back

**App** — Vercel → Deployments → last good one → **Promote to Production**. Seconds, no rebuild.

**Database** — migrations are forward-only by design. To reverse, write a new migration. If data is corrupted, restore the backup you took before launch. This is why you took it.
