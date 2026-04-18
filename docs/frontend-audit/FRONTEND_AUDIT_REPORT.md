# Pulse Pro — Full Frontend Audit Report

**Scope:** `frontend/src/**`, `frontend/index.html`, `frontend/vite.config.js`, `frontend/tailwind.config.js`, and wiring to Flask blueprints under `backend/api/routes/`.  
**Method:** Static review of source; no assumptions beyond verified code paths.

---

## Executive summary

The frontend is a **React 18 + Vite 5** SPA using **React Router 6**, **TanStack Query v5**, **Zustand**, and **Tailwind CSS 3**. The product shell is visually cohesive around **CSS variables in `index.css`** (Pulse Pro dark palette). Parallel systems exist for **theme tokens** (`theme/tokens.js` + `ThemeProvider` injecting `--color-*`), **Tailwind `pp-*` colors**, and **raw inline styles**—components pick different layers arbitrarily.

**Most severe issues:** (1) **two different Zustand stores** both exported as `useAppStore` (`src/store/appStore.js` vs `src/stores/appStore.js`), (2) **API path bugs** in `useDataMigration.jsx` and missing backend routes for migration, (3) **UI inconsistency** (dark shell vs light Tailwind modals in `App.jsx` schedule/delete — **still open**).

**Update:** `StoryCard` was rebuilt (pipeline-aware UI, token-only chrome) and **backend pipeline flags** + **`PATCH /api/stories/<id>/pipeline`** were added so `review_status`, `content_approved`, `needs_review`, `ready_to_schedule`, and `scheduled_at` are real contract fields. See **§ 11**.

---

## 1. UI/UX design

### 1.1 Layout consistency

| Observation | Severity | Evidence |
|-------------|----------|----------|
| Main shell (header, sidebar area, main) uses shared `--bg`, `--surface`, `--border` | Positive | `App.jsx` header/main `style` using `var(--*)` |
| `DashboardView.jsx` mixes **large inline style objects** with token vars; pattern duplicated across KPI/intel cards | Medium | Same `card` object repeated; not shared with `pp-card` in CSS |
| Schedule and delete **modals in `App.jsx`** use **light theme only** (`bg-white`, `text-slate-900`, indigo accents) while the app defaults to dark Pulse styling | **High** | `App.jsx` ~1633–1728 |
| `StoryCard.jsx` | **Addressed** | Rebuilt with CSS variables / Pulse tokens; platform chips use `--surface2`, `--border2`, semantic greens/teals. |

### 1.2 Visual hierarchy

- **Strong:** Header eyebrow + display font (`Syne`) for page titles.
- **Weak:** Multiple competing accent systems (purple `--accent`, indigo modals, platform-specific bright Tailwind colors) without a single semantic “primary action” color in all contexts.

### 1.3 Spacing, alignment, padding

- **Positive:** `--sidebar-w`, `--header-h`, `.max-w-7xl` on main content.
- **Issue:** Main padding `24px` inline vs `pp-card` 16–18px—no single spacing scale enforced in JSX.

### 1.4 Typography

- **Fonts:** Google Fonts loaded in `index.html` (Syne, DM Sans, DM Mono)—renders FOUT unless preloaded; no `font-display` strategy in link.
- **Scale:** Base `html { font-size: 14px }` in `index.css`; Dashboard KPI uses 28px display—consistent with hierarchy, but many components use ad hoc `11px`, `10px` uppercase labels.

### 1.5 Color system and contrast

- **Primary palette:** Documented in `:root` in `index.css` (`--bg`, `--accent`, semantic colors).
- **Parallel tokens:** `theme/tokens.js` documents WCAG-oriented colors; `ThemeProvider` writes `--color-primary`, etc.—**not the same hex values** as `--accent` / Pulse shell.
- **Risk:** `Button.jsx` uses `var(--color-*)`; cards in Dashboard use `var(--surface)`—two visual systems on one page.

### 1.6 Accessibility (WCAG basics)

| Item | Severity | Notes |
|------|----------|--------|
| Skip link | Positive | `SkipLink` + `#main-content` |
| Focus | **Medium** | `*:focus { outline: none }` globally in `index.css`; mitigated by `*:focus-visible`—keyboard OK, but custom components must all use focus-visible |
| Modals | Medium | Schedule modal custom toggle: checkbox `className="hidden"`—ensure focus order and SR labels reviewed |
| Live regions | Partial | `ui/LiveRegion.jsx` exists; not verified as wired everywhere for async errors |

