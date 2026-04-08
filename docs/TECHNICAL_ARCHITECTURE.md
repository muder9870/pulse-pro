# AI Pulse Pro - Technical Architecture

**Version:** 2.0  
**Last Updated:** February 13, 2026

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     AI PULSE PRO                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   COLLECT    │ -> │   PROCESS    │ -> │   GENERATE   │ │
│  │  Data from   │    │  Analyze &   │    │  Content for │ │
│  │  6+ sources  │    │  Score       │    │  15+ platforms│ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         v                    v                    v         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SQLite Database                          │  │
│  │  (stores articles, analysis, generated content)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              v                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         React Dashboard (Control Panel)               │  │
│  │  View • Edit • Copy • Publish • Schedule             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Data Flow

```
[arXiv Papers] ──┐
[Gmail/IMAP]   ──┤
[Reddit Posts] ────┤
[GitHub Repos] ────┼──▶ [Fetcher] ──▶ [Cleaner] ──▶ [Deduplicator]
[RSS Feeds]   ─────┤                                       │
[Direct URLs] ─────┘                                       │
                                                           ▼
                                             [SQLite: raw_articles]
                                                           │
                                                           ▼
                                            [LLM: Summarize & Analyze]
                                                           │
                                                           ▼
                                              [Scoring Algorithm]
                                                           │
                                                           ▼
                                          [SQLite: processed_articles]
                                                           │
                                                           ▼
                                       [Content Generator per Platform]
                                                           │
                                                           ▼
                                        [SQLite: generated_content]
                                                           │
                                                           ▼
                                             [Web Dashboard Display]
                                                           │
                                                           ▼
                                          [User Reviews & Posts]
```

---

## 🔧 Technology Stack

### Backend

| Component | Technology | Purpose | Version |
|-----------|-----------|---------|---------|
| **Runtime** | Python | Main language | 3.11+ |
| **Web Framework** | Flask | REST API server | 3.0+ |
| **Database** | SQLite | Data storage | 3 |
| **Task Scheduler** | APScheduler | Automated jobs | 3.10+ |
| **LLM Engine** | Ollama | Content generation | Latest |
| **LLM Model** | llama3.1:8b | AI analysis | 8B params |
| **Email Client** | imaplib | Newsletter reading | Built-in |
| **HTTP Client** | requests | Web scraping | 2.31+ |
| **HTML Parser** | BeautifulSoup4 | Content extraction | 4.12+ |

### Frontend

| Component | Technology | Purpose | Version |
|-----------|-----------|---------|---------|
| **Framework** | React | UI components | 18+ |
| **Build Tool** | Vite | Development server | 5+ |
| **Styling** | Tailwind CSS | Design system | 3+ |
| **Icons** | Lucide React | Icon library | Latest |
| **State** | React Hooks | State management | Built-in |
| **HTTP Client** | Fetch API | API calls | Built-in |

### Data Collection

| Source | Method | Library | Rate Limit |
|--------|--------|---------|------------|
| **arXiv** | Official API | `arxiv` | 3 sec/request |
| **Gmail** | IMAP | `imaplib` | N/A |
| **Reddit** | Official API | `praw` | 60 req/min |
| **GitHub** | Web Scraping | `BeautifulSoup4` | Reasonable use |
| **RSS Feeds** | Feed Parser | `feedparser` | Per feed |
| **Direct URLs** | HTTP Requests | `requests` | Reasonable use |

### DevOps & Deployment

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Containerization** | Docker | Easy deployment |
| **Orchestration** | Docker Compose | Multi-container apps |
| **Reverse Proxy** | Nginx (optional) | Production serving |
| **Process Manager** | systemd (optional) | Service management |

---

## 🗄️ Database Schema

### Core Tables

#### 1. `raw_articles`

Stores original fetched articles before processing.

```sql
CREATE TABLE raw_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    source TEXT,              -- 'arxiv', 'gmail', 'reddit', 'github', 'rss', 'direct_url'
    category TEXT,            -- 'LLM', 'Computer Vision', 'Robotics', 'NLP'
    raw_content TEXT,         -- Original article content
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT 0
);
```

