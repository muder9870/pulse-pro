# Pulse Pro — Frontend Improvement Plan

This document turns audit findings into a **prioritized, phased strategy**. Order respects **dependencies** (fix data-layer bugs before large UI refactors).

---

## Recently completed (synced with codebase)

| Item | Notes |
|------|--------|
| **StoryCard ops redesign** | Pipeline zones, single primary CTA, `storyState.js`, token-only styling; **Approve** wires to `PATCH /api/stories/:id/pipeline` + query invalidation. |
| **Backend pipeline flags** | `review_status`, `content_approved`, `needs_review`, `ready_to_schedule`, `scheduled_at` on story JSON; **Docker/Postgres via Alembic** (`b3f4a5c6d7e8_add_story_pipeline_columns.py`) and `init.sql` for new volumes (legacy helper script kept optional). |
| **React Query `gcTime`** | Replaced deprecated `cacheTime` in `useStories.js`, `usePlatforms.js`, `useAnalytics.js`. |
| **`api.patch`** | Added on `ApiClient` for pipeline updates. |

**Not done yet:** Zustand duplicate store (Phase 0.1), `useDataMigration` fix/remove, full HTTP base refactor, dark modals in `App.jsx`, ThemeProvider unification, etc.

---

## Phase 0 — Safety and correctness (Week 1)

**Goal:** Remove architectural foot-guns that cause wrong state or broken API calls.

1. **Unify Zustand app state**
   - Merge or rename so **exactly one** `useAppStore` exists for application chrome.
   - Move `ui.notifications` (and any Sidebar-only state) into the canonical store **or** rename the legacy store to `useLegacyAppStore` / `useNotificationStore` and update `Sidebar.jsx` imports.
   - **Acceptance:** Grep shows a single `export const useAppStore` from one file; Sidebar and ThemeProvider import the same module.

2. **Fix or remove data migration hook**
   - **Option A:** Implement `/api/migration/*` on Flask + fix paths to `/migration/check` (relative to `api` base) and align JSON shape.
   - **Option B:** Delete `useDataMigration.jsx` and `DataMigration.jsx` if product does not need migration—avoid dead broken code.
   - **Acceptance:** No requests to `/api/api/...`; migration flows return real data or code is removed.

3. **Normalize HTTP entry point**
   - Introduce a single `buildApiUrl(path)` or extend `ApiClient` so **all** `fetch` calls use the same base as `VITE_API_URL`.
   - Replace or wrap raw `fetch('/api/...')` incrementally (start with `App.jsx` pipeline/schedule/export).
   - **Acceptance:** Changing `VITE_API_URL` in a staging build does not leave orphan fetches to `/api` on the wrong host.

4. **React Query v5 housekeeping**
   - ~~Rename `cacheTime` → `gcTime` in `useStories.js` and any other queries.~~ **Done** (also `usePlatforms`, `useAnalytics`).

---

## Phase 1 — Design system consolidation (Weeks 2–3)

**Goal:** One coherent visual language for the Pulse shell; ThemeProvider aligned with CSS.

1. **Pick a single semantic layer**
   - Either map `ThemeProvider` `--color-*` to **mirror** `:root` Pulse vars (`--accent` ↔ primary), or **migrate** shell from `--accent` to `--color-*` exclusively.
   - Document the mapping in `DESIGN_SYSTEM_GUIDE.md` (maintained as source of truth).

2. **Modal and overlay components**
   - Extract shared `ModalShell` using **semantic tokens** (surface, border, text) that work in dark default and optional light theme.
   - Refactor schedule + delete modals in `App.jsx` to use it—remove one-off `bg-white` unless theme is explicitly “light paper.”

3. ~~**StoryCard platform UI**~~
   - **Done:** Card rebuilt; chips and shell use CSS variables; pipeline state driven by `getStoryState` + API flags.

4. **Tailwind vs `index.css` duplication**
   - Prefer **either** extending Tailwind theme from CSS variables **or** generating one JSON tokens file consumed by both—avoid triple hex definitions (`:root`, `tailwind.config`, `tokens.js`).

---

## Phase 2 — Architecture and maintainability (Weeks 3–5)

**Goal:** Reduce `App.jsx` surface; improve testability.

1. **Extract “shell” concerns**
   - `useScheduleModal`, `useBulkOperations`, `useKeyboardShortcuts` hooks colocated with types.
   - Move pipeline run + poll loop out of `App.jsx` into `hooks/usePipelineRun.js` (uses toast + query client).

