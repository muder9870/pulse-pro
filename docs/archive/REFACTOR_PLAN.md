# AI Pulse Pro — Refactor Plan

> Based on the April 2026 audit. Tasks are in `docs/REFACTOR_TASKS.md`.

---

## Guiding Principles

1. **Don't break what works.** The core pipeline (fetch → analyze → generate → schedule) is functional. Every phase must leave it working.
2. **Fix critical issues before adding features.** Security, stability, and correctness come before UX improvements.
3. **Small, verifiable steps.** Each task is independently deployable and testable.
4. **Backend and frontend in parallel where safe.** Phases 1 and 2 have independent backend and frontend tracks that can be worked simultaneously.

---

## Phase Overview

| Phase | Name | Focus | Risk |
|-------|------|-------|------|
| 1 | Critical Fixes | Security holes, broken infra, data integrity | Low — mostly additive |
| 2 | Stability | Concurrency bugs, import hygiene, export correctness | Low |
| 3 | Frontend Architecture | Split App.jsx, add routing, Zustand store | Medium |
| 4 | Performance | Code splitting, pagination, SSE singleton | Medium |
| 5 | Security Hardening | Auth, rate limiting, CSP, secrets | High — requires coordination |
| 6 | Developer Experience | Tests, API docs, monitoring, coverage | Low |

---

## Phase 1 — Critical Fixes (Do First)

These are bugs or gaps that can cause data loss, service failure, or security exposure right now.

### 1.1 Fix `backend/database/init.sql` directory vs file
The PostgreSQL init script path in `docker-compose.yml` points to a directory. On a fresh `docker compose up`, the database is never initialized and the app fails to start.

**Files:** `backend/database/`, `docker-compose.yml`
**Action:** Consolidate all SQL into a single `backend/database/init.sql` file. Remove the directory.

### 1.2 Create `backend/tasks.py`
`celery_app.py` includes `'backend.tasks'` but the file doesn't exist. Celery workers crash on startup with an `ImportError`.

**Files:** `backend/tasks.py` (create)
**Action:** Create the file with stub task definitions for `process_article` and `generate_content` (the two queues referenced in `celery_app.py`).

### 1.3 Enforce pipeline lock in `/api/pipeline/run` with correct lifecycle
The `pipeline_lock` exists in `backend/api/state.py` but is never acquired in the route handler. Clicking "Run Pipeline" twice starts two concurrent pipeline runs.

**Files:** `backend/api/routes/pipeline.py`
**Action:** Acquire `pipeline_lock` with `blocking=False` in the route handler. If acquire fails, return HTTP 409. The lock must be released inside the daemon thread using `try/finally` — NOT in the route handler, because the thread outlives the request. A half-implemented lock (acquire without guaranteed release) is worse than no lock — a thread crash would permanently deadlock the pipeline. See Task 1.3 in `REFACTOR_TASKS.md` for the complete pattern.

### 1.4 Move hardcoded credentials out of `docker-compose.yml`
PostgreSQL password (`pulsepassword`) is hardcoded. Redis has no password at all.

**Files:** `docker-compose.yml`, `.env.example`
**Action:** Reference `${POSTGRES_PASSWORD}` and `${REDIS_PASSWORD}` from `.env`. Add both to `.env.example` with placeholder values. Add Redis `--requirepass` flag.

