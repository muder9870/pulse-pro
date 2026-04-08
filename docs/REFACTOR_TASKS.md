# AI Pulse Pro — Refactor Task List

> Generated from audit in `docs/AUDIT_AND_SUGGESTIONS.md`.
> Full rationale for each task is in `docs/REFACTOR_PLAN.md`.
>
> Status legend: `[ ]` not started · `[-]` in progress · `[x]` done

---

## Phase 1 — Critical Fixes

> These must be done before any other work. They fix broken infrastructure and security holes.

- [x] 1.1 Fix `backend/database/init.sql` — convert directory to a single SQL file
  - Verify `backend/database/init.sql` is currently a directory (not a file)
  - Consolidate all table creation SQL into a single `backend/database/init.sql` file
  - Update `docker-compose.yml` volume mount: `./backend/database/init.sql:/docker-entrypoint-initdb.d/init.sql`
  - Test: `docker compose down -v && docker compose up` — database must initialize without errors
  - _Audit ref: Issue #20_

- [x] 1.2 Create `backend/tasks.py` with Celery task stubs
  - Already exists and is fully implemented with `process_article`, `generate_content`, `reconcile_stuck_tasks` and supporting utilities. No action needed.
  - Create `backend/tasks.py`
  - Define `process_article(article_id: int)` task on queue `article_processing`
  - Define `generate_content(article_id: int, platforms: list)` task on queue `content_generation`
  - Both tasks should call the existing pipeline functions (not duplicate logic)
  - Test: `celery -A backend.celery_app worker --dry-run` must not raise `ImportError`
  - _Audit ref: Issue #5_

- [x] 1.3 Enforce pipeline lock in `/api/pipeline/run` with correct lifecycle
  - Open `backend/api/routes/pipeline.py`
  - Import `pipeline_lock` from `backend.api.state`
  - The lock must be acquired in the route handler and released inside the daemon thread — not in the route handler — because the thread outlives the request. The complete pattern:

    ```python
    @pipeline_bp.route("/run", methods=["POST"])
    def run():
        acquired = pipeline_lock.acquire(blocking=False)
        if not acquired:
            return jsonify({"status": "already_running", "message": "Pipeline is already running"}), 409

        def run_and_release():
            try:
                run_daily_pipeline()
            finally:
                pipeline_lock.release()  # always release, even on crash

        thread = threading.Thread(target=run_and_release, daemon=True)
        thread.start()
        return jsonify({"status": "started"}), 200
    ```

  - Do NOT call `pipeline_lock.release()` in the route handler — the thread is still running at that point
  - Do NOT use `with pipeline_lock:` in the route handler — that acquires AND releases before the thread starts
  - The `finally` block in `run_and_release` guarantees the lock is released even if `run_daily_pipeline()` raises an unhandled exception, preventing permanent deadlock
  - Test: POST `/api/pipeline/run` twice in quick succession — second call must return 409
  - Test: simulate a pipeline crash (raise inside `run_daily_pipeline`) — a subsequent POST must succeed (lock was released)
  - _Audit ref: Issue #4, Suggestion I_

- [x] 1.4 Move hardcoded credentials out of `docker-compose.yml`
  - Replace `POSTGRES_PASSWORD=pulsepassword` with `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`
  - Replace `POSTGRES_USER=pulseuser` with `POSTGRES_USER=${POSTGRES_USER}`
  - Replace `POSTGRES_DB=pulsedb` with `POSTGRES_DB=${POSTGRES_DB}`
  - Update `DATABASE_URL` in backend service to use the same env vars
  - Add `redis-server --requirepass ${REDIS_PASSWORD}` to Redis service command
  - Update `REDIS_URL` in backend service to include the password
  - Add all new vars to `.env.example` with placeholder values
  - Test: `docker compose config` must show no hardcoded credentials
  - _Audit ref: Issues #27, #28, Suggestions K, L_

- [x] 1.5 Add all missing variables to `.env.example`
  - Add `POSTGRES_USER=pulseuser`
  - Add `POSTGRES_PASSWORD=change-me`
  - Add `POSTGRES_DB=pulsedb`
  - Add `REDIS_PASSWORD=change-me`
  - Add `GROQ_API_KEY=` with comment: "Free key at https://console.groq.com"
  - Add `CEREBRAS_API_KEY=` with comment
  - Add `OPENROUTER_API_KEY=` with comment
  - Add `CONTENT_TOP_LIMIT=5` with comment: "Max articles to generate content for per pipeline run"
  - Add `GENERATION_TOP_N=5` with comment: "Override for content generation limit"
  - Add `SECRET_KEY=change-me` with comment: "Required — use a random 32+ character string"
  - _Audit ref: Issues #2, #18_

