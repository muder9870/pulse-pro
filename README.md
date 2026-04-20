# AI Pulse Pro

AI Pulse Pro is a self-hosted AI content automation platform. It fetches AI/ML articles from multiple sources, analyzes them with a local or cloud LLM, generates platform-ready social posts, and publishes long-form blog content — all from a single React dashboard running in Docker.

---

## What it does

1. **Fetches** AI/ML content from arXiv, GitHub trending, RSS feeds (35+ defaults), Gmail newsletters, and Reddit
2. **Analyzes** each article with an LLM — summary, viral hook, key innovation, sentiment, and scores (viral / tech / relevance)
3. **Prioritizes** articles using a decision engine (HIGH / MEDIUM / LOW)
4. **Scores** articles with keyword-based relevance boost (configurable keyword list in Settings → Keywords)
5. **User-triggered**: Browse the scored feed, select an article, choose platforms, click Generate — content is created only on demand
6. **Publishes** long-form blog posts to Medium, Dev.to, and WordPress
7. **Tracks** engagement metrics and platform ROI
8. **Deep-dives** into arXiv papers — downloads PDFs, extracts methodology, results, limitations, and authors via LLM

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack React Query, Zustand |
| Backend | Flask 3, SQLAlchemy, Gunicorn |
| Database | PostgreSQL 15 |
| Cache / Queue | Redis 7, Celery |
| LLM | Groq (default), Ollama (local), OpenAI, Anthropic, Cerebras, OpenRouter |
| Deployment | Docker Compose (5 services) |

---

## Quick Start

### Requirements

