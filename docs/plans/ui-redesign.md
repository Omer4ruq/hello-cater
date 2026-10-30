# UI redesign plan

**Audience:** the next developer or AI agent continuing the redesign. Read [../DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) first; it is the standard every task below is held to. This file is the plan and the handoff.

**Status:** In progress. Foundation, homepage, header/footer, shared components and partners listing are done. Inner public pages, auth, dashboards and brand assets remain.

---

## How to work this plan

- Take one task at a time, top to bottom (they are ordered by what users see first). Put your name/branch on its `Owner:` line and commit that before coding.
- Each task is "done" only when the **Done when** check passes, including the browser checklist in DESIGN-SYSTEM.md.
- Reuse what exists: tokens, motion classes, `PartnerCard`, `EmptyState`, `Select`, the photo-card pattern. If you need a new pattern, add it to DESIGN-SYSTEM.md in the same commit.
- Start the app with `npm run dev`. Without Supabase, detail pages (`/services/[slug]`, `/events/[slug]`, `/partners/[slug]`) return 404: either connect a database ([LOCAL-DEVELOPMENT.md](../LOCAL-DEVELOPMENT.md)) or do task 0 first.
- Show the owner screenshots after each task. They judge by feel; "it works" is not enough.

---

## Done so far (2026-10-30)

| Area | What changed | Files |
|---|---|---|
| Tokens | Palette remapped (white, true greys, berry `#9b1c45`), Figtree, radii, neutral shadows, sentence-case eyebrow | `src/app/globals.css`, `src/app/layout.tsx` |
| Motion system | Page transitions (React `ViewTransition` in `template.tsx`), overlay/drawer/pop/stagger/nudge/reveal classes, smooth `<details>` | `globals.css`, `src/components/shared/page-transition.tsx`, `src/app/(marketing|app/*)/template.tsx`, `src/types/react-experimental.d.ts` |
| Shared UI | Button, Card, Input restyled; new designed `Select` replacing all native selects; Dialog/Sheet/Dropdown animated; EmptyState restyled | `src/components/ui/*` |
| Header / footer | Nav hover pill, animated mega-menus with icons and a featured photo, staggered mobile drawer, light footer | `src/components/marketing/site-header.tsx`, `site-footer.tsx` |
| Homepage | Airbnb-style brief search bar, occasion icons (from DB), photo occasion cards, partner grid, why-us panel, testimonials, FAQ, photo CTA | `src/app/(marketing)/page.tsx`, `src/features/requests/components/quick-request-form-client.tsx` |
| Partners listing | Photo collage hero, rounded filters, photo-first `PartnerCard` | `src/app/(marketing)/partners/page.tsx`, `src/features/marketplace/components/*` |
| 404 | Single header, photo suggestion cards | `src/app/not-found.tsx`, `src/app/(marketing)/not-found.tsx`, `src/components/shared/not-found-content.tsx` |
| Photos | 10 Unsplash stand-ins | `public/img/photos/` |

Checks at handoff: typecheck and lint clean; 64 unit tests pass; 42 e2e tests pass (8 skipped, need a database); verified in a browser at 1440 and 390.

---

## Remaining tasks

### 0. Detail pages work without a database
```
Task:        Service, event and partner detail pages render built-in content instead of 404 when Supabase is not configured, like the homepage does.
Owner:
Done when:   With an empty .env.local, every link in the header mega-menus opens a real page (no 404).
Files:       src/features/content/queries.ts (fallback data), src/app/(marketing)/services/[slug]/page.tsx, src/app/(marketing)/events/[slug]/page.tsx
Constraints: Fallback copy must not invent partners, ratings or prices. Owner decision pending: confirm this is wanted (see Open decisions).
```

### 1. Inner public pages
One task per page. Each: replace `/img/*.svg` art with photos from `public/img/photos/`, remove dark green/ink hero bands and uppercase letter-spaced labels, apply photo-card and motion patterns, add `.reveal` to sections.

| # | Page | File | Specific notes |
|---|---|---|---|
| 1a | Service detail | `src/app/(marketing)/services/[slug]/page.tsx` | Photo hero, `PartnerCard` grid (already new), dark hero band to remove |
| 1b | Event detail | `src/app/(marketing)/events/[slug]/page.tsx` | Same as 1a |
| 1c | Services index | `src/app/(marketing)/services/page.tsx` | Category photo cards |
| 1d | Events index | `src/app/(marketing)/events/page.tsx` | Occasion photo cards, like homepage |
| 1e | Corporate | `src/app/(marketing)/corporate/page.tsx` | Most important for corporate buyers; dark hero, saffron accents, uppercase labels |
| 1f | Partner profile | `src/app/(marketing)/partners/[slug]/page.tsx` | 520 lines. Photo gallery header (Airbnb listing feel), sticky "Request a quote" card, reviews |
| 1g | How it works | `src/app/(marketing)/how-it-works/page.tsx` | |
| 1h | Become a partner | `src/app/(marketing)/become-a-partner/page.tsx` | Dark hero, saffron accents |
| 1i | About, Contact | `src/app/(marketing)/about/page.tsx`, `contact/page.tsx` | |
| 1j | Legal pages | `src/app/(marketing)/legal/[slug]/page.tsx` | Typography only |

