# Design system

**Audience:** any developer or AI agent changing UI in this repo. Read this before touching a page or component. The redesign plan that applies it is in [plans/ui-redesign.md](./plans/ui-redesign.md).

---

## The bar

The product sells to top corporate companies in Bangladesh. The owner's reference is **Airbnb**: elegant, calm, photo-led, with smooth, considered interaction everywhere. The owner has rejected, in this order:

| Rejected | Why |
|---|---|
| Original warm "editorial" look (cream, evergreen, saffron, serif) | Looked generic and not premium |
| Quiet luxury / enterprise SaaS / dark gala / Swiss grid mockups | Too plain, generic, wrong colours and fonts, "not event enough" |
| Glossy gradient look | Too glossy and colourful |
| First code pass with no motion | "No interaction at all", native OS dropdowns, page loads "like a 1994 website" |

What was accepted: **white, true greys, one deep berry accent, Figtree, big rounded photos, soft shadows, and motion on every state change.** When unsure, look at the homepage ([src/app/(marketing)/page.tsx](../src/app/(marketing)/page.tsx)) and the header ([site-header.tsx](../src/components/marketing/site-header.tsx)); they are the reference implementation.

Two failure modes to avoid: **plain** (no photos, no depth, no motion) and **loud** (gradients, glow, many colours). Stay between them.

---

## Tokens

All in [src/app/globals.css](../src/app/globals.css) under `@theme`. Never hard-code a colour in a component; use the token classes.

| Role | Token | Value | Use |
|---|---|---|---|
| Text | `ink-900` | `#222222` | Headings, primary text, dark buttons |
| Muted text | `ink-600` / `ink-500` | `#5e5e5e` / `#6a6a6a` | Secondary text, captions (both pass 4.5:1 on white) |
| Lines | `ink-200` / `ink-300` | `#ebebeb` / `#dddddd` | Borders, dividers, input borders |
| Soft surface | `ink-50` / `ink-100` | `#f7f7f7` / `#f0f0f0` | Panels, hover backgrounds |
| Page | `paper` | `#ffffff` | Page background |
| Accent | `brand-700` | `#9b1c45` | Primary buttons, logo, small marks only. Never large fills |
| Gold | `saffron-*` | muted gold | Legacy accent; avoid in new work |
| Rose | `clay-*` | muted rose | Legacy accent; avoid in new work |

- **Font:** Figtree for everything (`--font-sans` and `--font-display` both point to it), loaded in [layout.tsx](../src/app/layout.tsx). Hierarchy comes from weight and size, not a second family. Headings: `font-bold`/`font-extrabold`, tight tracking. Bangla uses Noto Sans Bengali.
- **Radii:** inputs and buttons `rounded-lg`/`rounded-full`; cards and photos `rounded-2xl`; large panels `rounded-3xl`.
- **Shadows:** `shadow-sm` (header when scrolled), `shadow-md` (badges on photos, card hover), `shadow-lg`/`shadow-xl` (menus, popovers, dialogs). Only on things that float.
- **Eyebrows:** `.eyebrow` is sentence case, berry, semibold. Do not use uppercase letter-spaced labels (old style, still present in many files).

## Photography

- Stand-in Unsplash photos live in [public/img/photos/](../public/img/photos/) (README there). Reuse them; replace files by name when real photography arrives.
- The old abstract `/img/*.svg` placeholders are deleted; do not reintroduce abstract art.
- Photos are `next/image` with `fill` + `sizes`, inside a `relative overflow-hidden rounded-2xl` box with a fixed `aspect-*`. Above-the-fold photos get `priority` or `loading="eager"`.
- Never invent partners, ratings, client names or stats on real pages. Real data or a clearly labelled empty state.

---

## Motion system

Defined once in `globals.css` (section "Motion system"). Reuse these, do not invent per-component animations.

| Class / mechanism | What it does | Where it is used |
|---|---|---|
| `PageTransition` via `template.tsx` | Old page fades out (140ms), new rises in (380ms). Header is anchored with `viewTransitionName: 'site-header'` | `(marketing)`, `dashboard`, `partner`, `admin`, `account` templates |
| `.motion-overlay` | Backdrop fades in and out | Dialog, Sheet overlays |
| `.motion-dialog` | Scale + fade in, quicker out | `DialogContent` |
| `.motion-sheet-right` / `-left` | Drawer slides with drawer easing, both ways | `SheetContent` |
| `.motion-pop` | Pops from the trigger (uses Radix transform-origin) | Dropdown menu, Select, DatePicker |
| `.motion-stagger` | Children rise in one after another | Mega-menu lists, mobile drawer, 404 cards |
| `.icon-nudge` | Arrow slides 3px forward when its link/button is hovered | Every "→" CTA |
| `.reveal` | Section eases in as it scrolls into view (CSS scroll timeline, no JS) | Homepage sections |
| `details::details-content` | FAQ answers expand and collapse smoothly | FAQ |
| `active:scale-[0.97]` | Press feedback | Built into `Button` |

