# Pulse Pro — Frontend Task & Specification File

**Purpose:** Single checklist for UI/UX work, refactors, QA, and polish.  
**Stack:** React 18, Vite 5, React Router 6, TanStack Query 5, Zustand 4, Tailwind 3.4, Lucide icons, Recharts, Vitest + Testing Library.  
**Entry:** `frontend/src/main.jsx` → `App.jsx`  
**Styles:** `frontend/src/index.css` (Tailwind + CSS variables), `frontend/src/global.css` (utilities)  
**Production:** Nginx serves Vite build (`frontend/Dockerfile`); `VITE_API_URL=/api` in Compose.

---

> **How to read this file**
>
> - `[ ]` = not started · `[x]` = done · `[~]` = in progress
> - 🆕 = new task added during review
> - ⚠️ = flagged issue / needs decision
> - Priority tags: `[P1]` critical · `[P2]` important · `[P3]` nice-to-have

---

## 1. Repository & Tooling


| #   | Status | Priority | Task                                             | Notes                                                                                   |
| --- | ------ | -------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 1.1 | [x]    | P2       | Keep `package.json` scripts documented in README | Table added with all 11 scripts (`dev`, `build`, `lint`, `test`, etc.)                  |
| 1.2 | [x]    | P1       | Align ESLint with team rules                     | `.eslintrc.cjs` created with React, Hooks, Refresh plugins; `--max-warnings 0` enforced |
| 1.3 | [x]    | P1       | Run `npm run type-check` in CI                   | `.github/workflows/ci.yml` — runs lint, format-check, type-check, tests, build on PR    |
| 1.4 | [x]    | P2       | Pin or routinely audit dependencies              | Versions documented: React Query ^5.95.2, Vite ^5.0.8, Tailwind ^3.4.0                  |
| 1.5 | [x]    | P2       | Document Node version                            | `.nvmrc` (v20), `engines` field in `package.json` — node>=20.0.0, npm>=10.0.0           |
| 1.6 | [x]    | P2       | 🆕 Add `prettier` config and format check in CI  | `.prettierrc` created; `format` and `format:check` scripts added                        |
| 1.7 | [x]    | P3       | 🆕 Add `CONTRIBUTING.md` with dev setup steps    | Complete guide with setup, coding standards, testing, and PR checklist                  |


---

## 2. Design System & Tokens


| #   | Status | Priority | Task                                 | Detail                                                                                                                                                     |
| --- | ------ | -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | [x]    | P1       | **Single source of truth for color** | `index.css` `:root` / `.dark` HSL tokens (`--primary`, `--destructive`, …) vs hard-coded Tailwind (`indigo-600`, `#0f172a`) — pick one pattern and migrate |
| 2.2 | [x]    | P2       | **Brand gradient**                   | `--brand-gradient` documented: 135deg #667eea → #764ba2 — use for hero/CTA                                                                                 |
| 2.3 | [x]    | P2       | **Radius**                           | `--radius` (0.5rem=8px) — documented scale: cards rounded-2xl, buttons rounded-xl                                                                          |
| 2.4 | [x]    | P3       | **Shadows**                          | Added `.shadow-elevation-sm` to `2xl` utility classes mapped to CSS vars                                                                                   |
| 2.5 | [x]    | P1       | **Semantic colors**                  | `--success`, `--warning`, `--error`, `--info` — map to toasts, badges, pipeline status                                                                     |
| 2.6 | [x]    | P2       | **Spacing scale**                    | Documented: Tailwind 4px base, max-w-7xl (80rem) dashboard, spacing vars --space-1 to --space-12                                                           |
| 2.7 | [x]    | P1       | **Dark mode**                        | `html.light` / `html.dark` + Zustand `activeTheme`; verify every view in both modes                                                                        |
| 2.8 | [x]    | P2       | **Glass / scrollbar**                | `.custom-scrollbar` applied to Sidebar overflow regions; `.glass-effect` defined in global.css                                                             |
| 2.9 | [x]    | P2       | **Create a token reference page**    | `/dev/tokens` route created — shows all CSS vars, colors, spacing, typography, shadows, radius                                                             |


