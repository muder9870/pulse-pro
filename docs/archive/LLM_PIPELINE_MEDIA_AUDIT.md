# LLM, Pipeline, Image & Audio — Full Audit

**Branch:** feature/llm-pipeline-media-stabilization
**Date:** April 2026
**Status:** Implementation in progress

---

## 1. LLM Clients — Security & Correctness Audit

### 1.1 Groq (`backend/llm/clients/groq_client.py`) — GOOD

| Check | Result |
|-------|--------|
| API key validation | ✅ Checks None and placeholder |
| Rate limiting | ✅ In-process 28 RPM sliding window with lock |
| Timeout handling | ✅ Raises `TimeoutError` |
| 429 handling | ✅ Raises `GroqRateLimitError` |
| Response validation | ✅ Checks `choices` field |
| Health monitor | ✅ Logs success and failure |
| Key in logs | ✅ Never logged |

Issues:
- `GROQ_RPM_LIMIT = 28` hardcoded. Should be `int(os.getenv("GROQ_RPM_LIMIT", "28"))`.
- Rate limit list is module-level global — not enforced across Celery workers (acceptable for Gunicorn).

---

### 1.2 Cerebras (`backend/llm/clients/cerebras_client.py`) — ACCEPTABLE

| Check | Result |
|-------|--------|
| API key validation | ✅ Raises `ValueError` if missing |
| Session reuse | ✅ `requests.Session` |
| 429 handling | ✅ Exponential backoff |
| Health monitor | ❌ Never called — circuit breaker is blind to Cerebras failures |
| `timeout` param | ❌ Ignored — always uses `self.config.timeout` (30s) |
| Response validation | ⚠️ Returns `""` on malformed response instead of raising |

---

### 1.3 OpenRouter (`backend/llm/clients/openrouter_client.py`) — ACCEPTABLE

Same issues as Cerebras plus:
- `HTTP-Referer: http://localhost:3000` hardcoded — should use configurable `BASE_URL`.
- Retry loop sleeps after last attempt too — wastes time.

---

### 1.4 Ollama (`backend/llm/clients/ollama_client.py`) — ACCEPTABLE

- `timeout` parameter not accepted in `generate()` — always 90s regardless of what router passes.
- Returns `""` if `response` key missing in JSON.

---

### 1.5 PaidApiLLMClient (`backend/llm/clients/paid_client.py`) — POOR

- No `__init__` — silently initialises even with no keys set. Fails only at call time.
- `data["choices"][0]["message"]["content"]` — `KeyError` on malformed OpenAI response.
- `data["content"][0]["text"]` — `KeyError` on malformed Anthropic response.
- OpenAI and Anthropic in one class with `if/elif` — if OpenAI key set but fails, Anthropic never tried.
- `timeout` parameter not accepted.

---

### 1.6 LLM Router (`backend/llm/llm_router.py`) — GOOD STRUCTURE, SPECIFIC BUGS

**Bug 1 — Thread leak in `_call_with_timeout`:**
Thread keeps running after timeout is raised. Fix: use `concurrent.futures.ThreadPoolExecutor`.

**Bug 2 — Cache key collision:**
`hashlib.md5(f"{task.value}:{prompt}")` — does not include `max_tokens`. Deep analysis (4096 tokens) may get a truncated cached response from a 512-token call.

**Bug 3 — Fake `get_status()`:**
Checks `hasattr(client, 'model')` — always True. Never checks if API key is set or service is reachable.

**Bug 4 — `max_tokens` cap too low:**
Hard cap at 8000. Some providers support 32k+.

**Missing:** No `Task.BLOG` or `Task.AUDIO_SCRIPT` enum values.

---

### 1.7 Circuit Breaker — GOOD

Correctly implements closed → open → half-open. Only effective for Groq and Ollama since Cerebras/OpenRouter don't call `health_monitor`.

---

## 2. Image Generation Audit

### 2.1 Two Image Generators — Why They Exist

**`backend/generators/image_generator.py`** — DEAD STUB. Writes `b"MOCK_IMAGE_DATA"`. Never calls any API. Not imported anywhere active. **Delete it.**

