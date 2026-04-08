# AI Pulse Pro - Master Blueprint
## Multi-Platform AI Content Automation System

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Project Type:** Personal Use → Future SaaS  
**Cost Model:** 100% Free (Self-Hosted)

---

## 🎯 Project Vision

**What:** An intelligent system that monitors the AI/ML landscape 24/7, digests information from academic papers, newsletters, trending repositories, and social discussions, then generates platform-optimized content ready for manual posting across 15+ social media channels.

**Why:** 
- Stay ahead of AI trends without spending hours reading
- Build personal brand as an AI thought leader
- Consistent content pipeline with minimal manual effort
- Own your data and avoid platform lock-in

**Success Metrics:**
- Process 50+ AI news items daily
- Generate content for 15 platforms in under 5 minutes
- 90%+ accuracy in content relevance
- Zero monthly costs

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  arXiv   │  │  Gmail   │  │  Reddit  │  │ GitHub  │ │
│  │   API    │  │   IMAP   │  │   API    │  │ Scraper │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  HF Hub  │  │ TechNews │  │  Blogs   │              │
│  │ Scraper  │  │ Scraper  │  │ RSS Feed │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  PROCESSING ENGINE                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Cleaning & Deduplication                   │  │
│  │  • Remove ads, fluff, duplicate articles         │  │
│  │  • Extract core content & metadata               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  AI Analysis Engine (Ollama - Local LLM)         │  │
│  │  • Summarization                                 │  │
│  │  • Key takeaway extraction                       │  │
│  │  • Sentiment analysis                            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Scoring Algorithm                               │  │
│  │  • Viral Potential Score (0-100)                 │  │
│  │  • Technical Significance Score (0-100)          │  │
│  │  • Relevance to user interests                   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              CONTENT GENERATION ENGINE                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Platform-Specific Templates                     │  │
│  │  • Character limits                              │  │
│  │  • Tone adaptation (casual/professional)         │  │
│  │  • Format optimization (threads/long-form)       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Content Variations                              │  │
│  │  • Twitter: Thread format with emojis            │  │
│  │  • LinkedIn: Professional analysis               │  │
│  │  • Reddit: Discussion-style with questions       │  │
│  │  • Blog: Long-form deep dive                     │  │
│  │  • [12 more platforms...]                        │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   STORAGE LAYER (SQLite)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Raw News    │  │  Generated   │  │     User     │  │
│  │     Data     │  │   Content    │  │ Preferences  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               WEB DASHBOARD (User Interface)             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Daily Digest View                               │  │
│  │  • Top 10 stories ranked by score                │  │
│  │  │  • Expandable cards with full content         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Platform Selector                               │  │
│  │  • Toggle platforms on/off                       │  │
│  │  • Preview content before copying                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  One-Click Copy Buttons                          │  │
│  │  • Copy to clipboard per platform                │  │
│  │  • Edit inline if needed                         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Export & Reports                                │  │
│  │  • Download all as PDF/Markdown                  │  │
│  │  • Weekly analytics                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
[arXiv Papers] ──┐
[Gmail/Outlook] ──┤
[Reddit Posts] ────┤
[GitHub Repos] ────┼──▶ [Fetcher] ──▶ [Cleaner] ──▶ [Deduplicator]
[HF Models] ───────┤                                       │
[TechCrunch] ──────┤                                       │
[Blogs/RSS] ───────┘                                       │
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
                                          [User Copies & Posts Manually]
```

---

## 🗄️ Database Schema

### Table: `raw_articles`
```sql
CREATE TABLE raw_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    source TEXT,  -- 'arxiv', 'gmail', 'reddit', etc.
    category TEXT,  -- 'LLM', 'Computer Vision', 'Robotics'
    raw_content TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT 0
);
```

### Table: `processed_articles`
```sql
CREATE TABLE processed_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_article_id INTEGER,
    summary TEXT,
    key_takeaways TEXT,
    viral_score INTEGER,  -- 0-100
    tech_score INTEGER,   -- 0-100
    relevance_score INTEGER,  -- 0-100
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (raw_article_id) REFERENCES raw_articles(id)
);
```

### Table: `generated_content`
```sql
CREATE TABLE generated_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    platform TEXT,  -- 'twitter', 'linkedin', etc.
    content TEXT,
    char_count INTEGER,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted BOOLEAN DEFAULT 0,
    posted_at TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

