# AI Pulse Pro - Development Guide

**Version:** 2.0  
**Last Updated:** February 13, 2026

---

## 📋 Development Overview

This guide covers development setup, project structure, contribution guidelines, testing, and the project roadmap.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- Ollama (local LLM runtime)
- Docker + Docker Compose (optional)

### Development Setup

**1. Clone Repository**

```bash
git clone https://github.com/yourusername/ai-pulse-pro.git
cd ai-pulse-pro
```

**2. Backend Setup**

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux

# Initialize database
python -m backend.database

# Run backend
python -m backend.main
```

Backend runs on `http://localhost:5000`

**3. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs on `http://localhost:5173`

**4. Install Ollama**

```bash
# Download from https://ollama.ai

# Pull model
ollama pull llama3.1:8b

# Verify
ollama list
```

---

## 📁 Project Structure

```
ai-pulse-pro/
├── backend/                    # Python Flask backend
│   ├── main.py                # Flask app entry point
│   ├── config.py              # Configuration management
│   ├── database.py            # Database models & queries
│   │
│   ├── fetchers/              # Data collection modules
│   │   ├── arxiv_fetcher.py
│   │   ├── github_fetcher.py
│   │   ├── gmail_fetcher.py
│   │   ├── reddit_fetcher.py
│   │   ├── rss_fetcher.py
│   │   └── web_scraper.py
│   │
│   ├── processors/            # Data processing modules
│   │   ├── cleaner.py        # HTML/text cleaning
│   │   ├── deduplicator.py   # Duplicate detection
│   │   ├── analyzer.py       # LLM analysis
│   │   ├── scorer.py         # Scoring algorithms
│   │   ├── hashtag_analyzer.py
│   │   └── hashtag_recommender.py
│   │
│   ├── generators/           # Content generation
│   │   ├── generator_v5.py   # Platform content
│   │   ├── platform_templates.py
│   │   ├── blog_generator.py
│   │   ├── seo_optimizer.py
│   │   └── blog_publishers/
│   │       ├── medium_publisher.py
│   │       ├── devto_publisher.py
│   │       └── wordpress_publisher.py
│   │
│   ├── scheduler.py          # APScheduler jobs
│   └── main_pipeline.py      # Pipeline orchestration
│
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── StoryCard.jsx
│   │   │   ├── PlatformSelector.jsx
│   │   │   ├── RSSManager.jsx
│   │   │   ├── BlogPublisher.jsx
│   │   │   ├── ScheduleConfig.jsx
│   │   │   └── HealthMonitor.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
│
├── data/                     # SQLite database
│   └── app.db
│
├── logs/                     # Application logs
│   ├── app.log
│   └── pipeline.log
│
├── tests/                    # Test files
│   ├── test_fetchers.py
│   ├── test_processors.py
│   ├── test_generators.py
│   └── smoke_test.py
│
├── scripts/                  # Utility scripts
│   ├── seed_demo_data.py
│   └── migrate_database.py
│
├── docs/                     # Documentation
│   ├── FEATURES.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   ├── USER_GUIDE.md
│   ├── DEVELOPMENT.md       # This file
│   └── archive/             # Historical docs
│
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🔧 Development Workflow

### Adding a New Data Source

**1. Create Fetcher Module**

```python
# backend/fetchers/newsource_fetcher.py
import requests
from backend.database import insert_raw_article

class NewSourceFetcher:
    def __init__(self):
        self.source_name = "newsource"
    
    def fetch(self):
        """Fetch articles from new source"""
        # Implementation
        articles = self._fetch_articles()
        
        for article in articles:
            insert_raw_article(
                title=article['title'],
                url=article['url'],
                source=self.source_name,
                category=article.get('category', 'General'),
                raw_content=article['content']
            )
        
        return len(articles)
    
    def _fetch_articles(self):
        # Implement fetching logic
        pass
```

**2. Integrate into Pipeline**

```python
# backend/main_pipeline.py
from backend.fetchers.newsource_fetcher import NewSourceFetcher

def run_daily_pipeline():
    # Existing fetchers...
    
    # Add new fetcher
    newsource = NewSourceFetcher()
    newsource.fetch()
```

**3. Add Tests**

```python
# tests/test_newsource_fetcher.py
def test_newsource_fetch():
    fetcher = NewSourceFetcher()
    count = fetcher.fetch()
    assert count > 0
```

---

### Adding a New Platform

**1. Add Platform Configuration**

```python
# backend/generators/platform_templates.py
PLATFORM_CONFIGS = {
    # ... existing platforms
    
    'newplatform': {
        'max_length': 500,
        'tone': 'professional',
        'format': 'standard',
        'emoji_allowed': True,
        'hashtag_count': 3,
        'template': '''Create a {tone} post about this AI topic.
        
        Topic: {title}
        Summary: {summary}
        
        Requirements:
        - Max {max_length} characters
        - Include {hashtag_count} hashtags
        - Tone: {tone}
        '''
    }
}
```

**2. Update Frontend**

```jsx
// frontend/src/components/PlatformSelector.jsx
const platforms = [
  // ... existing platforms
  { id: 'newplatform', name: 'New Platform', icon: Icon }
];
```

---

### Database Migrations

**Adding a New Table:**

```python
# backend/database.py