Rules:
- Animate only `opacity` and transforms (`translate`, `scale`, `transform`). Exception: the nav hover pill animates `width`.
- Enter slower with `--ease-out-expo`; exit faster with `ease-in`. Micro feedback 100–200ms, elements 200–300ms, page ≤ 500ms.
- Radix overlays animate on **close** too: put the animation on `[data-state='closed']`, Radix waits for it.
- Everything respects `prefers-reduced-motion` (global rule at the bottom of `globals.css`). Keep it that way.

## Interaction patterns (copy these)

- **Photo card:** image zooms to `scale-105` over 700ms on hover; an "Explore →" / "View profile →" white chip rises in bottom-right. See homepage occasion cards and [partner-card.tsx](../src/features/marketplace/components/partner-card.tsx).
- **Nav hover pill:** grey pill glides between items; first hover fades in without sliding (`glide` flag). See `useHoverPill` in the header.
- **Mega-menu:** always mounted, toggled with `inert` and opacity/translate/scale; 70ms open delay, 160ms close delay; Escape returns focus to the trigger. Featured photo card on the right.
- **Search bar (brief):** Airbnb-style pill; segment lifts as a white pill on `focus-within`, bar turns grey, neighbouring dividers fade. See [quick-request-form-client.tsx](../src/features/requests/components/quick-request-form-client.tsx).
- **Sidebar nav (dashboards):** the same gliding grey pill, vertical; active item is an `ink-100` pill with a berry icon. See `SidebarNav` in [app-shell.tsx](../src/components/app/app-shell.tsx).
- **Choice tiles and pills (forms):** selected = `ink-900` border/fill with a check, never a berry fill. See `ChoiceTile` and `Pill` in [event-wizard.tsx](../src/features/requests/components/event-wizard.tsx).
- **Listing page:** photo gallery grid, thin dividers between sections, sticky quote card (bottom bar on mobile). See [partner-profile-view.tsx](../src/app/(marketing)/partners/[slug]/partner-profile-view.tsx).
- **Empty states:** `EmptyState` from `components/ui/feedback.tsx` (grey rounded panel, white icon tile, real next action).

## Components

| Component | File | Notes |
|---|---|---|
| `Button` | `components/ui/button.tsx` | `primary` (berry), `secondary` (white, grey border), `accent` (white, for dark/photo backgrounds), `ghost`, `outline`, `link`, `danger`. Add `rounded-full` for marketing CTAs |
| `Select` | `components/ui/select.tsx` (re-exported from `ui/input`) | **Never use a native `<select>`.** Drop-in: same props and `<option>`/`<optgroup>` children, works with react-hook-form `register`, `Controller` and controlled `value`. A hidden native select stays the source of truth. `variant="bare"` for selects inside a larger control |
| `Input`, `Textarea`, `TakaInput` | `components/ui/input.tsx` | `h-11`, dark focus outline |
| `DatePicker` | `components/ui/date-picker.tsx` | **Never use `type="date"`.** Controlled: `value`/`onChange` with `YYYY-MM-DD` strings (`''` when cleared), `min`/`max`, `onBlur` for react-hook-form `Controller`. Arrow keys, PageUp/PageDown, Home/End. `variant="bare"` inside a larger control |
| `Card` | `components/ui/card.tsx` | `rounded-2xl`, `interactive` adds hover shadow |
| `Dialog`, `Sheet`, `Dropdown` | `components/ui/*` | Animated open and close |
| `EmptyState` | `components/ui/feedback.tsx` | |
| `PartnerCard` | `features/marketplace/components/partner-card.tsx` | Photo-first listing card |
| `NotFoundContent` | `components/shared/not-found-content.tsx` | Root 404 adds its own header; `(marketing)/not-found.tsx` relies on the layout's |

---

## Done means verified in a browser

For every UI task, before calling it done:

1. `npx tsc --noEmit -p .` and `npx eslint src` clean.
2. Screenshots at **1440** and **390** widths; no horizontal scroll (`document.documentElement.scrollWidth === clientWidth`).
3. Hover, open and close every interactive element you touched; confirm the motion actually runs (e.g. `getComputedStyle(el).animationName`).
4. Keyboard: Tab reaches it, Enter/Space activate, Escape closes overlays.
5. `E2E_BASE_URL=http://localhost:<port> npx playwright test e2e/public-site.spec.ts e2e/request-wizard.spec.ts` and `npm run test:unit` pass.
6. Delete `.playwright-mcp/` artifacts.

Local development has **no database** by default: the homepage and the service and event pages fall back to built-in content; partner profiles 404 (use `/dev/partner-preview` to see the layout); dashboards need Supabase and a login. See [LOCAL-DEVELOPMENT.md](./LOCAL-DEVELOPMENT.md).