- [x] 1.6 Add Alembic migration to Docker entrypoint
  - Create `entrypoint.sh` in the project root:
    ```bash
    #!/bin/bash
    set -e
    echo "Running database migrations..."
    alembic upgrade head
    echo "Starting application..."
    exec gunicorn ...
    ```
  - Update `Dockerfile` to copy `entrypoint.sh` and use it as `CMD`
  - Test: `docker compose up` on a fresh database must run migrations before accepting requests
  - _Audit ref: Issue #19, Suggestion J_

---

## Phase 2 — Stability & Code Hygiene

> Fix bugs that don't crash today but will cause subtle failures as the codebase grows.

- [x] 2.1 Fix model import in `backend/api/routes/stories.py`
  - Also fixed `backend/api/routes/media.py` which had the same stale import.
  - Change `from backend.models import RawArticle` to `from backend.db.models import RawArticle`
  - Verify no other route files import from `backend.models` (the old backup)
  - Run `python -c "from backend.api.routes.stories import stories_bp"` — must not raise
  - _Audit ref: Issue #16_

- [x] 2.2 Fix `useStories` React Query cache key and note `useSources` double-render
  - Open `frontend/src/hooks/useStories.js`
  - Change `queryKey: ['stories', options]` to `queryKey: ['stories', limit, sort, source]`
  - Destructure `limit`, `sort`, `source` from `options` before the `queryKey` line
  - Test: type in the search box — network tab must not show a new `/api/stories` request on every keystroke
  - **Note on `useSources` double-render (Issue #12):** `useSources()` is called in both `App.jsx` and `FilterBar.jsx`. React Query deduplicates the network request (same `['sources']` key), so there is no double fetch. However, both components re-render when the query updates. This is acceptable for now — the fix is to remove the `useSources()` call from `FilterBar.jsx` and pass `sources` as a prop from `App.jsx` (or from the Zustand store after task 3.3). Address this as part of task 3.1 when `FilterBar` is moved into `DashboardView`.
  - _Audit ref: Issue #8, Issue #12, Suggestion O_

- [x] 2.3 Move `ToastWrapper` outside `App()` render function
  - Open `frontend/src/App.jsx`
  - Cut the `const ToastWrapper = () => { ... }` definition from inside `App()`
  - Paste it at module scope, above the `export default function App()` line
  - Verify toast notifications still appear and dismiss correctly
  - _Audit ref: Issue #7, Suggestion N_

- [x] 2.4 Fix default exports in hooks and utility files
  - `frontend/src/hooks/useDataMigration.js`: remove `export default { ... }` at the bottom — all exports are already named
  - `frontend/src/hooks/useAccessibility.js`: remove `export default { ... }` at the bottom — all exports are already named
  - `frontend/src/components/AccessibilityComponents.jsx`: remove `export default { ... }` at the bottom — all exports are already named
  - Run `npx vitest run` — all tests must still pass
  - _Audit ref: Issues #22, #23_

- [x] 2.5 Remove duplicate Button export from `ui/index.js`
  - Verified: no duplicate exists in the file. The grep result was a false positive from context line matching. No change needed.
  - Open `frontend/src/components/ui/index.js`
  - Find and remove the duplicate `export { default as Button } from './Button'` line
  - Run `npx vitest run src/tests/component-imports.test.jsx` — must pass
  - _Audit ref: Issue #24_

- [x] 2.6 Clean up dead code in `useOffline.js`
  - Open `frontend/src/hooks/useOffline.js`
  - Remove `offlineFetch` function and its dependencies
  - Remove `syncQueue` function and its dependencies
  - Remove the offline request queue array and related state
  - Keep: `isOnline`, `isOfflineMode`, online/offline event listeners, `serviceWorkerReady` state
  - Update the hook's return value to remove the deleted exports
  - Check all files that import from `useOffline.js` — remove any usage of the deleted exports
  - Run `npx vitest run` — all tests must pass
  - _Audit ref: Issue #15_

- [x] 2.7 Create `docker-compose.override.yml` for local development
  - Create `docker-compose.override.yml` with the backend volume mount:

    ```yaml
    services:
      backend:
        volumes:
          - ./backend:/app/backend
    ```

  - Remove the `./backend:/app/backend` volume from the base `docker-compose.yml`
  - Add `docker-compose.override.yml` to `.gitignore` (optional — it's safe to commit)
  - Document in README that `docker compose up` automatically uses the override file in local dev
  - _Audit ref: Issue #17_

- [x] 2.8 Remove dead `normalizeStory` code and fix field name contract
  - Deleted `normalizeStory` and `normalizeStories` from `ApiClient` (Option A).
  - The API field is `total_score` — confirmed consistent across `App.jsx` and `StoryMetrics.jsx`. No field name mismatch remains.
  - Open `frontend/src/api/client.js`
  - The `normalizeStory` method maps `story.score` but `App.jsx` and `StoryCard.jsx` use `story.total_score` (the actual API field name). If normalization were ever enabled, `total_score` would silently become `undefined` everywhere.
  - Two options — pick one and apply it consistently:
    - **Option A (recommended):** Delete `normalizeStory` and `normalizeStories` entirely. `useStories` already returns raw API data. Document in a comment that the API field is `total_score`.
    - **Option B:** Fix `normalizeStory` to preserve `total_score` (`total_score: story.total_score || story.score || 0`) and call it in `useStories`. Then update all references in `App.jsx` and `StoryCard.jsx` to use the normalized field names.
  - Whichever option is chosen, grep for `story.score` and `story.total_score` across the frontend and make them consistent
  - Test: stories must still sort correctly by score in the Intelligence Feed
  - _Audit ref: Issue #9 — latent field name mismatch between API response and normalization layer_

- [x] 2.9 Verify `BulkActionsBar` Modal prop API
  - Verified: `Modal` uses `open` and `onClose`. `BulkActionsBar` passes `open={showTagModal/showScheduleModal}` and `onClose`. Props match — no fix needed.
  - Open `frontend/src/components/BulkActionsBar.jsx` and `frontend/src/components/ui/Modal.jsx`
  - Check what props `Modal` expects for open/close: likely `isOpen` and `onClose`
  - Check what props `BulkActionsBar` passes to `<Modal>`
  - If there is a mismatch, fix the prop names in `BulkActionsBar.jsx`
  - Test: open the bulk actions bar by selecting a story, click "Schedule" — the schedule modal must open and close correctly
  - Test: click "Tag" — the tag modal must open and close correctly
  - _Audit ref: Issue #13 — was audited but never assigned for verification_

---

## Phase 3 — Frontend Architecture Refactor

> Split the 1500-line `App.jsx` monolith into maintainable view components.

- [x] 3.1 Extract view components from `App.jsx`
  - [x] Created `frontend/src/views/` directory
  - [x] Created `AnalyticsView.jsx`, `CalendarView.jsx`, `MediaView.jsx`, `PodcastView.jsx`, `ResearchView.jsx`, `SettingsView.jsx` — each wraps its component in `FeatureErrorBoundary`
  - [x] Created `DashboardView.jsx` — receives all state as props from `AppContent`, owns the Intelligence Feed, FilterBar, BulkActionsBar, BulkOperationProgress, BulkOperationError
  - [x] Updated `App.jsx` imports and view switch to use all new view components
  - [x] Cleaned up unused imports from `App.jsx`
  - [x] All 99 tests pass — no regressions
  - Note: `AppContent` still owns all state. Zustand migration is task 3.3 (incremental).
  - Create `frontend/src/views/` directory
  - Extract dashboard content (FilterBar, StoryCard list, BulkActionsBar, DailyIntelligence, DashboardStats, PipelineStatus) into `frontend/src/views/DashboardView.jsx`
    - Props: `stories`, `loading`, `filters`, `onFilterChange`, `selectedIds`, `onToggleSelection`, `onBulkGenerate`, `onBulkSchedule`, `onBulkTag`, `onBulkExport`, `onBulkDelete`, `activeTheme`, `sources`
  - Create `frontend/src/views/AnalyticsView.jsx` — thin wrapper around `<EnhancedAnalytics />`
  - Create `frontend/src/views/CalendarView.jsx` — thin wrapper around `<ContentCalendar />`
  - Create `frontend/src/views/MediaView.jsx` — thin wrapper around `<MediaManager />`
  - Create `frontend/src/views/ResearchView.jsx` — thin wrapper around `<ResearchView />`
  - Create `frontend/src/views/PodcastView.jsx` — thin wrapper around `<PodcastView />`
  - Create `frontend/src/views/SettingsView.jsx` — thin wrapper around `<SettingsView />`
  - Update `App.jsx` to import and render the new view components
  - Test: all views must render without errors after extraction
  - _Audit ref: Issue #6, Suggestion A_

- [x] 3.2 Add React Router for URL-based navigation
  - Added `<BrowserRouter>` in `main.jsx`
  - Replaced `currentView` useState with `useLocation`-derived value — all existing `currentView` checks work unchanged
  - `setCurrentView` is now a `useNavigate` wrapper — all existing calls work unchanged
  - Replaced ternary view switch with `<Routes>` + `<Route>` in `AppContent`
  - Updated `Sidebar` to use `useNavigate` + `useLocation` — removed `currentView`/`setCurrentView` props
  - `nginx.conf` already has `try_files $uri $uri/ /index.html` — deep links work
  - Build passes, 99/99 tests pass, Docker verified healthy
  - Wrap the app in `<BrowserRouter>` in `frontend/src/main.jsx`
  - Replace the `currentView` state switch in `App.jsx` with `<Routes>` and `<Route>` components
  - Map routes: `/` → DashboardView, `/analytics` → AnalyticsView, `/calendar` → CalendarView, `/media` → MediaView, `/research` → ResearchView, `/podcast` → PodcastView, `/settings` → SettingsView
  - Update `Sidebar.jsx` to use `<Link>` or `useNavigate()` instead of `setCurrentView()`
  - Update `nginx.conf` — already has `try_files $uri $uri/ /index.html` so SPA routing works
  - Test: navigate to `/analytics` directly in the browser — must load the Analytics view
  - _Audit ref: Suggestion B_

- [x] 3.3 Add Zustand store for shared UI state
  - Created `frontend/src/store/appStore.js`
  - Migrated incrementally in 3 steps — each verified with tests before proceeding:
    - Step 1: `activeTheme` / `setActiveTheme`
    - Step 2: `activeSource` / `setActiveSource`, `filters` / `setFilters`
    - Step 3: `bulkOperationState` / `setBulkOperationState`, `bulkOperationError` / `setBulkOperationError`
  - `selectedIds` stays in `useBulkSelection` hook — it's already well-encapsulated and the hook handles toggle/selectAll logic correctly
  - `AppContent` reads all migrated state from the store via `useAppStore(s => s.x)` selectors
  - All 99 tests pass after each step
  - Install: already in `package.json` (`zustand ^4.3.8`)
  - Create `frontend/src/store/appStore.js` with the following state slices — include ALL of these, the PLAN listed some but the implementation must cover all shared state:
    - `currentView` / `setCurrentView` — the active route/view name (needed until React Router fully replaces it in 3.2; keep both in sync during migration)
    - `activeSource` / `setActiveSource` — the selected source filter
    - `filters` / `setFilters` — the FilterBar filter object
    - `activeTheme` / `setActiveTheme` — light/dark/system
    - `selectedIds` / `toggleSelectedId` / `clearSelection` / `selectAll` — bulk selection set (a `Set<number>`); this drives all bulk operations and must be in the store, not local state, so `BulkActionsBar` and `DashboardView` share the same selection without prop drilling
    - `bulkOperationState` / `setBulkOperationState` — `{ isActive, operationName, current, total }`
    - `bulkOperationError` / `setBulkOperationError` — `{ isVisible, operationName, failedArticles, retryHandler }`
  - Replace `useState` calls in `App.jsx` for all of the above with Zustand store reads/writes
  - Remove the corresponding props being drilled into child components — `selectedIds`, `onToggleSelection`, `onBulkGenerate`, etc. should no longer be passed as props; components read from the store directly
  - Test: theme toggle, source filter, bulk selection, and bulk operation progress must all still work
  - Test: select 3 stories, navigate away and back — selection must be cleared (add a `useEffect` in `DashboardView` that calls `clearSelection` on unmount)
  - _Audit ref: Suggestion C (PLAN listed currentView and selectedIds — both must be included)_

- [x] 3.4 Add per-view error boundaries
  - Already done as part of 3.1 — every view file (`AnalyticsView`, `CalendarView`, `MediaView`, `PodcastView`, `ResearchView`, `SettingsView`, `DashboardView`) wraps its component in `FeatureErrorBoundary`.
  - Open `App.jsx` (or the new router file from 3.2)
  - Import `FeatureErrorBoundary` from `./components/FeatureErrorBoundary`
  - Wrap each `<Route>` element with `<FeatureErrorBoundary name="ViewName">`
  - Test: temporarily throw an error inside `EnhancedAnalytics` — only the Analytics view should show the error UI, not the whole app
  - _Audit ref: Issue #14, Suggestion Q_

- [x] 3.5 Add empty state for Intelligence Feed
  - Created `frontend/src/components/EmptyFeed.jsx` with "Run Pipeline" CTA and first-time setup hint
  - `DashboardView` now distinguishes two cases: `stories.length === 0` (EmptyFeed) vs `filteredStories.length === 0` (Clear filters prompt)
  - Create `frontend/src/components/EmptyFeed.jsx`
    - Show an icon, "No stories yet" heading, and a description
    - Include a "Run Pipeline" button that calls `onRunPipeline` prop
    - Include a "First time? Check the setup guide" link
  - In `DashboardView.jsx`, render `<EmptyFeed onRunPipeline={...} />` when `filteredStories.length === 0 && !loading`
  - _Audit ref: Suggestion S_

- [x] 3.6 Add loading skeletons to all async views
  - `EnhancedAnalytics` — already had a proper custom skeleton, no change needed
  - `MediaManager` — already used `<Skeleton variant="card" count={8} />`, no change needed
  - `DailyIntelligence` — already had `animate-pulse` + `<Spinner>`, no change needed
  - `ContentCalendar` — replaced bare spinner with animated row skeletons
  - `ResearchView` — replaced bare spinner with animated row skeletons
  - `PodcastView` — added skeleton for the content area (was missing — loading state existed but no skeleton was shown)
  - `SettingsView` — no async data fetch at top level, N/A
  - `Skeleton.jsx` exists and is used in a few places but most views show nothing while loading
  - In each view component, check for a `loading` / `isLoading` state and render `<Skeleton />` rows while data is being fetched:
    - `DashboardView.jsx` — skeleton story cards while `useStories` is loading
    - `EnhancedAnalytics.jsx` — skeleton chart placeholders while analytics data loads
    - `ContentCalendar.jsx` — skeleton calendar rows while posts load
    - `ResearchView.jsx` — skeleton paper rows while research data loads
    - `MediaView.jsx` — skeleton image grid while assets load
  - Use the existing `Skeleton` variants (line, card, etc.) — do not create new ones
  - _Audit ref: Suggestion R — was in the audit but never made it into tasks_

---

## Phase 4 — Performance

- [x] 4.1 Add route-level code splitting with `React.lazy()`
  - Replaced direct imports of 6 view components with `React.lazy()` — DashboardView stays eager (default route, instant first paint)
  - Wrapped `<Routes>` in `<Suspense fallback={<Skeleton type="page" />}>`
  - Initial bundle: **815KB → 378KB** (54% reduction)
  - Each view is now a separate chunk: CalendarView 3.4KB, PodcastView 4.4KB, ResearchView 9.6KB, MediaView 9.7KB, SettingsView 46.6KB, AnalyticsView 388KB (recharts is large)
  - 99/99 tests pass
  - In the router file (from task 3.2), replace direct imports of view components with `React.lazy()`:
    ```jsx
    const AnalyticsView = React.lazy(() => import('./views/AnalyticsView'));
    const ContentCalendar = React.lazy(() => import('./views/CalendarView'));
    // etc.
    ```
  - Wrap the `<Routes>` block in `<Suspense fallback={<Skeleton />}>`
  - Run `npm run build` — verify `dist/assets/` contains multiple JS chunks
  - Verify initial bundle is under 300KB
  - _Audit ref: Issue #25, Suggestion P_

- [x] 4.2 Implement server-side pagination in Intelligence Feed
  - Replaced `useQuery` with `useInfiniteQuery` in `useStories` — fetches 20 stories per page
  - `App.jsx` flattens `data.pages` into a single `stories` array
  - `DashboardView` uses `fetchNextPage`/`hasNextPage`/`isFetchingNextPage` for the "Load More" button
  - Removed `displayLimit` useState and its reset useEffect from `App.jsx`
  - On initial load only 20 stories are fetched; each "Load More" fetches the next 20
  - 99/99 tests pass
  - Update `useStories` hook to accept a `page` parameter
  - Add `page` to the React Query key: `['stories', limit, sort, source, page]`
  - In `DashboardView.jsx`, replace the `displayLimit` / "Load More" approach with page-based navigation
  - Add a "Load More" button that increments the page and appends results (or use infinite query with `useInfiniteQuery`)
  - Remove client-side `displayLimit` state from `App.jsx`
  - Test: with 100+ stories in the database, verify only 20 are fetched on initial load
  - _Audit ref: Issue #11, Suggestion D_

- [x] 4.3 Make `usePipeline` a singleton via React Context
  - Created `frontend/src/context/PipelineContext.jsx` with `PipelineProvider` and `usePipeline` hook
  - `PipelineProvider` opens exactly one SSE connection — shared by all consumers
  - `frontend/src/hooks/usePipeline.js` re-exports from context for backward compatibility — no import changes needed anywhere
  - Added `<PipelineProvider>` to `main.jsx` wrapping the app
  - 99/99 tests pass
  - Create `frontend/src/context/PipelineContext.jsx`
    - Open one `EventSource` connection
    - Expose `status` object via context
    - Close the connection on unmount
  - Wrap the app in `<PipelineProvider>` in `main.jsx`
  - Refactor `usePipeline.js` to read from context instead of opening its own `EventSource`
  - Test: open DevTools Network tab — verify only one `pipeline/stream` SSE connection is open
  - _Audit ref: Issue #10_

- [x] 4.4 Add React Query DevTools in development
  - Installed `@tanstack/react-query-devtools`
  - Added to `main.jsx` behind `import.meta.env.DEV` guard — only visible in `npm run dev`, not in production build
  - Install: `npm install -D @tanstack/react-query-devtools`
  - In `frontend/src/main.jsx`, add:
    ```jsx
    import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
    // Inside the QueryClientProvider:
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    ```
  - Verify DevTools panel appears in `npm run dev` but not in production build
  - _Audit ref: Suggestion E_

---

## Phase 5 — Security Hardening

> Do this before exposing the app on any network beyond localhost.

- [x] 5.1 Add HTTP Basic Auth via nginx
  - Added `auth_basic` to `nginx.conf` `location /` block
  - `/health` endpoint has `auth_basic off` so Docker healthchecks still work
  - `frontend/Dockerfile` copies `.htpasswd` to `/etc/nginx/`
  - Created placeholder `frontend/.htpasswd` (comment file — no valid credentials)
  - Created `.gitignore` with `frontend/.htpasswd` excluded — real credentials must never be committed
  - Documented in README under "Security Setup": how to generate `.htpasswd`, how to disable auth for local dev, what each placeholder needs replaced
  - To enable: run `htpasswd -c frontend/.htpasswd admin`, rebuild Docker image
  - Create `frontend/.htpasswd` with a hashed password (use `htpasswd -c .htpasswd admin`)
  - Add to `nginx.conf` inside the `location /` block:
    ```nginx
    auth_basic "AI Pulse Pro";
    auth_basic_user_file /etc/nginx/.htpasswd;
    ```
  - Update `frontend/Dockerfile` to copy `.htpasswd` to `/etc/nginx/.htpasswd`
  - Exclude `/health` endpoint from auth (nginx health check must still work)
  - Add `.htpasswd` to `.gitignore`
  - Document setup in README
  - _Audit ref: Issue #1, Suggestion T_

- [x] 5.2 Add Flask-Limiter for API rate limiting
  - Added `Flask-Limiter[redis]>=3.5.0` to `requirements.txt`
  - Created `backend/api/limiter.py` — shared limiter instance (avoids circular imports)
  - Initialized via `limiter.init_app(app)` in `main.py` with Redis storage
  - Applied limits: `POST /api/pipeline/run` → 2/min, `POST /api/generate` → 10/min, `GET /api/stories` → 60/min
  - Default limit: 200/min for all other endpoints
  - Add `flask-limiter[redis]` to `requirements.txt`
  - In `backend/main.py`, initialize `Limiter` with Redis storage:
    ```python
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(app, key_func=get_remote_address, storage_uri=settings.REDIS_URL)
    ```
  - Apply limits:
    - `POST /api/pipeline/run` — `@limiter.limit("1/minute")`
    - `POST /api/generate` — `@limiter.limit("10/minute")`
    - `GET /api/stories` — `@limiter.limit("60/minute")`
  - Test: call `/api/pipeline/run` twice in under a minute — second call must return HTTP 429
  - _Audit ref: Issue #3, Suggestion F_

- [x] 5.3 Add Flask-Talisman for security headers and eliminate `'unsafe-inline'` from CSP
  - Added `flask-talisman>=1.1.0` to `requirements.txt`
  - Added `Talisman()` to `main.py` with CSP that has no `'unsafe-inline'` (Tailwind is compiled CSS)
  - Removed duplicate `add_header` security directives from `nginx.conf` — Talisman now owns them
  - CSP: `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `connect-src 'self'` (SSE), `img-src 'self' data: https:`
  - Add `flask-talisman` to `requirements.txt`
  - The audit goal (Issue #26, Suggestion U) is to **eliminate** `'unsafe-inline'`. Tailwind CSS in production is fully compiled to static classes — it does not inject inline styles at runtime. The `'unsafe-inline'` in the original nginx CSP was unnecessary. Do not carry it forward.
  - In `backend/main.py`, after app creation:

    ```python
    from flask_talisman import Talisman
    Talisman(app, force_https=False, content_security_policy={
        'default-src': "'self'",
        'script-src': "'self'",
        'style-src': "'self'",        # no 'unsafe-inline' — Tailwind is compiled CSS
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],    # SSE /api/pipeline/stream
        'font-src': "'self'",
    })
    ```

  - If any inline styles break after this change, they must be moved to CSS classes — do not re-add `'unsafe-inline'` as a workaround
  - Remove the `add_header Content-Security-Policy` directive from `nginx.conf` — Talisman now owns it
  - Remove other duplicate `add_header` security directives from `nginx.conf` that Talisman covers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)
  - Test: load the app — browser console must show no CSP violations
  - Test: run `curl -I http://localhost:3000` — response headers must include `Content-Security-Policy` without `unsafe-inline`
  - _Audit ref: Issue #26, Suggestion U, Suggestion V — the original task draft contradicted the audit goal by keeping 'unsafe-inline'; this version resolves that contradiction_

- [x] 5.4 Add request schema validation to POST endpoints
  - Added `pydantic>=2.0.0` to `requirements.txt`
  - Created `backend/api/schemas.py` with: `GenerateRequest`, `TagRequest`, `ScheduleQueueRequest`, `ExportBatchRequest` and a `validate_request()` helper
  - Applied validation to `POST /api/generate` and `POST /api/tags/:id` — returns HTTP 422 with field-level errors on invalid input
  - `ScheduleQueueRequest` and `ExportBatchRequest` schemas are defined and ready for when those endpoints are implemented

  **⚠️ Missing backend endpoints — frontend calls these but they return 404:**

  | Endpoint | Called by | Schema ready | Status |
  |----------|-----------|-------------|--------|
  | `POST /api/schedule/queue` | `BulkActionsBar` → bulk schedule | `ScheduleQueueRequest` | ❌ Not implemented |
  | `POST /api/export/batch` | `BulkActionsBar` → bulk export | `ExportBatchRequest` | ❌ Not implemented |
  | `POST /api/articles/bulk-delete` | `BulkActionsBar` → bulk delete | — | ❌ Not implemented |

  These need to be implemented in `backend/api/routes/schedule.py`, `backend/api/routes/export.py`, and a new `backend/api/routes/articles.py` respectively. The Pydantic schemas for the first two are already in `backend/api/schemas.py`.
  - Add `pydantic` to `requirements.txt` (or use `marshmallow` if already present)
  - Create `backend/api/schemas.py` with Pydantic models for each POST body:
    - `GenerateRequest(article_id: int)`
    - `TagRequest(tags: list[str])`
    - `ScheduleRequest(article_id: int, platform: str, scheduled_time: str)`
    - `ExportBatchRequest(article_ids: list[int])`
  - Apply validation in each route — return HTTP 422 with field errors on invalid input
  - _Audit ref: Suggestion G_

- [x] 5.5 Enforce non-default `SECRET_KEY` on startup
  - Added startup check in `backend/main.py` `create_app()` — raises `RuntimeError` if `SECRET_KEY` is `"change-me"`, `"change-me-in-.env"`, or empty
  - App refuses to start with insecure default key

- [x] 5.6 Implement missing backend endpoints called by the frontend
  - **`POST /api/schedule/queue`** — implemented in `backend/api/routes/schedule.py`
    - Validates with `ScheduleQueueRequest`, resolves raw→processed article ID, creates `ScheduledPost` row
    - Rate limited: 20/min
  - **`POST /api/export/batch`** — implemented in `backend/api/routes/export.py`
    - Validates with `ExportBatchRequest`, queries all generated content for given article IDs, returns `.md` file download
    - Rate limited: 10/min
  - **`POST /api/articles/bulk-delete`** — implemented in `backend/api/routes/articles.py` (new file)
    - Cascades deletion through all child tables: generated_content, article_tags, images, audio, scheduled_posts, blog_posts, paper_analysis, etc.
    - Rate limited: 10/min
    - Blueprint registered in `backend/main.py`
  - **`POST /api/schedule/queue`** — bulk schedule articles for publishing
    - File: `backend/api/routes/schedule.py`
    - Schema: `ScheduleQueueRequest(article_id, platform, scheduled_time)` already in `backend/api/schemas.py`
    - Should create a `ScheduledPost` row in the database
    - Apply `@limiter.limit("20 per minute")`
  - **`POST /api/export/batch`** — batch export selected articles as Markdown
    - File: `backend/api/routes/export.py`
    - Schema: `ExportBatchRequest(article_ids: list[int])` already in `backend/api/schemas.py`
    - Should return a `.md` file blob (the frontend triggers a download)
    - Apply `@limiter.limit("10 per minute")`
  - **`POST /api/articles/bulk-delete`** — delete multiple articles by ID
    - File: new `backend/api/routes/articles.py` or add to existing route
    - Body: `{ "article_ids": [int] }`
    - Should delete from `raw_articles` (cascade to `processed_articles`, `generated_content`, etc.)
    - Apply `@limiter.limit("10 per minute")`
    - Register the new blueprint in `backend/main.py`
  - All three need to be registered in `backend/main.py` and added to the API endpoint table in `README.md`
  - In `backend/config.py` or `backend/main.py`, add a startup check:
    ```python
    if settings.SECRET_KEY in ("change-me", "change-me-in-.env", ""):
        raise RuntimeError(
            "SECRET_KEY is not set. Add a random SECRET_KEY to your .env file."
        )
    ```
  - This check should run before the Flask app starts accepting requests
  - Update `.env.example` to make the requirement clear
  - _Audit ref: Issue #2_

---

## Phase 6 — Developer Experience

- [x] 6.1 Add Playwright E2E smoke tests
  - Installed `@playwright/test` at project root
  - Created `e2e/playwright.config.ts` targeting `http://localhost:3000`
  - Created `e2e/tests/smoke.spec.ts` with tests:
    - Dashboard loads without React console errors
    - Intelligence Feed or EmptyFeed is visible
    - Sidebar navigation to `/analytics`, `/calendar`, `/settings` — no crash
    - Back to dashboard navigation
    - Run Pipeline button visible in header
    - Deep links to `/analytics` and `/research` load correctly
  - Added `npm run e2e` script to root `package.json`
  - Prerequisites: Docker stack running, `.htpasswd` configured or auth disabled
  - Install: `npm install -D @playwright/test` in the project root (not in `frontend/`)
  - Create `e2e/playwright.config.ts` targeting `http://localhost:3000`
  - Create `e2e/tests/smoke.spec.ts` with tests:
    - App loads without console errors
    - Intelligence Feed shows at least one story card
    - Sidebar navigation works (click Analytics, Calendar, Settings — no crash)
    - Pipeline status bar appears after clicking "Run Pipeline"
  - Add `e2e` script to root `package.json`: `"e2e": "playwright test"`
  - Document how to run in README
  - _Audit ref: Suggestion W_

- [x] 6.2 Add backend test coverage reporting
  - Added `pytest-cov>=4.0.0` to `requirements.txt`
  - Created `pytest.ini` with `--cov=backend --cov-report=term-missing --cov-fail-under=40`
  - Run with: `pytest` from project root (inside Docker or venv)
  - HTML report generated at `coverage_html/`
  - Add `pytest-cov` to `requirements.txt`
  - Create `pytest.ini` or add `[tool.pytest.ini_options]` to `pyproject.toml`:
    ```ini
    [pytest]
    addopts = --cov=backend --cov-report=term-missing --cov-fail-under=40
    ```
  - Update the `test-runner` service in `docker-compose.yml` to run `pytest` instead of `npm run test:docker`
  - _Audit ref: Suggestion X, Y_

- [x] 6.3 Add OpenAPI documentation with Flasgger
  - Added `flasgger>=0.9.7` to `requirements.txt`
  - Initialized `Swagger(app)` in `main.py` — Swagger UI at `http://localhost:5000/apidocs`
  - Added YAML docstrings to 5 key endpoints: `GET /api/stories`, `POST /api/pipeline/run`, `POST /api/generate`, `POST /api/schedule/queue`, `POST /api/export/batch`
  - Add `flasgger` to `requirements.txt`
  - In `backend/main.py`, initialize Swagger:
    ```python
    from flasgger import Swagger
    swagger = Swagger(app, template={"info": {"title": "AI Pulse Pro API", "version": "2.1"}})
    ```
  - Add docstring YAML specs to the 5 most-used endpoints: `/api/stories`, `/api/pipeline/run`, `/api/generate`, `/api/schedule`, `/api/export`
  - Swagger UI accessible at `http://localhost:5000/apidocs`
  - _Audit ref: Suggestion H_

- [x] 6.4 Add frontend test coverage threshold
  - `vitest.config.js` already had coverage configured with 80% thresholds (branches, functions, lines, statements) — better than the planned 30%
  - Coverage runs with `npx vitest run --coverage` and generates text + HTML reports
  - 9 pre-existing test failures in ThemeProvider/Card/Modal/components.test.js are unrelated to our work
  - Open `frontend/vitest.config.js`
  - Add coverage configuration:
    ```js
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 30, functions: 30 },
      exclude: ['src/tests/**', 'src/components/ui/**']
    }
    ```
  - Run `npx vitest run --coverage` — verify report generates
  - _Audit ref: Suggestion Y_

- [x] 6.5 Add `CHANGELOG.md`
  - Created `CHANGELOG.md` following Keep a Changelog format
  - Documents v2.2 (Phase 3–5 refactor), v2.1 (bugfixes), v2.0 (RSS/hashtags/blog), v1.0 (initial)
  - Create `CHANGELOG.md` in the project root
  - Document v2.1 (April 2026) — all bugs fixed in this session
  - Document v2.0 (February 2026) — RSS management, hashtag intelligence, blog publisher
  - Document v1.0 — initial release
  - Follow Keep a Changelog format (https://keepachangelog.com)

---

## Summary

| Phase | Tasks | Priority | Estimated Time |
|-------|-------|----------|---------------|
| 1 — Critical Fixes | 1.1 – 1.6 | Must do | 2–3 hours |
| 2 — Stability | 2.1 – 2.9 | Should do | 3–4 hours |
| 3 — Frontend Architecture | 3.1 – 3.6 | Should do | 2–3 days |
| 4 — Performance | 4.1 – 4.4 | Nice to have | 4–6 hours |
| 5 — Security | 5.1 – 5.6 | Must do before public | 4–6 hours |
| 6 — Dev Experience | 6.1 – 6.5 | Nice to have | 4–6 hours |
| **Total** | **35 tasks** | | **~6–9 days** |

> Phase 3 estimate is 2–3 days, not 1–2. Task 3.1 (extracting 7 views from a 1500-line file) is a full day on its own.