> **Decision needed (2.1):** The mix of CSS variable tokens and hard-coded Tailwind classes is the biggest design debt right now. Recommend migrating to CSS variables first (task 2.1) before doing any new component styling work — otherwise every new component inherits the inconsistency.

---

## 3. Typography


| #   | Status | Priority | Task                              | Detail                                                                                                         |
| --- | ------ | -------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 3.1 | [x]    | P2       | Reduce overuse of `font-black`    | Audited: 52 instances across 12 files; reserved for single H1 per view; Sidebar count badges → `font-bold`     |
| 3.2 | [x]    | P1       | **Type scale**                    | Documented in `index.css`: page-title (text-3xl), section-title (text-xl), body (text-base), caption (text-xs) |
| 3.3 | [x]    | P2       | **Line length**                   | Documented in CSS: `max-w-prose` (65ch) for readable paragraphs                                                |
| 3.4 | [x]    | P2       | **Line height**                   | Documented in CSS: `leading-relaxed` (1.625) on paragraph blocks                                               |
| 3.5 | [x]    | P2       | **Uppercase labels**              | Documented: Keep `uppercase tracking-widest` ONLY for tiny nav section labels (text-[9px])                     |
| 3.6 | [x]    | P3       | **Optional web font**             | Plus Jakarta Sans loaded from Google Fonts with `display=swap`                                                 |
| 3.7 | [x]    | P2       | 🆕 **Document type scale in CSS** | Add a comment block in `index.css` mapping class names to semantic roles (page-title, body, caption etc.)      |


---

## 4. Layout & Shell (`App.jsx`)


| #   | Status | Priority | Task                         | Detail                                                                                                         |
| --- | ------ | -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 4.1 | [x]    | P1       | **URL as source of truth**   | `pathToView` / `navigate` — no duplicate state that drifts from URL                                            |
| 4.2 | [x]    | P1       | **Lazy routes**              | `Suspense` + `<Skeleton type="page" />` fallback for all lazy-loaded views                                     |
| 4.3 | [x]    | P1       | **Mobile header**            | Menu toggle (lg:hidden), search (sm:block), QuickActions — tap targets ≥ 44px                                  |
| 4.4 | [x]    | P2       | **Main landmark**            | `<main id="main-content" tabIndex={-1}>` — skip link target present                                            |
| 4.5 | [x]    | P1       | **Toast provider**           | Wrap order: ToastProvider → [AppContent, ToastWrapper] — no double providers                                   |
| 4.6 | [x]    | P1       | **React Query**              | Default `staleTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false` — documented per feature                  |
| 4.7 | [x]    | P2       | 🆕 **Global error boundary** | Wrap `App` in top-level `ErrorBoundary` so uncaught render errors show a friendly fallback, not a blank screen |
| 4.8 | [x]    | P2       | 🆕 **Route 404 fallback**    | `*` catch-all route showing a "Page not found" view with a link back to dashboard                              |


---

## 5. Navigation (`components/Sidebar.jsx`)


| #   | Status | Priority | Task                    | Detail                                                                                                             |
| --- | ------ | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 5.1 | [x]    | P1       | **Parity with routes**  | Add **Podcast** (`/podcast`) to main nav — currently in `App.jsx` but missing from `mainNav`                       |
| 5.2 | [x]    | P2       | **Alias routes**        | `/analytics` → `/metrics` both render AnalyticsView — documented in code comments                                  |
| 5.3 | [x]    | P2       | **Settings deep links** | Collapsible "Settings Pages" section in Sidebar with: Monetization, Health, Webhooks, RSS, Style, Extension        |
| 5.4 | [x]    | P1       | **Active state**        | `aria-current="page"` on active nav button                                                                         |
| 5.5 | [x]    | P1       | **Keyboard**            | Escape closes mobile drawer; focus trap inside drawer (Tab cycles focusable elements)                              |
| 5.6 | [x]    | P2       | **Source folders**      | Truncate + `title` tooltip for long source names — implemented in Sidebar                                          |
| 5.7 | [x]    | P3       | **Footer card**         | Version now pulled from `package.json` dynamically — `v{packageJson.version}`                                      |
| 5.8 | [x]    | P2       | **Light mode hover**    | `hover:bg-slate-800/50` reads dark-centric; add light-mode hover tokens                                            |
| 5.9 | [x]    | P2       | 🆕 **Stub indicator**   | `COMING_SOON_PLATFORMS` dynamic list — Instagram, Facebook, Reddit, Threads, YouTube, TikTok shown with Clock icon |


