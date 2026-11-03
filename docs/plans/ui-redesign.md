# UI redesign plan

**Audience:** the next developer or AI agent continuing the redesign. Read [../DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) first; it is the standard every task below is held to. This file is the plan and the handoff.

**Status:** Done in code (2026-11-03). Every task below is built. What is left is checking the database-backed screens in a browser (see "Not yet verified").

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

## Completed 2026-11-03 (tasks 0-7)

| # | Task | What was built | Main files |
|---|---|---|---|
| 0 | Detail pages without a database | `getCatalogCategories` / `getCatalogEventTypes` fall back to copies of seed rows (`src/features/content/fallback.ts`); partner lists show an `EmptyState`. `/events/[slug]` also accepts the five segment keys (`corporate`, `wedding`, `private`, `social`, `government`) and shows a segment landing page, which fixed `/events/corporate` and `/events/private` 404ing even **with** a database | `src/features/content/{fallback,queries}.ts`, `events/[slug]`, `services/[slug]` |
| 1a-d | Services and events pages | Photo heroes, photo category/occasion cards, `PartnerCard` grids, photo CTA | `src/app/(marketing)/{services,events}/**` |
| 1e, g-j | Corporate, how it works, become a partner, about, contact, legal | Photo-led heroes, grey panels, homepage FAQ style, legal pages with a sticky "On this page" list | those pages, `partner-signup-form.tsx` |
| 1f | Partner profile | Airbnb listing layout: photo gallery, sticky quote card, mobile bottom bar, two-column reviews. Layout lives in `partner-profile-view.tsx`; dev-only preview with fake data at `/dev/partner-preview` (404 in production) | `src/app/(marketing)/partners/[slug]/*`, `src/app/(marketing)/dev/partner-preview/page.tsx` |
| 2 | Brief wizard | Centred column, segmented progress bar, rise-in step transitions, `ChoiceTile` and `Pill` controls (local to the wizard), sticky action bar | `event-wizard.tsx` |
| 3 | Date picker | In-house, no new dependency: Radix Popover calendar, keyboard navigation, `YYYY-MM-DD` strings. No `type="date"` left | `src/components/ui/date-picker.tsx` |
| 4 | Auth pages | Light form panel + large photo, sentence-case, ink links | `src/app/(auth)/*`, `src/features/auth/components/*` |
| 5 | App shell | White sidebar with the gliding hover pill (`SidebarNav`), blurred top bar, animated drawer that closes on link tap | `src/components/app/app-shell.tsx`, `page-header.tsx` |
| 6 | Dashboard pages | Old accents and uppercase labels removed; proposal cards side by side; saved partners as photo cards (now uses `cover_image_url`); `saffron` badge tone renders amber, `clay` renders neutral | `src/app/(app)/**`, `src/components/ui/{badge,stat,table,dropdown}.tsx`, feature components |
| 7 | Brand assets | Berry favicon/logo, white manifest, new share image (Figtree TTFs in `src/app/_fonts/`), global error page, GMV chart, email templates | `public/*`, `opengraph-image.tsx`, `global-error.tsx`, `gmv-chart.tsx`, `email.ts` |

Also: the old `/img/*.svg` art is deleted; `supabase/seed_demo.sql` now points demo partner covers at `public/img/photos/`.

Checks: typecheck and lint clean; 64 unit tests pass; 42 e2e pass (8 skipped, need a database); every public page loads at 390 and 1440 with no horizontal scroll, no old art and no native select.

## Not yet verified

These need a Supabase project and a demo login ([LOCAL-DEVELOPMENT.md](../LOCAL-DEVELOPMENT.md)); they were checked by typecheck and lint only:

- Dashboards (`/dashboard`, `/partner`, `/admin`): sidebar hover pill, proposal cards, quote builder, saved partners, Stat tiles, admin GMV chart. Invoice print preview.
- Brief wizard step 1 tiles (event types come from the database; without one step 1 is empty, as before) and the 8 skipped e2e tests.
- Partner sign-up form chips on `/become-a-partner` (form only renders with Supabase).
- Email templates (no preview route).

Small follow-ups: `OCCASION_ICONS` is duplicated in the homepage and the wizard (move to a shared module if a third copy appears); the proposal list marks the newest version "Latest version" because there is no "recommended" field.

---

## Open decisions for the owner

1. **Database-less fallbacks (task 0):** built (service and event pages show built-in content). Say if you would rather they 404 locally.
2. **Real photography:** when real event photos exist, drop them into `public/img/photos/` with the same names.
3. **Brand name:** "Evently BD" is still a placeholder (`src/config/brand.ts` and `brand.*` rows in `system_settings`).
4. **Date picker (task 3):** built in-house, no new dependency.
5. **Event-operations product:** the owner asked whether a tool for event-management companies to run their own operations (staff, run-of-show, vendors) was planned. It was **not** in the original plan; event management only exists as a partner category. Treat it as a separate product decision, not part of this redesign.

## Gotchas

- `ViewTransition` comes from React canary bundled in Next; its types come from `src/types/react-experimental.d.ts`. Transitions belong in `template.tsx` (remounts per navigation), not `layout.tsx`.
- This lucide-react version (1.47) does **not** add `lucide-<name>` classes to icons; mark nudging arrows with `className="icon-nudge"`.
- Tailwind v4: `translate-*` and `scale-*` set the `translate`/`scale` CSS properties, so transitions must list `translate`/`scale`, not `transform`. The IDE suggests canonical classes (`ease-(--ease-out-expo)`, `aspect-20/19`); use them.
- `AGENTS.md` is rewritten by `next dev`; project notes go in `CLAUDE.md` or `docs/`.
- Several dev servers may run on this machine; check which port belongs to this repo before screenshotting.
