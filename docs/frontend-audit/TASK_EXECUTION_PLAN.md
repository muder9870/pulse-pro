# Pulse Pro — Task Execution Plan

Granular tasks for implementing audit recommendations. Each task includes **files**, **priority**, **complexity**, and **dependencies**.

**Priority:** P0 = blocker, P1 = high, P2 = medium, P3 = low  
**Complexity:** Low / Medium / High  

### Execution workflow

- After **each task** in a phase: update this file (status line / legend).
- After **each phase** (P0, P1, …): run a **frontend build**, **commit**, then wait for **confirmation** before starting the next phase.

### Status legend

Tasks marked **Done** reflect the current repo; others remain open.

| ID | Status |
|----|--------|
| **T1** | **Done** — Single `useAppStore` in `store/appStore.js` (notifications merged); `stores/appStore.js` removed; `stores/index.js` re-exports from `store/appStore`. |
| **T2** | **Done** — Removed unwired `useDataMigration.jsx` and `DataMigration.jsx` (no backend routes; not imported elsewhere). |
| **T3** | **Done** — `buildApiUrl` + `apiFetch` in `api/client.js`; raw `fetch('/api/...')` replaced across `frontend/src` (incl. `App.jsx`, `PipelineContext`, components). |
| **T4** | **Done** — `gcTime` in `useStories`, `usePlatforms`, `useAnalytics`. |
| **T5** | **Done** — Schedule and delete modals in `App.jsx` use Pulse tokens (`var(--bg2)`, `var(--surface)`, `var(--text)`, `var(--border)`). |
| **T6** | **Done** — StoryCard platform chips use design tokens. |
| **T6b** | **Done** — StoryCard shell + expanded panel use Pulse surfaces (`--surface`, `--bg2`, `--border`). |
| **T7** | **Done** — ThemeProvider `--color-*` tokens unified with `:root` Pulse vars; all tokens bridge to Pulse shell vars for consistent theming. |
| **T8** | **Done** — Skeleton components deduplicated; `components/ui/Skeleton.jsx` removed, all imports migrated to `components/Skeleton.jsx`. |
| **T9** | **Done** — Extracted `usePipelineRun`, `useScheduleModal`, `useAppKeyboardShortcuts` hooks from `App.jsx`; App.jsx now uses these hooks. |
| **T10** | **Done** — Created `BulkOperationsContext` and `StoriesContext` to reduce prop drilling; DashboardView and ArticlesView now use context hooks instead of 35+ props. |
| **T11** | **Done** — ResearchView uses React Query + api client. |
| **T12** | **Done** | **T13** | **Done** — Implemented concurrency limit (2 concurrent requests) for bulk generate to avoid rate limits and improve performance. |
| **T14** | **Done** — Wired virtualized list using react-window; activates automatically for lists >50 items. |
| **T15** | **Done** — Replaced console.log with `import.meta.env.DEV` guards in production paths. |
| **T16** | **Done** — Added preconnect hints for Google Fonts; fonts already use `display=swap`. |

---

## P0 — Correctness and architecture

### T1 — Consolidate Zustand `useAppStore` into a single module

| Field | Value |
|-------|--------|
| **Description** | Remove duplicate `useAppStore` exports from `src/store/appStore.js` and `src/stores/appStore.js`. Merge notification UI state from `stores/appStore.js` into the canonical store **or** rename the second store (e.g. `useChromeStore`) and update all imports. Ensure `stores/index.js` re-exports match the new structure. |
| **Files** | `frontend/src/store/appStore.js`, `frontend/src/stores/appStore.js`, `frontend/src/stores/index.js`, `frontend/src/components/Sidebar.jsx`, `frontend/src/App.jsx`, `frontend/src/theme/ThemeProvider.jsx`, any other importers (grep `appStore`). |
| **Priority** | P0 |
| **Complexity** | High |
| **Dependencies** | None |
| **Status** | **Done** — Notifications live in `store/appStore.js`; Sidebar imports `../store/appStore`. |

---

### T2 — Fix or remove `useDataMigration` hook and UI

| Field | Value |
|-------|--------|
| **Description** | Remove double `/api` prefix: paths must be `/migration/check` relative to `BASE_URL` **or** use raw fetch with correct origin. Align `api.client` return value (no `.data` wrapper unless backend sends it). Either implement Flask routes under `/api/migration/*` or delete hook + `DataMigration.jsx` usage. |
| **Files** | `frontend/src/hooks/useDataMigration.jsx`, `frontend/src/components/DataMigration.jsx`, `backend/main.py` + new blueprint if implementing API |
| **Priority** | P0 |
| **Complexity** | Medium (remove) / High (full stack implement) |
| **Dependencies** | T1 optional (parallel) |
| **Status** | **Done** — Files deleted; no app imports. |

---

### T3 — Centralize API base for all `fetch` calls

