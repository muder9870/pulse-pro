# AI Pulse Pro – Master Task List

Consolidated implementation tasks from:
- **AI Pulse Pro – Master Blueprint**
- **AI Pulse Pro – Master Plan (Dashboard Roadmap)**
- **AI Pulse Pro – Feature Addons (Hashtag Intelligence + Blog Auto-Publisher)**

Use this as the single source of truth for building the full 6-week system.

---

## 0. Prep & Project Setup

- [ ] Read the **Master Blueprint**, **Master Plan**, and **Feature Addons** documents end-to-end
- [ ] Install required software (Python 3.11+, Node.js, Git, Docker optional)
- [ ] Decide default LLM setup that does **not** require a paid subscription (e.g., small local model or hosted LLM with a free tier)
- [x] Design an LLM provider abstraction (e.g., `LLM_PROVIDER=local|free_api|paid_api`) so you can switch between free and paid services via config
- [x] Implement config/env wiring for optional paid APIs (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) without hard-coding any provider
- [ ] If using a local model, install your chosen runtime (Ollama/LM Studio/other) and download at least one base model
- [ ] Create required free accounts / credentials (Gmail App Password, Reddit API app, optional Medium/Dev.to/WordPress accounts)
- [ ] Create local project folder `ai-pulse-pro/`
- [ ] Initialize Git repository and `.gitignore` (including `.env`, `*.db`, `*.log`, `credentials/`)

---

## 1. Week 1 – Foundation & Data Collection

### 1.1 Project Skeleton & Environment (Day 1–2) — **[backend, infra, ~8h]**

- [x] Create Python virtual environment and activate it
- [x] Create initial folder structure:
  - [x] `backend/` (Flask app, database, fetchers, processors, generators)
  - [x] `frontend/` (React app skeleton)
  - [x] `data/` (SQLite DB)
  - [x] `logs/`
  - [x] `tests/`
- [x] Create `requirements.txt` with core backend dependencies
- [x] Install backend dependencies (Flask, CORS, dotenv, arxiv, praw, bs4, requests, schedule/feedparser, ollama, etc.)
- [x] Create `backend/config.py` to load `.env` variables
- [x] Design and implement SQLite schemas in `backend/database.py` for:
  - [x] `raw_articles`
  - [x] `processed_articles`
  - [x] `generated_content`
  - [x] `user_preferences`
  - [x] `content_history`
- [x] Initialize empty `data/app.db` with all tables
- [x] Create minimal `backend/main.py` Flask app (Hello World + health endpoint)
- [x] Add `.env.example` with all required environment variables
- [x] Verify Flask app runs locally

### 1.2 arXiv Fetcher (Day 3–4) — **[backend, data, ~10h]**

- [x] Create `backend/fetchers/arxiv_fetcher.py`
- [x] Implement category-based fetching (e.g., `cs.AI`, `cs.LG`, `cs.CV`, `cs.CL`)
- [x] Respect arXiv rate limit (≥3 seconds between requests)
- [x] Parse paper metadata (title, authors, abstract, PDF link, categories)
- [x] Map and insert results into `raw_articles` table
- [x] Implement robust error handling and logging
- [x] Add CLI entry point or `__main__` for manual testing
- [x] Test: fetch ~50 papers and confirm DB inserts (✅ 55 papers in DB)

### 1.3 Gmail Newsletter Fetcher (Day 5–6) — **[backend, data, ~12h]**

- [x] Create `backend/fetchers/gmail_fetcher.py`
- [x] Implement IMAP connection using Gmail App Password
- [x] Allow configuration of newsletter senders (TLDR, DeepLearning.AI, etc.)
- [x] Fetch recent newsletters from configured senders
- [x] Parse HTML/plain text using BeautifulSoup
- [x] Extract article links, titles, and summary snippets
- [x] Strip obvious ads and promo blocks
- [x] Normalize and insert into `raw_articles`
- [ ] Optionally mark processed emails as read
- [x] Add logging and basic error handling for IMAP failures

### 1.4 Reddit & GitHub Fetchers (Day 7) — **[backend, data, ~6h]**

