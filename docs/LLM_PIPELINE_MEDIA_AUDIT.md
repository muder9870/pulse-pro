# LLM, Pipeline, Image & Audio — Full Audit

**Branch:** feature/llm-pipeline-media-stabilization
**Date:** April 2026
**Status:** Pre-fix audit — verified against actual source code, no assumptions

---

## 1. LLM Clients — Security & Correctness Audit

### 1.1 Groq (`backend/llm/clients/groq_client.py`)

**Status: GOOD — most complete client**

| Check | Result |
|-------|--------|
| API key validation | ✅ Checks for None and placeholder string |
| Rate limiting | ✅ In-process 28 RPM sliding window with lock |
| Timeout handling | ✅ Raises `TimeoutError` correctly |
| 429 handling | ✅ Raises `GroqRateLimitError` |
| 401 handling | ✅ Raises `RuntimeError` |
| Response validation | ✅ Checks `choices` field exists and is non-empty |
| Health monitor | ✅ Logs success and failure |
| Key in logs | ✅ Key never logged |

**Issues:**
- Rate limit list `_groq_request_times` is a module-level global — shared across all threads but only protected by `_groq_lock`. If the process forks (Celery), each worker gets its own copy and the rate limit is not enforced across workers. **Low severity** — acceptable for single-process Gunicorn.
- `GROQ_RPM_LIMIT = 28` is hardcoded. Groq free tier is 30 RPM but varies by model. Should be configurable via `GROQ_RPM_LIMIT` env var.

---

### 1.2 Cerebras (`backend/llm/clients/cerebras_client.py`)

**Status: ACCEPTABLE — minor issues**

| Check | Result |
|-------|--------|
| API key validation | ✅ Raises `ValueError` if missing |
| Session reuse | ✅ Uses `requests.Session` |
| Rate limiting | ✅ Exponential backoff on 429 |
| Timeout | ✅ 30s timeout |
| Response validation | ⚠️ Uses `.get()` chain — returns empty string on malformed response instead of raising |
| Health monitor | ❌ Not called — no success/failure logging to health monitor |
| Key in logs | ✅ Key never logged |

**Issues:**
- `health_monitor.log_success/log_failure` never called. Cerebras failures are invisible to the circuit breaker's failure rate calculation. The circuit breaker for `llm_cerebras` will never trip because it never sees failures.
- Empty string returned on malformed response — caller gets `""` and may not detect the failure.
- `timeout` parameter in `generate()` signature is ignored — always uses `self.config.timeout` (30s). The router passes `timeout=10` but Cerebras always uses 30s.

---

### 1.3 OpenRouter (`backend/llm/clients/openrouter_client.py`)

**Status: ACCEPTABLE — same issues as Cerebras**

| Check | Result |
|-------|--------|
| API key validation | ✅ Raises `ValueError` if missing |
| Session reuse | ✅ Uses `requests.Session` |
| Rate limiting | ✅ Exponential backoff on 429 |
| Timeout | ✅ 30s timeout |
| Response validation | ⚠️ Same `.get()` chain — empty string on malformed response |
| Health monitor | ❌ Not called |
| Key in logs | ✅ Key never logged |
| Referer header | ⚠️ Hardcoded `http://localhost:3000` — should use `settings.BASE_URL` or be configurable |

**Issues:**
- Same health monitor gap as Cerebras.
- `timeout` parameter ignored — always 30s.
- `HTTP-Referer: http://localhost:3000` is hardcoded. In production this should be the actual app URL.
- Retry loop has `time.sleep(2 ** attempt)` after the last attempt too — wastes time on final failure.

---

### 1.4 Ollama (`backend/llm/clients/ollama_client.py`)

**Status: ACCEPTABLE — local only**

| Check | Result |
|-------|--------|
| No API key needed | ✅ Local service |
| URL validation | ✅ Normalises scheme |
| Timeout | ✅ 90s (appropriate for local GPU) |
| Health monitor | ✅ Logs success and failure |
| Response validation | ⚠️ Returns empty string if `response` key missing |

**Issues:**
- `timeout` parameter in `generate()` signature is not accepted — always 90s. Router passes `timeout=10` but it's ignored.
- No check that Ollama is actually running before attempting — fails with `ConnectionRefusedError` which is fine but could have a clearer error message.

---

### 1.5 PaidApiLLMClient (`backend/llm/clients/paid_client.py`)