### 1.7 Responsiveness

- Sidebar: mobile drawer controlled by `mobileMenuOpen` in `App.jsx`; `lg:hidden` menu button.
- Header: `flex-wrap`, search width `.shell-header-search` with max-width in CSS.
- **Issue:** Duplicate “pipeline ready” UI: some controls `className="hidden"` (dead header controls) vs visible row—**visual noise in code**, possible drift between breakpoints.

### 1.8 Component reusability

- **Positive:** `components/ui/*` (Button, Card, Modal, etc.), Story subfolder split.
- **Negative:** Large **views duplicate behavior** (`DashboardView` vs `ArticlesView` receiving nearly identical prop lists from `App.jsx`).

---

## 2. Component architecture

### 2.1 Folder structure

```
src/
  api/client.js          # fetch wrapper
  components/            # ~100+ files (flat + ui/ + Story/)
  context/               # Pipeline, Audio
  hooks/                 # data + UX hooks
  store/                 # appStore.js (Pulse UI state)  ⚠️
  stores/                # appStore.js (legacy template) + stories, pipeline
  theme/                 # ThemeProvider, tokens
  views/                 # route wrappers + heavy views
```

**Issue:** `store/` vs `stores/` is error-prone and already caused **split imports**.

### 2.2 Duplicate / overlapping modules

| Module | Issue |
|--------|--------|
| `components/Skeleton.jsx` vs `components/ui/Skeleton.jsx` | Two skeleton implementations—risk of inconsistent loading UI |
| `store/appStore.js` vs `stores/appStore.js` | **Same hook name `useAppStore`, different shape**—critical architectural bug |
| `components/ResearchView.jsx` | Used by `views/ResearchView.jsx`; OK pattern |
| `components/PodcastView.jsx` | Wrapped by `views/PodcastView.jsx` |

### 2.3 Props and typing

- **`types.ts` exists** but most components are **untyped `.jsx`**. No PropTypes on large surfaces.
- **`App.jsx` → `DashboardView` / `ArticlesView`:** Extreme **prop drilling** (~35+ props each)—high coupling, hard to test and refactor.

### 2.4 Separation of concerns

- **Positive:** `PipelineProvider` centralizes SSE (`PipelineContext.jsx`).
- **Negative:** Bulk operations, modals, schedule, and stories fetching all concentrated in `App.jsx` (~1750 lines)—violates SRP.

### 2.5 State management

- **Zustand:** `store/appStore.js` — theme resolution, filters, bulk operation state (persist theme only).
- **Zustand:** `stores/appStore.js` — template `preferences`, `ui.modals`, **`ui.notifications`** consumed by **Sidebar only**.
- **React Query:** Stories infinite query, sources—appropriate.
- **Anti-pattern:** Same name `useAppStore` from two modules—developers and bundlers can confuse which store is active.

### 2.6 Code duplication

- Modal overlays duplicated (schedule vs delete)—same Tailwind structure twice in `App.jsx`.
- Dashboard vs Articles: likely duplicated lists/filters—needs consolidation (see views).

---

## 3. Styling system

### 3.1 Tailwind vs global CSS

- **`index.css`:** Large `@layer components` with Pulse-specific classes (`.pp-card`, `.dashboard-hero`, …).
- **`tailwind.config.js`:** Extends `pp-*` palette duplicated as hex (drift risk vs `:root`).
- **Inline styles:** Heavy use in `App.jsx`, `DashboardView.jsx`—bypasses Tailwind purge and design tokens.

### 3.2 Design tokens

- **Sources of truth (3+):** `:root` CSS vars, `tailwind` theme, `theme/tokens.js`.
- **ThemeProvider** sets `--color-*` from `themeTokens`; shell uses `--accent`, `--surface`, etc.—**not unified**.

### 3.3 Theme handling (dark / light)

- `ThemeProvider` supports `light`, `dark`, `electric-azure-*`, `system`.
- Default `getInitialTheme` can return **`light`** while `index.css` defaults to **dark Pulse** background—**first paint / stored theme** can disagree with static CSS until effects run.
- StoryCard platform UI assumes **light** grays—**electric-dark / dark class** themes break consistency.

---

## 4. Performance

