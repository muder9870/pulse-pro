# Pulse Pro — Design System Guide (Recommended)

This guide **codifies what the codebase already partially implements** (`index.css`, `tailwind.config.js`, `theme/tokens.js`) and adds **consistency rules** to stop drift. Treat this as the contract for new UI work.

---

## 1. Principles

1. **Single dark-first shell:** Default experience matches `:root` in `frontend/src/index.css` (navy background, purple accent).
2. **Semantic tokens over raw hex:** Use CSS variables in components; never paste `#6C63FF` in JSX except in token definitions.
3. **One accent per screen:** Primary action uses `--accent`; destructive uses `--red`; success uses `--green` / `--teal` as defined in tokens.
4. **Accessible by default:** Visible focus via `:focus-visible`; respect `prefers-reduced-motion`.

---

## 2. Color palette (recommended mapping)

### 2.1 Core (Pulse Pro — primary product theme)

| Token | Value (reference) | Usage |
|-------|-------------------|--------|
| `--bg` | `#080B14` | Page background |
| `--bg2` | `#0D1120` | Elevated shell (header/footer) |
| `--surface` | `#141C2E` | Cards, panels |
| `--surface2` | `#1C2640` | Inputs, secondary surfaces |
| `--border` | `rgba(255,255,255,0.07)` | Default hairline |
| `--border2` | `rgba(255,255,255,0.12)` | Stronger separation |
| `--text` | `#F0F4FF` | Primary text |
| `--text2` | `#8A96B0` | Secondary |
| `--text3` | `#4A5568` | Tertiary / placeholders |
| `--accent` | `#6C63FF` | Primary CTA, links, focus ring |
| `--accent2` | `#8B5CF6` | Hover / gradient end |
| `--teal` | `#00D4A8` | Positive / pipeline “go” |
| `--amber` | `#F59E0B` | Warning / syncing |
| `--red` | `#EF4444` | Error / destructive |

### 2.2 ThemeProvider bridge (`--color-*`)

If `ThemeProvider` remains, **define a one-time mapping** in documentation (and ideally in code):

| Injected `--color-*` | Suggested alias to Pulse |
|---------------------|---------------------------|
| `--color-primary` | Same as `--accent` in dark mode |
| `--color-background` | Same as `--bg` |
| `--color-surface` | Same as `--surface` |
| `--color-text-primary` | Same as `--text` |
| `--color-border` | Derive from `--border` / `--border2` |

**Rule:** New components should use **either** Pulse `--*` **or** `--color-*`, not both in the same file.

### 2.3 Tailwind (`pp-*`)

Use when writing utility-first components:

- `bg-pp-bg`, `text-pp-text`, `border-pp-border`, `bg-pp-accent`, etc.

**Rule:** When adding a color in Tailwind, **also** add/update the same value in `:root` OR read from CSS variable via Tailwind arbitrary value: `bg-[var(--surface)]` to avoid triple duplication.

---

## 3. Typography

| Role | Font | Tailwind / CSS |
|------|------|----------------|
| Display / page titles | Syne | `font-display` / `var(--font-display)` |
| Body | DM Sans | `font-sans` / `var(--font-body)` |
| Code / scores | DM Mono | `font-mono` / `var(--font-mono)` |

### Scale (recommended)

| Name | Size | Usage |
|------|------|--------|
| Eyebrow | 10px, uppercase, 0.08–0.12em tracking | Section labels |
| Body | 14px (`html` base) | Default |
| Card title | 13–14px semibold | Story titles |
| KPI | 22–28px display | Hero metrics |
| Mono meta | 10–11px | Timestamps, IDs |

---

## 4. Spacing system

Base unit **4px** (Tailwind default).

| Token | px | Usage |
|-------|-----|--------|
| `1` | 4 | Tight gaps |
| `2` | 8 | Icon gaps, chip padding |
| `3` | 12 | Card internal gap |
| `4` | 16 | Standard card padding |
| `6` | 24 | Section padding (main `padding: 24px`) |
| `8` | 32 | Large section breaks |

**Layout constants (existing):**

- `--sidebar-w: 220px`
- `--header-h: 54px`
- `--radius: 10px`, `--radius-lg: 14px`

---

## 5. Components — standards

### 5.1 Buttons

- **Primary:** `pp-btn-primary` or `<Button variant="primary" />` with tokens.
- **Secondary:** `pp-btn` or ghost for toolbar.
- **Destructive:** Red border/text consistent with `--red`; never rely on Tailwind `slate-*` alone on dark backgrounds.

### 5.2 Cards

- Prefer `.pp-card` or `.pp-card-sm` from `index.css` for consistency.
- Dashboard custom cards should use the same `border-radius: var(--radius-lg)` and padding 16–18px.

### 5.3 Modals

- **Overlay:** `rgba(0,0,0,0.7)` or `bg-[color:var(--...)]` with backdrop blur—match existing `.modal-overlay` in CSS.
- **Surface:** `var(--bg2)` or `var(--surface)`, **not** `bg-white`, unless the active theme is explicitly light and the rest of the screen matches.

### 5.4 Inputs

- Border `var(--border)`; focus `var(--accent)`.
- Schedule modal currently uses light styling—**non-compliant** with this guide until refactored.

### 5.5 Story / Article card (`StoryCard.jsx`)

**Canonical name in code:** **`StoryCard`** (`frontend/src/components/StoryCard.jsx`). The data model uses “story” / “article” interchangeably (`story.id`, `article_id` in API payloads).