**Status: POOR — multiple issues**

| Check | Result |
|-------|--------|
| API key validation | ⚠️ Only checked at call time, not at init |
| OpenAI response validation | ⚠️ Direct `data["choices"][0]["message"]["content"]` — KeyError if malformed |
| Anthropic response validation | ⚠️ Direct `data["content"][0]["text"]` — KeyError if malformed |
| Timeout | ✅ 60s |
| Health monitor | ✅ Logs success and failure |
| Key in logs | ✅ Key never logged |
| Error handling | ⚠️ Bare `except Exception` catches everything including `KeyboardInterrupt` |

**Issues:**
- No `__init__` — client is instantiated even when no paid keys are set. The router initialises it at startup and it silently succeeds. Only fails at call time with `RuntimeError("Missing Paid API Keys")`.
- OpenAI and Anthropic are both in one class with `if/elif` — if OpenAI key is set but fails, Anthropic is never tried. Should be two separate clients.
- `data["choices"][0]["message"]["content"]` will raise `KeyError` on unexpected response format — not caught.
- `timeout` parameter not accepted in `generate()` signature.

---

### 1.6 LLM Router (`backend/llm/llm_router.py`)

**Status: GOOD STRUCTURE — specific bugs**

| Check | Result |
|-------|--------|
| Fallback chain | ✅ Task-aware routing with ordered fallback |
| Circuit breaker | ✅ Per-provider |
| Redis caching | ✅ Adaptive TTL |
| Graceful degradation | ✅ Returns fallback JSON instead of crashing |
| Thread safety | ⚠️ `_call_with_timeout` leaks threads |
| Cache key | ❌ Does not include `max_tokens` |
| `get_status()` | ❌ Fake health check |
| `max_tokens` cap | ⚠️ Hard cap at 8000 — too low for some providers |

**Issues:**

**Bug 1 — Thread leak in `_call_with_timeout`:**
```python
thread = threading.Thread(target=target)
thread.daemon = True
thread.start()
thread.join(timeout)
if thread.is_alive():
    raise TimeoutError(...)  # Thread keeps running after this!
```
The thread continues executing after the timeout is raised. Under load, timed-out LLM calls accumulate as zombie threads. Fix: use `concurrent.futures.ThreadPoolExecutor`.

**Bug 2 — Cache key collision:**
```python
cache_key = hashlib.md5(f"{task.value}:{prompt}".encode()).hexdigest()
```
`max_tokens=512` and `max_tokens=4096` for the same prompt return the same cached result. Deep analysis (4096 tokens) may get a truncated cached response from a previous 512-token call.

**Bug 3 — Fake `get_status()`:**
```python
if hasattr(client, 'model') or hasattr(client, 'config'):
    status["available_providers"].append(provider)
```
Every client has either `model` or `config`. This always marks all providers as available regardless of whether their API keys are set or the service is reachable.

---

### 1.7 Circuit Breaker (`backend/llm/circuit_breaker.py`)

**Status: GOOD**

Correctly implements closed → open → half-open state machine. Uses `health_monitor` for failure rate. Cooldown period is configurable. No issues found.

**Note:** Only effective for Groq and Ollama clients since Cerebras and OpenRouter don't call `health_monitor`. The circuit breaker for those providers will never trip.

---

## 2. Image Generation Audit

### 2.1 Two Image Generators — Why They Exist

There are two separate image generator files:

**`backend/generators/image_generator.py`** — **DEAD CODE / STUB**
- Writes `b"MOCK_IMAGE_DATA"` to a file. Never calls any real API.
- Has a `style_mapper` integration that is also unused.
- Not called from anywhere in the active codebase.
- **Action: Delete this file.**

**`backend/processors/image_engine.py`** — **REAL IMPLEMENTATION**
- Used by `backend/api/routes/media.py` → `POST /api/media/generate-image`
- Has real DALL-E 3 → HuggingFace SDXL → Quote Card fallback chain.
- This is the one that matters.

### 2.2 Quote Card Bug — Root Cause Found

The quote card is the final fallback in `image_engine.py`. It fails silently in Docker because:

```python
try:
    font_title = ImageFont.truetype("arial.ttf", 48)   # Windows only
    font_text = ImageFont.truetype("arial.ttf", 32)
except:
    font_title = ImageFont.load_default()   # Returns a tiny 10px bitmap font
    font_text = ImageFont.load_default()
```