> ⚠️ **Issue (5.3):** Seven settings-related routes in the main sidebar will feel overwhelming. Recommend grouping them under a single collapsible "Settings" nav item with sub-links, or using a tab-based SettingsView layout (already partially done per §6). Decide before milestone 1.

---

## 6. Routes & Views (Inventory)


| Path                                        | View / Component | Priority | Frontend Tasks                                             |
| ------------------------------------------- | ---------------- | -------- | ---------------------------------------------------------- |
| `/`                                         | `DashboardView`  | P1       | See §7                                                     |
| `/analytics`, `/metrics`                    | `AnalyticsView`  | P2       | Charts readable in dark; empty data state; export          |
| `/calendar`                                 | `CalendarView`   | P2       | Timezone label; loading; event density on mobile           |
| `/media`                                    | `MediaView`      | P2       | Grid/list toggle; upload progress; empty state             |
| `/podcast`                                  | `PodcastView`    | P2       | Nav link (see 5.1); audio player UX; episode list skeleton |
| `/research`                                 | `ResearchView`   | P2       | Deep dive modal flow; PDF/paper states; errors             |
| `/settings` (+ tab routes)                  | `SettingsView`   | P1       | Tab persistence in URL (`?tab=`), mobile tabs              |
| `/monetization`, `/monetize`                | Settings tab     | P2       | Same as settings                                           |
| `/health`                                   | Settings tab     | P2       | Status colors tied to tokens                               |
| `/webhooks`, `/rss`, `/style`, `/extension` | Settings tabs    | P2       | Form validation messages; save feedback                    |
| 🆕 `*` (catch-all)                          | `NotFoundView`   | P2       | "Page not found" + back to dashboard CTA                   |


---

## 7. Dashboard (`views/DashboardView.jsx`)


| #    | Status | Priority | Task                      | Detail                                                                                                                                                          |
| ---- | ------ | -------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | [x]    | P2       | **Page header**           | `PageHeader.jsx` — title/subtitle, back button, source folder variant with "back to all"                                                                        |
| 7.2  | [x]    | P2       | **FilterBar**             | Filter state visible; reset; mobile collapse                                                                                                                    |
| 7.3  | [x]    | P1       | **DashboardStats**        | Skeleton while loading; error boundary                                                                                                                          |
| 7.4  | [x]    | P1       | **DailyIntelligence**     | Empty day message; refresh button                                                                                                                               |
| 7.5  | [x]    | P1       | **PipelineStatus**        | Long-running pipeline: progress text, last run time — `PipelineStatus` component with SSE support                                                               |
| 7.6  | [x]    | P3       | **Story list**            | `react-window` added; `useVirtualizedStories` hook + `VirtualizedStoryList` component                                                                           |
| 7.7  | [x]    | P2       | **Infinite scroll**       | `fetchNextPage` loading indicator; end-of-list message                                                                                                          |
| 7.8  | [x]    | P2       | **Bulk actions**          | Selection count; disable when zero; confirm destructive                                                                                                         |
| 7.9  | [x]    | P1       | **Modals**                | Tag, schedule, delete — focus trap, ESC, `aria-modal`                                                                                                           |
| 7.10 | [x]    | P1       | **SSE pipeline progress** | Connect `EventSource` to `/api/pipeline/stream` — show live stage updates: "Fetching arXiv... 23 papers", "Analysing 4/10..." (aligns with Master Plan Phase 2) |
| 7.11 | [x]    | P2       | **Last run summary card** | Show last pipeline run time, articles fetched, content generated — visible at-a-glance without opening pipeline panel                                           |


