# LLM, Pipeline, Image & Audio — Audit Report

**Branch:** feature/llm-pipeline-media-stabilization
**Date:** April 2026
**Status:** Pre-fix audit — issues identified, fixes not yet implemented

---

## Executive Summary

The core pipeline (fetch → analyze → generate text → schedule) is solid. However, **image generation and audio/podcast are completely disconnected from the automated pipeline** — they only work when a user manually clicks a button. The LLM router has several reliability issues under load. The podcast generator bypasses the LLM fallback system entirely. Audio files return 404 because there is no route to serve them.

---

## Area 1: LLM Router (`backend/llm/llm_router.py`)

### What works
- Multi-provider fallback chain (Groq → Cerebras → OpenRouter → Ollama)
- Task-aware routing (`TASK_ROUTING` dict maps each task to a provider priority list)
- Redis caching of responses (adaptive TTL based on access count)
- Circuit breaker per provider
- Graceful fallback JSON when all providers fail (pipeline doesn't crash)
- `LLMResponse` wrapper with string-compatible methods

### Issues Found

| # | Severity | Issue | File / Line |
|---|----------|-------|-------------|
| 1 | **High** | `_call_with_timeout` uses a daemon thread that keeps running after timeout — no real cancellation. Under load this leaks threads and can exhaust the thread pool. | `llm_router.py` → `_call_with_timeout()` |
| 2 | **Medium** | `get_status()` health check is fake — checks `hasattr(client, 'model')` which always returns True. Never actually pings a provider. | `llm_router.py` → `get_status()` |
| 3 | **Medium** | Redis cache key is `md5(task:prompt)` — does not include `max_tokens`. Same prompt with different token limits returns the same cached result. | `llm_router.py` → `generate()` |
| 4 | **Low** | `max_tokens` validation rejects values > 8000. Some providers (OpenRouter, paid_api) support 32k+. Deep analysis uses 4096 which is fine, but the cap is unnecessarily restrictive. | `llm_router.py` → `_validate_inputs()` |
| 5 | **Low** | No `Task.BLOG` enum value despite blog generation being a real use case. Blog content uses `SOCIAL_LONG` which routes to Groq/Cerebras — may not be the best provider for long-form. | `llm_router.py` → `Task` enum |

### Suggested Fixes
1. Replace thread-based timeout with `concurrent.futures.ThreadPoolExecutor` + `Future.result(timeout=N)` — this is the standard Python pattern and properly handles cancellation.
2. Add a real `ping()` method to each client that makes a minimal API call, and use it in `get_status()`.
3. Include `max_tokens` in the cache key: `md5(f"{task.value}:{max_tokens}:{prompt}")`.
4. Raise `max_tokens` cap to 32000.
5. Add `Task.BLOG` and `Task.AUDIO_SCRIPT` to the enum with appropriate routing.

---

## Area 2: Pipeline (`backend/agents/orchestrator.py`)

### What works
- Full fetch → analyze → generate → schedule → summary flow
- Lock management prevents concurrent runs
- SSE event emission for real-time progress
- Error handling with lock release in `finally` block
- Partial success handling

### Issues Found

| # | Severity | Issue | File / Line |
|---|----------|-------|-------------|
| 1 | **Critical** | **Image generation is never called in the pipeline.** `ImageEngine` exists and works, but `orchestrator.py` has no step for it. Images only generate if a user manually clicks "Generate Image" in the Media view. | `orchestrator.py` — missing step |
| 2 | **Critical** | **Audio/Podcast is never called in the pipeline.** `PodcastGenerator` exists but is only triggered manually via `POST /api/generate/podcast`. The pipeline has no audio step. | `orchestrator.py` — missing step |
| 3 | **Medium** | Pipeline has no configurable feature flags to enable/disable image and audio steps. If added, they should be opt-in via env vars (`PIPELINE_GENERATE_IMAGES=true`, `PIPELINE_GENERATE_PODCAST=true`) since they are slow and require API keys. | `orchestrator.py` |
| 4 | **Low** | `run_full_pipeline` acquires the lock twice — once with `acquire(timeout=1)` and then again with `with pipeline_lock`. The second `with` will deadlock if the lock is not re-entrant. | `orchestrator.py` → `run_full_pipeline()` |

### Suggested Fixes
1. Add an optional **Image Generation step** after content generation: for each article that got content generated, call `ImageEngine.generate_image()` with a prompt derived from the article summary. Gate behind `PIPELINE_GENERATE_IMAGES=true`.
2. Add an optional **Podcast Generation step** at the end of the pipeline: call `PodcastGenerator.generate_daily_digest_sync()` after all articles are processed. Gate behind `PIPELINE_GENERATE_PODCAST=true`.
3. Fix the double-lock acquisition — use a single `with pipeline_lock` block.

---

## Area 3: Image Engine (`backend/processors/image_engine.py`)

### What works
- Three-tier fallback: DALL-E 3 → Hugging Face SDXL → procedural quote card
- Quote card is a solid last resort (no API key needed, always works)
- Images saved to disk and recorded in DB via `MediaRepository`
- HF retry logic with model loading wait

### Issues Found

| # | Severity | Issue | File / Line |
|---|----------|-------|-------------|
| 1 | **High** | `ProcessedArticle.get(p_id)` uses the legacy SQLAlchemy `.get()` method which is deprecated in SQLAlchemy 2.x and will raise a warning or error. Should use `db.get(ProcessedArticle, p_id)`. | `image_engine.py` → `generate_image()` |
| 2 | **Medium** | `generate_image()` opens a new `SessionLocal()` inside the method while the caller may already have an open session. This can exhaust the connection pool under load. Should accept an optional `db` parameter. | `image_engine.py` → `generate_image()` |
| 3 | **Medium** | HF model URL is hardcoded to `stabilityai/stable-diffusion-xl-base-1.0`. Should be configurable via `HF_IMAGE_MODEL` env var. | `image_engine.py` → `generate_hf_image()` |
| 4 | **Low** | No auto-prompt generation in the engine. When called from the pipeline, the caller must provide a prompt. Should have a `generate_prompt_from_article()` helper that creates a good image prompt from the article summary and title. | `image_engine.py` — missing method |
| 5 | **Low** | Font loading in `generate_quote_card()` tries `arial.ttf` (Windows only) with a bare `except` fallback to the default font. On Linux (Docker), this always falls back to the tiny default font. Should try multiple font paths. | `image_engine.py` → `generate_quote_card()` |

### Suggested Fixes
1. Replace `.get(p_id)` with `db.get(ProcessedArticle, p_id)`.
2. Add `db=None` parameter to `generate_image()` — use provided session or create one.
3. Add `HF_IMAGE_MODEL` to config with SDXL as default.
4. Add `generate_prompt_from_article(article_id, db)` method.
5. Try multiple font paths: `DejaVuSans.ttf`, `LiberationSans-Regular.ttf`, `arial.ttf` before falling back to default.

---

## Area 4: Podcast & Audio (`backend/generators/podcast_generator.py`, `backend/processors/audio_engine.py`)

### What works
- `edge-tts` TTS is free, high quality, no API key needed
- Alex/Morgan debate format produces engaging scripts
- `generate_daily_digest_sync()` wrapper for sync callers
- Audio saved to disk and recorded in `article_audio` table

### Issues Found

| # | Severity | Issue | File / Line |
|---|----------|-------|-------------|
| 1 | **Critical** | **Audio files return 404.** The podcast player calls `/api/media/audio/{filename}` but there is no Flask route to serve files from the audio directory. The file exists on disk but is unreachable. | `podcast.py` — missing route |
| 2 | **High** | `PodcastGenerator` hardcodes `Groq(api_key=settings.GROQ_API_KEY)` directly instead of using `SmartLLMRouter`. If Groq is down or rate-limited, podcast generation fails with no fallback. | `podcast_generator.py` → `__init__()` |
| 3 | **High** | `get_latest_podcast()` scans the filesystem (`os.listdir("data/audio")`) instead of querying the DB. In Docker, the path `data/audio` is relative and may not resolve correctly. Also returns no metadata beyond filename. | `podcast.py` → `get_latest_podcast()` |
| 4 | **Medium** | No `podcasts` table in the DB. Podcast metadata (title, script, article IDs used, duration) is not persisted. Only the MP3 file exists. History is not queryable. | DB schema — missing table |
| 5 | **Medium** | `generate_daily_digest_sync()` uses `asyncio.run()` which raises `RuntimeError: This event loop is already running` when called from Celery workers or any async context. | `podcast_generator.py` → `generate_daily_digest_sync()` |
| 6 | **Low** | `PodcastGenerator.__init__` always instantiates `AudioEngine` and `Groq` client even if only the script is needed. Should be lazy-initialized. | `podcast_generator.py` → `__init__()` |
| 7 | **Low** | The podcast script cleaning (`replace("[ALEX]", "Alex: ")`) is done before TTS but the debate format with two speakers would benefit from different voices per speaker. `edge-tts` supports multiple voices. | `podcast_generator.py` → `generate_daily_digest()` |

### Suggested Fixes
1. Add `GET /api/media/audio/<filename>` route that serves files from `settings.MEDIA_DIR / "audio"` using Flask's `send_from_directory`.
2. Replace `Groq(...)` with `smart_router.generate(prompt, task=Task.AUDIO_SCRIPT)` — uses the full fallback chain.
3. Add a `podcasts` table: `id, title, audio_url, local_path, script, article_ids, duration_seconds, created_at`.
4. Update `get_latest_podcast()` to query the `podcasts` table instead of scanning the filesystem.
5. Replace `asyncio.run()` with `asyncio.get_event_loop().run_until_complete()` with a new loop fallback for Celery compatibility.

---

## Summary Table

| Area | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| LLM Router | 0 | 1 | 2 | 2 |
| Pipeline | 2 | 0 | 2 | 1 |
| Image Engine | 0 | 1 | 2 | 2 |
| Podcast/Audio | 1 | 2 | 2 | 2 |
| **Total** | **3** | **4** | **8** | **7** |

---

## Recommended Fix Order

### Phase 1 — Critical fixes (nothing works without these)
1. Add audio file serving route (`GET /api/media/audio/<filename>`)
2. Fix pipeline double-lock acquisition
3. Fix `ProcessedArticle.get()` deprecated call

### Phase 2 — High impact (reliability)
4. Replace `PodcastGenerator` Groq hardcode with `SmartLLMRouter`
5. Fix `_call_with_timeout` thread leak in LLM router
6. Add image generation step to pipeline (gated by env var)
7. Add podcast generation step to pipeline (gated by env var)

### Phase 3 — Data integrity
8. Add `podcasts` DB table and update `get_latest_podcast()` to use it
9. Fix cache key to include `max_tokens`
10. Fix `asyncio.run()` Celery compatibility

### Phase 4 — Polish
11. Real `get_status()` health check with provider ping
12. Better font loading in quote card (Linux-compatible)
13. Auto-prompt generation from article in `ImageEngine`
14. Two-voice podcast (Alex/Morgan with different `edge-tts` voices)
15. Add `Task.BLOG` and `Task.AUDIO_SCRIPT` to LLM router

---

## How It Will Work After Fixes

### Automated Pipeline Flow (after Phase 1 + 2)

```
Pipeline Run triggered
    │
    ├── 1. Fetch articles (arXiv, RSS, GitHub, etc.)
    ├── 2. Analyze & score with LLM router (fallback chain)
    ├── 3. Generate text content (Twitter, LinkedIn, etc.)
    ├── 4. Schedule generated content
    ├── 5. [NEW] Generate images for top N articles (if PIPELINE_GENERATE_IMAGES=true)
    │       └── DALL-E 3 → HF SDXL → Quote Card fallback
    ├── 6. [NEW] Generate daily podcast digest (if PIPELINE_GENERATE_PODCAST=true)
    │       └── LLM router (not hardcoded Groq) → edge-tts → save MP3
    └── 7. Generate daily intelligence summary
```

### Audio Serving (after Phase 1)

```
User opens Podcast view
    │
    ├── GET /api/podcast/latest → queries podcasts table → returns audio_url
    └── AudioPlayer loads /api/media/audio/{filename}
            └── Flask send_from_directory(MEDIA_DIR/audio, filename) → MP3 streams
```

### LLM Router (after Phase 2)

```
Any LLM call
    │
    ├── Check Redis cache (key = task + max_tokens + prompt hash)
    │       └── Cache hit → return immediately
    │
    ├── Try provider chain for task (e.g. Groq → Cerebras → OpenRouter)
    │       ├── Circuit breaker open? → skip provider
    │       ├── Call with ThreadPoolExecutor timeout (no thread leak)
    │       └── Success → cache result → return
    │
    └── All failed → system fallback JSON → pipeline continues
```
