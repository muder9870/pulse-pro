# AI Pulse Pro — Full Audit & Suggestions

> Audit date: April 2026. Based on live Docker deployment review, static code analysis, and runtime testing.

---

## Current Status Summary

The app is **running and functional** in Docker. Stories load, the pipeline runs, analytics render, and bulk operations work. The core content automation loop (fetch → analyze → generate → schedule) is fully implemented. Several bugs were fixed during this session (React error #130, stale service worker, API base URL mismatch, `Card.Content` undefined).

---

## What's Working Well

- Multi-source ingestion (arXiv, GitHub, RSS, Gmail, Reddit)
- LLM analysis pipeline with Groq/Ollama/OpenRouter support
- Content generation for 15+ platforms
- Real-time pipeline progress via SSE
- Bulk operations (generate, schedule, tag, export)
- PostgreSQL + Redis + Celery infrastructure
- Docker Compose full-stack deployment
- Circuit breaker pattern on LLM calls
- Hashtag intelligence and recommendations
- Blog publishing (Medium, Dev.to, WordPress)
- APScheduler for automated daily runs

---

## Bugs Found & Fixed (This Session)

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | `dist/service-worker.js` had hardcoded unhashed asset paths causing `cache.addAll()` to fail with 404, blocking the JS bundle from loading | Replaced with pass-through SW (no caching) |
| 2 | `useOffline.js` registered a second SW (`/sw.js`) in parallel with `index.html`, causing dual-registration cache collision | Removed `navigator.serviceWorker.register()` call |
| 3 | `vite.config.js` forced `process.env.NODE_ENV: "production"` at all times, hiding non-minified React errors in dev | Removed the `define` block |
| 4 | `rollupOptions` stripped content hashes from filenames, making `dist/index.html` reference files that didn't exist | Added `[hash]` to all filename patterns |
| 5 | `Card.Content` was `undefined` — `Card.jsx` defined `CardContent` but never attached it as `Card.Content` | Added `Card.Content = CardContent` (and Header, Title, Description, Footer) |
| 6 | `ApiClient` was instantiated with empty base URL, so all API calls hit nginx's SPA fallback instead of the backend | Changed to `new ApiClient('/api')` |

---

## Issues Still Present

### Critical

**1. No authentication or authorization**
The entire app is open. Any user on the network can read all stories, trigger the pipeline, publish to social platforms, and modify settings. There is no login, no session management, no API key validation.

**2. `SECRET_KEY` defaults to `"change-me"`**
`backend/config.py` has `SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-.env")`. If `.env` is not set, Flask sessions are cryptographically insecure.

**3. No rate limiting on any API endpoint**
`/api/pipeline/run` can be called repeatedly with no throttle, potentially hammering the LLM provider and exhausting API quotas. Same for `/api/generate`.

**4. Pipeline runs in a daemon thread with no lock enforcement in Docker**
`pipeline.py` starts a `threading.Thread(target=run_daily_pipeline, daemon=True)` on every POST to `/api/pipeline/run`. There is a `pipeline_lock` imported from `api.state` but it is not used in the route handler — concurrent pipeline runs are possible.

**5. `backend/tasks.py` is referenced by Celery but may not exist**
`celery_app.py` includes `'backend.tasks'` but no `backend/tasks.py` was found in the file tree. Celery workers will fail to start.

---

### High Priority

**6. `App.jsx` is 1500+ lines — a single monolithic component**
`AppContent` contains all state, all handlers, all rendering logic. This makes it extremely hard to maintain, test, or debug. Any state change re-renders the entire tree.

**7. `ToastWrapper` is defined inside `App()` render function**
```jsx
export default function App() {
  const ToastWrapper = () => { ... }; // ← new component type on every render
  return <ToastProvider><AppContent /><ToastWrapper /></ToastProvider>;
}
```
React creates a new component type on every render, causing `ToastWrapper` to unmount and remount constantly. Move it outside `App`.

**8. `useStories` passes `options` object as React Query key**
```js
queryKey: ['stories', options]
```
`options` is a new object reference on every render, causing unnecessary refetches. Should be `['stories', limit, sort, source]`.

**9. `normalizeStory` in `ApiClient` is never called**
`useStories` calls `api.get(endpoint)` and returns the raw data directly. The `normalizeStories` / `normalizeStory` methods exist but are never invoked. Story fields like `total_score` are used in `App.jsx` but `normalizeStory` maps it to `score`, creating a field name mismatch if normalization were ever enabled.

**10. `usePipeline` opens an SSE connection on every component mount**
Every component that calls `usePipeline()` opens a new `EventSource`. If `PipelineStatus` and `App.jsx` both use it, two SSE connections are open simultaneously. Should use a shared context or singleton.

**11. No pagination in the Intelligence Feed**
`displayLimit` is set to 20 and incremented manually, but the API is called with `limit: 50` and all filtering happens client-side. For large datasets this means 50 stories are always fetched and filtered in the browser. The API supports `page` and `limit` but the frontend doesn't use server-side pagination.

**12. `FilterBar` source dropdown fetches on every render**
`useSources()` is called inside `FilterBar` AND inside `App.jsx`. Two separate React Query instances for the same data. Should be called once and passed as a prop, or deduplicated via shared query key (they do share the key `['sources']` so React Query deduplicates — but the component still re-renders twice).

**13. `BulkActionsBar` imports `Modal` from `./ui` but `Modal` may not support the usage pattern**
`BulkActionsBar` uses `<Modal>` but the `Modal` component in `ui/Modal.jsx` needs to be verified for the open/close prop API it expects.

---

### Medium Priority

**14. No error boundary around individual views**
`main.jsx` wraps the whole app in `<ErrorBoundary>` but if `EnhancedAnalytics` or `ContentCalendar` throws, the entire app goes blank. Each view should have its own error boundary.

**15. `useOffline.js` still exports `offlineFetch` and `syncQueue` but SW registration is removed**
The offline queue functionality (`offlineFetch`, `syncQueue`) depends on a service worker to replay queued requests. With SW registration removed, these functions will queue requests that are never replayed. Either remove the queue functionality or document that it requires manual SW setup.

**16. `backend/api/routes/stories.py` imports from `backend.models` (old module) not `backend.db.models`**
```python
from backend.models import RawArticle
```
There are two model files: `backend/models.py` (old/backup) and `backend/db/models.py` (current). The stories route imports from the old one. This works currently but is a maintenance hazard.

**17. `docker-compose.yml` mounts `./backend` as a volume into the container**
```yaml
volumes:
  - ./backend:/app/backend
```
This overrides the built image's backend code with the host filesystem. In production this is fine for hot-reload but means the Docker image is not self-contained — deploying to a remote server without the source directory will break.

**18. No `CONTENT_TOP_LIMIT` or `GENERATION_TOP_N` in `.env.example`**
These are referenced in `orchestrator.py` and `config.py` but missing from `.env.example`, so new users won't know they exist.

**19. `alembic.ini` exists but migrations are not run on container startup**
The `Dockerfile` doesn't run `alembic upgrade head`. Database schema changes require manual migration. The `init.sql` in `backend/database/` handles initial schema but won't apply future migrations.

**20. `backend/database/init.sql` is a directory, not a file**
```
backend/database/init.sql/   ← this is a folder
```
PostgreSQL's `docker-entrypoint-initdb.d` expects a `.sql` file. If this is a directory, the init script won't run and the database won't be initialized on first start.

---

### Low Priority

**21. `recharts` `Tooltip` name collision with `ui/Tooltip`**
`EnhancedAnalytics.jsx` imports `Tooltip` from `recharts`. The `ui/index.js` also exports a `Tooltip`. If someone adds `import { Tooltip } from './ui'` to `EnhancedAnalytics`, it will silently shadow the recharts one.

**22. `useDataMigration.js` and `useAccessibility.js` export objects as default**
```js
export default { useDataMigration, transformStoryData, ... }
```
Exporting a plain object as a default export from a hooks file is unconventional and will cause issues if anyone tries to use it as a component. Should use named exports only.

**23. `AccessibilityComponents.jsx` exports an object as default**
Same issue — `export default { SkipLink, AccessibleButton, ... }`. If this is ever imported as a component it will throw React error #130.

**24. `frontend/src/components/ui/index.js` has a duplicate `Button` export line**
The grep showed `export { default as Button } from './Button'` appearing twice. Verify and remove the duplicate.

**25. `vite.config.js` has no chunk splitting**
The entire app bundles into a single 812KB JS file. This is above Vite's 500KB warning threshold. Code splitting by route would significantly improve initial load time.

**26. No `Content-Security-Policy` nonce for inline scripts**
`nginx.conf` sets `Content-Security-Policy: default-src 'self' ... 'unsafe-inline'`. The `'unsafe-inline'` allows XSS via injected scripts. Should use nonces or hashes instead.

**27. Redis password is not set**
`docker-compose.yml` starts Redis with no authentication. Any process on the Docker network can read/write the cache and Celery queue.

**28. PostgreSQL credentials are hardcoded in `docker-compose.yml`**
```yaml
POSTGRES_PASSWORD=pulsepassword
```
These should be in `.env` and referenced via `${POSTGRES_PASSWORD}`.

---

## Suggestions & Improvements

### Architecture

**A. Split `App.jsx` into route-level components**
Extract each view into its own file: `DashboardView.jsx`, `AnalyticsView.jsx`, etc. Keep `App.jsx` as a thin router/layout shell. This enables lazy loading and dramatically reduces re-render scope.

**B. Add React Router**
Currently view switching is done via `currentView` state. Using `react-router-dom` (already installed) would give proper URL routing, browser back/forward support, and deep linking to specific views.

**C. Add a global Zustand store for UI state**
`currentView`, `activeSource`, `filters`, `selectedIds`, `bulkOperationState` are all in `App.jsx`. Moving them to a Zustand store decouples state from the component tree and makes it accessible anywhere without prop drilling.

**D. Implement server-side pagination**
The API already supports `page` and `limit`. Use them. Fetch 20 stories at a time, load more on scroll or page navigation. This will make the app usable with thousands of articles.

**E. Add React Query DevTools in development**
```jsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// Add <ReactQueryDevtools /> to main.jsx in dev mode
```
Invaluable for debugging cache state and query behavior.

### Backend

**F. Add Flask-Limiter for rate limiting**
```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=get_remote_address)

@pipeline_bp.route("/run", methods=["POST"])
@limiter.limit("1/minute")
def run(): ...
```

**G. Add request validation with Pydantic or marshmallow**
All POST endpoints accept raw JSON with no schema validation. A malformed request can cause unhandled exceptions that leak stack traces.

**H. Add OpenAPI documentation**
Use `flask-smorest` or `flasgger` to auto-generate API docs from route definitions. This makes the API self-documenting and enables client SDK generation.

**I. Fix the pipeline lock**
```python
# In pipeline.py route handler:
from backend.api.state import pipeline_lock, pipeline_state

@pipeline_bp.route("/run", methods=["POST"])
def run():
    if not pipeline_lock.acquire(blocking=False):
        return jsonify({"status": "already_running"}), 409
    thread = threading.Thread(target=run_daily_pipeline, daemon=True)
    thread.start()
    return jsonify({"status": "started"}), 200
```

**J. Run Alembic migrations on startup**
Add to `Dockerfile` or entrypoint:
```bash
alembic upgrade head && gunicorn ...
```

**K. Move PostgreSQL credentials to `.env`**
```yaml
# docker-compose.yml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

**L. Add Redis AUTH password**
```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
```

**M. Create `backend/tasks.py`**
Celery is configured to include `backend.tasks` but the file doesn't exist. Either create it with the task definitions or remove the include from `celery_app.py`.

### Frontend

**N. Move `ToastWrapper` outside `App()`**
```jsx
// Before:
export default function App() {
  const ToastWrapper = () => { ... }; // bad — new type every render
}

// After:
const ToastWrapper = () => { ... }; // defined once at module level
export default function App() { ... }
```

**O. Fix React Query key for `useStories`**
```js
// Before:
queryKey: ['stories', options]  // new object reference every render

// After:
queryKey: ['stories', limit, sort, source]  // stable primitives
```

**P. Add route-level code splitting**
```jsx
const EnhancedAnalytics = React.lazy(() => import('./components/EnhancedAnalytics'));
const ContentCalendar = React.lazy(() => import('./components/ContentCalendar'));
// etc.
```
This will cut the initial bundle from 812KB to ~200KB.

**Q. Add per-view error boundaries**
```jsx
<FeatureErrorBoundary name="Analytics">
  <EnhancedAnalytics />
</FeatureErrorBoundary>
```
`FeatureErrorBoundary.jsx` already exists in the components folder — just use it.

**R. Add loading skeletons for all async views**
`Skeleton.jsx` exists but is only used in a few places. All views that fetch data should show a skeleton while loading.

**S. Add empty state components**
When the Intelligence Feed has 0 stories (fresh install, no pipeline run yet), show a helpful empty state with a "Run Pipeline" CTA instead of a blank list.

### Security

**T. Add basic HTTP authentication as a minimum**
Even a simple username/password via nginx `auth_basic` or a Flask login page would prevent unauthorized access. Full OAuth is ideal but even basic auth is better than nothing.

**U. Remove `'unsafe-inline'` from CSP**
Use Vite's `vite-plugin-csp` or configure nonces in nginx to eliminate the need for `'unsafe-inline'`.

**V. Add `SECURE_HEADERS` to Flask responses**
```python
from flask_talisman import Talisman
Talisman(app, content_security_policy=csp)
```

### Testing

**W. Add Playwright or Cypress for E2E tests**
The current test suite has no browser-level tests. A basic Playwright test that loads the app, checks the Intelligence Feed renders, and runs a pipeline would catch the class of bugs fixed in this session.

**X. Add backend API integration tests**
`tests/test_e2e_api_flow.py` exists but needs to be verified it actually runs against the live Docker stack. Add it to the `test-runner` service in `docker-compose.yml`.

**Y. Add test coverage reporting**
```bash
# Backend
pytest --cov=backend --cov-report=html tests/

# Frontend
npx vitest run --coverage
```

---

## Quick Wins (Can be done in < 1 hour each)

1. Move `ToastWrapper` outside `App()` — 5 min
2. Fix React Query key in `useStories` — 5 min
3. Add `CONTENT_TOP_LIMIT` and `GENERATION_TOP_N` to `.env.example` — 5 min
4. Move PostgreSQL password to `.env` — 10 min
5. Add `FeatureErrorBoundary` around each view in `App.jsx` — 15 min
6. Fix `backend/api/routes/stories.py` import to use `backend.db.models` — 5 min
7. Add pipeline lock enforcement in `/api/pipeline/run` — 15 min
8. Create `backend/tasks.py` stub so Celery doesn't fail on import — 10 min
9. Add `alembic upgrade head` to Docker entrypoint — 10 min
10. Verify `backend/database/init.sql` is a file not a directory — 5 min
