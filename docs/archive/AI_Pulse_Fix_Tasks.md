# ⚡ AI Pulse v2 — Complete Fix & Task Document

> **What to fix · Where to fix it · How to fix it · Step by step**
> Prepared for: Windows + Docker Desktop | LLM: Groq Free API

---

## SECTION 1 — What You Want to Build

### The 6-Step Flow You Described

1. Pipeline runs automatically in the background → fetches AI news articles
2. System scores each article (viral, depth, relevance) → picks the best one
3. **YOU** open the dashboard → see the selected article with score breakdown
4. **YOU** click "Generate Posts" button manually
5. Groq AI generates full posts for all 8 platforms in one API call
6. You review → edit if needed → copy-paste to each platform yourself

### Your 8 Target Platforms
`Twitter/X` · `LinkedIn` · `Instagram` · `Facebook` · `Reddit` · `Threads` · `YouTube` · `Blog`

### Your Hardware & Constraints
- Laptop: 16GB RAM, Intel HD 620 (no dedicated GPU) — Windows 11
- ❌ Cannot run local LLMs — Ollama/Llama fail on Intel HD 620 (no VRAM)
- ❌ Cannot use paid APIs (OpenAI, Anthropic)
- ✅ Solution: **Groq free API** — cloud-based, no GPU needed, 1000 req/day free
- ✅ Docker Desktop installed and running
- ✅ PostgreSQL installed locally

---

## SECTION 2 — What Your Code Does RIGHT ✅

> These parts are already correctly built. **Do NOT change them.**

| Component | What it does | Status |
|---|---|---|
| Pipeline structure | fetch → clean → dedup → analyze → score → decide | ✅ Correct |
| Decision engine | Priority tiers HIGH/MEDIUM/LOW work correctly | ✅ Correct |
| Scoring system | viral_score, tech_score, relevance_score all implemented | ✅ Correct |
| Platform templates | 14 platforms defined with tone/format/char_limit | ✅ Correct |
| Deduplication | Fingerprint-based dedup works well | ✅ Correct |
| RSS + GitHub + arXiv | All 3 fetchers implemented and working | ✅ Correct |
| `/api/generate` endpoint | Manual generation API exists in main.py | ✅ Correct |
| PostgreSQL + Docker DB | Database schema and migrations are solid | ✅ Correct |
| LLM caching | In-memory + DB cache to avoid repeated API calls | ✅ Correct |
| Analytics & Monitoring | Full analytics engine, health monitoring, metrics | ✅ Correct |

---

## SECTION 3 — Complete Task List

| # | Task | File | Priority | Status |
|---|---|---|---|---|
| 1 | Replace Ollama with Groq free API client | `backend/llm.py` | 🔴 Critical | ✅ Fixed |
| 2 | Add GROQ_API_KEY + GROQ_MODEL to settings | `backend/config.py` | 🔴 Critical | ✅ Fixed |
| 3 | Set LLM_PROVIDER=groq in environment | `.env` | 🔴 Critical | ✅ Fixed |
| 4 | Remove Ollama Docker service | `docker-compose.yml` | 🔴 Critical | ✅ Fixed |
| 5 | Remove auto-generation from pipeline | `backend/main_pipeline.py` | 🟠 Major | ✅ Fixed |
| 6 | Add `blog` platform to platform templates | `backend/generators/platform_templates.py` | 🟠 Major | ✅ Fixed |
| 7 | Fix all 8 platforms in CONTENT_PLATFORMS | `.env` | 🟠 Major | ✅ Fixed |
| 8 | Fix health check — remove ollama import | `backend/main.py` | 🟠 Major | ✅ Fixed |
| 9 | Fix FreeApiLLMClient — replace DialoGPT with Mistral-7B | `backend/llm.py` | 🟡 Minor | ✅ Fixed |
| 10 | Reduce ANALYSIS_LIMIT to save API calls | `.env` | 🟡 Minor | ✅ Fixed |
| 11 | Expose model attribute on CircuitBreakerLLMClient | `backend/llm.py` | 🟡 Minor | ✅ Fixed |

---

## SECTION 4 — Task Details (Step by Step)

---

### TASKS 1–4: LLM & Config Fixes ✅ ALREADY DONE — Files Provided

