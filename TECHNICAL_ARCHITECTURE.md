# AI Pulse Pro — Technical Architecture

**Version:** 2.4
**Last Updated:** April 2026

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       AI PULSE PRO                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   COLLECT    │──▶│   PROCESS    │──▶│   GENERATE   │    │
│  │  6+ sources  │   │  LLM analyze │   │  15+ platforms│   │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                  │                   │            │
│         └──────────────────┴───────────────────┘           │
│                            │                               │
│                            ▼                               │
│              ┌─────────────────────────┐                   │
│              │   PostgreSQL 15          │                   │
│              │   Redis 7 (cache/queue)  │                   │
│              └─────────────────────────┘                   │
│                            │                               │
│                            ▼                               │
│         ┌──────────────────────────────────────┐           │
│         │   React 18 Dashboard (port 3000)      │           │
│         │   Nginx + Vite build                  │           │
│         └──────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Zustand | Latest |
| Backend | Flask 3, SQLAlchemy, Gunicorn (gthread, 10 threads) | 3.x |
| Database | PostgreSQL 15 | 15 |
| Cache / Queue | Redis 7, Celery | 7 |
| LLM Router | Groq (default), Ollama, OpenAI, Anthropic, Cerebras, OpenRouter | — |
| Deployment | Docker Compose (5 services) | — |
| Web Server | Nginx (stable-alpine) | — |

---

## Docker Services

```
pulsepro-frontend-1    nginx:stable-alpine   port 3000 → 80
pulsepro-backend-1     python:3.11-slim      port 5000
pulsepro-celery-1      python:3.11-slim      (no port, worker)
pulsepro-db-1          postgres:15-alpine    port 5432 (internal)
pulsepro-redis-1       redis:7-alpine        port 6379
```

---

## Data Flow

```
[arXiv]  [GitHub]  [RSS]  [Gmail]  [Reddit]  [Direct URL]
    │         │       │       │        │           │
    └─────────┴───────┴───────┴────────┴───────────┘
                              │
                              ▼
                    [Fetcher Layer]
                    backend/fetchers/
                              │
                              ▼
                    [Cleaner + Deduplicator]
                    backend/processors/
                              │
                              ▼
                    [PostgreSQL: raw_articles]
                              │
                              ▼
                    [LLM Router → Provider]
                    backend/llm/llm_router.py
                    (Groq / Ollama / OpenAI / etc.)
                              │
                              ▼
                    [Analyzer + Scorer]
                    backend/processors/analyzer.py
                              │
                              ▼
                    [PostgreSQL: processed_articles]
                              │
                              ▼
                    [Content Generator]
                    backend/generators/generator_v5.py
                              │
                              ▼
                    [PostgreSQL: generated_content]
                              │
                              ▼
                    [React Dashboard]
                    frontend/src/App.jsx
```

---

## LLM Router

The `SmartLLMRouter` in `backend/llm/llm_router.py` manages all LLM calls:

- **Circuit breaker** — trips at configurable failure rate threshold, auto-recovers after cooldown
- **Provider fallback** — tries providers in priority order (Groq → Cerebras → OpenRouter → Ollama)
- **Task-aware routing** — different tasks (SUMMARIZE, GENERATE, DEEP_ANALYSIS) can use different providers
- **Redis caching** — identical prompts are cached to avoid redundant API calls
- **Cost tracking** — daily budget enforcement via `LLM_DAILY_BUDGET` env var

```
Task.SUMMARIZE      → fast provider (Groq default)
Task.GENERATE       → fast provider
Task.DEEP_ANALYSIS  → high-token provider (4096 tokens, 180s timeout)
Task.BLOG           → high-quality provider
```

---

## Database Schema (key tables)

| Table | Purpose |
|-------|---------|
| `raw_articles` | Ingested articles (state machine: pending → cleaning → deduped → decided) |
| `processed_articles` | LLM analysis results (summary, scores, hooks, innovation) |
| `generated_content` | Platform-specific posts (twitter, linkedin, etc.) |
| `paper_analysis` | Deep-dive research analysis (methodology, results, limitations, authors) |
| `rss_feeds` | RSS feed registry with active/inactive toggle |
| `rss_feed_items` | Individual RSS items (dedup by GUID) |
| `system_status` | Per-service health heartbeats (success/failure counts) |
| `health_history` | Historical health events |
| `webhooks` | Outbound webhook configurations |
| `affiliate_links` | Keyword → URL monetization mappings |
| `user_feedback` | Thumbs up/down + edit history for personalization |
| `user_styles` | AI-learned writing style preferences |
| `scheduled_posts` | Post scheduling queue |
| `blog_posts` | Long-form blog content |
| `article_images` | Generated image assets |
| `article_audio` | Generated audio/podcast assets |

---

## Frontend Architecture