In Docker (Linux), `arial.ttf` does not exist. `ImageFont.load_default()` returns a 10-pixel bitmap font. The text is drawn but is **unreadably tiny** — the card appears blank or broken.

Additionally, `ImageFont.load_default()` in Pillow ≥ 10.x requires a `size` parameter: `ImageFont.load_default(size=32)`. Without it, the font is 10px regardless.

**Fix:** Try multiple font paths in order: `DejaVuSans.ttf` (available in most Linux Docker images), `LiberationSans-Regular.ttf`, `arial.ttf`, then `ImageFont.load_default(size=32)`.

### 2.3 Image Engine Issues

| # | Severity | Issue |
|---|----------|-------|
| 1 | High | Quote card font fails silently in Docker — text is 10px, card looks blank |
| 2 | High | `ProcessedArticle.get(p_id)` — deprecated SQLAlchemy 2.x `.get()` method |
| 3 | Medium | Opens new `SessionLocal()` inside method — connection pool exhaustion risk |
| 4 | Medium | HF model URL hardcoded to SDXL — not configurable |
| 5 | Low | No auto-prompt generation — callers must provide prompt |

### 2.4 Proposed Image Fallback Chain (with Pollinations.ai)

```
1. DALL-E 3 via OpenAI API          (if OPENAI_API_KEY set)     — best quality, paid
2. Pollinations.ai Flux             (no key, always available)   — good quality, free
   GET https://image.pollinations.ai/prompt/{encoded_prompt}
       ?width=1024&height=1024&model=flux&nologo=true
3. Hugging Face SDXL                (if HF_TOKEN set)            — good quality, free tier
4. Quote Card (PIL)                 (always available)           — basic, 100% reliable
```

**Pollinations.ai implementation:**
```python
import urllib.parse, requests

def generate_pollinations_image(self, article_id: int, prompt: str) -> str | None:
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&model=flux&nologo=true"
    response = requests.get(url, timeout=60)
    if response.status_code == 200 and "image" in response.headers.get("Content-Type", ""):
        filename = f"article_{article_id}_pollinations_{os.urandom(4).hex()}.jpg"
        local_path = self.media_dir / filename
        with open(local_path, "wb") as f:
            f.write(response.content)
        # save to DB...
        return str(local_path)
    return None
```

---

## 3. Audio & Podcast Audit

### 3.1 Audio Engine (`backend/processors/audio_engine.py`)

**Status: GOOD — edge-tts works correctly**

| Check | Result |
|-------|--------|
| TTS provider | ✅ `edge-tts` — free, Microsoft neural voices, no API key |
| File saving | ✅ Saves to `MEDIA_DIR/audio/` |
| DB recording | ✅ Saves to `article_audio` table |
| Error handling | ✅ Returns None on failure |
| Async wrapper | ⚠️ `asyncio.run()` fails in Celery workers |

**Issues:**
- `asyncio.run()` raises `RuntimeError: This event loop is already running` when called from Celery. Fix: use `asyncio.get_event_loop().run_until_complete()` with new loop fallback.

### 3.2 Podcast Generator (`backend/generators/podcast_generator.py`)

**Status: BROKEN — multiple critical issues**

| # | Severity | Issue |
|---|----------|-------|
| 1 | Critical | Audio files return 404 — no Flask route serves `/api/media/audio/{filename}` |
| 2 | Critical | Hardcodes `Groq(api_key=settings.GROQ_API_KEY)` directly — bypasses SmartLLMRouter, no fallback |
| 3 | High | No article/story selection — always uses top 5 articles, user cannot choose |
| 4 | High | `get_latest_podcast()` scans filesystem with relative path `"data/audio"` — breaks in Docker |
| 5 | Medium | No `podcasts` DB table — history not queryable, metadata not persisted |
| 6 | Medium | `asyncio.run()` Celery incompatibility |
| 7 | Low | Single voice for both Alex and Morgan — debate format loses impact |

### 3.3 Missing Audio Serving Route

The `AudioPlayer` component calls `/api/media/audio/{filename}`. No Flask route exists for this. Fix:

```python
# In backend/api/routes/media.py or podcast.py
from flask import send_from_directory
from backend.config import settings

@media_bp.get("/api/media/audio/<path:filename>")
def serve_audio(filename):
    audio_dir = settings.MEDIA_DIR / "audio"
    return send_from_directory(str(audio_dir), filename)
```