2. **Collapse Dashboard vs Articles duplication**
   - Shared layout: `ProductionWorkspace` accepting slot for “hero” vs “full list.”
   - Shared props grouped into objects: `storiesState`, `bulkState`, `handlers` to avoid 35+ positional props.

3. **ResearchView data**
   - Use `useInfiniteQuery` or shared `useStories` with `source=arxiv` instead of one-off `fetch`—single cache, consistent normalization.

4. **Dead UI cleanup**
   - Remove or feature-flag `className="hidden"` blocks in header; or expose intentionally with specs.

---

## Phase 3 — Performance and resilience (Ongoing)

1. **Bulk generate:** Consider backend batch endpoint or parallel requests with concurrency cap + client-side progress; respect rate limits (`10 per minute` on generate).
2. **List virtualization:** Wire `useVirtualizedStories` into `ArticlesView`—the hook exists today but has **no consumers** outside its own file.
3. **Icons:** Audit `lucide-react` imports for tree-shaking; prefer `import { Icon } from 'lucide-react'`.
4. **Fonts:** Add `<link rel="preload">` for critical WOFF2 if self-hosting; or accept font-display swap in Google Fonts URL.

---

## Phase 4 — Accessibility and polish

1. Audit modals with keyboard trap (Radix or existing `Modal.jsx` if extended).
2. Replace `console.log` with dev-only logging or remove.
3. Expand jest-axe coverage on shell + StoryCard + modals.

---

## Prioritized fix list (quick reference)

| Priority | Item |
|----------|------|
| P0 | Single `useAppStore`; fix migration URLs / remove hook |
| P0 | HTTP layer respects `VITE_API_URL` everywhere |
| P1 | Modal + StoryCard theme alignment |
| P1 | Unify CSS variable strategy with ThemeProvider |
| P2 | Split `App.jsx`; reduce prop drilling |
| P2 | ResearchView → React Query |
| P3 | Performance (bulk, virtualization, fonts) |

---

## UX enhancements (product-facing)

- **Schedule modal:** Align copy and visuals with Pulse brand; show timezone explicitly next to server time.
- **Pipeline feedback:** Single status indicator (remove duplicate hidden vs visible rows).
- **Empty states:** Reuse `EmptyStates.jsx` consistently across Media, Research, Articles.
- **Error surfaces:** Prefer toast + inline retry over silent `catch` blocks in StoryCard media/hashtag fetches.

---

## Story / Article card — business best practices (`StoryCard`)

**Naming:** The UI component is **`StoryCard`**; backend fields often say `article_id`. Treat “story” and “article” as the same entity in docs and training.

### Editorial & operations

1. **Clear pipeline state:** Each card should communicate **one** primary editorial state readers care about (e.g. *Needs generation*, *Ready to review*, *Scheduled*, *Posted*). Derive from existing data (`posts`, `generatedContent`, schedule) instead of adding noise.
2. **Priority ordering:** In high-volume queues, **score + recency** already support triage; keep score visible in the **top-right** (or consistent corner) so power users scan vertically.
3. **Channel discipline:** “Channels” are business outputs, not a generic tag cloud—keep platform chips **aligned to configured channels** and limit simultaneous primary actions (avoid 8 equal-weight buttons without grouping).
4. **Expand-on-purpose:** The main CTA should read as **“open the workspace for this story,”** not a generic button—matches “Explore opportunities” / “Collapse insights” pattern today; avoid duplicate entry points that also expand (e.g. pill click vs main CTA) without clear distinction.
5. **Quality & trust:** Source and fetch/time build trust; **quality grades** belong in the expanded panel or secondary, not crowding the collapsed title.

### Analytics & accountability

- **`logEngagement`** events (`view`, per platform) are only useful if product defines **reporting** (conversion from view → post). Avoid logging every hover unless KPIs require it.
- Prefer **explicit** “posted” / “mark posted” over inferred-only states for compliance and reporting.

### Visual / UX consistency

- **Dark-native card:** Collapsed and expanded regions must use **Pulse surfaces**—the current light gray panels (`bg-gray-50`, `border-gray-100`) conflict with the rest of the app; see `story-card-redesign-preview.html` and `DESIGN_SYSTEM_GUIDE.md` § 5.5.

### Accessibility

- **Article landmark:** Prefer `<article>` or `role="article"` with **aria-labelledby** pointing at the title id.
- **Keyboard:** Expand/collapse and primary actions must be reachable in **Tab order** after list navigation; checkboxes for bulk select already use focus—keep focus visible on chips.

---

*Phases assume one primary developer; adjust calendar for team parallelism (e.g. Phase 0 + Phase 1 design tokens in parallel after P0 fixes).*