```
frontend/src/
├── App.jsx                  # Main shell, routing, bulk operations
├── store/
│   └── appStore.js          # Zustand global state (activeTheme, filters, bulk ops)
├── theme/
│   ├── ThemeProvider.jsx    # Single source of truth for theme (syncs Zustand)
│   ├── ThemeSelector.jsx    # Theme picker UI
│   └── tokens.js            # Design tokens (colors, spacing)
├── components/
│   ├── ui/                  # Design system (Button, Card, Badge, Input, etc.)
│   ├── Sidebar.jsx          # Navigation
│   ├── DashboardView.jsx    # Main feed
│   ├── StoryCard.jsx        # Article card with bulk selection
│   ├── FilterBar.jsx        # Dashboard filters
│   ├── PaperDetailsModal.jsx # Research deep-dive modal
│   ├── SystemHealth.jsx     # System Health tab
│   ├── AdvancedTools.jsx    # Advanced tab (pipeline, metrics, export)
│   ├── RSSManager.jsx       # RSS Source Manager tab
│   ├── WebhookManager.jsx   # Webhooks tab
│   ├── MonetizationManager.jsx # Monetization tab
│   ├── StyleProfile.jsx     # Style Profile tab
│   └── SettingsView.jsx     # Settings Hub shell (8 tabs)
├── hooks/
│   ├── useStories.js        # TanStack Query for stories
│   ├── usePipeline.js       # Pipeline status polling
│   └── useBulkSelection.js  # Bulk selection state
└── views/
    ├── DashboardView.jsx
    ├── AnalyticsView.jsx
    ├── ResearchView.jsx
    └── ...
```

### Theme System

The theme system uses a single source of truth pattern:

1. `ThemeProvider.jsx` manages theme state and applies CSS classes to `<html>`
2. On every theme change, `ThemeProvider` calls `setActiveTheme(resolvedMode)` in Zustand
3. All components read `activeTheme` from Zustand for conditional styling
4. `appStore.js` initializes `activeTheme` from the `theme` localStorage key

Supported themes: `light`, `dark`, `electric-azure-light`, `electric-azure-dark`, `system`

---

## API Surface

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Articles with pagination, sort, source filter |
| POST | `/api/pipeline/run` | Start pipeline (background thread) |
| GET | `/api/pipeline/status` | Pipeline state |
| GET | `/api/pipeline/stream` | SSE real-time progress |
| POST | `/api/generate` | Generate content for article |
| GET | `/api/export` | Export as CSV or JSON |
| POST | `/api/export/batch` | Batch export as Markdown |

### Research

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/research/analysis/:id` | Get deep-dive (200 ready, 202 pending) |
| POST | `/api/research/deep-dive` | Trigger PDF analysis |
| DELETE | `/api/research/analysis/:id` | Clear cached analysis |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/rss/feeds` | List / add RSS feeds |
| DELETE | `/api/rss/feeds/:id` | Delete feed |
| PATCH | `/api/rss/feeds/:id` | Toggle active |
| POST | `/api/rss/add-defaults` | Add 35+ default feeds |
| POST | `/api/rss/import-opml` | Import OPML |
| GET/POST | `/api/integrations/webhooks` | List / add webhooks |
| DELETE | `/api/integrations/webhooks/:id` | Delete webhook |
| POST | `/api/integrations/webhooks/:id/toggle` | Enable/disable |
| POST | `/api/integrations/test` | Test all webhooks |
| GET/POST | `/api/monetization/links` | List / add affiliate links |
| DELETE | `/api/monetization/links/:id` | Delete link |
| GET | `/api/personalization/style` | AI-learned style prefs |
| POST | `/api/personalization/feedback` | Submit feedback |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/health` | Full health (services, circuit breaker, flags, vitals) |
| GET | `/api/performance/metrics` | DB throughput, LLM stats, Redis stats |
| GET | `/api/performance/cache-stats` | Redis cache hit rate, memory |
| GET | `/api/metrics/realtime` | In-memory pipeline counters |
| GET | `/api/stats/dashboard` | Dashboard statistics |
| GET | `/api/schedule` | Scheduler config |
| POST | `/api/scheduler/enable` | Enable scheduler |
| POST | `/api/scheduler/disable` | Disable scheduler |
| GET | `/api/health` | Simple health check |

---

## Personalization Engine

The app learns from user behavior to improve content generation:

1. **Feedback collection** — `POST /api/personalization/feedback` captures thumbs up/down, edits, and posts
2. **Style analysis** — `personalization_engine.analyze_user_style()` runs after each feedback event
3. **Style storage** — learned preferences stored in `user_styles` table
4. **Few-shot injection** — best past edits injected into LLM prompts as examples

Style dimensions learned: tone, length, emoji_frequency, hashtag_style, hook_style

---

## Research Deep Dive Pipeline

```
User clicks "Deep Dive"
        │
        ▼
GET /api/research/analysis/:id
        │
   200 → show cached result
   202 → trigger deep dive
        │
        ▼
POST /api/research/deep-dive
        │
        ▼
ResearchAnalyzer.perform_deep_analysis()
        │
        ├── download_pdf(url)          # arXiv URL rewrite: abs/ → pdf/
        ├── extract_first_page_text()  # Author extraction
        ├── parse_authors_from_text()  # Regex-based author parsing
        ├── extract_text([:15 pages])  # PyMuPDF, max 12k chars to LLM
        ├── LLM(DEEP_ANALYSIS_PROMPT)  # 4096 tokens, 180s timeout
        ├── _parse_json()              # Robust JSON extraction + repair
        ├── _merge_deep_fields()       # Fallback for empty LLM fields
        └── save_paper_analysis()      # Store in paper_analysis table
```

---

## Security

| Control | Implementation |
|---------|---------------|
| HTTP Basic Auth | nginx `.htpasswd` (must generate before production) |
| Rate limiting | Flask-Limiter backed by Redis |
| CSP | Flask-Talisman strict policy |
| Secret key | Refuses to start with default `"change-me"` |
| DB credentials | Environment variables only, never hardcoded |
| CORS | Restricted to same-origin |

---

**Last Updated:** April 2026