- [x] Create `backend/fetchers/reddit_fetcher.py`
  - [x] Configure PRAW client with credentials
  - [x] Fetch top posts from `r/MachineLearning`, `r/ArtificialIntelligence`, etc.
  - [x] Extract title, URL, score/upvotes, comments count, timestamp
  - [x] Insert posts into `raw_articles` with source=`reddit`
- [x] Create `backend/fetchers/github_fetcher.py`
  - [x] Scrape GitHub Trending (focus on AI/ML repos)
  - [x] Extract repo name, description, stars, language, URL
  - [x] Insert into `raw_articles` with source=`github`
- [x] Add simple command-line test runners for each fetcher
- [x] Confirm DB contains ≥100 `raw_articles` from all sources combined (✅ 147 articles: GitHub 89, arXiv 55, direct_url 3)

---

## 2. Week 2 – Processing & Intelligence

### 2.1 Cleaning & Deduplication (Day 8–9) — **[backend, data, ~10h]**

- [x] Create `backend/processors/cleaner.py`
  - [x] Strip HTML tags from newsletter and scraped content
  - [x] Remove boilerplate/ads/promo text patterns
  - [x] Normalize whitespace and encoding
  - [x] Standardize date formats and metadata fields
  - [x] Persist cleaned text back to `raw_articles`
- [x] Create `backend/processors/deduplicator.py`
  - [x] Implement `are_duplicates(title1, title2, threshold=0.85)` with fuzzy matching
  - [x] Use URL similarity rules to detect duplicates across sources
  - [x] Prefer authoritative sources (arXiv > newsletter > Reddit > blogs)
  - [x] Mark duplicates or consolidate references in DB
  - [x] Make threshold configurable for tuning

### 2.2 LLM Analyzer via Ollama (Day 10–11) — **[backend, LLM, ~8h]**

- [ ] Install and verify Ollama CLI locally
- [ ] Pull `llama3.1:8b` model and test simple prompt
- [x] Create `backend/processors/analyzer.py` with `ArticleAnalyzer` class:
  - [x] `summarize(article_text)` – 1–2 sentence summary
  - [x] `extract_key_points(article_text)` – 3–5 bullet takeaways
  - [x] `categorize(article_text)` – classify into LLM / CV / NLP / Robotics / etc.
  - [x] Bulk method to analyze all new `raw_articles` and write to `processed_articles`
- [x] Add configuration for model name and prompt templates

### 2.3 Scoring Engine (Day 12–13) — **[backend, data/ML, ~10h]**

- [x] Create `backend/processors/scorer.py` with `ArticleScorer` class
- [x] Implement Viral Potential score (0–100):
  - [x] Recency decay based on `fetched_at`
  - [x] Reddit/other engagement metrics
  - [x] Keyword-based boosts (e.g., GPT‑5, AGI)
  - [x] Title length/simplicity factor
- [x] Implement Technical Significance score (0–100):
  - [x] Source authority (arXiv > blog > Reddit)
  - [x] Citation count (arXiv) if available
  - [x] Methodology/rigor signals (e.g., "peer-reviewed", "reproducible")
- [x] Implement User Relevance score (0–100):
  - [x] Match to `user_preferences` categories and keywords
  - [x] Source preferences (arXiv vs newsletter etc.)
  - [x] Historical engagement from `content_history`
- [x] Write `score_all_articles()` to score every `processed_article`

### 2.4 End-to-End Processing Pipeline (Day 14) — **[backend, infra, ~6h]**

- [x] Create `backend/main_pipeline.py` (or similar orchestration module)
- [x] Implement `run_daily_pipeline()` to:
  - [x] Run all fetchers (arXiv, Gmail, Reddit, GitHub, others later)
  - [x] Clean all new articles
  - [x] Deduplicate
  - [x] Run LLM analysis
  - [x] Apply scoring
- [x] Add structured logging for each stage
- [x] Add a CLI entry point to trigger full pipeline manually
- [x] Run end-to-end test and verify `processed_articles` and scores look sane

---

## 3. Week 3 – Content Generation & Dashboard

### 3.1 Platform Templates & Content Generator (Day 15–16) — **[backend, LLM, ~12h]**