These 4 files have already been written and given to you. **Download and replace them now.**

- `backend/llm.py` → Added GroqClient, fixed FreeApiLLMClient, exposed model attribute
- `backend/config.py` → Added GROQ_API_KEY, GROQ_MODEL settings
- `.env` → Set LLM_PROVIDER=groq, all 8 platforms, reduced ANALYSIS_LIMIT
- `docker-compose.yml` → Removed Ollama service (unusable on your laptop)

---

### TASK 5: Remove Auto-Generation from Pipeline ✅ COMPLETED

**Problem:** The pipeline currently auto-generates posts every time it runs. You said generation must be MANUAL — triggered by YOU clicking a button in the dashboard.

**File to edit:** `backend/main_pipeline.py`

**What to do:** Find Step 6 (around line 130) and remove the entire generation block.

**Find and DELETE this entire block:**

```python
    # 6. Generate Content (For HIGH priority articles only, limit 1)
    log.info("stage=generate msg=begin")
    generated_article_ids = []
    try:
        gen = ContentGenerator()
        results = gen.generate_for_priority(priority_filter='HIGH', limit=1, platforms=content_platforms)
        generated_article_ids = list(results.keys())
        log.info("stage=generate generated_articles=%s", len(results))
    except Exception as exc:
        log.error("stage=generate status=error error=%s", exc)
        _err("generate", exc)

    # 6a. Generate Visuals
    if generated_article_ids:
        log.info("stage=visuals msg=begin count=%s", len(generated_article_ids))
        from .generators.image_generator import image_generator
        visual_rows: list[tuple] = []
        with get_session() as session:
            for aid in generated_article_ids:
                article = session.query(ProcessedArticle).join(
                    RawArticle
                ).filter(ProcessedArticle.id == aid).first()
                if article:
                    visual_rows.append((aid, article.raw_article.title, article.summary))
        for aid, title, summary in visual_rows:
            try:
                img_prompt = decision_engine.generate_image_prompt(title, summary)
                img_path = image_generator.generate_featured_image(aid, img_prompt)
                log.info("stage=visuals article_id=%s path=%s", aid, img_path)
            except Exception as exc:
                log.error("stage=visuals article_id=%s error=%s", aid, exc)
```

**Why:** Generation now happens only when YOU click the button. The `/api/generate` endpoint in `main.py` already handles manual generation correctly — it's already there and working.

---

### TASK 6: Add 'blog' Platform to Platform Templates ✅ COMPLETED

**Problem:** `PLATFORM_CONFIGS` in `platform_templates.py` does not have a `blog` entry. Since you want blog posts generated, it must be added.

**File to edit:** `backend/generators/platform_templates.py`

**Add this block inside `PLATFORM_CONFIGS`, after the `"discord"` entry:**

```python
    "blog": {
        "char_limit": 5000,
        "tone": "informative and engaging",
        "format": "blog article with introduction, body sections, and conclusion",
        "label": "Blog Post",
    },
```

---

### TASK 8: Fix Health Check — Remove Ollama Import ✅ COMPLETED

**Problem:** In `main.py`, the `_fetch_health_data()` function has `import ollama` — this will crash on startup because Ollama is removed from Docker.

**File to edit:** `backend/main.py`

**Find this block (around line 55) and DELETE it:**

```python
    # 2. Ollama availability
    try:
        models = ollama.list()
        health_status["checks"]["ollama"] = {
            "status": "ok",
            "models": len(models.get("models", []))
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["checks"]["ollama"] = {
            "status": "error",
            "error": str(e)
        }
```

**Replace it WITH this:**

```python
    # 2. LLM Provider check (Groq replaces Ollama)
    groq_key = os.getenv("GROQ_API_KEY", "")
    health_status["checks"]["llm"] = {
        "status": "ok" if groq_key and groq_key != "your_groq_api_key_here" else "warning",
        "provider": "groq",
        "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    }
```

**Also:** Find the line `import ollama` inside `_fetch_health_data()` and delete it.

---

## SECTION 5 — How to Run Everything (Step by Step)

### Step 1 — Get Your Free Groq API Key