- Docker and Docker Compose
- A free [Groq API key](https://console.groq.com) (recommended — no GPU needed, fast)
- Optional: Gmail app password, Reddit API credentials

### 1. Clone and configure

```bash
git clone https://github.com/yourusername/ai-pulse-pro.git
cd ai-pulse-pro
cp .env.example .env
```

Edit `.env` — at minimum set:

```bash
SECRET_KEY=your-random-secret-here
GROQ_API_KEY=your-groq-key-here
LLM_PROVIDER=groq
```

### 2. Start

```bash
docker compose up --build
```

### 3. Open the dashboard

```
http://localhost:3000
```

### 4. Run the pipeline

Click **Run Pipeline** in the dashboard header. The first run fetches and analyzes articles. Progress streams in real time via the pipeline status bar.

---

## LLM Provider Options

| Provider | Cost | Speed | Setup |
|----------|------|-------|-------|
| **Groq** (recommended) | Free tier | Very fast | Set `GROQ_API_KEY` |
| **Ollama** (local) | Free | Slow without GPU | Install Ollama, set `OLLAMA_MODEL` |
| **OpenAI** | Paid | Fast | Set `OPENAI_API_KEY` |
| **Anthropic** | Paid | Fast | Set `ANTHROPIC_API_KEY` |
| **Cerebras** | Free tier | Fast | Set `CEREBRAS_API_KEY` |
| **OpenRouter** | Pay-per-use | Varies | Set `OPENROUTER_API_KEY` |

Set `LLM_PROVIDER` in `.env` to one of: `groq`, `local`, `paid_api`, `free_api`

---

## Configuration

Key environment variables in `.env`:

```bash
# Core
SECRET_KEY=change-me                    # Required — use a random string
LLM_PROVIDER=groq                       # LLM backend
GROQ_API_KEY=                           # Groq free API key

# Pipeline throughput
INGEST_CAP_PER_SOURCE=50               # Max articles fetched per source per run
ANALYSIS_LIMIT=0                        # Max articles analyzed per run (0 = all)
CONTENT_PLATFORMS=twitter,linkedin,reddit,hackernews,medium

# Data sources (optional)
GMAIL_ADDRESS=
GMAIL_APP_PASSWORD=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=ai-pulse-pro/0.1

# Blog publishing (optional)
MEDIUM_API_KEY=
DEVTO_API_KEY=
WORDPRESS_SITE_URL=
WORDPRESS_USERNAME=
WORDPRESS_APP_PASSWORD=

# Notifications (optional)
NOTIFY_ON=failure                       # off | failure | success | always
NOTIFY_WEBHOOK_URL=                     # Slack/Discord webhook
```

---

## Dashboard Views

| View | What it shows |
|------|--------------|
| **Dashboard** | Intelligence Feed — all analyzed articles with scores, generated content, and bulk actions |
| **Analytics** | Platform ROI, engagement metrics, content performance charts |
| **Calendar** | Scheduled posts timeline |
| **Research** | Deep paper analysis for arXiv articles (methodology, results, limitations, authors) |
| **Media** | Generated images and audio assets |
| **Podcast** | Audio content management |
| **Settings Hub** | 8-tab configuration center (see below) |

---

## Settings Hub

| Tab | What it does |
|-----|-------------|
| **Monetization** | Manage affiliate keyword → URL mappings injected into generated content |
| **System Health** | Live pipeline service status, LLM circuit breaker, feature flags, article queue |
| **Webhooks** | Configure outbound webhooks to Zapier, Slack, or custom endpoints |
| **Source Manager** | Add/remove/toggle RSS feeds, import OPML, add 35+ default AI/ML feeds |
| **Style Profile** | View AI-learned writing style preferences (tone, length, emoji usage) |
| **Browser Widget** | Instructions for installing the Chrome extension for one-click article capture |
| **Interface** | Theme selection (Light, Dark, Azure Light, Azure Dark, System) |
| **Keywords** | Manage the keyword list used to boost article relevance scores |
| **Advanced** | Pipeline control, scheduler toggle, performance metrics, cache stats, RSS health check, content export |

---

## Research Deep Dive

The Research tab provides deep analysis of arXiv papers:

1. Click **Deep Dive** on any arXiv paper
2. The system downloads the PDF, extracts text, and sends it to the LLM
3. Results show: Technical Methodology, Experimental Results, Critical Limitations, Authors, Affiliations
4. Use **Regenerate** to clear the cached result and get a fresh LLM analysis
5. Use **Copy** to copy the full analysis as Markdown to clipboard
6. Use **Download** to save as a `.md` file

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Fetch articles (`limit`, `page`, `sort`, `source`) |
| POST | `/api/pipeline/run` | Start the full pipeline |
| GET | `/api/pipeline/status` | Current pipeline state |
| GET | `/api/pipeline/stream` | Real-time pipeline progress (SSE) |
| POST | `/api/generate` | Generate content for an article |
| GET | `/api/keywords` | List all relevance keywords |
| POST | `/api/keywords` | Add a keyword |
| DELETE | `/api/keywords/<id>` | Delete a keyword |
| POST | `/api/keywords/bulk` | Bulk add keywords (skips duplicates) |
| GET | `/api/export` | Export content as CSV or JSON |
| POST | `/api/export/batch` | Batch export selected articles as Markdown |
| GET | `/api/research/analysis/:id` | Get deep-dive analysis for an article |
| POST | `/api/research/deep-dive` | Trigger deep paper analysis |
| DELETE | `/api/research/analysis/:id` | Clear cached analysis (force regenerate) |
| GET | `/api/rss/feeds` | List RSS feeds |
| POST | `/api/rss/feeds` | Add RSS feed |
| DELETE | `/api/rss/feeds/:id` | Delete RSS feed |
| PATCH | `/api/rss/feeds/:id` | Toggle feed active/inactive |
| POST | `/api/rss/add-defaults` | Add 35+ default AI/ML feeds |
| POST | `/api/rss/import-opml` | Import feeds from OPML file |
| GET | `/api/integrations/webhooks` | List webhooks |
| POST | `/api/integrations/webhooks` | Add webhook |
| DELETE | `/api/integrations/webhooks/:id` | Delete webhook |
| POST | `/api/integrations/webhooks/:id/toggle` | Enable/disable webhook |
| POST | `/api/integrations/test` | Test all enabled webhooks |
| GET | `/api/monetization/links` | List affiliate links |
| POST | `/api/monetization/links` | Add affiliate link |
| DELETE | `/api/monetization/links/:id` | Delete affiliate link |
| GET | `/api/system/health` | Comprehensive system health |
| GET | `/api/performance/metrics` | Real-time performance metrics |
| GET | `/api/stats/dashboard` | Dashboard statistics |
| GET | `/api/personalization/style` | AI-learned style preferences |
| POST | `/api/personalization/feedback` | Submit thumbs up/down feedback |
| GET | `/api/schedule` | Get schedule configuration |
| POST | `/api/schedule` | Update schedule configuration |
| GET | `/api/health` | Simple health check |

---

## Security Setup

### HTTP Basic Auth (nginx)

Auth is configured in `frontend/nginx.conf` but requires a real `.htpasswd` file.

```bash
htpasswd -c frontend/.htpasswd admin
docker compose build --no-cache frontend
docker compose up -d frontend
```

To disable auth (local dev): comment out the two `auth_basic` lines in `frontend/nginx.conf`.

### SECRET_KEY

The app refuses to start if `SECRET_KEY` is the default `"change-me"`. Generate a real key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Rate Limits (active)

| Endpoint | Limit |
|----------|-------|
| `POST /api/pipeline/run` | 2 per minute |
| `POST /api/generate` | 10 per minute |
| `GET /api/stories` | 60 per minute |
| All other endpoints | 200 per minute |

---

## Development

### Local backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m backend.main
```

### Local frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Run tests

```bash
# Backend
pytest backend/tests/ -v

# Frontend
cd frontend && npx vitest run
```

### Rebuild Docker

```bash
docker compose build frontend backend
docker compose up -d --no-deps --force-recreate frontend backend
```

---

## Project Structure

```
ai-pulse-pro/
├── backend/
│   ├── agents/          # Orchestrator, Ingestion, Analysis, Creative agents
│   ├── api/routes/      # Flask blueprints (stories, pipeline, content, rss, etc.)
│   ├── db/
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── session.py   # Connection pooling, circuit breaker
│   │   └── repositories/
│   ├── fetchers/        # arXiv, GitHub, Gmail, RSS, Reddit fetchers
│   ├── generators/      # Content, blog, image, video, podcast generators
│   ├── processors/      # Cleaner, deduplicator, analyzer, scorer, scheduler
│   ├── llm/             # LLM router and provider clients
│   ├── tests/           # Backend test suite (pytest)
│   ├── config.py        # Settings from environment variables
│   └── main.py          # Flask app factory
├── frontend/
│   ├── src/
│   │   ├── components/  # React components + ui/ design system
│   │   ├── hooks/       # Custom React hooks
│   │   ├── store/       # Zustand global state (appStore)
│   │   ├── theme/       # ThemeProvider, tokens, ThemeExample
│   │   └── App.jsx      # Main app shell
│   └── vite.config.js
├── .kiro/specs/         # Feature and bugfix specs (requirements, design, tasks)
├── docs/                # Architecture, runbook, audit docs
├── docker-compose.yml
├── Dockerfile           # Backend image
└── .env.example
```

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.5 | April 2026 | Pipeline/content decoupling: pipeline stops after scoring, content generation is user-triggered; keyword-based relevance scoring; Keywords tab in Settings |
| 2.4 | April 2026 | Settings Hub stable: all 8 tabs wired, Advanced tools rewrite, real performance metrics |
| 2.3 | April 2026 | Theme system unification (Azure themes), Research Deep Dive sync fix, Regenerate/Copy/Download actions |
| 2.2 | April 2026 | Phase 3–5 refactor: React Router, Zustand, code splitting, rate limiting, CSP, Basic Auth |
| 2.1 | April 2026 | Fixed React error #130, stale SW, API base URL, pipeline lock |
| 2.0 | February 2026 | RSS management, hashtag intelligence, blog auto-publisher, APScheduler |
| 1.0 | Initial | Core pipeline, multi-source ingestion, React dashboard |

---

## License

MIT — see [LICENSE](LICENSE) for details.
