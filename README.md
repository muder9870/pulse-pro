# AI Pulse Pro

AI Pulse Pro is a self-hosted AI content automation platform. It fetches AI/ML articles from multiple sources, analyzes them with a local or cloud LLM, generates platform-ready social posts, and publishes long-form blog content — all from a single React dashboard.

**Current status: Running in Docker. Core pipeline functional. See [docs/AUDIT_AND_SUGGESTIONS.md](docs/AUDIT_AND_SUGGESTIONS.md) for known issues and improvement roadmap.**

---

## What it does

1. **Fetches** AI/ML content from arXiv, GitHub trending, RSS feeds (26+ defaults), Gmail newsletters, and Reddit
2. **Analyzes** each article with an LLM — summary, viral hook, key innovation, sentiment, and scores (viral / tech / relevance)
3. **Prioritizes** articles using a decision engine (HIGH / MEDIUM / LOW)
4. **Generates** platform-specific posts for Twitter/X, LinkedIn, Reddit, HackerNews, Medium, Dev.to, Facebook, Instagram, TikTok, Threads, YouTube, Telegram, Discord, and more
5. **Schedules** posts for publishing via APScheduler
6. **Publishes** long-form blog posts to Medium, Dev.to, and WordPress
7. **Tracks** engagement metrics and platform ROI

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TanStack React Query |
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
ANALYSIS_LIMIT=10                       # Max articles analyzed per run
CONTENT_TOP_LIMIT=5                     # Max articles to generate content for
GENERATION_TOP_N=5                      # Override for content generation limit
CONTENT_PLATFORMS=twitter,linkedin,reddit,hackernews,medium

# Data sources (optional — app works without these)
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

## Data Sources

### arXiv
Fetches from cs.AI, cs.LG, cs.CV, cs.CL categories automatically. No credentials needed.

### RSS Feeds
26+ AI/ML feeds included by default (Towards Data Science, The Batch, MIT Tech Review, etc.). Manage feeds in Settings → RSS Manager.

### Gmail
1. Enable 2-Step Verification on your Google account
2. Create an App Password at myaccount.google.com → Security → App Passwords
3. Set `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` in `.env`

### Reddit
1. Create a script app at reddit.com/prefs/apps
2. Set `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` in `.env`

### GitHub
Fetches trending repositories automatically. No credentials needed.

---

## Dashboard Views

| View | What it shows |
|------|--------------|
| **Dashboard** | Intelligence Feed — all analyzed articles with scores, generated content, and bulk actions |
| **Analytics** | Platform ROI, engagement metrics, content performance charts |
| **Calendar** | Scheduled posts timeline |
| **Research** | Deep paper analysis for arXiv articles |
| **Media** | Generated images and audio assets |
| **Podcast** | Audio content management |
| **Settings** | Pipeline config, RSS feeds, integrations, webhooks, theme |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | Fetch articles (supports `limit`, `page`, `sort`, `source`) |
| GET | `/api/stories/sources` | Unique sources with article counts |
| POST | `/api/pipeline/run` | Start the full pipeline |
| GET | `/api/pipeline/stream` | Real-time pipeline progress (SSE) |
| GET | `/api/pipeline/status` | Current pipeline state |
| POST | `/api/generate` | Generate content for an article |
| POST | `/api/tags/:id` | Update article tags |
| GET | `/api/analytics/dashboard` | Platform analytics |
| GET | `/api/hashtags` | Trending hashtags |
| POST | `/api/schedule/queue` | Queue a post for publishing |
| GET | `/api/schedule` | Get/set schedule configuration |
| GET | `/api/export` | Export articles as Markdown |
| POST | `/api/export/batch` | Batch export selected articles |
| GET | `/api/health` | Backend health check |

---

## Development

### Local backend (without Docker)

```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
python -m backend.main
```

### Local frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
# API proxied to http://localhost:5000 via vite.config.js
```

### Run tests

```bash
# Backend
python -m unittest discover -s tests -p "test_*.py" -v

# Frontend
cd frontend && npx vitest run
```

### Rebuild Docker (no cache)

```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

---

## Security Setup

Phase 5 of the refactor added security hardening. Here's what's in place and what needs real values before going public.

### HTTP Basic Auth (nginx)

Auth is configured in `frontend/nginx.conf` but requires a real `.htpasswd` file to work.

**Current state:** `frontend/.htpasswd` is a placeholder comment file — nginx will reject all requests when auth is enabled with an invalid file. The app currently has auth enabled in `nginx.conf` but no valid credentials.

**To set up real auth:**