---

## 8. Story Experience


| File(s)                  | Status | Priority | Task                                                                              |
| ------------------------ | ------ | -------- | --------------------------------------------------------------------------------- |
| `StoryCard.jsx`          | [x]    | P1       | Unified card elevation, hover, priority badge, source icon, score display         |
| `Story/StoryHeader.jsx`  | [x]    | P2       | Title hierarchy, actions menu — edit/copy/share/delete dropdown                   |
| `Story/StoryContent.jsx` | [x]    | P2       | Readability (leading-relaxed), copy buttons, expand/collapse long content         |
| `Story/StoryMetrics.jsx` | [x]    | P2       | Score tooltips explaining "what this means" for each metric                       |
| `Story/StoryAssets.jsx`  | [x]    | P2       | Platform icons, generated content preview per platform                            |
| `Story/StoryModals.jsx`  | [x]    | P1       | Consistent with `ui/Modal`                                                        |
| `PaperDetailsModal.jsx`  | [x]    | P2       | Deep dive: limitations, authors, affiliations with empty states; loading skeleton |


> **Architecture note:** `StoryCard.jsx` is currently 1000+ lines handling generation, editing, tagging, scheduling, quality checks, media, audio, and blog publishing. This needs to be decomposed before it becomes unmaintainable. Suggested split (aligns with Master Plan Phase 4):
>
> - `StoryCard.jsx` — display shell only (< 200 lines)
> - `Story/ContentEditor.jsx` — editing + regeneration
> - `Story/PublishPanel.jsx` — platform selection + publish actions
> - `Story/MediaPanel.jsx` — images, audio, blog assets
>
> Do this decomposition **before** adding new story features, not after.

---

## 9. Feature Components (Checklist)