#### 2. `processed_articles`

Stores AI-analyzed articles with scores.

```sql
CREATE TABLE processed_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_article_id INTEGER,
    summary TEXT,             -- 2-3 sentence summary
    key_takeaways TEXT,       -- 3-5 bullet points
    sentiment TEXT,           -- 'positive', 'neutral', 'negative'
    category TEXT,
    target_audience TEXT,     -- 'researchers', 'developers', 'business'
    viral_score INTEGER,      -- 0-100
    tech_score INTEGER,       -- 0-100
    relevance_score INTEGER,  -- 0-100
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raw_article_id) REFERENCES raw_articles(id)
);
```

#### 3. `generated_content`

Stores platform-specific generated posts.

```sql
CREATE TABLE generated_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    platform TEXT,            -- 'twitter', 'linkedin', 'reddit', etc.
    content TEXT,             -- Generated post content
    char_count INTEGER,       -- Character count
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted BOOLEAN DEFAULT 0,
    posted_at TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

#### 4. `tags`

Stores article tags and hashtags.

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    tag TEXT,                 -- Original tag
    hashtag TEXT,             -- Hashtag format (#tag)
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

### Feature Tables

#### 5. `rss_feeds`

Manages RSS feed sources.

```sql
CREATE TABLE rss_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    category TEXT,
    active BOOLEAN DEFAULT 1,
    last_fetched TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. `rss_feed_items`

Tracks individual RSS items to prevent duplicates.

```sql
CREATE TABLE rss_feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER,
    guid TEXT UNIQUE NOT NULL,      -- RSS item GUID
    url TEXT,
    title TEXT,
    processed BOOLEAN DEFAULT 0,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id)
);
```

#### 7. `blog_posts`

Stores generated long-form blog articles.

```sql
CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,               -- URL-friendly slug
    content TEXT NOT NULL,          -- Full markdown content
    excerpt TEXT,                   -- Meta description
    featured_image_url TEXT,
    focus_keyword TEXT,             -- SEO keyword
    word_count INTEGER,
    reading_time INTEGER,           -- Minutes
    status TEXT DEFAULT 'draft',    -- 'draft', 'published', 'scheduled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

#### 8. `blog_publications`

Tracks blog publishing to different platforms.

```sql
CREATE TABLE blog_publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER,
    platform TEXT NOT NULL,         -- 'medium', 'devto', 'wordpress'
    platform_post_id TEXT,          -- ID from the platform
    url TEXT,                       -- Published URL
    status TEXT DEFAULT 'pending',  -- 'pending', 'published', 'failed'
    published_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id)
);
```

#### 9. `trending_hashtags`

Stores trending hashtag data.

```sql
CREATE TABLE trending_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hashtag TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,         -- 'twitter', 'instagram', etc.
    volume INTEGER DEFAULT 0,       -- Posts per hour
    engagement_rate REAL DEFAULT 0.0,
    trend_score INTEGER DEFAULT 0,  -- 0-100
    category TEXT,                  -- 'LLM', 'CV', 'NLP', etc.
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'    -- 'rising', 'trending', 'declining'
);
```

#### 10. `hashtag_performance`

Historical hashtag performance data.

```sql
CREATE TABLE hashtag_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hashtag_id INTEGER,
    platform TEXT,
    volume INTEGER,
    engagement_rate REAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hashtag_id) REFERENCES trending_hashtags(id)
);
```

#### 11. `content_hashtags`

Maps recommended hashtags to content.

```sql
CREATE TABLE content_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    hashtag_id INTEGER,
    platform TEXT,
    relevance_score REAL,           -- 0-1 relevance
    recommended BOOLEAN DEFAULT 1,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id),
    FOREIGN KEY (hashtag_id) REFERENCES trending_hashtags(id)
);
```

#### 12. `user_preferences`

User configuration and preferences.

```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 13. `content_history`