def create_new_table(conn):
    """Create new table for feature X"""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS new_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field1 TEXT,
            field2 INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

# Add to init_database()
def init_database():
    # ... existing tables
    create_new_table(conn)
```

---

## 🧪 Testing

### Running Tests

**Unit Tests:**

```bash
# All tests
python -m unittest discover -s tests -p "test_*.py" -v

# Specific test file
python -m unittest tests.test_fetchers -v

# Specific test
python -m unittest tests.test_fetchers.TestArxivFetcher.test_fetch -v
```

**Smoke Test:**

```bash
python tests/smoke_test.py --base http://localhost:5000
```

**Manual Testing Checklist:**

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Fetch new data
curl -X POST http://localhost:5000/api/pipeline/run

# Get stories
curl http://localhost:5000/api/stories
```

---

### QA Checklist

#### Data Collection

- [ ] arXiv fetcher retrieves papers
- [ ] GitHub fetcher gets trending repos
- [ ] RSS feeds parse correctly
- [ ] Gmail IMAP connects successfully
- [ ] Reddit API returns posts
- [ ] No duplicate articles in database

#### Processing

- [ ] HTML cleaning removes tags
- [ ] Deduplication catches similar articles
- [ ] LLM analysis generates summaries
- [ ] Scoring produces reasonable values (0-100)
- [ ] Tags generated correctly

#### Content Generation

- [ ] All platforms generate content
- [ ] Character limits enforced
- [ ] Tone matches platform
- [ ] Hashtags recommended
- [ ] Blog posts >1500 words

#### Dashboard

- [ ] Stories display correctly
- [ ] Platform selector works
- [ ] Copy to clipboard functions
- [ ] Edit content saves changes
- [ ] RSS manager adds/removes feeds
- [ ] Blog publisher works
- [ ] Schedule configuration saves

#### Integration

- [ ] Pipeline runs end-to-end
- [ ] Scheduler triggers on time
- [ ] Medium publishing succeeds
- [ ] Dev.to publishing succeeds
- [ ] WordPress publishing succeeds

---

## 📊 Project Roadmap

### ✅ Completed (v1.0)

**Core Features:**

- [x] Multi-source data collection (6 sources)
- [x] AI-powered analysis (Ollama)
- [x] Intelligent scoring system
- [x] Platform-specific content generation (15 platforms)
- [x] React dashboard with Tailwind CSS
- [x] Copy-to-clipboard functionality
- [x] RSS feed management
- [x] Hashtag intelligence module
- [x] Blog auto-publisher (Medium, Dev.to, WordPress)
- [x] Smart scheduling with APScheduler
- [x] Docker deployment
- [x] Performance optimizations (caching, batching)

**Metrics:**

- 147+ articles processed
- 86+ content pieces across 14 platforms
- 26+ RSS feeds active
- 98% pipeline success rate

---

### 🔄 In Progress (v2.0)

**Current Sprint:**

- [ ] Auto-posting to Twitter/LinkedIn/Instagram
- [ ] Visual content generation (images, infographics)
- [ ] Enhanced personalization and learning
- [ ] Progressive Web App (PWA)

**Backlog:**

- [ ] Browser extension for content capture
- [ ] Voice-to-text for quick edits
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

---

### 🗓️ Planned Features

**Phase 3: Mobile & Accessibility** (Weeks 9-12)

- Progressive Web App (PWA)
- Offline functionality
- Push notifications
- Browser extensions (Chrome, Firefox)
- Voice commands

**Phase 4: Advanced Features** (Weeks 13-16)

- AI research assistant (deep paper analysis)
- Content monetization tools
- Advanced integrations (Zapier, IFTTT, Slack)
- Video script generation
- Podcast summaries

**Phase 5: Enterprise** (Future)

- Multi-user support
- Team collaboration
- Advanced analytics & reporting
- Public API & webhooks
- White-label solution

---

## 🤝 Contributing

### Contribution Guidelines

**Code Style:**

- Python: Follow PEP 8
- JavaScript: Use Prettier defaults
- Indent: 4 spaces (Python), 2 spaces (JavaScript)
- Max line length: 100 characters

**Commit Messages:**

```
type(scope): Brief description

- Detailed change 1
- Detailed change 2

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Pull Request Process:**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and commit
4. Write/update tests
5. Update documentation
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

**PR Checklist:**

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)

---

### Development Best Practices

**1. Logging**

```python
import logging

logger = logging.getLogger(__name__)

# Use appropriate levels
logger.debug("Detailed diagnostic info")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred")
```

**2. Error Handling**

```python
try:
    result = risky_operation()
except SpecificException as e:
    logger.error(f"Operation failed: {e}")
    # Handle gracefully
    return fallback_value
```

**3. Configuration**

```python
# Use environment variables
import os