### Table: `user_preferences`
```sql
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `content_history`
```sql
CREATE TABLE content_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    platform TEXT,
    action TEXT,  -- 'copied', 'edited', 'posted'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);
```

---

## 🔧 Technology Stack

### Backend
| Component | Technology | Purpose | Cost |
|-----------|-----------|---------|------|
| **Runtime** | Python 3.11+ | Main language | Free |
| **Web Framework** | Flask 3.0 | Web server & API | Free |
| **Database** | SQLite 3 | Data storage | Free |
| **Task Scheduler** | APScheduler | Automated fetching | Free |
| **LLM Engine** | Ollama (Llama 3.1 8B) | Content generation | Free |
| **Email Client** | imaplib (built-in) | Newsletter reading | Free |

### Data Collection
| Source | Method | Library | Rate Limit |
|--------|--------|---------|------------|
| **arXiv** | Official API | `arxiv` | 3 sec/request |
| **Gmail** | IMAP | `imaplib` | N/A |
| **Reddit** | Official API | `praw` | 60 req/min |
| **GitHub** | Web Scraping | `BeautifulSoup4` | Reasonable use |
| **Hugging Face** | Web Scraping | `requests` + `bs4` | Reasonable use |

### Frontend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | React 18 | UI components |
| **Styling** | Tailwind CSS | Design system |
| **Icons** | Lucide React | Icon library |
| **State** | React Hooks | State management |

### DevOps & Deployment
| Component | Technology | Purpose | Cost |
|-----------|-----------|---------|------|
| **Version Control** | Git + GitHub | Code management | Free |
| **Containerization** | Docker | Easy deployment | Free |
| **Hosting (Optional)** | Render/Railway Free Tier | Cloud hosting | Free |
| **Default** | Local Machine | Self-hosted | Free |

---

## 🎨 User Interface Design

### Dashboard Sections

#### 1. **Header Bar**
- App title: "AI Pulse Pro"
- Last refresh timestamp
- Buttons: [Refresh Feed] [Export All] [Settings]

#### 2. **Platform Selector Panel**
- 15 toggle buttons (one per platform)
- Active platforms highlighted in brand color
- Shows: "{X} platforms selected"

#### 3. **Stories Feed**
Each story card contains:
```
┌─────────────────────────────────────────────────┐
│ 🚀 Title of the AI News Story                  │
│                                                 │
│ 📰 Source | 🏷️ Category | 🕐 Timestamp         │
│                                                 │
│ ┌─────────┐  ┌─────────┐                       │
│ │   95    │  │   88    │                       │
│ │  Viral  │  │  Tech   │                       │
│ └─────────┘  └─────────┘                       │
│                                                 │
│ ▼ Platform-Specific Content (expandable)       │
│                                                 │
│ ┌─ Twitter ─────────────────────────┐ [Copy]   │
│ │ Thread content here...            │          │
│ └───────────────────────────────────┘          │
│                                                 │
│ ┌─ LinkedIn ────────────────────────┐ [Copy]   │
│ │ Professional post here...         │          │
│ └───────────────────────────────────┘          │
│                                                 │
│ ... (more platforms)                            │
└─────────────────────────────────────────────────┘
```

#### 4. **Footer**
- Analytics: "Processed {X} articles today"
- Links: [GitHub] [Documentation] [Feedback]

---

## 🔐 Security & Privacy

### Data Protection
- **No Cloud APIs:** All processing happens locally
- **Email Credentials:** Stored in `.env` file (never committed)
- **Database:** Local SQLite (encrypted optional)
- **No Tracking:** Zero telemetry or analytics

### Best Practices
```bash
# Never commit these files
.env
*.db
*.log
credentials/
```

### Gmail App Password Setup
1. Enable 2FA on Google Account
2. Generate App-Specific Password
3. Use that password (NOT your real password)

---

## 📈 Scoring Algorithm

### Viral Potential Score (0-100)
```python
viral_score = (
    engagement_metrics * 0.3 +      # Reddit upvotes, HN points
    source_authority * 0.2 +         # arXiv > Newsletter > Blog
    recency_factor * 0.2 +           # Last 24h = 100, decay over time
    keyword_match * 0.15 +           # Trending terms (GPT-5, AGI, etc.)
    simplicity_score * 0.15          # Easier to understand = more viral
)
```

### Technical Significance Score (0-100)
```python
tech_score = (
    paper_citations * 0.25 +         # If arXiv, check citation count
    methodology_rigor * 0.25 +       # Reproducible, peer-reviewed
    novelty_factor * 0.25 +          # New technique vs incremental
    real_world_impact * 0.15 +       # Commercial applications
    author_reputation * 0.1          # Known researchers/companies
)
```

### Relevance Score (User-Specific)
```python
relevance_score = (
    keyword_match * 0.4 +            # Matches user's interests
    category_preference * 0.3 +      # User's favorite categories
    source_preference * 0.2 +        # Preferred sources (arXiv vs Reddit)
    historical_engagement * 0.1      # What user copied before
)
```

---

## 🚀 Scalability & Future Enhancements

### Phase 1: MVP (Current Blueprint)
- Manual posting
- 15 platforms
- Local hosting
- Basic scoring

### Phase 2: Enhanced Features (v2.0)
- Image generation for Instagram/Pinterest
- Video script generation for YouTube
- Multi-user support
- Cloud deployment

### Phase 3: SaaS Product (v3.0)
- OAuth login for social platforms
- Automated posting (with user approval)
- Team collaboration
- Analytics dashboard
- Subscription model ($9-29/month)

---

## 📋 File Structure

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
│   │   └── web_scraper.py
│   ├── processors/
│   │   ├── cleaner.py          # Data cleaning
│   │   ├── deduplicator.py     # Remove duplicates
│   │   ├── analyzer.py         # LLM analysis
│   │   └── scorer.py           # Scoring algorithms
│   ├── generators/
│   │   ├── content_generator.py
│   │   └── platform_templates.py
│   └── scheduler.py            # Automated tasks
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StoryCard.jsx
│   │   │   ├── PlatformSelector.jsx
│   │   │   └── ContentPreview.jsx
│   │   ├── App.jsx
│   │   └── index.jsx
│   └── package.json
├── data/
│   └── app.db                  # SQLite database
├── logs/
│   └── app.log
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

## 🎯 Success Criteria

### Functional Requirements
✅ Fetch 50+ articles daily from 7+ sources  
✅ Process & deduplicate content  
✅ Generate content for 15 platforms  
✅ Display in user-friendly dashboard  
✅ One-click copy functionality  
✅ Export reports feature  

### Performance Requirements
✅ Dashboard loads in <3 seconds  
✅ Content generation completes in <60 seconds  
✅ Database queries respond in <100ms  
✅ System runs on 4GB RAM machine  

### Quality Requirements
✅ 90%+ accuracy in content relevance  
✅ 95%+ deduplication rate  
✅ Platform-specific content adheres to character limits  
✅ Zero false positives in scoring  

---

## 📞 Support & Maintenance

### Regular Tasks
- **Daily:** Monitor fetch logs for errors
- **Weekly:** Review scoring accuracy
- **Monthly:** Update platform templates if APIs change
- **Quarterly:** Train new LLM model for better summaries

### Common Issues & Solutions
| Issue | Solution |
|-------|----------|
| arXiv blocking IP | Increase delay to 5 seconds |
| Gmail authentication fails | Regenerate app password |
| Reddit API rate limit | Reduce fetch frequency |
| LLM generating gibberish | Update Ollama model |

---

**Document Version:** 1.0  
**Status:** Ready for Development  
**Next Document:** Master Plan (Implementation Roadmap)