| Field | Value |
|-------|--------|
| **Description** | Add `getApiBaseUrl()` or extend `ApiClient` with `fetchRaw(path, options)`. Replace hardcoded `fetch('/api/...')` in `App.jsx` (pipeline, schedule, export), then iterate through components (StoryCard, BlogPublisher, etc.). Ensure production split hosting works with `VITE_API_URL`. |
| **Files** | `frontend/src/api/client.js`, `frontend/src/App.jsx`, `frontend/src/context/PipelineContext.jsx`, grep results for `fetch('/api` in `frontend/src` |
| **Priority** | P0 |
| **Complexity** | High |
| **Dependencies** | None (coordinate with T2 for migration paths) |
| **Status** | **Done** — See `buildApiUrl`, `apiFetch`, `normalizeApiPath` in `frontend/src/api/client.js`. |

---

### T4 — Update React Query `cacheTime` to `gcTime`

| Field | Value |
|-------|--------|
| **Description** | In TanStack Query v5, rename deprecated `cacheTime` to `gcTime` in all queries; run tests. |
| **Files** | `frontend/src/hooks/useStories.js`, any other `useQuery`/`useInfiniteQuery` files |
| **Priority** | P0 |
| **Complexity** | Low |
| **Dependencies** | None |
| **Status** | **Done** (`useStories.js`, `usePlatforms.js`, `useAnalytics.js`). |

---

## P1 — UI / UX consistency

### T5 — Refactor schedule and delete modals to dark-compatible tokens

| Field | Value |
|-------|--------|
| **Description** | Replace `bg-white` / `slate-*` modal chrome with `var(--bg2)`, `var(--surface)`, `var(--text)`, `var(--border)`. Preserve layout; match Pulse modals in `index.css` (`.modal-*`). |
| **Files** | `frontend/src/App.jsx` (schedule + delete modal sections) |
| **Priority** | P1 |
| **Complexity** | Medium |
| **Dependencies** | None |

---

### T6 — Align `StoryCard` platform pills with design tokens

| Field | Value |
|-------|--------|
| **Description** | Replace `border-gray-200`, `bg-white`, light hover classes on **`PlatformPill`** with `pp-*` or CSS variables (`--surface2`, `--border2`, `--text2`). Ensure contrast on dark background. Cross-check against `docs/frontend-audit/story-card-redesign-preview.html`. |
| **Files** | `frontend/src/components/StoryCard.jsx` (platform pill block ~lines 40–88, 417–438) |
| **Priority** | P1 |
| **Complexity** | Medium |
| **Dependencies** | `DESIGN_SYSTEM_GUIDE.md` § 5.5 (reference) |
| **Status** | **Done** |

---

### T6b — Restyle `StoryCard` shell and expanded panel (full dark-native card)

| Field | Value |
|-------|--------|
| **Description** | Replace light-only regions: `border-gray-100`, `border-t border-gray-300`, `bg-gray-50/50` (expanded), `ActionButton` white/gray styles with Pulse tokens. Align outer wrapper and dividers with **§ 5.5** of `DESIGN_SYSTEM_GUIDE.md`. Optional: add `article` landmark + `aria-labelledby` on title. Visual target: `story-card-redesign-preview.html`. |
| **Files** | `frontend/src/components/StoryCard.jsx`, optionally `frontend/src/components/Story/StoryHeader.jsx`, `StoryMetrics.jsx` |
| **Priority** | P1 |
| **Complexity** | High |
| **Dependencies** | T6 (can merge with T6 in one PR) |
| **Status** | **Done** |

---

### T7 — Unify ThemeProvider tokens with `:root` Pulse vars

| Field | Value |
|-------|--------|
| **Description** | In `ThemeProvider` effect, map `--color-*` to same values as Pulse `--accent`/`--surface` for dark mode **or** switch shell components to consume `--color-*` only. Remove visual mismatch between `Button` and `DashboardView`. |
| **Files** | `frontend/src/theme/ThemeProvider.jsx`, `frontend/src/components/ui/Button.jsx`, optionally `frontend/src/index.css` |
| **Priority** | P1 |
| **Complexity** | High |
| **Dependencies** | T5 optional |

---

### T8 — Deduplicate Skeleton components

| Field | Value |
|-------|--------|
| **Description** | Pick one of `components/Skeleton.jsx` or `components/ui/Skeleton.jsx`; migrate imports; delete duplicate. |
| **Files** | `frontend/src/components/Skeleton.jsx`, `frontend/src/components/ui/Skeleton.jsx`, consumers |
| **Priority** | P1 |
| **Complexity** | Low |
| **Dependencies** | None |

---

## P2 — Structure and maintainability

### T9 — Extract hooks from `App.jsx` (pipeline run, keyboard shortcuts)

| Field | Value |
|-------|--------|
| **Description** | Move `handleRunPipeline` polling, schedule load/save, and keydown handler into dedicated hooks to shrink `App.jsx` below a maintainable threshold (e.g. &lt;800 lines split across modules). |
| **Files** | `frontend/src/App.jsx`, new `frontend/src/hooks/usePipelineRun.js`, `frontend/src/hooks/useAppKeyboardShortcuts.js`, etc. |
| **Priority** | P2 |
| **Complexity** | High |
| **Dependencies** | T3 for pipeline fetch |
| **Status** | **Done** — Created `usePipelineRun.js`, `useScheduleModal.js`, `useAppKeyboardShortcuts.js`; App.jsx refactored to use these hooks. |