### 4.1 Re-renders

- **`AppContent`:** Large component; any parent state change can re-render children. Memoization used for `filteredStories`, `uniqueSources`, but **callbacks** may still churn if not stable.
- **`window` event listeners** (`dashboard-filter`, `open-story-details`) depend on `[stories]` in one effect—**refetches invalidate stories** → effect rebinds; acceptable but worth checking closure staleness (e.g. `setCurrentView` not in deps for stats filter effect—actually intentional URL navigation).

### 4.2 Heavy components

- **`StoryCard`:** Large; memoized—good. Still heavy per row if list is long.
- **Virtualization:** `useVirtualizedStories.js` exists with `react-window`, but **no other file imports it** (only internal example in the same module)—articles list is **not** virtualized in production wiring.

### 4.3 Lazy loading / code splitting

- **Positive:** `lazy()` for `AnalyticsView`, `CalendarView`, `SettingsView`, etc.; `Suspense` with `Skeleton`.
- **Positive:** `DashboardView` eager for first route—reasonable.

### 4.4 API inefficiencies

- **Bulk generate:** Sequential `fetch('/api/generate')` in a loop (`App.jsx`)—latency grows linearly; backend rate limit may apply (`content.py` `@limiter.limit("10 per minute")`)—**risk of throttling** on large selections.
- **ResearchView:** `fetch('/api/stories?limit=100&source=arxiv&sort=score')` bypasses `api` client and React Query—**duplicate cache** vs main stories list.

### 4.5 Bundle size risks

- **`recharts`** pulled with Analytics route only (lazy)—good.
- **`lucide-react`:** Icon imports are per-file; tree-shaking depends on import style—verify named imports (partial bundle bloat if importing entire library).

---

## 5. Code quality

### 5.1 Readability

- **`components/ui/Button.jsx`** uses `process.env.NODE_ENV` for dev warnings; Vite projects typically use **`import.meta.env.DEV`**—verify env polyfill exists in build or switch for consistency.
- **App.jsx** is too long; difficult onboarding.
- Comments reference “Requirement X.X”—useful for traceability, noisy for casual readers.

### 5.2 Naming

- Generally consistent; **major exception:** duplicate `useAppStore`.

### 5.3 Dead code / unused paths

- **Hidden header controls** (`className="hidden"` on export, notifications, etc.)—dead UI or feature flags unclear.
- **`stores/appStore.js`:** Large surface (`resetState`, `openModal`) possibly **unused** if only Sidebar imports it for notifications.

### 5.4 Error handling

- **`api/client.js`:** Parses JSON errors; throws generic `Error`; logs `console.error`.
- **StoryCard:** Some catch blocks **swallow** errors (`/* swallow */`)—debugging difficulty.
- **Pipeline SSE:** Reconnect + polling fallback in `PipelineContext.jsx`—good.

### 5.5 Logging

- `console.log` on pipeline finish (`App.jsx` effect)—should be behind `DEV` or removed for production.
- `console.log` in deep-dive handler (`open-story-details`).

---

## 6. Routing and UX flow

### 6.1 Navigation

- **URL as source of truth:** `currentView` derived from `location.pathname`—good.
- **Aliases:** `/metrics` → `AnalyticsView`; settings shortcuts `/monetization`, `/rss`, etc.—good discoverability.

### 6.2 Flow issues

- **Source select** (`handleSourceSelect`) navigates to `/articles`—may surprise users on mobile when tapping source from dashboard.
- **NotFound:** Catch-all `*` → `NotFoundView`—standard.

### 6.3 Page hierarchy

- Clear shells: Dashboard (home) vs Articles (production) vs Settings cluster.

---

## 7. API integration (frontend + backend sync)

### 7.1 Base URL and client

- **`api/client.js`:** `BASE_URL = import.meta.env.VITE_API_URL || '/api'`.
- **Vite proxy:** `/api` → `localhost:5000` in dev (`vite.config.js`).

### 7.2 Consistency: `api` vs raw `fetch`

| Pattern | Files | Risk |
|---------|-------|------|
| `api.get('/stories?...')` | `useStories.js` | Correct relative to `/api` |
| `fetch('/api/pipeline/...')` | `App.jsx`, `PipelineContext`, many components | **Hardcoded `/api`**—breaks if `VITE_API_URL` is absolute origin without path prefix in some deploys |
| `fetch('/api/...')` in StoryCard, BlogPublisher, etc. | Many | Same as above |