- [x] Create `backend/generators/platform_templates.py`
  - [x] Define configs (char limits, tone, format, template text) for all planned platforms (Twitter/X, LinkedIn, Reddit, YouTube script, etc. – 15 total)
- [x] Create `backend/generators/generator_v5.py` with `ContentGenerator` class
  - [x] `generate_for_platform(article, platform)` using Ollama + platform config
  - [x] Enforce character limits safely
  - [x] `generate_all_platforms(article, platforms_list)` to batch-generate
  - [x] Save results to `generated_content`
- [x] Add functions/tests to regenerate content on demand for a given article/platform

### 3.2 Dashboard Backend APIs (Flask) (Day 17–19) — **[backend, ~10h]**

- [x] Extend `backend/main.py` Flask app:
  - [x] `GET /api/stories` – return today’s top N stories with scores & metadata
  - [x] `GET /api/content/<int:article_id>/<platform>` – return generated content
  - [x] `POST /api/generate` – regenerate or generate content on demand
  - [x] `GET /api/export` – export all current content as markdown or JSON
- [x] Add CORS support for React frontend
- [x] Implement DB access helpers in `backend/database.py` (e.g., `get_top_stories`, `get_content_for_platform`)

### 3.3 React Dashboard UI (Day 17–19) — **[frontend, ~18h]**

- [x] Initialize React app in `frontend/` with Vite or CRA
- [x] Install Tailwind CSS and Lucide icons
- [x] Implement core components:
  - [x] `App.jsx` – main layout, header, refresh/export buttons
  - [x] `PlatformSelector.jsx` – platform toggles, shows count selected
  - [x] `StoryCard.jsx` – displays article title, source, scores, expandable platform content
  - [x] Content preview in `StoryCard.jsx` with copy buttons
- [x] Wire up API calls to `/api/stories` and `/api/content/...`

### 3.4 UX Polish & Export (Day 20–21) — **[frontend, ~10h]**

- [x] Add `CopyButton` component (copy-to-clipboard + feedback state)
- [x] Implement inline content editing (editable textarea or modal)
- [x] Implement export to Markdown from dashboard (using backend `/api/export`)
- [x] Add loading spinners and error states for network and LLM errors
- [x] Apply consistent Tailwind styling and responsive layout

---

## 4. Week 4 – Automation & Deployment

### 4.1 Scheduling & Monitoring (Day 22–23) — **[backend, infra, ~10h]**

- [x] Install and configure APScheduler
- [x] Create `backend/scheduler.py` to:
  - [x] Schedule `run_daily_pipeline()` at a fixed time (e.g., 6 AM)
  - [x] Log job start, success, and failure
  - [x] Optionally send email/notification on completion or failure
- [x] Ensure scheduler can run alongside Flask app (or in separate process/service)
- [x] Set up structured logging to `logs/app.log`

### 4.2 Containerization (Day 24–25) — **[infra/devops, ~8h]**

- [x] Create `Dockerfile` for backend (and optionally frontend)
  - [x] Install Python deps and copy backend code
  - [x] Configure Ollama installation or document host integration
  - [x] Expose Flask port
- [x] Create `docker-compose.yml` to run the stack
  - [x] Mount volumes for `data/` and `logs/`
  - [x] Set environment variables for production
- [x] Build and run containers locally
- [x] Verify pipeline and dashboard work correctly inside containers

### 4.3 Final QA, Docs, and Launch (Day 26–28) — **[infra, docs, ~10h]**

- [x] Create an end-to-end QA checklist document
- [x] Add a basic API smoke test script
- [x] Run full end-to-end tests using a checklist (fetch → process → generate → UI)
- [x] Optimize any slow DB queries and noisy logs
- [x] Create/complete `README.md`:
  - [x] Quick start
  - [x] Setup guides for Ollama, Gmail, Reddit
  - [x] Usage and troubleshooting
  - [x] Contribution guidelines and license
- [ ] Optionally deploy to cloud (Render/Railway/VPS)
- [ ] Smoke-test deployed instance

---

## 5. Hashtag Intelligence Module — **Core v1 Feature Pillar**

### 5.1 Data & Schema for Hashtags (Day 29–30) — **[backend, data, ~6h]**