| Component                                                          | Status | Priority | UX / UI Tasks                                                                                                                                     |
| ------------------------------------------------------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuickActions`                                                     | [x]    | P2       | Primary actions obvious (Fetch/Generate/Schedule/Export); clear visual hierarchy                                                                  |
| `SearchBar`                                                        | [x]    | P2       | Debounce 300ms, clear button — `SearchBar.jsx` updated with `useEffect` timer                                                                     |
| `PlatformSelector`                                                 | [x]    | P1       | Selected state, `implemented` flag with Clock icon for coming-soon platforms                                                                      |
| `ContentCalendar`                                                  | [x]    | P2       | Drag affordance (grip icon), mobile scroll container, today highlight                                                                             |
| `EmptyFeed`                                                        | [x]    | P1       | Rss icon illustration, "Run Pipeline" CTA, .env config hint                                                                                       |
| `EmptyStates`                                                      | [x]    | P1       | Reusable EmptyStories/EmptySearch with refresh/clear CTAs                                                                                         |
| `PipelineStatus`                                                   | [x]    | P1       | `PipelineStatus.jsx` — idle/running/success/failed states with semantic color tokens                                                              |
| `SystemHealth`                                                     | [x]    | P2       | Green/yellow/red status colors from semantic tokens; last checked timestamp                                                                       |
| `RSSManager`                                                       | [x]    | P2       | Add/edit/delete RSS feeds; URL validation with feedback messages                                                                                  |
| `WebhookManager`                                                   | [x]    | P2       | Secret display with reveal toggle, test webhook, copy-to-clipboard                                                                                |
| `MonetizationManager`                                              | [x]    | P3       | Pricing tiers with revenue metrics dashboard — Pro/Enterprise tiers with feature list                                                             |
| `MediaManager`                                                     | [x]    | P2       | Filters (all/images/videos), preview modal, delete confirmation dialog                                                                            |
| `BlogPublisher`                                                    | [x]    | P2       | Success/error toasts via ToastContext; draft vs publish toggle                                                                                    |
| `StyleProfile`                                                     | [x]    | P2       | Save confirmation toast; preview snippet of style preferences                                                                                     |
| `ThemeManager`                                                     | [x]    | P1       | System/light/dark; sync with `localStorage` + system preference + CSS vars                                                                        |
| `AnalyticsDashboard` / `EnhancedAnalytics`                         | [x]    | P2       | Deduplicated EnhancedAnalytics; chart legends with categories                                                                                     |
| `CopyButton`                                                       | [x]    | P2       | Copied state with Check icon, `aria-live="polite"` for screen readers                                                                             |
| `BulkActionsBar`                                                   | [x]    | P2       | Sticky bottom with `pb-safe` padding; delete confirmation; mobile scrollable                                                                      |
| `BulkScheduleModal` / `BulkTagModal`                               | [x]    | P2       | Validation with error messages; batch size warning (>50 items)                                                                                    |
| `AccessibilityComponents`                                          | [x]    | P2       | Reduced motion, high contrast support in `index.css`; keyboard navigation throughout                                                              |
| `ProductionDeployment` / `UAT` / `FeatureParity` / `DataMigration` | [x]    | P1       | **Product decision:** hide from default nav or move to "Advanced" / dev-only route                                                                |
| `StubPublisherBadge`                                               | [x]    | P1       | Show "Not yet implemented" indicator on Instagram, Facebook, Reddit, Threads, YouTube publishers — prevents user confusion (see Master Plan §2.2) |
| `MultiTurnChatPanel`                                               | [x]    | P3       | Per-story chat UI — conversational interface for content refinement with streaming responses                                                      |


---

## 10. UI Kit (`components/ui/`)


| Component                     | Status | Priority | Tasks                                                                              |
| ----------------------------- | ------ | -------- | ---------------------------------------------------------------------------------- |
| `Button`                      | [x]    | P1       | Variants (primary, secondary, ghost, danger); loading; disabled styles             |
| `Input`, `Select`, `Checkbox` | [x]    | P1       | Labels, errors, `aria-describedby`                                                 |
| `Card`                        | [x]    | P2       | Padding variants (none/sm/md/lg/xl); optional Header/Title/Content/Footer slots    |
| `Modal`                       | [x]    | P1       | Focus trap, scroll lock, sizes                                                     |
| `Tabs`                        | [x]    | P1       | Keyboard arrows; responsive overflow                                               |
| `Badge`                       | [x]    | P2       | Semantic variants mapped to 2.5 color tokens (primary/success/warning/danger/info) |
| `Alert`                       | [x]    | P2       | Dismissible with X button; `role="alert"` for errors, `role="status"` for info     |
| `Tooltip`                     | [x]    | P2       | Configurable delay (default 200ms); click-to-show for mobile (hover alternative)   |
| `Spinner` / `Progress`        | [x]    | P1       | Determinate vs indeterminate                                                       |
| `Toast`                       | [x]    | P1       | Stacking, pause on hover                                                           |
| `Avatar`                      | [x]    | P3       | Fallback initials component with placeholder background                            |
| `Dropdown`                    | [x]    | P1       | Click outside, keyboard                                                            |
| `Flex` / `Grid` / `Stack`     | [x]    | P3       | Document: Use Tailwind's flex/grid utilities; no wrapper components needed         |
| `*ThemeExample.jsx`           | [x]    | P1       | ✅ Moved to `/dev/theme` route — dev-only, excluded from prod bundle                |


---

## 11. Data & API (`api/client.js`, Hooks)


| #    | Status | Priority | Task                  | Detail                                                                                                                                   |
| ---- | ------ | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 11.1 | [x]    | P1       | **Base URL**          | `VITE_API_URL` dev vs prod; proxy in `vite.config.js` — `/api` default, env-configurable                                                 |
| 11.2 | [x]    | P2       | **Auth headers**      | Auth interceptor placeholder in `api/client.js` — ready for JWT/token implementation                                                     |
| 11.3 | [x]    | P1       | **Error shape**       | `useErrorHandler` normalizes errors with category, userMessage, isRetryable, context                                                     |
| 11.4 | [x]    | P1       | `**useStories`**      | Pagination (20/page), filters (sort/source), loading/error states via useInfiniteQuery                                                   |
| 11.5 | [x]    | P1       | `**usePipeline**`     | Polling with 30s interval; exponential backoff on error via `useRetry`                                                                   |
| 11.6 | [x]    | P2       | `**useOffline**`      | `useOffline.js` — banner when offline; network status monitoring                                                                         |
| 11.7 | [x]    | P1       | `**useStoryActions**` | Optimistic updates with rollback for `updateStory` and `toggleStatus`                                                                    |
| 11.8 | [x]    | P1       | 🆕 `**useSSE**`       | Custom hook wrapping `EventSource` for `/api/pipeline/stream` — handles reconnect, cleanup on unmount, error state (Master Plan Phase 2) |
| 11.9 | [x]    | P2       | 🆕 `**useAnalytics**` | `useAnalytics.js` — dedicated hook with separate cache from `useStories`                                                                 |


---

## 12. State Management


| Store / Context                              | Status | Priority | Tasks                                                                                                  |
| -------------------------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------ |
| 12.1                                         | [x]    | P1       | `store/appStore.js` (Zustand)                                                                          |
| `stores/pipelineStore.js`, `storiesStore.js` | [x]    | P1       | **React Query boundary documented** — React Query owns server state, Zustand owns UI-only state        |
| `context/PipelineContext.jsx`                | [x]    | P1       | Uses SSE for live server state — single source of truth for pipeline status (not duplicated in stores) |


> ⚠️ **Architecture note:** The biggest state risk is `pipelineStore.js` / `PipelineContext.jsx` duplicating what React Query already tracks. Rule of thumb: React Query = anything that comes from the API. Zustand = UI-only state (theme, sidebar open, selected filters). Any pipeline status that comes from the backend should live in React Query, not Zustand.

---

## 13. Accessibility (a11y)


| #    | Status | Priority | Task                                                                                                                               |
| ---- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 13.1 | [x]    | P1       | Skip link to main content                                                                                                          |
| 13.2 | [x]    | P1       | Focus visible on all interactive elements (extends `global.css`)                                                                   |
| 13.3 | [x]    | P2       | `useAccessibility` hook — wire reduced motion, font size                                                                           |
| 13.4 | [x]    | P2       | Charts: table fallback or `aria-label` summary                                                                                     |
| 13.5 | [x]    | P1       | Modals: initial focus, return focus on close                                                                                       |
| 13.6 | [x]    | P1       | Form errors announced to screen readers                                                                                            |
| 13.7 | [x]    | P1       | Color contrast audit complete — `text-gray-400` on `text-xs` identified for 17 components (requires design token migration to fix) |
| 13.8 | [x]    | P2       | 🆕 Run `axe-core` or `eslint-plugin-jsx-a11y` in CI — catches regressions automatically                                            |


---

## 14. Performance


| #    | Status | Priority | Task                                                                                                                                                      |
| ---- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ---- | ------ | -------- | -------------------------------------------------------------------------------------------------------------                                             |
| 15.1 | [x]    | P1       | Error boundary hierarchy: ErrorBoundary → FeatureErrorBoundary → AsyncErrorBoundary → NetworkErrorBoundary — all implemented with specific error handling |
| 15.2 | [x]    | P1       | User-facing message vs dev stack trace — dev details only shown when `process.env.NODE_ENV === 'development'`                                             |
| 15.3 | [x]    | P1       | Retry actions on network errors — `useRetry` hook with exponential backoff, `useRetryMutation` with automatic retry                                       |
| 15.4 | [x]    | P2       | 🆕 Handle SSE stream errors gracefully — shows "Connection lost, retrying..." message; reconnect with exponential backoff                                 |


---

## 16. Testing (`vitest`, Testing Library)


| #    | Status | Priority | Task                                                                                                         |
| ---- | ------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| 16.1 | [x]    | P1       | `ThemeProvider.test.jsx` comprehensive — 452 lines covering rendering, persistence, CSS vars, error handling |
| 16.2 | [x]    | P1       | `preservation.test.js` — validates build output, SW unregistration, API proxy config                         |
| 16.3 | [x]    | P2       | Increase coverage on: `Sidebar` nav, `Modal`, critical hooks                                                 |
| 16.4 | [x]    | P1       | `component-imports.test.jsx` — validates all App.jsx imports resolve (prevents React #130)                   |
| 16.5 | [x]    | P2       | 🆕 Add tests for `useSSE` hook — mock `EventSource`, test reconnect + cleanup                                |
| 16.6 | [x]    | P2       | 🆕 Add tests for optimistic update rollback in `useStoryActions`                                             |


---

## 17. Docker & Production Frontend


| #    | Status | Priority | Task                                                                                                                                                            |
| ---- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17.1 | [x]    | P1       | `frontend/Dockerfile` multi-stage: `node:20-slim` → `npm ci` → `npm run build` → `nginx:stable-alpine`                                                          |
| 17.2 | [x]    | P1       | Health endpoint `/health` for Compose healthcheck                                                                                                               |
| 17.3 | [x]    | P2       | Nginx: gzip/brotli, cache headers for assets, API proxy to backend                                                                                              |
| 17.4 | [x]    | P2       | `Dockerfile.test` — `test:docker` and volume `test-results`                                                                                                     |
| 17.5 | [x]    | P2       | 🆕 Nginx config: ensure SSE endpoint (`/api/pipeline/stream`) has `proxy_buffering off` and appropriate `proxy_read_timeout` — SSE breaks silently without this |


---

## 18. Security & Content


| #    | Status | Priority | Task                                                              |
| ---- | ------ | -------- | ----------------------------------------------------------------- |
| 18.1 | [x]    | P1       | No `dangerouslySetInnerHTML` usage found — no sanitization needed |
| 18.2 | [x]    | P1       | External links `rel="noopener noreferrer"`                        |
| 18.3 | [x]    | P2       | CSP aligned with backend Talisman                                 |


---

## 19. Content & Microcopy


| #    | Status | Priority | Task                                                                                                          |
| ---- | ------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| 19.1 | [x]    | P2       | Consistent product name: "Pulse Pro"                                                                          |
| 19.2 | [x]    | P1       | Button verbs: "Run pipeline", "Save", "Regenerate", not vague "Submit"                                        |
| 19.3 | [x]    | P1       | **Error messages**                                                                                            |
| 19.4 | [x]    | P2       | 🆕 Publisher stub labels: clearly say "Coming soon" or "Not implemented" — not a dead button with no feedback |


---

## 20. Milestones (Suggested Order)

Aligned with Master Plan phases:

### Milestone 1 — Wayfinding & Shell (This Weekend)

- 5.1 Sidebar Podcast link
- 5.4 `aria-current` active state
- 5.8 Light-mode sidebar hover
- 4.7 Top-level error boundary
- 4.8 404 catch-all route
- 9 `StubPublisherBadge` on unimplemented platforms

### Milestone 2 — Design Tokens (Week 1)

- 2.1 Migrate all colors to CSS variables
- 2.5 Semantic color tokens (success/warning/error/info)
- 2.7 Verify dark mode across all views
- 3.2 Define and apply type scale

### Milestone 3 — Pipeline UX / Phase 2 Frontend (Week 1–2)

- 11.8 `useSSE` hook
- 7.10 Connect SSE to dashboard pipeline status
- 7.11 Last run summary card
- 7.5 PipelineStatus component states (idle/running/success/failed)
- 17.5 Nginx SSE proxy config
- 15.4 SSE error handling

### Milestone 4 — Settings & Research (Week 2–3)

- 6 Settings tab URL persistence (`?tab=`)
- Settings mobile layout
- 6 ResearchView deep dive modal polish

### Milestone 5 — StoryCard Decomposition (Month 1, before Phase 3)

- Split `StoryCard.jsx` into ContentEditor, PublishPanel, MediaPanel
- 8 Story sub-component polish
- 14.5/14.6 Re-render audit post-decomposition

### Milestone 6 — Tests, CI & Cleanup (Ongoing)

- 16.1 Fix flaky tests (ThemeProvider tests stabilized)
- 16.2 Fix preservation test vs CI build
- 13.8 Add axe-core to CI
- 9 Gate internal-only components (`ProductionDeployment`, `UAT` etc.) from default nav

---

## 21. File Index (`frontend/src`)

**Root:** `main.jsx`, `App.jsx`, `index.css`, `global.css`  
**Views:** `views/DashboardView.jsx`, `AnalyticsView.jsx`, `CalendarView.jsx`, `DevToolsView.jsx`, `MediaView.jsx`, `PodcastView.jsx`, `ResearchView.jsx`, `SettingsView.jsx`  
**Components:** `components/`* (see §9), `components/Story/`*, `components/ui/`**  
***Hooks:** `hooks/useStories.js`, `usePipeline.js`, `useToast.jsx`, `useBulkSelection.js`, `useDebounce.js`, `useErrorHandler.js`, `useOffline.js`, `usePerformance.js`, `usePlatforms.js`, `useRealtime.js`, `useRetry.js`, `useStoryActions.js`, `useDataMigration.js`, `useAccessibility.js`*  
***New hooks to add:** ~~`useSSE.js`, `useAnalytics.js~~` ✅ Both created and in use*  
***API:** `api/client.js`*  
***Store:** `store/appStore.js`, `stores/`*  
**Context:** `context/PipelineContext.jsx` ⚠️ (review for consolidation with React Query)  
**Theme:** `theme/ThemeProvider.jsx`, `ThemeExample.jsx` ✅ (now at `/dev/theme` route)  
**Tests:** `src/tests/`*, `src/test/`*, `**/*.test.jsx`

---

## Appendix — New Tasks Summary (🆕)


| #    | Section    | Task                                       | Priority |
| ---- | ---------- | ------------------------------------------ | -------- |
| 1.6  | Tooling    | Add Prettier config + CI format check      | P2       |
| 1.7  | Tooling    | Add `CONTRIBUTING.md`                      | P3       |
| 2.9  | Tokens     | Dev-only `/dev/tokens` reference page      | P2       |
| 3.7  | Type       | Document type scale as comments in CSS     | P2       |
| 4.7  | Shell      | Global error boundary                      | P2       |
| 4.8  | Shell      | 404 catch-all route                        | P2       |
| 5.9  | Sidebar    | Stub indicator for unimplemented nav items | P2       |
| 7.10 | Dashboard  | SSE live pipeline progress                 | P1       |
| 7.11 | Dashboard  | Last run summary card                      | P2       |
| 9    | Components | `StubPublisherBadge`                       | P1       |
| 9    | Components | `MultiTurnChatPanel` (Phase 3 prep)        | P3       |
| 11.8 | Hooks      | `useSSE` hook for pipeline stream          | P1       |
| 11.9 | Hooks      | `useAnalytics` hook                        | P2       |
| 13.8 | a11y       | `axe-core` / `jsx-a11y` in CI              | P2       |
| 14.6 | Perf       | `React.memo` audit post-StoryCard split    | P3       |
| 15.4 | Errors     | SSE stream error handling                  | P2       |
| 16.5 | Testing    | `useSSE` hook tests                        | P2       |
| 16.6 | Testing    | Optimistic update rollback tests           | P2       |
| 17.5 | Docker     | Nginx SSE proxy config                     | P2       |
| 19.4 | Copy       | Stub publisher labels                      | P2       |


---

*Last updated: April 2026 — Pulse Pro frontend overhaul. Tick `[ ]` → `[x]` as tasks complete. Items marked 🆕 were added during review pass against the Master Plan.*