User interaction history.

```sql
CREATE TABLE content_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    platform TEXT,
    action TEXT,                    -- 'copied', 'edited', 'posted'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

---

## 🔄 Pipeline Architecture

### Pipeline Stages

```python
# Simplified pipeline flow
def run_daily_pipeline():
    # Stage 1: Data Collection (2-5 minutes)
    fetch_arxiv_papers()
    fetch_github_trending()
    fetch_rss_feeds()
    fetch_gmail_newsletters()
    fetch_reddit_posts()
    fetch_direct_urls()
    
    # Stage 2: Data Cleaning (30 seconds)
    clean_all_articles()
    
    # Stage 3: Deduplication (10 seconds)
    deduplicate_articles()
    
    # Stage 4: AI Analysis (10-15 minutes) - SLOWEST
    analyze_with_llm(limit=10)
    
    # Stage 5: Scoring (5 seconds)
    score_all_articles()
    
    # Stage 6: Tag Generation (30 seconds)
    generate_tags(top_n=10)
    
    # Stage 7: Content Generation (10-15 minutes)
    generate_content_for_top_articles(
        top_n=2,
        platforms=['twitter', 'linkedin', 'reddit', 'hackernews', 'medium']
    )
    
    # Stage 8: Completion
    trigger_webhooks()
    update_health_status()
```

### Performance Configuration

```bash
# .env configuration
ANALYSIS_LIMIT=10              # Analyze top 10 articles  
CONTENT_TOP_LIMIT=2            # Generate content for top 2
CONTENT_PLATFORMS=twitter,linkedin,reddit,hackernews,medium
```

---

## 🤖 LLM Integration

### Ollama Configuration

```python
# Backend LLM configuration
import ollama

class LLMService:
    def __init__(self):
        self.model = "llama3.1:8b"
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    
    def generate(self, prompt, max_tokens=1000):
        response = ollama.generate(
            model=self.model,
            prompt=prompt,
            options={
                'num_predict': max_tokens,
                'temperature': 0.7
            }
        )
        return response['response']
```

### Analysis Prompts

```python
# Article summarization prompt
SUMMARIZATION_PROMPT = """
Analyze this AI/ML article and provide:
1. A 2-3 sentence summary
2. 3-5 key takeaways as bullet points
3. Sentiment (positive/neutral/negative)
4. Primary category (LLM/NLP/CV/Robotics/Other)
5. Target audience (researchers/developers/business)

Article:
Title: {title}
Content: {content}

Response format (JSON):
{{
    "summary": "...",
    "key_takeaways": ["...", "..."],
    "sentiment": "...",
    "category": "...",
    "target_audience": "..."
}}
"""

# Content generation prompt
CONTENT_GENERATION_PROMPT = """
Generate a {platform} post about this AI article.

Article Summary: {summary}
Key Points: {key_takeaways}

Platform: {platform}
Max Length: {max_chars} characters
Tone: {tone}
Include: {include_elements}

Generate the post:
"""
```

---

## 📈 Scoring Algorithms

### Viral Potential Score (0-100)

```python
def calculate_viral_score(article):
    # Recency (30%)
    hours_ago = (datetime.now() - article.fetched_at).total_seconds() / 3600
    recency_score = max(0, 30 - (hours_ago / 24) * 30)
    
    # Engagement (25%) - from Reddit/GitHub
    engagement_score = min(article.upvotes / 100, 25)
    
    # Trending keywords (25%)
    trending_keywords = ['gpt-5', 'agi', 'breakthrough', 'revolutionary']
    keyword_score = sum(15 for kw in trending_keywords if kw in article.title.lower())
    keyword_score = min(keyword_score, 25)
    
    # Title simplicity (20%)
    title_words = len(article.title.split())
    simplicity_score = max(0, 20 - (title_words - 10))
    
    return int(recency_score + engagement_score + keyword_score + simplicity_score)