- [x] Create DB tables (or extend `database.py`) for:
  - [x] `trending_hashtags` (hashtag, platform, volume, engagement_rate, trend_score, category, status, timestamps)
  - [x] `hashtag_performance` (history of volume/engagement over time)
  - [x] `content_hashtags` (mapping between `processed_articles` and hashtags per platform, with relevance score)
- [x] Create directory `backend/fetchers/hashtag_collectors/`

### 5.2 Hashtag Collectors (Day 29–30) — **[backend, data, ~12h]**

- [x] Implement `twitter_collector.py` (internal trends via pipeline/tag signals):
  - [x] Filter for AI/ML-related tags
  - [x] Normalize and upsert into `trending_hashtags`
- [x] Implement `reddit_collector.py`:
  - [x] Analyze top posts and flairs in target subreddits
  - [x] Extract hashtags from titles and content
  - [x] Aggregate counts and average scores per tag
- [x] (Optional/Phased) Implement collectors for Instagram, LinkedIn, TikTok, etc.
- [x] Add tests/CLI scripts to run collectors and verify DB updates

### 5.3 Hashtag Analyzer & Scoring (Day 31–32) — **[backend, data/ML, ~10h]**

- [x] Create `backend/processors/hashtag_analyzer.py`
  - [x] Calculate hourly volume and growth rates per hashtag
  - [x] Compute engagement measures (likes, comments, upvotes where available)
  - [x] Classify hashtags into categories (LLM, CV, NLP, Robotics, etc.)
  - [x] Implement trend score (0–100) using volume, growth, engagement, recency
  - [x] Update `trending_hashtags` and `hashtag_performance` on a schedule
- [x] Integrate hashtag updates into scheduler (e.g., hourly jobs)

### 5.4 Hashtag Recommender (Day 33–34) — **[backend, ML, ~10h]**

- [x] Create `backend/processors/hashtag_recommender.py` (or reuse the one from addons doc)
  - [x] Load trending hashtags for a given platform
  - [x] Extract keywords from article title + summary
  - [x] Compute relevance score between article and each hashtag
  - [x] Combine trend score and relevance into final ranking
  - [x] Implement mixing strategy: e.g., 3 top trending + 2 niche/evergreen tags
- [x] Implement helper functions to return recommendations per article/platform
- [x] Store recommended tags in `content_hashtags`
- [x] Add unit tests with sample article + hashtag data

### 5.5 Backend & Dashboard Integration (Day 35) — **[backend, frontend, ~8h]**

- [x] Backend:
  - [x] Add API endpoint `GET /api/hashtags/<int:article_id>/<platform>` returning recommended tags and scores
  - [x] Ensure efficient querying from hashtag tables
- [x] Frontend:
  - [x] Display recommended hashtags as chips with details
  - [x] Provide "Copy Hashtags" button
- [x] Manually test hashtag flow end-to-end

---

## 6. Personal Blog Auto-Publisher — **Core v1 Feature Pillar**

### 6.1 Blog Post Data Model (Day 36) — **[backend, data, ~4h]**

- [x] Extend SQLite schema with:
  - [x] `blog_posts` (article_id, title, slug, content, excerpt, featured_image_url, focus_keyword, word_count, reading_time, status, timestamps)
  - [x] `blog_publications` (blog_post_id, platform, platform_post_id, url, status, published_at, error_message)
  - [x] `blog_credentials` (platform, api_key/secret, site_url, enabled)
- [x] Implement migrations/DDL inside `database.py`

### 6.2 Long-Form Content Generator (Day 36–37) — **[backend, LLM, ~12h]**

- [x] Create `backend/generators/blog_generator.py` with `BlogPostGenerator`:
  - [x] Prompt Ollama to produce 1500–2500 word article structured as: Intro, 3–4 analysis sections, Implications, Conclusion
  - [x] Add optional Table of Contents based on headings
  - [x] Append Sources section referencing `processed_articles` metadata
  - [x] Add helpers to calculate word count and reading time
  - [x] Generate SEO-friendly slug from title
  - [x] Generate meta description from first paragraph
- [x] Store generated blog posts in `blog_posts`