**`backend/processors/image_engine.py`** — REAL IMPLEMENTATION. Used by `POST /api/media/generate-image`. Has DALL-E 3 → HuggingFace → Quote Card chain.

### 2.2 Quote Card Bug — Root Cause

In Docker (Linux), `arial.ttf` does not exist. `ImageFont.load_default()` returns a 10px bitmap font. Text renders unreadably tiny — card appears blank.

Additionally, Pillow ≥ 10.x requires `ImageFont.load_default(size=32)`. Without `size`, font is always 10px.

Fix: try `DejaVuSans.ttf` → `LiberationSans-Regular.ttf` → `arial.ttf` → `ImageFont.load_default(size=32)`.

### 2.3 Proposed Image Fallback Chain

```
1. DALL-E 3 (OpenAI)        if OPENAI_API_KEY set     — best quality, paid
2. Pollinations.ai Flux     no key, always available   — good quality, free
3. HuggingFace SDXL         if HF_TOKEN set            — good quality, free tier
4. Quote Card (PIL)         always available           — basic, 100% reliable
```

Pollinations.ai call: `GET https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&model=flux&nologo=true`

---

## 3. Audio & Podcast Audit

### 3.1 Audio Engine — GOOD

`edge-tts` works. Issues:
- `asyncio.run()` fails in Celery workers.

### 3.2 Podcast Generator — BROKEN

| # | Severity | Issue |
|---|----------|-------|
| 1 | Critical | Audio files return 404 — no Flask route for `/api/media/audio/{filename}` |
| 2 | Critical | Hardcodes `Groq(api_key=...)` directly — no fallback if Groq is down |
| 3 | High | No article selection — always top 5, user cannot choose |
| 4 | High | `get_latest_podcast()` scans filesystem with relative path — breaks in Docker |
| 5 | Medium | No `podcasts` DB table — history not queryable |
| 6 | Medium | `asyncio.run()` Celery incompatibility |

### 3.3 Proposed Audio Fallback Chain

```
Script generation:  SmartLLMRouter (Groq → Cerebras → OpenRouter)
TTS:                edge-tts (primary) → Pollinations.ai ElevenLabs TTS (fallback)
```

Pollinations TTS: `GET https://gen.pollinations.ai/audio/{encoded_text}?voice=nova&model=elevenlabs`

---

## 4. Free LLM Options — Verified April 2026

### 4.1 Currently Implemented

| Provider | Free Tier | RPM | Notes |
|----------|-----------|-----|-------|
| Groq | ✅ Free key | 28–30 RPM | Best speed. `GROQ_API_KEY` |
| Cerebras | ✅ Free key | Limited | Fast inference. `CEREBRAS_API_KEY` |
| OpenRouter | ✅ Some models free | Varies | Many models. `OPENROUTER_API_KEY` |
| Ollama | ✅ Unlimited | Unlimited | Local only, needs GPU. No key. |

### 4.2 Additional Free LLMs — Verified & Recommended

| Provider | Free Tier | RPM/Day | Key Required | Best For | Priority |
|----------|-----------|---------|--------------|----------|----------|
| **Google Gemini 2.5 Flash-Lite** | ✅ Free | 30 RPM, 1000 RPD | Yes (free at aistudio.google.com) | Analysis, long-form | **Add first** |
| **Mistral (Experiment plan)** | ✅ Free | Per-model limits, ~1B tokens/month | Yes (free, phone verification) | European data, summarization | Add second |
| **Pollinations.ai text** | ✅ Free, no key | Rate limited | No | Last-resort fallback | Add third |
| **Together AI** | ⚠️ $5 credit only | Pay-per-token after | Yes | Not truly free long-term | Skip |

**Google Gemini 2.5 Flash-Lite** is the best next addition:
- 30 RPM, 1000 RPD free (December 2025 quota reduction from 1M TPD — now 250K TPM)
- Free API key at `aistudio.google.com` — no credit card
- OpenAI-compatible endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Model: `gemini-2.5-flash-lite-preview-06-17` or `gemini-2.0-flash-lite`