### 3.4 Podcast Story Selection — Missing Feature

The `PodcastView.jsx` has no way to select which articles to include. It always uses whatever `get_top_stories(limit=5)` returns. The user should be able to:
1. See a list of available articles
2. Select 1–10 articles to include in the podcast
3. Click "Generate Podcast"

This requires:
- Frontend: article multi-select in `PodcastView.jsx`
- Backend: `POST /api/generate/podcast` accepts `{ article_ids: [int] }` body
- `PodcastGenerator.generate_daily_digest()` accepts `article_ids` parameter

### 3.5 Proposed Audio Fallback Chain

```
Script generation (text):
1. SmartLLMRouter (Groq → Cerebras → OpenRouter)   — already free, use existing router

TTS (audio):
1. edge-tts (already implemented)                   — free, no key, Microsoft neural voices
2. Pollinations.ai TTS (ElevenLabs voices)          — free tier, better voice quality
   GET https://gen.pollinations.ai/audio/{text}?voice=nova&model=elevenlabs
```

**Pollinations TTS implementation:**
```python
def generate_pollinations_tts(self, text: str, voice: str = "nova") -> bytes | None:
    import urllib.parse
    encoded = urllib.parse.quote(text[:5000])  # API limit
    url = f"https://gen.pollinations.ai/audio/{encoded}?voice={voice}&model=elevenlabs"
    response = requests.get(url, timeout=60)
    if response.status_code == 200:
        return response.content
    return None
```

---

## 4. Free LLM Options for Pipeline

### 4.1 Currently Implemented

| Provider | Free Tier | Speed | Best For | Key Required |
|----------|-----------|-------|----------|--------------|
| Groq | ✅ 30 RPM, 6000 TPM | Very fast | Analysis, generation | Yes (free) |
| Cerebras | ✅ Limited | Fast | Analysis | Yes (free) |
| OpenRouter | ✅ Some models free | Varies | Research, deep analysis | Yes (free) |
| Ollama | ✅ Unlimited | Slow (needs GPU) | Local/offline | No |

### 4.2 Additional Free LLMs to Consider (Future)

| Provider | API | Free Tier | Notes |
|----------|-----|-----------|-------|
| **Google Gemini** | `generativelanguage.googleapis.com` | 15 RPM, 1M TPD (Gemini 1.5 Flash) | Best free tier by volume. Needs `GEMINI_API_KEY` (free). |
| **Mistral** | `api.mistral.ai` | Free tier on `mistral-small` | Good for European data residency. |
| **Cohere** | `api.cohere.com` | 20 RPM free | Good for summarization tasks. |
| **Together AI** | `api.together.xyz` | $1 free credit | Llama 3, Mixtral, many open models. |
| **Pollinations.ai** | `gen.pollinations.ai` | Unlimited (rate limited) | No key needed. GPT-5 Nano, DeepSeek, Mistral. |

**Recommendation for next free LLM to add: Google Gemini 1.5 Flash**
- 15 RPM, 1 million tokens/day free
- Fast, high quality
- Free API key at `aistudio.google.com`
- OpenAI-compatible endpoint available

---

## 5. Complete Task List

### Phase 1 — Critical Fixes (nothing works without these)

**T1.1** — Add audio file serving route
- File: `backend/api/routes/media.py`
- Add `GET /api/media/audio/<path:filename>` using `send_from_directory(settings.MEDIA_DIR / "audio", filename)`
- Test: `curl http://localhost:5000/api/media/audio/test.mp3`

**T1.2** — Fix Quote Card font in Docker
- File: `backend/processors/image_engine.py` → `generate_quote_card()`
- Try fonts in order: `DejaVuSans.ttf`, `LiberationSans-Regular.ttf`, `arial.ttf`
- Fallback: `ImageFont.load_default(size=32)` (Pillow ≥ 10 syntax)
- Add `fontconfig` or `fonts-dejavu-core` to Docker image if needed
- Test: call `generate_quote_card(0, "Test text", "Test Title")` in Docker, verify readable output

**T1.3** — Fix deprecated `ProcessedArticle.get(p_id)` in image engine
- File: `backend/processors/image_engine.py` → `generate_image()`
- Replace `db_f.query(ProcessedArticle).get(p_id)` with `db_f.get(ProcessedArticle, p_id)`