**Deployment note:** If production sets `VITE_API_URL` to full backend URL, **`api` client** respects it; **raw `/api/...` fetch** still targets **same origin** only—**silent breakage** on split hosting unless reverse-proxied.

### 7.3 React Query configuration

- **`main.jsx`:** `refetchOnWindowFocus: false`, `retry: 1`, `staleTime: 5 min`—sensible.
- **`useStories.js`:** Uses deprecated **`cacheTime`** (TanStack Query v5 renamed to **`gcTime`**)—works with compatibility but should be updated.

### 7.4 Critical wiring bugs

| Issue | Severity | Details |
|-------|----------|---------|
| **`useDataMigration.jsx`** | **Critical** | Calls `api.get('/api/migration/check')` → resolves to **`/api/api/migration/check`**. Same for all migration endpoints. |
| **Backend** | **Critical** | No Flask routes for `/api/migration/*` found in `backend/`—feature is non-functional even if paths fixed. |
| **Response shape** | Medium | `useDataMigration` expects `response.data`; **`api.client`** returns **parsed JSON root**, not `{ data: ... }`—logic likely wrong. |

### 7.5 Endpoint alignment (sample)

| Frontend usage | Backend (verified) |
|----------------|-------------------|
| `GET/POST /api/pipeline/*` | `pipeline.py`, `url_prefix="/api/pipeline"` ✓ |
| `GET /api/stories`, `GET /api/stories/sources` | `stories.py`, `url_prefix="/api/stories"` ✓ |
| `POST /api/generate` | `content.py` `@content_bp.post("/api/generate")` ✓ |
| `GET /api/content/...`, `GET /api/audio/...` | `content.py` ✓ |
| `GET/POST /api/schedule` | Confirm `schedule.py` prefix in app (used by App modal) |

---

## 8. Issue register (by severity)

### Critical

1. **Duplicate `useAppStore`** — `src/store/appStore.js` vs `src/stores/appStore.js`; Sidebar imports `stores`, App/Theme import `store`.
2. **`useDataMigration.jsx`** — Double `/api` prefix + wrong response shape + **no backend routes**.

### High

3. **Split API strategy** — `api` client vs raw `fetch('/api/...')` breaks when `VITE_API_URL` points off-origin.
4. **Modaltheming** — Schedule/delete modals light-on-dark-app (jarring, WCAG context changes).
5. ~~**StoryCard platform pills**~~ — **Mitigated** (card rebuilt + tokens; see § 11).

### Medium

6. **Theme token duplication** — `:root` vs `ThemeProvider` vs Tailwind `pp-*`.
7. **App.jsx size** — Maintainability and testability.
8. **Prop drilling** — Dashboard/Articles views.
9. **Global `*:focus { outline: none }`** — Requires discipline on every control.
10. ~~**`cacheTime` → `gcTime`**~~ — **Done** in `useStories` / `usePlatforms` / `useAnalytics`.

### Low

11. **Console logging** in production paths.
12. **Duplicate Skeleton** components.
13. **Hidden header actions** — clutter / uncertain product intent.
14. **Google Fonts** — No `preload`; possible layout shift.

---

## 9. Story / Article card — component name, business context, redesign direction

### 9.1 Component name

- **React component:** `StoryCard` in `frontend/src/components/StoryCard.jsx`.
- **Product language:** Listings are **stories** in the UI; APIs often use **`article_id`** — same entity, different vocabulary.

### 9.2 What the card does today

- **Collapsed:** `StoryHeader`, `StoryMetrics`, **platform generation pills** (`PlatformPill` / `PLATFORM_LIST`), primary **Button** to expand, `BlogPublisher` trigger, optional bulk **Checkbox**.
- **Expanded:** `PublishPanel`, per-platform `ContentEditor`, `MediaPanel`, modals (`QualityModal`, `EditModal`, `TagsModal`).
- **Styling issue:** Large blocks use **light Tailwind** (`border-gray-100`, `bg-gray-50/50`, `border-t border-gray-300`, white ghost buttons) — inconsistent with the Pulse shell.

### 9.3 Business best practices (recommended)