### 1.5 Add missing env vars to `.env.example`
`CONTENT_TOP_LIMIT`, `GENERATION_TOP_N`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` are all used in code but absent from `.env.example`.

**Files:** `.env.example`
**Action:** Add all missing variables with comments explaining their purpose and default values.

### 1.6 Run Alembic migrations on container startup
The `Dockerfile` starts Gunicorn directly. Schema changes require manual `alembic upgrade head`. On a fresh deploy with an existing database, the app can fail with column-not-found errors.

**Files:** `Dockerfile`, or a new `entrypoint.sh`
**Action:** Add `alembic upgrade head` before the Gunicorn start command. Use an entrypoint script so failures are visible.

---

## Phase 2 — Stability & Code Hygiene

These are bugs that don't crash the app today but will cause subtle failures as the codebase grows.

### 2.1 Fix `stories.py` model import
`backend/api/routes/stories.py` imports `RawArticle` from `backend.models` (the old backup file) instead of `backend.db.models` (the current source of truth). If the two files diverge, the stories route will silently use stale schema.

**Files:** `backend/api/routes/stories.py`
**Action:** Change `from backend.models import RawArticle` to `from backend.db.models import RawArticle`.

### 2.2 Fix `useStories` React Query cache key
`queryKey: ['stories', options]` passes a new object reference on every render, causing React Query to treat every render as a cache miss and refetch. This means the Intelligence Feed re-fetches on every keystroke in the search box.

**Files:** `frontend/src/hooks/useStories.js`
**Action:** Change to `queryKey: ['stories', limit, sort, source]` using primitive values.

### 2.3 Move `ToastWrapper` outside `App()`
Defining a component inside a render function creates a new component type on every render. React unmounts and remounts `ToastWrapper` on every `App` re-render, causing toast notifications to flash and disappear.

**Files:** `frontend/src/App.jsx`
**Action:** Move `ToastWrapper` to module scope (outside the `App` function).

### 2.4 Fix default exports in hooks and utility files
`useDataMigration.js`, `useAccessibility.js`, and `AccessibilityComponents.jsx` all use `export default { ... }` (exporting a plain object). If any of these are ever imported as a React component, they will throw React error #130.

**Files:** `frontend/src/hooks/useDataMigration.js`, `frontend/src/hooks/useAccessibility.js`, `frontend/src/components/AccessibilityComponents.jsx`
**Action:** Remove `export default { ... }` from all three. All exports should be named exports only.

### 2.5 Verify and deduplicate `ui/index.js` Button export
The grep audit found `export { default as Button } from './Button'` appearing twice in `ui/index.js`. Duplicate exports cause a build warning and can cause unexpected behavior in some bundlers.

**Files:** `frontend/src/components/ui/index.js`
**Action:** Open the file, remove the duplicate line.

### 2.6 Clean up `useOffline.js` dead code
`offlineFetch` and `syncQueue` depend on a service worker to replay queued requests. The SW registration was removed as part of the React error #130 fix. These functions now silently queue requests that are never replayed.

**Files:** `frontend/src/hooks/useOffline.js`
**Action:** Remove `offlineFetch`, `syncQueue`, and the offline request queue from `useOffline.js`. Keep `isOnline`, `isOfflineMode`, and the online/offline event listeners.

### 2.7 Remove `docker-compose.yml` backend volume mount for production
The `./backend:/app/backend` volume mount overrides the built Docker image with the host filesystem. This is useful for local development but makes the image non-portable.

**Files:** `docker-compose.yml`
**Action:** Move the volume mount to a `docker-compose.override.yml` (for local dev only). The base `docker-compose.yml` should be self-contained.

### 2.8 Remove dead `normalizeStory` code and fix field name contract
`ApiClient` has `normalizeStory` and `normalizeStories` methods that are never called. More critically, `normalizeStory` maps `story.score` but the API returns `total_score`. If normalization were ever enabled, every score reference in `App.jsx` and `StoryCard.jsx` would silently become `undefined`. This is a latent bug, not just dead code.

**Files:** `frontend/src/api/client.js`, `frontend/src/App.jsx`, `frontend/src/components/StoryCard.jsx`
**Action:** Either delete `normalizeStory`/`normalizeStories` entirely (Option A, recommended), or fix the field mapping to preserve `total_score` and wire it up consistently (Option B). Grep for `story.score` vs `story.total_score` across the frontend and make them consistent.

### 2.9 Verify `BulkActionsBar` Modal prop API
The audit flagged that `BulkActionsBar` uses `<Modal>` from `./ui` but the prop API was never verified. If `Modal` expects `isOpen` but receives `open`, the modal never renders — a silent bug.

**Files:** `frontend/src/components/BulkActionsBar.jsx`, `frontend/src/components/ui/Modal.jsx`
**Action:** Compare the props passed vs the props expected. Fix any mismatch. Test that Schedule and Tag modals open and close correctly.

---

## Phase 3 — Frontend Architecture Refactor

The biggest structural debt. `App.jsx` at 1500+ lines is the single largest maintenance risk in the codebase.

### 3.1 Extract view components from `App.jsx`
Each view (`dashboard`, `analytics`, `calendar`, `media`, `research`, `podcast`, `settings`) should be its own file. `App.jsx` should only contain the layout shell, navigation state, and view routing.

**New files:**
- `frontend/src/views/DashboardView.jsx` — Intelligence Feed, FilterBar, BulkActionsBar, StoryCard list
- `frontend/src/views/AnalyticsView.jsx` — wraps `EnhancedAnalytics`
- `frontend/src/views/CalendarView.jsx` — wraps `ContentCalendar`
- `frontend/src/views/MediaView.jsx` — wraps `MediaManager`
- `frontend/src/views/ResearchView.jsx` — wraps `ResearchView`
- `frontend/src/views/PodcastView.jsx` — wraps `PodcastView`
- `frontend/src/views/SettingsView.jsx` — wraps `SettingsView`

### 3.2 Add React Router for URL-based navigation
`react-router-dom` is already installed. Replace the `currentView` state switch with proper routes. This gives browser back/forward support and deep linking.

**Routes:**
```
/              → DashboardView
/analytics     → AnalyticsView
/calendar      → CalendarView
/media         → MediaView
/research      → ResearchView
/podcast       → PodcastView
/settings      → SettingsView
```

### 3.3 Add Zustand store for shared UI state
Move `currentView`, `activeSource`, `filters`, `selectedIds`, `bulkOperationState`, `bulkOperationError`, `activeTheme` out of `App.jsx` into a Zustand store. This eliminates prop drilling and makes state accessible from any component.

`selectedIds` is particularly important — it currently drives all bulk operations via prop drilling through `App.jsx` → `DashboardView` → `BulkActionsBar`. Moving it to the store means `BulkActionsBar` can read selection state directly without a prop chain.

`currentView` should remain in the store during the React Router migration (task 3.2) to keep the Sidebar in sync. Once routing is fully in place, `currentView` can be derived from `useLocation()` instead.

**New file:** `frontend/src/store/appStore.js`

### 3.4 Add per-view error boundaries
`FeatureErrorBoundary.jsx` already exists. Wrap each view render in `App.jsx` with it so a crash in one view doesn't blank the entire app.

### 3.5 Add empty state for Intelligence Feed
When `filteredStories.length === 0` and `loading === false`, show a helpful empty state component with a "Run Pipeline" CTA and instructions for first-time setup.

**New file:** `frontend/src/components/EmptyFeed.jsx`

### 3.6 Add loading skeletons to all async views
`Skeleton.jsx` exists but is only used in a few places. All views that fetch data should show skeleton placeholders while loading — this prevents layout shift and gives users immediate visual feedback.

**Files:** `DashboardView.jsx`, `EnhancedAnalytics.jsx`, `ContentCalendar.jsx`, `ResearchView.jsx`, `MediaView.jsx`

---

## Phase 4 — Performance

### 4.1 Add route-level code splitting
Use `React.lazy()` for all view components. The current 812KB bundle will split into a ~150KB initial chunk plus per-route chunks loaded on demand.

**Files:** `frontend/src/App.jsx` (or the new router file from Phase 3)

### 4.2 Implement server-side pagination
The API already supports `page` and `limit`. Replace the client-side `displayLimit` approach with proper server-side pagination. Fetch 20 stories per page, show a "Load More" button or infinite scroll.

**Files:** `frontend/src/hooks/useStories.js`, `frontend/src/views/DashboardView.jsx`

### 4.3 Make `usePipeline` a singleton via React Context
Currently every component that calls `usePipeline()` opens its own `EventSource` connection. With `PipelineStatus` and `App.jsx` both using it, two SSE connections are open. Wrap the SSE logic in a context provider so the connection is shared.

**New file:** `frontend/src/context/PipelineContext.jsx`
**Files:** `frontend/src/hooks/usePipeline.js` (refactor to use context)

### 4.4 Add React Query DevTools in development
Add `@tanstack/react-query-devtools` to `main.jsx` behind a `import.meta.env.DEV` guard.

---

## Phase 5 — Security Hardening

Do this before exposing the app to any network beyond localhost.

### 5.1 Add HTTP Basic Auth via nginx (minimum viable auth)
Add `auth_basic` to `nginx.conf` with a `.htpasswd` file. This is a single-user solution but prevents unauthorized access with zero code changes to the app.

**Files:** `frontend/nginx.conf`, `docker-compose.yml`

### 5.2 Add Flask-Limiter for API rate limiting
Install `flask-limiter` and apply limits to the most sensitive endpoints:
- `POST /api/pipeline/run` — 1 per minute
- `POST /api/generate` — 10 per minute
- `GET /api/stories` — 60 per minute

**Files:** `backend/main.py`, `backend/api/routes/pipeline.py`, `backend/api/routes/content.py`

### 5.3 Add Flask-Talisman for security headers and eliminate `'unsafe-inline'`
Replace the manual `add_header` directives in `nginx.conf` with Flask-Talisman. The audit goal (Issue #26, Suggestion U) is to **eliminate** `'unsafe-inline'` from the CSP entirely. Tailwind CSS in production is compiled to static classes — it does not inject inline styles at runtime, so `'unsafe-inline'` is not needed and must not be carried forward.

**Files:** `backend/main.py`, `requirements.txt`, `frontend/nginx.conf`

### 5.4 Add request schema validation
Add Pydantic or marshmallow validation to all POST endpoints. Return HTTP 422 with a clear error message for malformed requests instead of leaking a stack trace.

**Files:** All files in `backend/api/routes/`

### 5.5 Rotate `SECRET_KEY` and enforce it in config
Add a startup check that raises an error if `SECRET_KEY` is still the default value `"change-me-in-.env"`.

**Files:** `backend/config.py`, `backend/main.py`

---

## Phase 6 — Developer Experience

### 6.1 Add Playwright E2E tests
Add a minimal Playwright test suite that:
- Loads the app at `http://localhost:3000`
- Verifies the Intelligence Feed renders stories
- Clicks "Run Pipeline" and verifies the status bar appears
- Navigates to Analytics, Calendar, Settings and verifies no crash