API_KEY = os.getenv('API_KEY', 'default_value')
```

**4. Database Access**

```python
# Use context managers
import sqlite3

def query_database():
    with sqlite3.connect('data/app.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM articles")
        return cursor.fetchall()
```

---

## 🐛 Debugging

### Common Issues

**1. Database Locked Errors**

```python
# Solution: Use timeout and connection pooling
conn = sqlite3.connect('data/app.db', timeout=30)
```

**2. LLM Timeouts**

```python
# Solution: Increase timeout or reduce batch size
ollama.generate(model="llama3.1:8b", timeout=120)
```

**3. Memory Leaks**

```python
# Solution: Close connections and clear caches
conn.close()
cache.clear()
```

### Debugging Tools

**Backend:**

```bash
# Enable debug mode
export FLASK_DEBUG=1
python -m backend.main

# View logs
tail -f logs/app.log

# Database inspection
sqlite3 data/app.db
.tables
.schema articles
SELECT * FROM articles LIMIT 5;
```

**Frontend:**

```bash
# React DevTools
npm install -g react-devtools

# Vite debug mode
npm run dev -- --debug
```

---

## 🔐 Security

### Security Best Practices

**1. Never Commit Secrets**

```bash
# .gitignore must include:
.env
*.db
*.log
credentials/
```

**2. Use Environment Variables**

```python
# Don't hardcode secrets
API_KEY = os.getenv('API_KEY')  # ✅ Good
API_KEY = "abc123"              # ❌ Bad
```

**3. Validate Input**

```python
def add_rss_feed(url):
    # Validate URL format
    if not url.startswith('http'):
        raise ValueError("Invalid URL")
    
    # Sanitize input
    url = url.strip()
```

**4. Rate Limiting**

```python
import time

last_call = 0
MIN_INTERVAL = 3  # seconds

def fetch_with_rate_limit():
    global last_call
    elapsed = time.time() - last_call
    if elapsed < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - elapsed)
    last_call = time.time()
```

---

## 📈 Performance Optimization

### Backend Optimization

**1. Caching**

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def expensive_operation(key):
    return result
```

**2. Batch Processing**

```python
# Process in batches
BATCH_SIZE = 10
for i in range(0, len(articles), BATCH_SIZE):
    batch = articles[i:i+BATCH_SIZE]
    process_batch(batch)
```

**3. Async Operations**

```python
import concurrent.futures

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(fetch, url) for url in urls]
    results = [f.result() for f in futures]
```

### Frontend Optimization

**1. Code Splitting**

```jsx
import React, { lazy, Suspense } from 'react';

const BlogPublisher = lazy(() => import('./BlogPublisher'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BlogPublisher />
    </Suspense>
  );
}
```

**2. Memoization**

```jsx
import { useMemo } from 'react';

const expensiveValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);
```

---

## 📝 Documentation

### Code Documentation

**Python Docstrings:**

```python
def analyze_article(article_text):
    """
    Analyze article using LLM.
    
    Args:
        article_text (str): The article content to analyze
        
    Returns:
        dict: Analysis results with summary, key_takeaways, etc.
        
    Raises:
        ValueError: If article_text is empty
        ConnectionError: If LLM is unavailable
    """
    pass
```

**JavaScript JSDoc:**

```javascript
/**
 * Generate content for specified platform
 * @param {Object} article - Article object with title, summary
 * @param {string} platform - Target platform (twitter, linkedin, etc.)
 * @returns {Promise<string>} Generated content
 */
async function generateContent(article, platform) {
  // Implementation
}
```

---

## 🚀 Deployment

### Docker Deployment

**Build and Run:**

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Production Configuration:**

```yaml
# docker-compose.prod.yml
services:
  backend:
    restart: always
    environment:
      - FLASK_ENV=production
    mem_limit: 2g
    cpus: 4
```

### VPS Deployment

**1. Setup Server**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y
```

**2. Deploy Application**

```bash
# Clone repository
git clone https://github.com/yourusername/ai-pulse-pro.git
cd ai-pulse-pro

# Configure environment
cp .env.example .env
nano .env

# Start services
docker compose up -d
```

**3. Setup Nginx (Optional)**

```nginx
server {
    listen 80;
    server_name yoursite.com;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
```

---

## 📊 Monitoring

### Health Checks

```python
# backend/health.py
def check_health():
    return {
        'database': check_database(),
        'ollama': check_ollama(),
        'disk_space': check_disk_space(),
        'memory': check_memory()
    }
```

### Metrics

```python
# Track important metrics
metrics = {
    'articles_processed': get_article_count(),
    'content_generated': get_content_count(),
    'pipeline_runs': get_pipeline_runs(),
    'avg_processing_time': get_avg_time()
}
```

---

## 📞 Getting Help

### Resources

- **Documentation:** [`docs/`](.)
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions

### Community

- Discord: (link)
- Twitter: @aipulsepro

---

**Document Version:** 2.0  
**Last Updated:** February 13, 2026