```
Owner:
Done when:   Each page screenshotted at 1440 and 390, no `/img/*.svg`, `bg-brand-9xx`, `saffron-`/`clay-` or `uppercase tracking` left in the file, e2e public-site suite passes.
Constraints: Keep every heading and link text the e2e tests assert (see e2e/public-site.spec.ts).
```

### 2. Brief wizard
```
Task:        Restyle the 10-step request wizard to the new standard: step progress, animated step transitions, photo or icon choice tiles for event type, pill controls.
Owner:
Done when:   e2e/request-wizard.spec.ts passes (with a database, so its 8 skipped tests run), screenshots of every step at 1440 and 390.
Files:       src/features/requests/components/event-wizard.tsx, src/app/(marketing)/plan/page.tsx
Constraints: Prefill from the homepage search bar must keep working (?eventType, date, guests, city). Draft persistence across reload must keep working.
```

### 3. Date picker
```
Task:        Replace native date inputs with a designed, animated date picker (popover calendar), as with Select.
Owner:
Done when:   No `type="date"` left in src; keyboard navigation works; value still a YYYY-MM-DD string to callers.
Files:       new src/components/ui/date-picker.tsx; users: quick-request-form-client.tsx, event-wizard.tsx, data-toolbar.tsx, others found by `grep -rn 'type="date"' src`
Constraints: Ask the owner before adding a dependency (react-day-picker is the usual choice).
```

### 4. Auth pages
```
Task:        Login, register, forgot/reset password: split layout with a photo, light form panel, new inputs.
Owner:
Done when:   Screenshots at 1440 and 390 for all four pages.
Files:       src/app/(auth)/layout.tsx (uses old art and dark brand panel), src/app/(auth)/*/page.tsx, src/features/auth/components/*
```

### 5. Dashboard shell
```
Task:        Restyle the shared app shell (sidebar, top bar, page header, data toolbar) used by customer, partner and admin dashboards.
Owner:
Done when:   One page in each of /dashboard, /partner, /admin screenshotted at 1440 and 390 (needs a database and a demo login, see LOCAL-DEVELOPMENT.md).
Files:       src/components/app/app-shell.tsx, page-header.tsx, data-toolbar.tsx
Constraints: Sidebar active state and hover use the same pill language as the marketing nav.
```

### 6. Dashboard pages
65 pages under `src/app/(app)/`. Most inherit the new look from tokens and shared components; fix the outliers. Files still using old accents or uppercase labels (from `grep`):

- Customer: `dashboard/saved/page.tsx` (old art), `dashboard/payments/page.tsx`, `dashboard/requests/[id]`, `dashboard/events/[id]`
- Partner: `partner/page.tsx`, `quotes/page.tsx`, `quotes/[id]`, `services`, `reviews`, `customers`, `bookings`, `requests/[id]`, `profile`
- Admin: `admin/page.tsx`, `requests/[id]`, `partners/[id]`, `events/[id]`, `reports`, `reviews`
- Shared: `invoices/[id]/page.tsx` (print layout: keep it printable)
- Feature components: `quote-builder.tsx`, `partner-signup-form.tsx`, `payout-run-panel.tsx`, `event-wizard.tsx`, `profile-form.tsx`, `partner-calendar.tsx`, `thread-view.tsx`, `thread-list.tsx`, `notification-list.tsx`, `review-form.tsx`, `badge.tsx` (`saffron`/`clay` tones)

```
Owner:
Done when:   `grep -rlnE "(saffron|clay)-[0-9]|uppercase tracking" src/app/(app) src/features` returns only deliberate uses; customer proposal comparison and quote builder screenshotted.
```

### 7. Brand assets still in old green
```
Task:        Update colours in favicon, logo, web manifest, social share image, global error page, admin chart and email templates.
Owner:
Done when:   `grep -rn "0e4f3c\|0b3e30\|185c4b\|ecbc66" src public` returns nothing.
Files:       public/favicon.svg, public/logo.svg, public/site.webmanifest, src/app/opengraph-image.tsx, src/app/global-error.tsx, src/features/admin/components/gmv-chart.tsx, src/features/notifications/email.ts
```

---

## Open decisions for the owner

1. **Database-less fallbacks (task 0):** should detail pages show built-in content when no database is connected, or is 404 acceptable locally?
2. **Real photography:** when real event photos exist, drop them into `public/img/photos/` with the same names.
3. **Brand name:** "Evently BD" is still a placeholder (`src/config/brand.ts` and `brand.*` rows in `system_settings`).
4. **Date picker dependency (task 3):** approve adding `react-day-picker` or build in-house.
5. **Event-operations product:** the owner asked whether a tool for event-management companies to run their own operations (staff, run-of-show, vendors) was planned. It was **not** in the original plan; event management only exists as a partner category. Treat it as a separate product decision, not part of this redesign.

## Gotchas

- `ViewTransition` comes from React canary bundled in Next; its types come from `src/types/react-experimental.d.ts`. Transitions belong in `template.tsx` (remounts per navigation), not `layout.tsx`.
- This lucide-react version (1.47) does **not** add `lucide-<name>` classes to icons; mark nudging arrows with `className="icon-nudge"`.
- Tailwind v4: `translate-*` and `scale-*` set the `translate`/`scale` CSS properties, so transitions must list `translate`/`scale`, not `transform`. The IDE suggests canonical classes (`ease-(--ease-out-expo)`, `aspect-20/19`); use them.
- `AGENTS.md` is rewritten by `next dev`; project notes go in `CLAUDE.md` or `docs/`.
- Several dev servers may run on this machine; check which port belongs to this repo before screenshotting.