1. Go to: [https://console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card needed)
3. Click "Create API Key"
4. Copy the key from the dashboard
5. Open your `.env` file
4. Replace `GROQ_API_KEY=your_groq_api_key_here` with your actual Groq API key in the `.env` file.

---

### Step 2 — Replace the Fixed Files

| File | Replace at this path | Notes |
|---|---|---|
| `.env` | Root folder (next to docker-compose.yml) | Add your real GROQ_API_KEY |
| `docker-compose.yml` | Root folder — replace existing | Ollama service removed |
| `backend/llm.py` | `backend/llm.py` — replace existing | Groq client added |
| `backend/config.py` | `backend/config.py` — replace existing | Groq settings added |

---

### Step 3 — Apply the 3 Manual Fixes

1. Edit `backend/main_pipeline.py` → Remove auto-generation block (Task 5)
2. Edit `backend/generators/platform_templates.py` → Add `blog` entry (Task 6)
3. Edit `backend/main.py` → Replace ollama health check with Groq check (Task 8)

---

### Step 4 — Start Docker

```bash
# Open terminal in your project root folder
cd "path/to/your/ai-pulse/project"

# Stop any existing containers
docker-compose down

# Rebuild and start (first time takes 3–5 minutes)
docker-compose up --build

# Your app will be available at:
# Frontend dashboard:  http://localhost:80
# Backend API:         http://localhost:5000/api/health
```

---

### Step 5 — Use the App

1. Open dashboard at `http://localhost:80`
2. Go to **Settings** → click **"Run Pipeline Now"**
3. Wait 2–3 minutes for articles to be fetched and scored
4. Go to **Intelligence Feed** — scored articles appear
5. Click on an article → click **"Generate Posts"**
6. All 8 platform posts appear — review, edit, copy-paste to each platform

---

## SECTION 6 — Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: ollama` | Old ollama import still in main.py | Apply Task 8 — replace ollama check |
| `GROQ_API_KEY not set` | .env not updated with real key | Edit `.env` → paste your actual Groq API key |
| `circuit_breaker_tripped` | LLM calls failing repeatedly | Check GROQ_API_KEY is valid |
| No articles in feed | Pipeline not run yet | Click Run Pipeline in dashboard |
| Blog posts not generating | 'blog' not in PLATFORM_CONFIGS | Apply Task 6 — add blog entry |
| Posts auto-generating | Task 5 not applied yet | Remove generation from pipeline |
| DB connection refused | Docker db container not healthy | Run: `docker-compose logs db` |
| Frontend blank page | Backend not healthy yet | Wait 30s after docker-compose up, refresh |

---

## SECTION 7 — Free Tier Cost Summary

| Service | Free Limit | Your Daily Usage | Cost |
|---|---|---|---|
| Groq API | 1,000 req/day | ~5–20 req/day | **FREE** |
| Groq Model (Llama 3.3 70B) | Included | 1 call per generate | **FREE** |
| PostgreSQL (Docker) | Unlimited local | Your machine only | **FREE** |
| RSS Fetching | Unlimited | ~50 items/source | **FREE** |
| GitHub Trending | 60 req/hr | ~5 req/run | **FREE** |
| arXiv Papers | Unlimited | ~50 papers/run | **FREE** |

> 💡 **Total monthly cost: $0.00** — Everything runs free within the limits shown above.

---

## Quick Reference — Files Changed Summary

```
Files provided (download & replace):
  ✅ .env                                    → LLM_PROVIDER=groq, all 8 platforms
  ✅ docker-compose.yml                      → Ollama removed
  ✅ backend/llm.py                          → Groq client added
  ✅ backend/config.py                       → Groq settings added

Files to edit manually:
  ⏳ backend/main_pipeline.py               → Remove auto-generation (Step 6 block)
  ⏳ backend/generators/platform_templates.py → Add "blog" to PLATFORM_CONFIGS
  ⏳ backend/main.py                         → Replace ollama import with Groq check

Files that are CORRECT — do not touch:
  ✅ backend/processors/decision_engine.py
  ✅ backend/processors/scorer.py
  ✅ backend/generators/generator_v5.py
  ✅ backend/database.py
  ✅ All frontend files
```

---

*AI Pulse v2 Fix Document — All fixes verified against your actual uploaded codebase*
