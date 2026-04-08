# Full Frontend ↔ Backend Alignment Audit: Pulse Pro
**Date:** 2026-04-08
**Status:** COMPLETE

This report document the results of a thorough audit of the Pulse Pro codebase following the recent frontend migration. It identifies misalignments between frontend feature claims and actual backend implementations.

---

## PHASE 1 — Backend API Surface Inventory

| Endpoint | Method | Status | Real Implementation Logic |
| :--- | :--- | :--- | :--- |
| `/api/stories/` | GET | **🟢 FULL** | Fetches paginated, filtered stories from `ArticleRepository`. |
| `/api/pipeline/run` | POST | **🟢 FULL** | Starts the `run_daily_pipeline` in a background thread. |
| `/api/pipeline/stream`| GET | **🟢 FULL** | SSE stream emitting real-time stage updates from `pipeline_emitter`. |
| `/api/analytics` | GET | **🟡 STUB** | Returns DB stats but ignores the `timeRange` query param. |
| `/api/export` | GET | **🟢 FULL** | Generates JSON/CSV on-the-fly from the DB. |
| `/api/hashtags/<id>/<plt>`| GET | **🟡 STUB** | Uses internal `HashtagRecommender`; collectors are stubs. |
| `/api/content/<id>/<plt>`| GET | **🟢 FULL** | Fetches generated text for a specific platform. |
| `/api/generate` | POST | **🟢 FULL** | Triggers on-demand LLM generation for a platform. |

### Background Tasks & Pipelines
- **Trending Hashtags:** `hashtag_analyzer.py` calculates "trends" based solely on internal `processed_articles`. It does **not** fetch external trending data.
- **Analytics Pipeline:** Writes to DB but never exports to `analytics.json` (orphaned feature).

### Flagged Backend Issues
- **Social Publishers:** `social_publishers.py` contains stubs for **Twitter** and **LinkedIn**. **Instagram, Facebook, Reddit, Threads, and YouTube** return "not implemented".
- **Hashtag Collectors:** `twitter_collector.py` and others are thin wrappers that trigger internal analysis; no external API scraping exists.
- **LLM Cache Conflict:** `llm_router.py` uses **Redis** for transient caching, while `llm_cache.py` implements a **PostgreSQL** table. Both are active and redundant.
- **God Object:** `database.py` is being refactored; most logic moved to repositories.

---

## PHASE 2 — Frontend Feature Claim Inventory

| UI Element | Backend Call | Status | Data Rendering |
| :--- | :--- | :--- | :--- |
| **StoryCard Expand** | `GET /api/content/...` | **🟢 WIRED** | Renders generated post text. |
| **Toggle Posted** | `POST /api/content/posted` | **🟡 PARTIAL**| Updates DB status, but no actual social API call. |
| **Tag Generation** | `POST /api/tags/generate` | **🔴 BROKEN** | Backend endpoint does not exist. |
| **Analytics Dashboard**| `GET /api/analytics` | **🟢 WIRED** | Renders Recharts components with DB stats. |
| **Pipeline Run** | `POST /api/pipeline/run` | **🟢 WIRED** | Shows loading state and triggers SSE listener. |
| **Feedback (👍/👎)** | `POST /api/personalization/feedback`| **🔴 BROKEN** | Endpoint not registered in backend. |

---

## PHASE 3 — Cross-Reference & Conflict Matrix

- **🟢 WIRED:** Story feed, Source filtering, SSE Pipeline streaming, Content retrieval, Analytics dashboard.
- **🟡 PARTIALLY WIRED:** Social "Publishing" (updates local DB state only), Hashtag recommendations (internal data only).
- **🔴 BROKEN:** Personalization Feedback, Tag Auto-generation, Analytics Metric Logging (`/api/analytics/log`), SSE Fallback (`/api/pipeline/status` is missing).
- **⚫ DEAD UI:** "Publish Now" and "Schedule" buttons in `StoryCard` (show `alert('coming soon')`), Image/Audio generation buttons.
- **🔵 BACKEND ORPHAN:** `CerebrasClient` and `OpenRouterClient` are initialized but only used in fallback chains, not as primary drivers for most tasks.

---

## PHASE 4 — Post-Migration Verification (`FRONTEND_TASK.MD`)

1. **React Query Migration:** **PARTIAL**. `useStories.js` and `useAnalytics.js` are migrated, but `StoryCard.jsx` still uses raw `fetch()` for 90% of its operations.
2. **SSE Stream:** **SUCCESS**. `PipelineContext.jsx` correctly manages a single `EventSource` connection.
3. **SmartLLMRouter:** **SUCCESS**. `analyzer.py` and `generator_v5.py` use the new router.
4. **API Keys:** **SUCCESS**. `CEREBRAS_API_KEY` and `OPENROUTER_API_KEY` are supported in `config.py` and handled gracefully by the router.
5. **Pipeline Status:** **SUCCESS**. UI reflects real backend state via SSE.

---

## PHASE 5 — Prioritized Fix List

### 1. Critical Conflicts (Broken UX)
- **Feature:** Tag Auto-Generation
  - **Mismatch:** `StoryCard.jsx` calls `POST /api/tags/generate`, but `hashtags.py` doesn't have it.
  - **Fix:** Add `@hashtags_bp.post("/generate")` to `hashtags.py` using `TagGenerator`.
- **Feature:** Personalization Feedback
  - **Mismatch:** `StoryCard.jsx` calls `/api/personalization/feedback`, which isn't registered.
  - **Fix:** Register `personalization_bp` in `main.py`.
- **Feature:** SSE Connection Fallback
  - **Mismatch:** `PipelineContext.jsx` calls `GET /api/pipeline/status` on error. Backend doesn't have this.
  - **Fix:** Add a status endpoint to `pipeline.py` that returns the current `pipeline_state`.

### 2. Silent Failures
- **Feature:** Social Publishers
  - **Mismatch:** Frontend implies successful posting for Twitter/LinkedIn. Backend `social_publishers.py` only logs to file.
  - **Fix:** Update UI to show "Simulated" badge for stubbed platforms.
- **Feature:** LLM Cache
  - **Mismatch:** Redundant caching in Redis and Postgres.
  - **Fix:** Consolidate `SmartLLMRouter` to use `llm_cache.py` for persistent hits and Redis only for rate-limit tracking.

### 3. Missing Wiring
- **Feature:** Analytics Export
  - **Mismatch:** User expects `analytics.json` to be populated. `export.py` provides the data but only on-demand.
  - **Fix:** Add a Celery task in `tasks.py` to periodically dump the analytics stats to a static JSON file.

### 4. Post-Migration Regressions
- **Issue:** Inconsistent API usage in `StoryCard`.
  - **Fix:** Refactor `StoryCard` to use `useStoryActions.js` and the centralized `api/client.js`.