```

### Technical Significance Score (0-100)

```python
def calculate_tech_score(article):
    # Source authority (40%)
    source_scores = {
        'arxiv': 40,
        'github': 30,
        'newsletter': 25,
        'reddit': 15,
        'rss': 20,
        'direct_url': 20
    }
    authority_score = source_scores.get(article.source, 15)
    
    # Citation count (30%) - for arXiv
    citation_score = min(article.citation_count / 10, 30) if article.source == 'arxiv' else 15
    
    # Technical keywords (20%)
    tech_keywords = ['architecture', 'algorithm', 'model', 'training', 'inference']
    tech_score = sum(4 for kw in tech_keywords if kw in article.raw_content.lower())
    tech_score = min(tech_score, 20)
    
    # Rigor signals (10%)
    rigor_keywords = ['reproducible', 'peer-reviewed', 'empirical', 'evaluation']
    rigor_score = sum(2.5 for kw in rigor_keywords if kw in article.raw_content.lower())
    rigor_score = min(rigor_score, 10)
    
    return int(authority_score + citation_score + tech_score + rigor_score)
```

### Relevance Score (0-100)

```python
def calculate_relevance_score(article, user_preferences):
    # Category match (40%)
    preferred_categories = user_preferences.get('categories', [])
    category_score = 40 if article.category in preferred_categories else 20
    
    # Keyword match (30%)
    preferred_keywords = user_preferences.get('keywords', [])
    keyword_matches = sum(1 for kw in preferred_keywords if kw in article.title.lower())
    keyword_score = min(keyword_matches * 10, 30)
    
    # Source preference (20%)
    preferred_sources = user_preferences.get('sources', [])
    source_score = 20 if article.source in preferred_sources else 10
    
    # Historical engagement (10%)
    engagement_history = get_user_engagement_for_category(article.category)
    engagement_score = min(engagement_history * 10, 10)
    
    return int(category_score + keyword_score + source_score + engagement_score)
```

---

## 🔌 API Endpoints

### Stories & Content

```
GET  /api/stories                    # Get all processed stories
GET  /api/content/:id/:platform      # Get generated content
POST /api/generate                   # Generate content on demand
POST /api/content/update             # Update content manually
POST /api/content/posted             # Mark as posted
GET  /api/export                     # Export all content
```

### Pipeline

```
POST /api/pipeline/run               # Trigger pipeline manually
GET  /api/pipeline/status            # Get pipeline status
```

### Scheduling

```
GET  /api/schedule                   # Get schedule configuration
POST /api/schedule                   # Update schedule
```

### RSS Feeds

```
GET  /api/rss/feeds                  # List all feeds
POST /api/rss/feeds                  # Add new feed
PUT  /api/rss/feeds/:id              # Update feed
DELETE /api/rss/feeds/:id            # Delete feed
POST /api/rss/import-opml            # Import OPML file
POST /api/rss/fetch                  # Manually fetch feeds
GET  /api/rss/stats                  # Feed statistics
```

### Tags & Hashtags

```
POST /api/hashtags/update            # Update hashtags manually
GET  /api/hashtags/:id/:platform     # Get recommended hashtags
```

### Blog Publishing

```
GET  /api/blog/generate/:id          # Generate blog post
POST /api/blog/publish               # Publish to platform(s)
GET  /api/blog/:id                   # Get blog post
GET  /api/blog/history               # Publication history
```

### Health & Monitoring

```
GET  /api/health                     # System health status
GET  /api/metrics                    # System metrics
```

---

## 🐳 Docker Architecture

### Docker Compose Stack

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - OLLAMA_HOST=http://host.docker.internal:11434
      - LLM_PROVIDER=local
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

### Volume Mounts

- `./data:/app/data` - SQLite database persistence
- `./logs:/app/logs` - Log file persistence

---

## ⚙️ Configuration

### Environment Variables

```bash
# LLM Configuration
LLM_PROVIDER=local                          # local|free_api|paid_api
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Performance Tuning
ANALYSIS_LIMIT=10
CONTENT_TOP_LIMIT=2
CONTENT_PLATFORMS=twitter,linkedin,reddit,hackernews,medium