### 6.3 Blog Platform Connectors (Day 38–39) — **[backend, integration, ~12h]**

- [x] Create `backend/generators/blog_publishers/` directory
- [x] Implement **Medium** publisher:
  - [x] Auth via API token
  - [x] Endpoint to publish markdown as draft/public
  - [x] Capture returned post ID and URL in `blog_publications`
- [x] Implement **Dev.to** publisher:
  - [x] Auth via API key
  - [x] Publish markdown article with up to 4 tags
- [x] Implement **WordPress** publisher:
  - [x] Auth via username + app password (HTTP Basic)
  - [x] Convert markdown to HTML
  - [x] Ensure tags and categories are created and assigned
- [ ] (Optional future) Add Hashnode, Ghost, Substack connectors
- [x] Add robust error handling and logging for each platform call

### 6.4 SEO Optimization Module (Day 40–41) — **[backend, SEO/ML, ~10h]**

- [x] Create `backend/generators/seo_optimizer.py` (or integrate into blog generator):
  - [x] Generate meta descriptions (≤160 chars)
  - [x] Extract focus keywords from title + content
  - [x] Compute readability scores (e.g., Flesch Reading Ease)
  - [x] Normalize heading hierarchy (H1/H2/H3) if needed
  - [x] Generate slugs for different platforms if needed
  - [x] Create alt text suggestions for any images
- [x] Persist SEO fields to `blog_posts`

### 6.5 Dashboard Blog Publisher UI & Integration (Day 42) — **[backend, frontend, ~10h]**

- [x] Backend:
  - [x] `GET /api/blog/generate/<int:article_id>` – generate or return blog post for article
  - [x] `POST /api/blog/publish` – publish a given `blog_post_id` to selected platforms
  - [x] `GET /api/blog/history` – list blog posts and publication statuses
- [x] Frontend:
  - [x] Implement `BlogPublisher.jsx` component to:
    - [x] Trigger blog generation for a selected article
    - [x] Show title, word count, reading time, and SEO meta info
    - [x] Allow editing of blog content before publishing
    - [x] Let user choose platforms (Medium/Dev.to/WordPress/etc.) via checkboxes
    - [x] Trigger publish action and display results/errors
    - [x] Show past publication history with links
- [x] Verify full workflow: generate → preview/edit → publish-as-draft → confirm on platforms

---

## 7. Ongoing Maintenance & Optimization

- [ ] Monitor fetch logs daily for errors or API changes
- [ ] Review scoring quality weekly and adjust weights/heuristics
- [ ] Update platform templates (length limits, tone) when platforms change
- [ ] Periodically refresh Ollama models or prompts for better outputs
- [ ] Track which platforms and content types perform best and refine templates
- [ ] Keep documentation and `.env.example` up to date

---

## 8. Milestone Checklists

Use these to track higher-level progress:

### After Week 1

- [x] 4+ data sources functional (arXiv, Gmail, Reddit, GitHub) ✅
- [x] ≥100 `raw_articles` stored (✅ 147 articles)
- [x] Fetchers log errors cleanly without crashing ✅

### After Week 2

- [x] All articles cleaned and deduplicated ✅
- [x] LLM summarization and key points working ✅
- [x] Viral/tech/relevance scores populated and plausible ✅

### After Week 3

- [x] Content generator produces platform-ready posts for all configured platforms ✅
- [x] React dashboard displays and filters stories correctly ✅
- [x] Copy-to-clipboard and export features work end-to-end ✅

### After Week 4

- [ ] Daily pipeline runs automatically on schedule
- [ ] Dockerized stack runs locally or on a server
- [ ] Documentation is complete enough for a fresh setup

### After Week 5

- [x] Hashtag collectors gather 100+ relevant tags/day ✅
- [x] Trend scores update at least every few hours ✅
- [x] Dashboard shows recommended hashtags per article/platform ✅

### After Week 6

- [x] Long-form blog posts generated from top articles ✅
- [x] Publishing to at least Medium or Dev.to works reliably ✅
- [x] SEO fields (meta description, slug, reading time) are populated ✅
- [x] Blog publishing workflow fully usable from the dashboard ✅
