# Changelog

All notable changes to AI Pulse Pro are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.2] — April 2026

### Added
- React Router — URL-based navigation with browser back/forward support
- Zustand store — shared UI state (theme, filters, source, bulk operations)
- Route-level code splitting — initial bundle reduced from 815KB to 378KB
- Server-side pagination — Intelligence Feed fetches 20 stories per page
- `PipelineContext` — single SSE connection shared across all components
- React Query DevTools — visible in dev mode only
- `EmptyFeed` component — shown on fresh install with "Run Pipeline" CTA
- Loading skeletons for all 7 async views
- HTTP Basic Auth via nginx (placeholder `.htpasswd` — see README Security Setup)
- Flask-Limiter — rate limits on pipeline (2/min), generate (10/min), stories (60/min)
- Flask-Talisman — strict CSP without `'unsafe-inline'`, security headers
- Pydantic request validation — HTTP 422 with field errors on invalid POST bodies
- `POST /api/schedule/queue` — bulk schedule articles for publishing
- `POST /api/export/batch` — batch export selected articles as Markdown
- `POST /api/articles/bulk-delete` — delete multiple articles with full cascade
- `backend/api/schemas.py` — shared Pydantic schemas for all POST endpoints
- `.gitignore` — excludes `.env`, `.htpasswd`, `node_modules`, `dist`, logs
- `docker-compose.override.yml` — local dev volume mounts separated from base compose
- `entrypoint.sh` — runs `alembic upgrade head` before Gunicorn on container start
- `celery-worker` service added to `docker-compose.yml`

### Fixed
- `SECRET_KEY` startup check — app refuses to start with default value
- `backend/api/routes/stories.py` and `media.py` — fixed stale import from `backend.models` → `backend.db.models`
- `useStories` React Query key — was passing object reference causing unnecessary refetches
- `ToastWrapper` defined at module scope — was causing remount on every render
- Dead `normalizeStory`/`normalizeStories` code removed from `ApiClient`
- `useOffline.js` — removed dead `offlineFetch`/`syncQueue` queue that was never replayed
- `export default {}` removed from `useDataMigration.js`, `useAccessibility.js`, `AccessibilityComponents.jsx`
- `docker-compose.yml` — removed hardcoded PostgreSQL/Redis credentials
- `backend/database/init.sql` — was a directory, converted to a proper SQL file with all 32 tables

### Changed
- `App.jsx` split into 7 view components in `frontend/src/views/`
- `usePipeline` refactored to use `PipelineContext` singleton
- `useStories` migrated to `useInfiniteQuery` for server-side pagination
- `docker-compose.yml` — credentials now read from `.env`, Redis requires password
- `Dockerfile` — uses `ENTRYPOINT` + `CMD` split so celery-worker can reuse image
- `nginx.conf` — removed `'unsafe-inline'` CSP, added `proxy_read_timeout 300s`

---

## [2.1] — April 2026

### Fixed
- React error #130 — `dist/service-worker.js` had hardcoded unhashed asset paths blocking JS bundle load
- Dual SW registration — `useOffline.js` was registering a second SW in parallel
- `vite.config.js` — removed forced `process.env.NODE_ENV: "production"` define
- `rollupOptions` — added `[hash]` to all filename patterns
- `Card.Content` was `undefined` — `CardContent` not attached to `Card` object
- `ApiClient` base URL was empty — all API calls hit nginx SPA fallback instead of backend

---

## [2.0] — February 2026

### Added
- RSS feed management with 26+ default AI/ML feeds
- Hashtag intelligence module
- Blog auto-publisher (Medium, Dev.to, WordPress)
- Smart scheduling with APScheduler
- Performance optimizations
- PostgreSQL migration from SQLite

---

## [1.0] — Initial Release

### Added
- Multi-source content ingestion (arXiv, GitHub, RSS, Gmail, Reddit)
- LLM analysis pipeline (Groq, Ollama, OpenAI, Anthropic)
- Content generation for 15+ social platforms
- React dashboard with filtering and bulk operations
- Docker Compose deployment