# Data Source Credentials (Optional)
GMAIL_ADDRESS=your@email.com
GMAIL_APP_PASSWORD=xxxx
REDDIT_CLIENT_ID=xxxx
REDDIT_CLIENT_SECRET=xxxx
REDDIT_USER_AGENT=ai-pulse-pro/0.1

# Blog Publishing (Optional)
MEDIUM_API_KEY=xxxx
DEVTO_API_KEY=xxxx
WORDPRESS_SITE_URL=https://yoursite.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=xxxx

# Notifications (Optional)
NOTIFY_ON=off|failure|success|always
NOTIFY_WEBHOOK_URL=https://hooks.slack.com/...
NOTIFY_EMAIL_TO=you@email.com
SMTP_HOST=smtp.gmail.com
```

---

## 🔒 Security Considerations

### Data Protection

- All secrets in `.env` file (never committed)
- Local LLM processing (no cloud API calls)
- SQLite database with optional encryption
- No telemetry or external tracking

### Best Practices

```bash
# .gitignore requirements
.env
*.db
*.log
credentials/
data/
```

### Gmail App Password

1. Enable 2-Step Verification on Google Account
2. Create App-Specific Password
3. Use app password (NOT real password)

---

## 📁 File Structure

```
ai-pulse-pro/
├── backend/
│   ├── main.py                 # Flask app entry point
│   ├── config.py               # Configuration management
│   ├── database.py             # Database models & queries
│   ├── fetchers/
│   │   ├── arxiv_fetcher.py
│   │   ├── gmail_fetcher.py
│   │   ├── reddit_fetcher.py
│   │   ├── github_fetcher.py
│   │   ├── rss_fetcher.py
│   │   └── web_scraper.py
│   ├── processors/
│   │   ├── cleaner.py          # Data cleaning
│   │   ├── deduplicator.py     # Remove duplicates
│   │   ├── analyzer.py         # LLM analysis
│   │   ├── scorer.py           # Scoring algorithms
│   │   └── hashtag_recommender.py
│   ├── generators/
│   │   ├── content_generator.py
│   │   ├── platform_templates.py
│   │   ├── blog_generator.py
│   │   └── blog_publishers/
│   │       ├── medium_publisher.py
│   │       ├── devto_publisher.py
│   │       └── wordpress_publisher.py
│   └── scheduler.py            # APScheduler jobs
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StoryCard.jsx
│   │   │   ├── PlatformSelector.jsx
│   │   │   ├── RSSManager.jsx
│   │   │   ├── BlogPublisher.jsx
│   │   │   └── ScheduleConfig.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── data/
│   └── app.db                  # SQLite database
├── logs/
│   └── app.log                 # Application logs
├── docs/
│   ├── FEATURES.md
│   ├── TECHNICAL_ARCHITECTURE.md  # This file
│   ├── USER_GUIDE.md
│   └── DEVELOPMENT.md
├── tests/
│   ├── test_fetchers.py
│   ├── test_processors.py
│   └── test_generators.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚦 Performance Metrics

### Pipeline Performance

- **Total Pipeline Time:** 20-30 minutes
- **Data Collection:** 2-5 minutes
- **Cleaning:** 30 seconds
- **Deduplication:** 10 seconds
- **AI Analysis:** 10-15 minutes (slowest stage)
- **Scoring:** 5 seconds
- **Tag Generation:** 30 seconds
- **Content Generation:** 10-15 minutes

### Resource Usage

- **Memory:** ~500MB (with Ollama separate)
- **Disk:** ~100MB (database + logs)
- **CPU:** Minimal (except during LLM calls)

### Optimization Tips

1. Reduce `ANALYSIS_LIMIT` for faster pipeline
2. Reduce `CONTENT_TOP_LIMIT` for fewer LLM calls
3. Use caching to avoid redundant processing
4. Batch process articles for efficiency

---

**Document Version:** 2.0  
**Last Updated:** February 13, 2026