**Mistral (Experiment plan)**:
- Free tier with phone verification
- Requires opting into data training on free tier
- `mistral-small-latest` is the best free model
- API: `https://api.mistral.ai/v1/chat/completions`

**Pollinations.ai text (no key)**:
- `GET https://gen.pollinations.ai/text/{encoded_prompt}?model=openai&seed=-1`
- Returns plain text
- No key, no signup
- Use as absolute last resort before `system_fallback`

### 4.3 Updated Router Fallback Chain (after all additions)

```
Task.ANALYSIS:      cerebras → groq → gemini → openrouter → pollinations_text
Task.TAGGING:       cerebras → groq → gemini → openrouter → pollinations_text
Task.SOCIAL_SHORT:  groq → cerebras → gemini → openrouter → pollinations_text
Task.SOCIAL_LONG:   groq → cerebras → gemini → openrouter
Task.BLOG:          openrouter → gemini → groq → cerebras
Task.RESEARCH:      openrouter → gemini → groq → cerebras
Task.DEEP_ANALYSIS: openrouter → gemini → groq → cerebras
Task.AUDIO_SCRIPT:  groq → cerebras → gemini → openrouter
Task.DECISION:      groq → cerebras → gemini → openrouter
```

---

## 5. Complete Implementation Task List

### Phase 1 — Critical Fixes

**T1.1** Add audio file serving route
- `backend/api/routes/media.py`
- `GET /api/media/audio/<path:filename>` → `send_from_directory(settings.MEDIA_DIR / "audio", filename)`

**T1.2** Fix Quote Card font in Docker
- `backend/processors/image_engine.py` → `generate_quote_card()`
- Try: `DejaVuSans.ttf` → `LiberationSans-Regular.ttf` → `arial.ttf` → `ImageFont.load_default(size=32)`

**T1.3** Fix deprecated `ProcessedArticle.get(p_id)`
- `backend/processors/image_engine.py`
- Replace `.get(p_id)` with `db_f.get(ProcessedArticle, p_id)`

**T1.4** Fix double-lock in orchestrator
- `backend/agents/orchestrator.py`
- Remove `pipeline_lock.acquire(timeout=1)` — use only `with pipeline_lock:` for state updates

### Phase 2 — Image Generation

**T2.1** Add Pollinations.ai image provider
- `backend/processors/image_engine.py`
- New method `generate_pollinations_image(article_id, prompt)`
- URL: `https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=1024&height=1024&model=flux&nologo=true`
- Timeout 60s, validate `Content-Type` contains `image`

**T2.2** Update image fallback chain order
- DALL-E 3 → Pollinations.ai → HuggingFace → Quote Card

**T2.3** Delete dead code `backend/generators/image_generator.py`

**T2.4** Add `HF_IMAGE_MODEL` to config
- `backend/config.py`: `HF_IMAGE_MODEL: str = os.getenv("HF_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")`

### Phase 3 — Podcast & Audio

**T3.1** Replace hardcoded Groq in PodcastGenerator with SmartLLMRouter
- `backend/generators/podcast_generator.py`
- Remove `from groq import Groq`, use `smart_router.generate(prompt, max_tokens=2048, task=Task.AUDIO_SCRIPT)`

**T3.2** Add article selection to podcast API
- `backend/api/routes/podcast.py` → read `article_ids` from request body
- `backend/generators/podcast_generator.py` → accept `article_ids=None` parameter

**T3.3** Add article selection UI to PodcastView
- `frontend/src/components/PodcastView.jsx`
- Fetch stories, show scrollable checklist, pass `article_ids` in POST body

**T3.4** Fix `get_latest_podcast()` to query DB
- `backend/api/routes/podcast.py`
- Query `ArticleAudio` table for `podcast_digest` files, order by `created_at DESC`

**T3.5** Fix `asyncio.run()` Celery compatibility
- `backend/generators/podcast_generator.py` and `backend/processors/audio_engine.py`
- Use `concurrent.futures.ThreadPoolExecutor` pattern