**New file:** `e2e/tests/smoke.spec.ts`

### 6.2 Add backend test coverage reporting
Configure `pytest-cov` and add a coverage report to the CI/test-runner service.

**Files:** `docker-compose.yml` (test-runner service), `pytest.ini` or `pyproject.toml`

### 6.3 Add OpenAPI documentation
Add `flasgger` or `flask-smorest` to auto-generate Swagger UI from the existing route definitions. Accessible at `/api/docs`.

**Files:** `backend/main.py`, `requirements.txt`, all route files

### 6.4 Add frontend test coverage
Configure `@vitest/coverage-v8` (already in `devDependencies`) and add a coverage threshold to `vitest.config.js`.

**Files:** `frontend/vitest.config.js`, `frontend/package.json`

### 6.5 Add `CHANGELOG.md`
Document what changed in each version. Start from the current state (v2.1 post-bugfix).

---

## Dependency Map

Some tasks depend on others. This is the safe execution order:

```
Phase 1 (all tasks) → can be done in any order within the phase
Phase 2 (all tasks) → can be done in any order, independent of Phase 1
  2.9 (BulkActionsBar Modal) → should be done before 3.1 (so the bug is known before extraction)
  2.8 (normalizeStory) → should be done before 3.1 (field names must be consistent before splitting)
Phase 3.1 → must come before 3.2, 3.3, 3.4, 3.6
Phase 3.2 → depends on 3.1
Phase 3.3 → depends on 3.1 (store must exist before removing props from extracted views)
Phase 3.4 → depends on 3.1
Phase 3.6 → depends on 3.1 (skeletons go inside view components)
Phase 4.1 → depends on 3.1 (needs view components to lazy-load)
Phase 4.2 → depends on 3.1 (DashboardView must exist)
Phase 4.3 → independent
Phase 5.x → independent of Phase 3/4, but do Phase 1 first
Phase 6.x → independent, can be done any time
```

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|---------------|
| 1 | 6 tasks | 2–3 hours |
| 2 | 9 tasks (2.7–2.9 added) | 3–4 hours |
| 3 | 6 tasks (3.6 added) | 2–3 days |
| 4 | 4 tasks | 4–6 hours |
| 5 | 5 tasks | 4–6 hours |
| 6 | 5 tasks | 4–6 hours |
| **Total** | **35 tasks** | **~6–9 days** |

> Phase 3 estimate revised upward from the original 1–2 days. Task 3.1 alone (extracting 7 views from a 1500-line file with explicit prop interfaces) is a full day for someone familiar with the codebase. Budget 2–3 days for the full phase.