```bash
# Install apache2-utils if needed (Linux/Mac)
# On Windows use Git Bash or WSL

# Generate .htpasswd with a username and password
htpasswd -c frontend/.htpasswd admin
# Enter password when prompted

# Rebuild the frontend Docker image
docker compose build --no-cache frontend
docker compose up -d frontend
```

The `.htpasswd` file is in `.gitignore` — never commit real credentials.

**To disable auth** (local dev only): comment out the two `auth_basic` lines in `frontend/nginx.conf`:

```nginx
# auth_basic "AI Pulse Pro";
# auth_basic_user_file /etc/nginx/.htpasswd;
```

### SECRET_KEY

The app refuses to start if `SECRET_KEY` is the default value `"change-me"`. Generate a real key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Add the output to `.env`:

```bash
SECRET_KEY=<paste-generated-key-here>
```

### Database & Redis Credentials

The defaults in `.env.example` are placeholders. Set real passwords before exposing the app:

```bash
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
```

### Rate Limits (already active)

The following limits are enforced by Flask-Limiter (backed by Redis):

| Endpoint | Limit |
|----------|-------|
| `POST /api/pipeline/run` | 2 per minute |
| `POST /api/generate` | 10 per minute |
| `GET /api/stories` | 60 per minute |
| All other endpoints | 200 per minute |

### Content Security Policy (already active)

Flask-Talisman sets a strict CSP with no `'unsafe-inline'`. If you add inline scripts or styles, you'll need to update the CSP in `backend/main.py`.

---

## Known Issues & Limitations

See [docs/AUDIT_AND_SUGGESTIONS.md](docs/AUDIT_AND_SUGGESTIONS.md) for the full audit. Key remaining items:

- **Auth uses a placeholder** — `frontend/.htpasswd` is a comment file. nginx will block all requests until you generate a real `.htpasswd` (see Security Setup above).
- **`/api/schedule/queue` and `/api/export/batch` not implemented** — the frontend calls these endpoints but they don't exist in the backend yet. Bulk schedule and batch export will return 404.
- **AnalyticsView bundle is 388KB** — recharts is large. Consider dynamic imports within the analytics component if load time is a concern.

---

## Project Structure

```
ai-pulse-pro/
├── backend/
│   ├── agents/          # Orchestrator, Ingestion, Analysis, Creative agents
│   ├── api/routes/      # Flask blueprints (stories, pipeline, content, etc.)
│   ├── db/
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── session.py   # Connection pooling, circuit breaker
│   │   └── repositories/
│   ├── fetchers/        # arXiv, GitHub, Gmail, RSS, Reddit fetchers
│   ├── generators/      # Content, blog, image, video, podcast generators
│   ├── processors/      # Cleaner, deduplicator, analyzer, scorer, scheduler
│   ├── llm/             # LLM router and provider clients
│   ├── config.py        # Settings from environment variables
│   └── main.py          # Flask app factory
├── frontend/
│   ├── src/
│   │   ├── components/  # React components + ui/ design system
│   │   ├── hooks/       # Custom React hooks
│   │   ├── api/         # API client
│   │   └── App.jsx      # Main app shell
│   ├── public/          # Static assets, pass-through service workers
│   └── vite.config.js
├── tests/               # Backend test suite
├── docs/                # Documentation and audit files
├── docker-compose.yml
├── Dockerfile           # Backend image
└── .env.example
```

---

## Frontend Development

The frontend is a React 18 + Vite application located in the `frontend/` directory.

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | Production build with optimizations |
| `lint` | `npm run lint` | ESLint check with `--max-warnings 0` |
| `lint:fix` | `npm run lint:fix` | Auto-fix ESLint issues |
| `type-check` | `npm run type-check` | TypeScript check without emit |
| `test` | `npm run test` | Run Vitest tests |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage report |
| `test:ui` | `npm run test:ui` | Run tests with Vitest UI |
| `test:docker` | `npm run test:docker` | Run tests in Docker environment |
| `preview` | `npm run preview` | Preview production build locally |

### Development Workflow

```bash
cd frontend
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 2.2 | April 2026 | Phase 3–5 refactor: React Router, Zustand, code splitting, rate limiting, CSP, Basic Auth, Pydantic validation |
| 2.1 | April 2026 | Fixed React error #130, stale SW, API base URL, Card.Content undefined, pipeline lock |
| 2.0 | February 2026 | RSS management, hashtag intelligence, blog auto-publisher, APScheduler |
| 1.0 | Initial | Core pipeline, multi-source ingestion, React dashboard |

---

## License

MIT — see [LICENSE](LICENSE) for details.