**T3.6** Add Pollinations.ai TTS fallback
- `backend/processors/audio_engine.py`
- New method `generate_pollinations_tts(text, voice="nova")`
- URL: `https://gen.pollinations.ai/audio/{urllib.parse.quote(text[:5000])}?voice=nova&model=elevenlabs`

### Phase 4 — LLM Router Fixes

**T4.1** Fix thread leak — replace `_call_with_timeout` with `concurrent.futures`
```python
def _call_with_timeout(self, func, *args, timeout=10, **kwargs):
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        return ex.submit(func, *args, **kwargs).result(timeout=timeout)
```

**T4.2** Fix cache key — include `max_tokens`
- `hashlib.md5(f"{task.value}:{max_tokens}:{prompt}".encode()).hexdigest()`

**T4.3** Fix `get_status()` — real key check
- Check `settings.GROQ_API_KEY`, `settings.CEREBRAS_API_KEY`, etc. per provider

**T4.4** Add health monitor to Cerebras and OpenRouter
- `health_monitor.log_success("llm_cerebras", duration_ms)` on success
- `health_monitor.log_failure("llm_cerebras", e)` on failure

**T4.5** Fix `timeout` parameter ignored in Cerebras, OpenRouter, Ollama
- Accept `timeout=None` in `generate()`, use `timeout or self.config.timeout`

**T4.6** Fix PaidApiLLMClient response validation
- Wrap key access in try/except `KeyError`

**T4.7** Add `Task.AUDIO_SCRIPT` and `Task.BLOG` to router enum and routing table

**T4.8** Raise `max_tokens` cap to 32000

### Phase 5 — New Free LLM Clients

**T5.1** Add Google Gemini 2.5 Flash-Lite client
- New file: `backend/llm/clients/gemini_client.py`
- API: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- Key: `GEMINI_API_KEY` (free at aistudio.google.com)
- Model: `gemini-2.0-flash-lite` (configurable via `GEMINI_MODEL`)
- Free tier: 30 RPM, 1000 RPD
- Add to `config.py`: `GEMINI_API_KEY`, `GEMINI_MODEL`
- Add to router: `"gemini": GeminiClient` in `_initialize_clients()`
- Add to all `TASK_ROUTING` chains as third fallback

**T5.2** Add Mistral client
- New file: `backend/llm/clients/mistral_client.py`
- API: `https://api.mistral.ai/v1/chat/completions`
- Key: `MISTRAL_API_KEY` (free Experiment plan at console.mistral.ai)
- Model: `mistral-small-latest` (configurable via `MISTRAL_MODEL`)
- Note: free tier requires opting into data training
- Add to `config.py`: `MISTRAL_API_KEY`, `MISTRAL_MODEL`
- Add to router as fourth fallback

**T5.3** Add Pollinations.ai text client (no key)
- New file: `backend/llm/clients/pollinations_text_client.py`
- API: `GET https://gen.pollinations.ai/text/{urllib.parse.quote(prompt)}?model=openai&seed=-1`
- No key required
- Use as last fallback before `system_fallback` for non-critical tasks (tagging, social short)
- Add to `config.py`: `POLLINATIONS_TEXT_ENABLED: bool = os.getenv("POLLINATIONS_TEXT_ENABLED", "true").lower() == "true"`

---

## 6. Design Decisions

**Image and Audio: user-triggered only.** Not in the automated pipeline. Both are slow (10–120s) and may cost money. Only run when user explicitly clicks a button.

**Pollinations.ai:** No key, no signup. Best zero-config fallback for both image (Flux model) and audio (ElevenLabs voices). Rate limits are generous for single-user self-hosted use.

**edge-tts:** Keep as primary TTS. Free, Microsoft neural voices, works without any API key. Pollinations TTS is the fallback for better voice quality.

**Google Gemini 2.5 Flash-Lite:** Best next free LLM to add. 30 RPM, 1000 RPD, free key, OpenAI-compatible endpoint. Better quality than Cerebras for long-form tasks.

**Mistral:** Add after Gemini. Requires phone verification and data training opt-in on free tier. Good for European data residency requirements.

**Pollinations text (no key):** Add as absolute last resort. No key means no rate limit enforcement — use only for low-stakes tasks (tagging, short social posts).