**T1.4** — Fix double-lock acquisition in orchestrator
- File: `backend/agents/orchestrator.py` → `run_full_pipeline()`
- Remove the `pipeline_lock.acquire(timeout=1)` call at the top
- Keep only the `with pipeline_lock:` block for state updates
- The running check should use `pipeline_state["running"]` directly

---

### Phase 2 — Image Generation

**T2.1** — Add Pollinations.ai as image provider (tier 2, no key needed)
- File: `backend/processors/image_engine.py`
- Add `generate_pollinations_image(self, article_id, prompt)` method
- URL: `https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=1024&height=1024&model=flux&nologo=true`
- Timeout: 60s
- Validate response: `Content-Type` must contain `image`
- Save to disk and DB same as other providers

**T2.2** — Update image fallback chain order
- File: `backend/processors/image_engine.py` → `generate_image()`
- New order: DALL-E 3 → Pollinations.ai → HuggingFace → Quote Card
- Pollinations runs before HuggingFace because it needs no key

**T2.3** — Delete dead code `backend/generators/image_generator.py`
- This file writes mock data and is never called
- Verify no imports reference it: `grep -r "image_generator" backend/`
- Delete the file

**T2.4** — Add `HF_IMAGE_MODEL` config
- File: `backend/config.py`
- Add `HF_IMAGE_MODEL: str = os.getenv("HF_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")`
- File: `backend/processors/image_engine.py` → `generate_hf_image()`
- Replace hardcoded URL with `settings.HF_IMAGE_MODEL`

---

### Phase 3 — Podcast & Audio

**T3.1** — Replace hardcoded Groq in PodcastGenerator with SmartLLMRouter
- File: `backend/generators/podcast_generator.py`
- Remove `from groq import Groq` and `self.client = Groq(...)`
- Import `from backend.llm.llm_router import smart_router, Task`
- Replace `self.client.chat.completions.create(...)` with `smart_router.generate(prompt, max_tokens=2048, task=Task.SOCIAL_LONG)`

**T3.2** — Add article selection to podcast generation
- File: `backend/generators/podcast_generator.py`
- Change `generate_daily_digest(self, limit=5)` to `generate_daily_digest(self, article_ids=None, limit=5)`
- If `article_ids` provided, fetch those specific articles; otherwise use top N by score
- File: `backend/api/routes/podcast.py` → `generate_podcast_endpoint()`
- Read `article_ids` from request body: `data = request.json or {}; article_ids = data.get("article_ids")`
- Pass to generator

**T3.3** — Add article selection UI to PodcastView
- File: `frontend/src/components/PodcastView.jsx`
- Add state: `const [stories, setStories] = useState([]); const [selectedIds, setSelectedIds] = useState([])`
- Fetch stories on mount: `GET /api/stories?limit=20&sort=score`
- Show a scrollable checklist of story titles with checkboxes
- Pass `article_ids: selectedIds` in the `POST /api/generate/podcast` body
- If no stories selected, use default (top 5)

**T3.4** — Fix `get_latest_podcast()` to use DB instead of filesystem scan
- File: `backend/api/routes/podcast.py`
- Query `ArticleAudio` table for rows where `audio_url` contains `podcast_digest`
- Order by `created_at DESC`, return first result
- Return `{ podcast: { audio_url, created_at, title } }` or `{ podcast: null }`

**T3.5** — Fix `asyncio.run()` Celery compatibility
- File: `backend/generators/podcast_generator.py` → `generate_daily_digest_sync()`
- File: `backend/processors/audio_engine.py` → `generate_audio_sync()`
- Replace `asyncio.run(coro)` with:
  ```python
  try:
      loop = asyncio.get_event_loop()
      if loop.is_running():
          import concurrent.futures
          with concurrent.futures.ThreadPoolExecutor() as pool:
              return pool.submit(asyncio.run, coro).result()
      return loop.run_until_complete(coro)
  except RuntimeError:
      return asyncio.run(coro)
  ```

**T3.6** — Add Pollinations.ai TTS as audio fallback
- File: `backend/processors/audio_engine.py`
- Add `generate_pollinations_tts(self, text, voice="nova")` method
- URL: `https://gen.pollinations.ai/audio/{urllib.parse.quote(text[:5000])}?voice={voice}&model=elevenlabs`
- Update `generate_audio()` to try edge-tts first, then Pollinations TTS on failure

---

### Phase 4 — LLM Router Fixes