---

### T10 — Reduce prop drilling for Dashboard and Articles views

| Field | Value |
|-------|--------|
| **Description** | Introduce context providers (`BulkActionsContext`, `StoriesUIContext`) or compose props into 3–4 objects; update `DashboardView.jsx`, `ArticlesView.jsx`. |
| **Files** | `frontend/src/App.jsx`, `frontend/src/views/DashboardView.jsx`, `frontend/src/views/ArticlesView.jsx` |
| **Priority** | P2 |
| **Complexity** | High |
| **Dependencies** | T9 optional |
| **Status** | **Done** — Created `BulkOperationsContext` and `StoriesContext`; reduced prop count from 35+ to 3 in ArticlesView and DashboardView. |

---

### T11 — Research hub: use React Query + `api` client

| Field | Value |
|-------|--------|
| **Description** | Replace raw `fetch` in `components/ResearchView.jsx` with shared query (reuse `useStories` options or dedicated `useArxivStories`). Normalize pagination response. |
| **Files** | `frontend/src/components/ResearchView.jsx`, `frontend/src/hooks/useStories.js` |
| **Priority** | P2 |
| **Complexity** | Medium |
| **Dependencies** | T4 |
| **Status** | **Done** — ResearchView uses React Query with proper cache configuration. |

---

### T12 — Remove or expose hidden header controls

| Field | Value |
|-------|--------|
| **Description** | Audit `className="hidden"` on export, notifications, badges in `App.jsx`; remove dead code or enable with product-approved UX. |
| **Files** | `frontend/src/App.jsx` |
| **Priority** | P2 |
| **Complexity** | Low |
| **Dependencies** | None |
| **Status** | **Done** — Removed all `className="hidden"` dead code from header. |

---

## P3 — Performance, a11y, polish

### T13 — Bulk generate: batch API or parallelize with backoff

| Field | Value |
|-------|--------|
| **Description** | Address sequential loop + rate limit risk; coordinate with backend (`content.py` limiter). Options: backend batch endpoint, or client concurrency limit (e.g. 2 at a time) + progress. |
| **Files** | `frontend/src/App.jsx`, `backend/api/routes/content.py` |
| **Priority** | P3 |
| **Complexity** | High |
| **Dependencies** | None |
| **Status** | **Done** — Implemented concurrency limit of 2 concurrent requests using Promise.race queue pattern; prevents rate limit issues while improving performance. |

---

### T14 — Wire virtualized list for Articles view

| Field | Value |
|-------|--------|
| **Description** | `useVirtualizedStories.js` is **not imported** by any view—implement list rendering in `ArticlesView` (or shared list component) using the hook + `react-window` to cap DOM nodes for large feeds. |
| **Files** | `frontend/src/views/ArticlesView.jsx`, `frontend/src/hooks/useVirtualizedStories.js` |
| **Priority** | P3 |
| **Complexity** | Medium |
| **Dependencies** | None |
| **Status** | **Done** — Integrated react-window FixedSizeList in ArticlesView; automatically activates for lists >50 items to optimize DOM rendering. |

---

### T15 — Replace development `console.log` in production paths

| Field | Value |
|-------|--------|
| **Description** | Guard with `import.meta.env.DEV` or remove (pipeline invalidate, deep-dive handler). |
| **Files** | `frontend/src/App.jsx`, others from grep `console.log` |
| **Priority** | P3 |
| **Complexity** | Low |
| **Dependencies** | None |
| **Status** | **Done** — Guarded all production `console.log` statements with `import.meta.env.DEV` checks. |

---

### T16 — Font loading optimization

| Field | Value |
|-------|--------|
| **Description** | Add preload for critical font files or adjust Google Fonts URL with `display=swap` / self-host for CSP. |
| **Files** | `frontend/index.html` |
| **Priority** | P3 |
| **Complexity** | Low |
| **Dependencies** | None |
| **Status** | **Done** — Added `preconnect` hints for Google Fonts; fonts already use `display=swap`. |

---

## Dependency graph (summary)

```
T1 (single store)
T2 (migration)     ─┐
T3 (API base)      ─┼─→ T9, T11
T4 (gcTime)        ─┘

T5, T6, T7, T8    → can run after P0 stable
T9, T10           → after T3
T13–T16           → independent polish
```

---

## Suggested sprint order

1. **Sprint A:** T1, T4, T2 (or delete migration)  
2. **Sprint B:** T3, T5, T6  
3. **Sprint C:** T7, T8, T11  
4. **Sprint D:** T9, T10, T12  
5. **Sprint E:** T13–T16  

---

*Tasks are intentionally small enough for single PRs where possible; T1/T3/T9 may split into sub-PRs.*