**Layout zones (top → bottom)**

| Zone | Purpose | Rules |
|------|---------|--------|
| **Accent rail** | Brand presence, selection state | Thin gradient or solid `var(--accent)`; avoid rainbow-only hover if it fights score semantics |
| **Header row** | Scanning | **Source + time** first (trust), then **title** (display font), **≤2 lines summary** (optional clamp) |
| **Score / status column** | Editorial priority | Numeric score + **one** workflow pill: e.g. *Ready* / *Review* / *Posted* (limit to one primary state) |
| **Channels** | Platform work | Label: “Channels” or “Generate for” — use **token-based chips** (`--surface2`, `--border2`), not `gray-100`/`bg-white` |
| **Primary action** | Expand / collapse | One **primary** CTA (e.g. “Explore opportunities” / “Collapse insights”), min height **44px** touch target |
| **Secondary** | Blog, extras | Ghost/outline — same height as primary row for alignment |
| **Expanded panel** | Publishing + editors | Background **dark surface** (`rgba(8,11,20,0.5)` or `var(--bg2)`), border `var(--border)` — **never** `bg-gray-50/50` on default theme |

**Typography**

- Title: `font-display`, 15–16px semibold.
- Section labels: 10px uppercase, `letter-spacing`, `var(--text3)`.
- Summary: 12px, `var(--text2)`, line-clamp 2 in list context.

**Business-aligned patterns (product)**

- **State legibility:** Users should see *where* the item is in the pipeline (intake → generated → reviewed → scheduled/posted) without opening the card.
- **Single primary action per card** in collapsed state: expand to work; avoid competing CTAs at equal weight.
- **Scannable list:** F-pattern: source → title → score → channels.
- **Analytics:** If logging engagement (`logEngagement`), define KPIs (e.g. expand rate, generate-by-platform) in analytics docs—UI should not add noisy metrics on the card unless actionable.

**Visual reference**

- Baseline: `docs/frontend-audit/story-card-redesign-preview.html`
- **Alt A (image / reader-style):** `docs/frontend-audit/story-card-alt-a-inoreader-image.html`
- **Alt B (quote + background):** `docs/frontend-audit/story-card-alt-b-quote-background.html`

### 5.6 API fields for pipeline state (backend contract)

`GET /api/stories` returns these **per story** (raw article id = `id`):

| JSON field | Type | Meaning |
|------------|------|---------|
| `review_status` | `none` \| `pending` \| `approved` | Editorial review gate; maps from DB `story_review_status`. |
| `content_approved` | boolean | Explicit approval for scheduling. |
| `needs_review` | boolean | Automation / ops flag (`pipeline_needs_review`). |
| `ready_to_schedule` | boolean | Ready for calendar (can be set via PATCH). |
| `scheduled_at` | ISO string \| omitted | Next upcoming time from `scheduled_posts` (pending / queued / scheduled). |

**Write:** `PATCH /api/stories/<id>/pipeline` with any subset of the same keys (except `scheduled_at`, which is derived).

**Frontend:** `frontend/src/utils/storyState.js` — `getStoryState(story, { generatedContent })` consumes these fields plus merged posts.

---

## 6. Icons

- Library: **Lucide React**.
- Default size: **16px** in lists, **20–24px** in empty states.
- Stroke width: default Lucide; keep consistent per screen.

---

## 7. Motion

- Entry: `animate-fade-in` (200ms), `animate-slide-up` (250ms).
- **Respect** `@media (prefers-reduced-motion: reduce)` — already in `index.css`; do not add infinite animations except for explicit loading indicators.

---

## 8. Accessibility checklist (minimum)

- [ ] Interactive elements have **accessible name** (`aria-label`, visible text, or `aria-labelledby`).
- [ ] Focus visible on keyboard navigation (do not remove `outline` without `focus-visible` replacement).
- [ ] `prefers-reduced-motion` honored for large transitions.
- [ ] Color contrast: **4.5:1** normal text on surfaces; accent on `--bg` verified for CTAs.
- [ ] Modals: focus trap + return focus on close (target: shared `Modal` component).

---

## 9. Anti-patterns (do not ship)

1. **Light-theme Tailwind neutrals** (`bg-white`, `border-gray-200`) on the default dark shell without a themed wrapper.
2. **New hex colors** in JSX outside token files.
3. **Second store** with the same name as global app store hooks.
4. **Raw `fetch('/api/...')`** for new code without going through the API base helper.

---

## 10. File reference map

| Asset | Role |
|-------|------|
| `frontend/src/index.css` | Canonical Pulse variables + component layer |
| `frontend/tailwind.config.js` | `pp-*` + shadcn-compat HSL vars |
| `frontend/src/theme/tokens.js` | JS theme tokens + Electric Azure variants |
| `frontend/src/theme/ThemeProvider.jsx` | Runtime `--color-*` injection |
| `frontend/src/components/ui/*` | Reusable primitives |
| `docs/frontend-audit/story-card-redesign-preview.html` | Static **browser preview** — baseline Pulse card (no build step) |
| `docs/frontend-audit/story-card-alt-a-inoreader-image.html` | **Alt A:** Inoreader-style — hero image + scrim, or thumbnail column |
| `docs/frontend-audit/story-card-alt-b-quote-background.html` | **Alt B:** Featured **quote** + blurred/full-bleed background image, or quote strip + solid body |

---

*Update this guide when tokens change; prefer one PR that syncs CSS + Tailwind + ThemeProvider.*