| Practice | Rationale |
|----------|-----------|
| **One primary workflow state** visible on the collapsed card | Reduces decision fatigue in long lists (what to do next). |
| **Source + time above the fold** | Trust and freshness for news/research intake. |
| **Score in a fixed spatial slot** | Supports triage sorting without re-reading titles. |
| **Channels as work queue, not decoration** | Align labels with real publishing destinations; cap simultaneous noisy actions. |
| **Single strong CTA** to open the editorial workspace | “Explore” / “Collapse” pattern is sound; avoid redundant expand paths unless differentiated (e.g. “preview only”). |
| **Define analytics meaning** | `logEngagement` calls need a dashboard story (view → generate → post) or they become vanity metrics. |

### 9.4 Redesign direction

- **Token-based surfaces** for collapsed + expanded: `var(--surface)`, `var(--border)`, `var(--bg2)` for expanded inset — no `bg-white` / `gray-50` defaults.
- **Platform chips:** Dark-safe borders/fills; reserved **brand tints** per platform only when contrast passes on `--surface`.
- **Touch / density:** Keep primary control height ≥ **44px** on mobile.

### 9.5 Visual mock (viewable file)

- **Baseline:** `docs/frontend-audit/story-card-redesign-preview.html` — collapsed + expanded strip (Pulse tokens only).
- **Alt A — Inoreader-style image cards:** `docs/frontend-audit/story-card-alt-a-inoreader-image.html` — hero image + scrim meta, or left thumbnail + text column.
- **Alt B — Quote + background:** `docs/frontend-audit/story-card-alt-b-quote-background.html` — pull-quote hero over blurred image, or quote strip + solid card body.
- **Spec detail:** `DESIGN_SYSTEM_GUIDE.md` § 5.5.

---

## 10. Positive highlights (non-exhaustive)

- Centralized **SSE pipeline** in `PipelineContext` (single connection).
- **Skip link**, **Focus-visible** treatment, **reduced-motion** block in `index.css`.
- **Lazy routes** + **Suspense** for non-dashboard sections.
- **Feature error boundaries** on several views.
- **`api/client`** abstraction exists—should be extended as the single HTTP layer.

---

## 11. Implementation delta (since initial audit)

The following shipped after the original audit and should be treated as **current product behavior**:

| Area | Change |
|------|--------|
| **StoryCard** | Rebuilt as a pipeline-aware card: zones for header, score + state pill, **Channels**, **single primary CTA** from `getPrimaryAction(getStoryState(...))`, secondary expand / blog / tags. Styling uses **`index.css` variables** only (no `bg-white` / `gray-*` / `slate-*` on the card shell). |
| **`frontend/src/utils/storyState.js`** | Central state machine: `mergePostSnapshots`, `getStoryState`, `getPrimaryAction`, `getPlatformChannelStatus`. |
| **Backend pipeline flags** | `ProcessedArticle` fields: `story_review_status`, `content_approved`, `pipeline_needs_review`, `ready_to_schedule`. Exposed on each story as `review_status`, `content_approved`, `needs_review`, `ready_to_schedule`. |
| **`scheduled_at`** | Computed from `scheduled_posts` (next pending/queued/scheduled row per processed article). |
| **API** | `PATCH /api/stories/<raw_article_id>/pipeline` with JSON body (any of): `review_status`, `content_approved`, `needs_review`, `ready_to_schedule`. Returns updated story object. |
| **Frontend client** | `api.patch()` in `frontend/src/api/client.js`. **Approve** primary action calls PATCH then invalidates React Query `['stories']`. |
| **DB migration** | **Docker/Postgres:** Alembic revision `migrations/versions/b3f4a5c6d7e8_add_story_pipeline_columns.py` (runs via `entrypoint.sh` → `alembic upgrade head`). **Init:** `backend/database/init.sql` includes the columns for fresh volumes. **Legacy:** `backend/migrations/add_story_pipeline_flags.py` remains as a one-off helper for non-Alembic / SQLite setups. |
| **React Query v5** | `cacheTime` renamed to **`gcTime`** in `useStories.js`, `usePlatforms.js`, `useAnalytics.js`. |

**Still open from original audit:** duplicate `useAppStore` (T1), `useDataMigration` paths/backend (T2), centralized fetch vs `VITE_API_URL` (T3), light modals in `App.jsx` (T5), ThemeProvider vs `:root` drift (T7), etc.

---

*This report is derived from repository state at audit time; line numbers refer to the reviewed files and may shift after edits.*