**T4.1** — Fix thread leak in `_call_with_timeout`
- File: `backend/llm/llm_router.py`
- Replace thread + queue pattern with `concurrent.futures.ThreadPoolExecutor`:
  ```python
  import concurrent.futures
  def _call_with_timeout(self, func, *args, timeout: int = 10, **kwargs):
      with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
          future = executor.submit(func, *args, **kwargs)
          return future.result(timeout=timeout)
  ```

**T4.2** — Fix cache key to include `max_tokens`
- File: `backend/llm/llm_router.py` → `generate()`
- Change: `cache_key = hashlib.md5(f"{task.value}:{max_tokens}:{prompt}".encode()).hexdigest()`

**T4.3** — Fix `get_status()` to return real information
- File: `backend/llm/llm_router.py` → `get_status()`
- For each provider, check if the API key is set (not just if the client object exists)
- Return `{ "provider": name, "key_configured": bool, "circuit_breaker_state": "open"|"closed" }`

**T4.4** — Add health monitor calls to Cerebras and OpenRouter
- File: `backend/llm/clients/cerebras_client.py` → `generate()`
- Import and call `health_monitor.log_success("llm_cerebras", duration_ms)` on success
- Call `health_monitor.log_failure("llm_cerebras", e)` on failure
- Same for `backend/llm/clients/openrouter_client.py` with `"llm_openrouter"`

**T4.5** — Fix `timeout` parameter ignored in Cerebras, OpenRouter, Ollama
- File: `backend/llm/clients/cerebras_client.py` → `generate(self, prompt, max_tokens, timeout=None)`
- Use `timeout or self.config.timeout` in the `requests.post()` call
- Same fix for `openrouter_client.py` and `ollama_client.py`

**T4.6** — Fix PaidApiLLMClient response validation
- File: `backend/llm/clients/paid_client.py`
- Wrap `data["choices"][0]["message"]["content"]` in try/except `KeyError`
- Wrap `data["content"][0]["text"]` in try/except `KeyError`
- Raise `RuntimeError("Malformed response from OpenAI/Anthropic")` on KeyError

**T4.7** — Add `Task.AUDIO_SCRIPT` and `Task.BLOG` to router
- File: `backend/llm/llm_router.py`
- Add to `Task` enum: `AUDIO_SCRIPT = "audio_script"`, `BLOG = "blog"`
- Add to `TASK_ROUTING`: `Task.AUDIO_SCRIPT: ["groq", "cerebras", "openrouter"]`, `Task.BLOG: ["openrouter", "groq", "cerebras"]`

**T4.8** — Raise `max_tokens` validation cap
- File: `backend/llm/llm_router.py` → `_validate_inputs()`
- Change `max_tokens > 8000` to `max_tokens > 32000`

---

### Phase 5 — Future: Additional Free LLMs

**T5.1** — Add Google Gemini 1.5 Flash client
- New file: `backend/llm/clients/gemini_client.py`
- API: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- Key: `GEMINI_API_KEY` (free at aistudio.google.com)
- Free tier: 15 RPM, 1M tokens/day
- Add to `TASK_ROUTING` as additional fallback after OpenRouter

**T5.2** — Add Pollinations.ai text LLM client
- New file: `backend/llm/clients/pollinations_client.py`
- API: `https://gen.pollinations.ai/text/{encoded_prompt}?model=openai&seed=-1`
- No key required
- Use as last-resort fallback before `system_fallback`
- Suitable for: tagging, short social posts, non-critical tasks

---

## 6. Design Decisions

### Image: User-triggered only (not in pipeline)
Image generation is slow (10–60s per image) and may cost money (DALL-E). It should only run when the user explicitly clicks "Generate Image" in the Media view. The pipeline should not auto-generate images.

### Audio/Podcast: User-triggered only (not in pipeline)
Podcast generation takes 30–120s. It should only run when the user clicks "Generate Podcast" in the Podcast view. The user should be able to select which articles to include.

### Pollinations.ai — No key, always available
Pollinations.ai requires no API key and no signup. It is the best zero-config fallback for both image and audio. Quality is good (Flux Schnell for images, ElevenLabs voices for TTS). Rate limits exist but are generous for single-user self-hosted use.

### edge-tts — Primary TTS, keep it
`edge-tts` uses Microsoft's neural TTS infrastructure. It's free, high quality, and works offline-ish (streams from Microsoft CDN). Keep it as the primary TTS. Pollinations TTS is the fallback for better voice quality when needed.
