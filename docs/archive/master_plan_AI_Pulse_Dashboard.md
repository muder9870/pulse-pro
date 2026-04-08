# AI Pulse Pro - Master Plan
## 4-Week Implementation Roadmap

**Project Duration:** 28 Days (4 Weeks)  
**Estimated Hours:** 80-100 hours total  
**Difficulty Level:** Intermediate  
**Prerequisites:** Basic Python knowledge, willingness to learn

---

## 🗓️ Week-by-Week Breakdown

### **WEEK 1: Foundation & Data Collection**
**Goal:** Set up project infrastructure and build all data fetchers

#### Day 1-2: Project Setup (8 hours)
**Tasks:**
- [ ] Install Python 3.11+ and create virtual environment
- [ ] Initialize Git repository
- [ ] Set up project folder structure
- [ ] Install core dependencies
- [ ] Create SQLite database with all tables
- [ ] Write `.env.example` template
- [ ] Test basic Flask app runs

**Deliverables:**
```bash
ai-pulse-pro/
├── venv/
├── backend/
│   ├── main.py (Hello World Flask app)
│   ├── database.py (All table schemas)
│   └── config.py (Load .env variables)
├── data/
│   └── app.db (Empty database)
├── requirements.txt
└── .env (Your credentials)
```

**Dependencies to Install:**
```txt
flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
arxiv==2.1.0
praw==7.7.1
beautifulsoup4==4.12.2
requests==2.31.0
schedule==1.2.0
feedparser==6.0.10
ollama==0.1.6
```

---

#### Day 3-4: arXiv Fetcher (10 hours)
**Tasks:**
- [ ] Create `fetchers/arxiv_fetcher.py`
- [ ] Implement search by category (cs.AI, cs.LG, cs.CV)
- [ ] Respect 3-second delay between requests
- [ ] Parse paper metadata (title, authors, abstract, PDF link)
- [ ] Save to `raw_articles` table
- [ ] Add error handling for API failures
- [ ] Test with 10 papers

**Code Structure:**
```python
# fetchers/arxiv_fetcher.py
import arxiv
import time

class ArxivFetcher:
    def __init__(self):
        self.categories = ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL']
    
    def fetch_latest_papers(self, max_results=50):
        """Fetch latest papers from arXiv"""
        pass
    
    def save_to_db(self, papers):
        """Save papers to raw_articles table"""
        pass
```

**Testing:**
```bash
python -m backend.fetchers.arxiv_fetcher
# Should fetch 50 papers and save to database
```

---

#### Day 5-6: Gmail Newsletter Fetcher (12 hours)
**Tasks:**
- [ ] Create `fetchers/gmail_fetcher.py`
- [ ] Connect via IMAP to Gmail
- [ ] Search for specific senders (TLDR AI, DeepLearning.AI)
- [ ] Parse email HTML/plain text
- [ ] Extract article links from newsletters
- [ ] Remove ads and promotional content
- [ ] Save cleaned content to database
- [ ] Mark emails as read (optional)

**Code Structure:**
```python
# fetchers/gmail_fetcher.py
import imaplib
import email
from bs4 import BeautifulSoup

class GmailFetcher:
    def __init__(self, email_addr, app_password):
        self.email = email_addr
        self.password = app_password
        self.imap = None
    
    def connect(self):
        """Connect to Gmail IMAP"""
        pass
    
    def fetch_newsletters(self, senders_list):
        """Fetch emails from specific senders"""
        pass
    
    def parse_email_content(self, raw_email):
        """Extract article links and summaries"""
        pass
```

**Newsletter Senders to Track:**
- tldr@mail.tldrnewsletter.com
- batch@deeplearning.ai
- newsletters@superhuman.com
- (Add more based on your subscriptions)

---

#### Day 7: Reddit & GitHub Fetchers (6 hours)
**Tasks:**
- [ ] Create `fetchers/reddit_fetcher.py`
  - Connect to Reddit API with PRAW
  - Fetch top posts from r/MachineLearning, r/ArtificialIntelligence
  - Extract post title, URL, score, comments
  
- [ ] Create `fetchers/github_fetcher.py`
  - Scrape GitHub Trending page
  - Extract repo name, description, stars, language
  - Focus on Python/Jupyter Notebook repos

**Testing:**
```bash
# Test Reddit fetcher
python -m backend.fetchers.reddit_fetcher
# Should save 25 top Reddit posts

# Test GitHub fetcher
python -m backend.fetchers.github_fetcher
# Should save 25 trending repos
```

---

**Week 1 Checkpoint:**
- ✅ 4 data sources working
- ✅ Database has 100+ raw articles
- ✅ All fetchers handle errors gracefully
- ✅ Logs show successful fetches

---

### **WEEK 2: Processing & Intelligence**
**Goal:** Clean data, remove duplicates, and add AI-powered analysis

#### Day 8-9: Data Cleaning & Deduplication (10 hours)
**Tasks:**
- [ ] Create `processors/cleaner.py`
  - Remove HTML tags from newsletter content
  - Strip ads and promotional text
  - Standardize date formats
  - Extract core content only

- [ ] Create `processors/deduplicator.py`
  - Compare article titles (fuzzy matching)
  - Check URL similarity
  - Detect if arXiv paper mentioned in newsletter
  - Mark duplicates in database

**Deduplication Logic:**
```python
# processors/deduplicator.py
from difflib import SequenceMatcher

def are_duplicates(title1, title2, threshold=0.85):
    """Check if two titles are similar"""
    similarity = SequenceMatcher(None, title1.lower(), title2.lower()).ratio()
    return similarity > threshold

def deduplicate_articles():
    """Find and mark duplicate articles"""
    # 1. Fetch all unprocessed articles
    # 2. Compare each pair
    # 3. Keep highest quality source (arXiv > Newsletter > Reddit)
    # 4. Mark duplicates
    pass
```

---

#### Day 10-11: Install & Configure Ollama (8 hours)
**Tasks:**
- [ ] Install Ollama on your machine
- [ ] Download Llama 3.1 8B model
- [ ] Test basic prompts
- [ ] Create `processors/analyzer.py`
  - Send article to Ollama for summarization
  - Extract key takeaways (3-5 bullet points)
  - Identify main category (LLM, CV, Robotics, etc.)

**Installation:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download model
ollama pull llama3.1:8b

# Test
ollama run llama3.1:8b "Explain what a transformer is in AI"
```

**Analyzer Code:**
```python
# processors/analyzer.py
import ollama

class ArticleAnalyzer:
    def __init__(self):
        self.model = "llama3.1:8b"
    
    def summarize(self, article_text):
        """Generate 2-sentence summary"""
        prompt = f"""Summarize this AI article in exactly 2 sentences:

{article_text}

Summary:"""
        response = ollama.generate(model=self.model, prompt=prompt)
        return response['response']
    
    def extract_key_points(self, article_text):
        """Extract 3-5 key takeaways"""
        pass
    
    def categorize(self, article_text):
        """Determine category: LLM, CV, NLP, Robotics, etc."""
        pass
```

---

#### Day 12-13: Scoring Algorithm (10 hours)
**Tasks:**
- [ ] Create `processors/scorer.py`
- [ ] Implement viral potential scoring
  - Check Reddit upvotes
  - Analyze title clickability
  - Measure recency (last 24h = boost)
  - Keyword matching (GPT-5, AGI, breakthrough)

- [ ] Implement technical significance scoring
  - arXiv citations (via API)
  - Source authority (arXiv > Blog)
  - Methodology rigor (detect "peer-reviewed")

- [ ] Implement relevance scoring
  - Match against user preferences
  - Historical engagement tracking

**Scoring Code:**
```python
# processors/scorer.py
import math
from datetime import datetime, timedelta

class ArticleScorer:
    def __init__(self):
        self.viral_keywords = ['gpt-5', 'agi', 'breakthrough', 'beats', 'surpasses']
        self.tech_keywords = ['peer-reviewed', 'reproducible', 'open-source']
    
    def calculate_viral_score(self, article):
        """Calculate viral potential (0-100)"""
        score = 0
        
        # Recency boost
        hours_old = (datetime.now() - article.fetched_at).total_seconds() / 3600
        recency = max(0, 100 - (hours_old * 2))  # Decay 2 points per hour
        score += recency * 0.3
        
        # Engagement metrics
        if article.source == 'reddit':
            score += min(article.upvotes / 10, 30)  # Max 30 points
        
        # Keyword matching
        title_lower = article.title.lower()
        keyword_matches = sum(1 for kw in self.viral_keywords if kw in title_lower)
        score += keyword_matches * 10
        
        # Simplicity (shorter titles = more viral)
        title_length = len(article.title.split())
        if title_length < 12:
            score += 15
        
        return min(int(score), 100)
    
    def calculate_tech_score(self, article):
        """Calculate technical significance (0-100)"""
        pass
    
    def calculate_relevance_score(self, article, user_prefs):
        """Calculate user-specific relevance (0-100)"""
        pass
```

---

#### Day 14: Integration & Testing (6 hours)
**Tasks:**
- [ ] Create `main_pipeline.py`
  - Run all fetchers
  - Clean data
  - Deduplicate
  - Analyze with LLM
  - Score articles
  - Save to `processed_articles` table

- [ ] Test complete pipeline
- [ ] Fix bugs
- [ ] Add logging

**Pipeline Code:**
```python
# main_pipeline.py
from fetchers import arxiv_fetcher, gmail_fetcher, reddit_fetcher
from processors import cleaner, deduplicator, analyzer, scorer

def run_daily_pipeline():
    print("Starting AI Pulse pipeline...")
    
    # Step 1: Fetch data
    arxiv_fetcher.fetch_latest_papers()
    gmail_fetcher.fetch_newsletters()
    reddit_fetcher.fetch_top_posts()
    
    # Step 2: Clean
    cleaner.clean_all_articles()
    
    # Step 3: Deduplicate
    deduplicator.deduplicate_articles()
    
    # Step 4: Analyze
    analyzer.analyze_all_articles()
    
    # Step 5: Score
    scorer.score_all_articles()
    
    print("Pipeline complete!")

if __name__ == "__main__":
    run_daily_pipeline()
```

---

**Week 2 Checkpoint:**
- ✅ All articles are cleaned and deduplicated
- ✅ Ollama generates summaries
- ✅ Scoring algorithm ranks articles
- ✅ Database has `processed_articles` with scores

---

### **WEEK 3: Content Generation & Dashboard**
**Goal:** Generate platform-specific content and build web interface

#### Day 15-16: Content Generator (12 hours)
**Tasks:**
- [ ] Create `generators/platform_templates.py`
  - Define templates for all 15 platforms
  - Include character limits
  - Add tone variations

- [ ] Create `generators/content_generator.py`
  - Take processed article
  - Generate content for selected platforms
  - Use Ollama for variations
  - Save to `generated_content` table

**Template Structure:**
```python
# generators/platform_templates.py

PLATFORM_CONFIGS = {
    'twitter': {
        'char_limit': 280,
        'tone': 'casual',
        'format': 'thread',
        'template': """🚀 {title}

{summary}

Key takeaway: {takeaway}

#{hashtag1} #{hashtag2}"""
    },
    
    'linkedin': {
        'char_limit': 3000,
        'tone': 'professional',
        'format': 'long-form',
        'template': """{title}

{detailed_analysis}

Technical Insights:
{key_points}

Industry Impact:
{implications}

What are your thoughts? 💬

#AI #MachineLearning #Technology"""
    },
    
    # ... 13 more platforms
}
```

**Generator Code:**
```python
# generators/content_generator.py
import ollama
from .platform_templates import PLATFORM_CONFIGS

class ContentGenerator:
    def __init__(self):
        self.model = "llama3.1:8b"
    
    def generate_for_platform(self, article, platform):
        """Generate platform-specific content"""
        config = PLATFORM_CONFIGS[platform]
        
        prompt = f"""Generate a {config['tone']} social media post for {platform}.
        
Article: {article.title}
Summary: {article.summary}
Key Points: {article.key_takeaways}

Requirements:
- Character limit: {config['char_limit']}
- Tone: {config['tone']}
- Format: {config['format']}

Post:"""
        
        response = ollama.generate(model=self.model, prompt=prompt)
        content = response['response']
        
        # Ensure character limit
        if len(content) > config['char_limit']:
            content = content[:config['char_limit']-3] + "..."
        
        return content
    
    def generate_all_platforms(self, article, platforms_list):
        """Generate content for multiple platforms"""
        results = {}
        for platform in platforms_list:
            results[platform] = self.generate_for_platform(article, platform)
        return results
```

---

#### Day 17-19: Build Web Dashboard (18 hours)
**Tasks:**
- [ ] Set up React project
- [ ] Install Tailwind CSS
- [ ] Create components:
  - Dashboard layout
  - Story card
  - Platform selector
  - Content preview with copy button
  - Export functionality

- [ ] Build Flask API endpoints:
  - GET /api/stories (fetch today's top stories)
  - GET /api/content/:id/:platform (get specific content)
  - POST /api/generate (regenerate content)
  - GET /api/export (download all as Markdown)

**React Components:**
```jsx
// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import StoryCard from './StoryCard';
import PlatformSelector from './PlatformSelector';

function Dashboard() {
  const [stories, setStories] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([
    'twitter', 'linkedin', 'reddit'
  ]);

  useEffect(() => {
    fetch('/api/stories')
      .then(res => res.json())
      .then(data => setStories(data));
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Pulse Dashboard</h1>
      
      <PlatformSelector 
        selected={selectedPlatforms}
        onChange={setSelectedPlatforms}
      />
      
      <div className="space-y-6 mt-6">
        {stories.map(story => (
          <StoryCard 
            key={story.id}
            story={story}
            platforms={selectedPlatforms}
          />
        ))}
      </div>
    </div>
  );
}
```

**Flask API:**
```python
# backend/main.py
from flask import Flask, jsonify, request
from database import get_top_stories, get_content_for_platform

app = Flask(__name__)

@app.route('/api/stories')
def get_stories():
    """Get today's top 10 stories"""
    stories = get_top_stories(limit=10)
    return jsonify(stories)

@app.route('/api/content/<int:article_id>/<platform>')
def get_content(article_id, platform):
    """Get generated content for specific platform"""
    content = get_content_for_platform(article_id, platform)
    return jsonify({'content': content})

@app.route('/api/export')
def export_all():
    """Export all content as Markdown"""
    pass

if __name__ == '__main__':
    app.run(debug=True)
```

---

#### Day 20-21: Polish & Features (10 hours)
**Tasks:**
- [ ] Add "Copy to Clipboard" functionality
- [ ] Implement content preview modal
- [ ] Add inline editing for content
- [ ] Create export to PDF/Markdown
- [ ] Add loading indicators
- [ ] Implement error handling
- [ ] Style everything with Tailwind

**Copy to Clipboard:**
```jsx
// src/components/CopyButton.jsx
import { Copy, Check } from 'lucide-react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn">
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

---

**Week 3 Checkpoint:**
- ✅ Content generator works for all 15 platforms
- ✅ Dashboard displays stories
- ✅ Copy-to-clipboard works
- ✅ Export functionality complete

---

### **WEEK 4: Automation & Deployment**
**Goal:** Set up scheduled tasks and deployment

#### Day 22-23: Task Scheduler (10 hours)
**Tasks:**
- [ ] Install APScheduler
- [ ] Create `scheduler.py`
  - Run pipeline every 24 hours
  - Run at specific time (e.g., 6 AM)
  - Send notification when complete

- [ ] Add email notifications (optional)
- [ ] Create logs for monitoring

**Scheduler Code:**
```python
# backend/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from main_pipeline import run_daily_pipeline
import logging

logging.basicConfig(level=logging.INFO)

def scheduled_job():
    logging.info("Starting scheduled pipeline...")
    try:
        run_daily_pipeline()
        logging.info("Pipeline completed successfully!")
    except Exception as e:
        logging.error(f"Pipeline failed: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_job, 'cron', hour=6)  # Run at 6 AM daily
scheduler.start()

print("Scheduler started. Pipeline will run daily at 6 AM.")
```

---

#### Day 24-25: Docker Setup (8 hours)
**Tasks:**
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Test container builds
- [ ] Test volume mounting for database
- [ ] Write deployment instructions

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Pull LLM model
RUN ollama pull llama3.1:8b

EXPOSE 5000

CMD ["python", "backend/main.py"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  ai-pulse:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
```

---

#### Day 26: Testing & Bug Fixes (6 hours)
**Tasks:**
- [ ] Test entire system end-to-end
- [ ] Fix any bugs found
- [ ] Optimize slow queries
- [ ] Improve error messages
- [ ] Update README with setup instructions

**Test Checklist:**
- [ ] Fetchers retrieve data without errors
- [ ] Deduplication catches duplicates
- [ ] Ollama generates coherent summaries
- [ ] Scores are reasonable (not all 100 or 0)
- [ ] Dashboard loads all stories
- [ ] Copy button works on all platforms
- [ ] Export downloads correctly

---

#### Day 27: Documentation (6 hours)
**Tasks:**
- [ ] Write comprehensive README.md
- [ ] Document all environment variables
- [ ] Create user guide with screenshots
- [ ] Write troubleshooting section
- [ ] Add contribution guidelines

**README Structure:**
```markdown
# AI Pulse Pro

> Your personal AI research assistant and content generator

## Quick Start
1. Clone repo
2. Install dependencies
3. Configure .env
4. Run: `python backend/main.py`

## Setup Guide
### 1. Install Ollama
### 2. Configure Gmail
### 3. Get Reddit API Keys
### 4. Set User Preferences

## Usage
...

## Troubleshooting
...

## License
MIT
```

---

#### Day 28: Deployment & Launch (4 hours)
**Tasks:**
- [ ] Deploy to Render/Railway (optional)
- [ ] Test on production
- [ ] Share on social media (dogfooding!)
- [ ] Collect feedback
- [ ] Plan v2.0 features

**Deployment Options:**
1. **Local Machine:** Keep running on your laptop
2. **Render.com:** Free tier (limited hours)
3. **Railway.app:** $5/month
4. **VPS (DigitalOcean):** $6/month

---

**Week 4 Checkpoint:**
- ✅ System runs automatically daily
- ✅ Docker container works
- ✅ Documentation complete
- ✅ App is live!

---

## 📦 Deliverables Summary

### Week 1
- ✅ Working data fetchers (arXiv, Gmail, Reddit, GitHub)
- ✅ Database with 100+ articles
- ✅ All fetchers with error handling

### Week 2
- ✅ Data cleaning & deduplication
- ✅ Ollama integration for summaries
- ✅ Scoring algorithm implemented
- ✅ Complete pipeline script

### Week 3
- ✅ Content generator for 15 platforms
- ✅ React dashboard with Tailwind
- ✅ Copy-to-clipboard functionality
- ✅ Export feature

### Week 4
- ✅ Scheduled daily automation
- ✅ Docker deployment
- ✅ Complete documentation
- ✅ Live application

---

## 🛠️ Tools & Resources

### Required Accounts (Free)
- **Gmail:** App-specific password
- **Reddit:** Create app at reddit.com/prefs/apps
- **GitHub:** No account needed (scraping)
- **Ollama:** Download from ollama.com

### Recommended Tools
- **VS Code:** Code editor
- **Postman:** Test Flask API
- **DB Browser for SQLite:** View database
- **Git:** Version control

### Learning Resources
- Flask tutorial: flask.palletsprojects.com
- React docs: react.dev
- Ollama docs: ollama.com/docs
- Reddit API: praw.readthedocs.io

---

## ⚠️ Common Pitfalls & Solutions

### Problem: Ollama is slow
**Solution:** Use smaller model (Llama 3.1 8B) or reduce batch size

### Problem: Gmail IMAP connection fails
**Solution:** 
1. Enable 2FA
2. Generate App Password (not your real password)
3. Use that password in .env

### Problem: Too many duplicates
**Solution:** Adjust similarity threshold in deduplicator (from 0.85 to 0.90)

### Problem: Scoring seems random
**Solution:** Log intermediate values and tune weights

### Problem: React app won't connect to Flask
**Solution:** Enable CORS in Flask (`flask-cors`)

---

## 🎯 Success Metrics

### By End of Week 1
- [ ] 4 data sources functional
- [ ] 100+ articles in database
- [ ] No errors in logs

### By End of Week 2
- [ ] Ollama generates summaries
- [ ] Deduplication rate >90%
- [ ] Top 10 articles ranked correctly

### By End of Week 3
- [ ] Dashboard displays content
- [ ] All 15 platforms have templates
- [ ] Copy function works 100%

### By End of Week 4
- [ ] System runs automatically
- [ ] You've posted content manually 7 days straight
- [ ] Documentation is complete

---

## 🚀 Post-Launch Plan

### Month 1: User Testing
- Use system daily
- Track what platforms you use most
- Note which content performs best
- Collect pain points

### Month 2: Feature Additions
- Add more data sources
- Improve scoring algorithm
- Better content templates
- Add image generation

### Month 3: Optimization
- Speed up pipeline
- Reduce LLM tokens
- Improve dashboard UX
- Add analytics

### Month 4+: SaaS Consideration
- Multi-user support
- Cloud hosting
- Automated posting (with approval)
- Subscription model

---

## 📊 Time Allocation Breakdown

| Phase | Hours | Percentage |
|-------|-------|------------|
| Data Collection | 24h | 24% |
| Processing/AI | 28h | 28% |
| Content Generation | 12h | 12% |
| Dashboard/UI | 18h | 18% |
| Automation | 10h | 10% |
| Testing/Docs | 8h | 8% |
| **TOTAL** | **100h** | **100%** |

---

## 🎓 Learning Outcomes

By completing this project, you will learn:
- ✅ API integration (arXiv, Reddit, Gmail)
- ✅ Web scraping with BeautifulSoup
- ✅ Working with LLMs (Ollama)
- ✅ Database design (SQLite)
- ✅ Full-stack development (Flask + React)
- ✅ Task scheduling and automation
- ✅ Docker containerization
- ✅ Content strategy for social media

---

## 📝 Final Checklist

**Before Starting:**
- [ ] Read both Master Blueprint and Master Plan
- [ ] Install required software (Python, Node.js, Ollama)
- [ ] Create necessary accounts (Reddit API, Gmail App Password)
- [ ] Set up development environment
- [ ] Clone/fork starter repo (if provided)

**During Development:**
- [ ] Commit code daily to Git
- [ ] Write tests for critical functions
- [ ] Document tricky solutions
- [ ] Track hours spent per task
- [ ] Ask for help when stuck >2 hours

**After Launch:**
- [ ] Use system for 7 consecutive days
- [ ] Fix critical bugs immediately
- [ ] Gather feedback from yourself
- [ ] Plan next features
- [ ] Share project publicly (GitHub, LinkedIn)

---

---

### **WEEK 5: Hashtag Intelligence Module**
**Goal:** Build trending hashtag tracker and smart recommender

#### Day 29-30: Hashtag Collectors (12 hours)
**Tasks:**
- [ ] Create `fetchers/hashtag_collectors/` directory
- [ ] Build Twitter hashtag scraper
  - Use Selenium or API (if available)
  - Extract trending topics from Explore page
  - Filter AI/ML related hashtags
- [ ] Build Reddit hashtag collector
  - Extract popular flairs from r/MachineLearning
  - Parse hashtags from post titles
  - Track upvote counts per hashtag
- [ ] Build Instagram hashtag scraper
  - Use browser automation to check trending
  - Focus on #AI, #MachineLearning communities
- [ ] Create database tables for hashtags
- [ ] Test all collectors

**Deliverables:**
```python
# fetchers/hashtag_collectors/twitter_collector.py
# fetchers/hashtag_collectors/reddit_collector.py
# fetchers/hashtag_collectors/instagram_collector.py
```

---

#### Day 31-32: Hashtag Analyzer & Scorer (10 hours)
**Tasks:**
- [ ] Create `processors/hashtag_analyzer.py`
- [ ] Implement volume tracking (posts per hour)
- [ ] Calculate engagement rate (likes/comments per hashtag)
- [ ] Build trend detection algorithm
  - Compare current hour vs last 6 hours
  - Detect rising vs declining hashtags
- [ ] Categorize hashtags (LLM, CV, NLP, etc.)
- [ ] Calculate trend score (0-100)
- [ ] Schedule hourly updates

**Scoring Algorithm:**
```python
def calculate_trend_score(hashtag_data):
    volume_score = min(hashtag_data['volume'] / 1000, 40)
    growth_score = min(hashtag_data['growth_rate'] * 30, 30)
    engagement_score = min(hashtag_data['engagement_rate'] * 20, 20)
    recency_score = max(10 - hashtag_data['hours_trending'], 0)
    return int(volume_score + growth_score + engagement_score + recency_score)
```

---

#### Day 33-34: Hashtag Recommender (10 hours)
**Tasks:**
- [ ] Create `processors/hashtag_recommender.py`
- [ ] Build relevance matching algorithm
  - Match hashtags to article category
  - Extract keywords from content
  - Calculate relevance score (0-1)
- [ ] Implement smart mixing strategy
  - 3 trending hashtags
  - 2 niche/evergreen hashtags
- [ ] Platform-specific recommendations
  - Twitter: 3-5 tags
  - Instagram: 20-30 tags
  - LinkedIn: 3-5 professional tags
- [ ] Test recommendations on sample articles

**Code Structure:**
```python
class HashtagRecommender:
    def recommend_for_article(self, article, platform):
        trending = get_trending_hashtags(platform, limit=50)
        scored = self.score_relevance(trending, article)
        top_trending = scored[:3]
        niche_tags = self.get_niche_tags(article.category)[:2]
        return top_trending + niche_tags
```

---

#### Day 35: Dashboard Integration & Testing (8 hours)
**Tasks:**
- [ ] Add hashtag panel to React dashboard
- [ ] Display trending hashtags with scores
- [ ] Show recommended hashtags per article/platform
- [ ] Add "Copy Hashtags" button
- [ ] Visual indicators for trending/rising/declining
- [ ] Test full hashtag workflow
- [ ] Fix any bugs

**Dashboard Component:**
```jsx
// src/components/HashtagPanel.jsx
function HashtagPanel({ article, platform }) {
  const [hashtags, setHashtags] = useState([]);
  
  return (
    <div className="bg-blue-50 rounded-lg p-4">
      <h4>Recommended Hashtags</h4>
      {hashtags.map(tag => (
        <span className="bg-blue-600 text-white px-3 py-1 rounded-full">
          {tag.hashtag}
        </span>
      ))}
    </div>
  );
}
```

---

**Week 5 Checkpoint:**
- ✅ Hashtag collectors fetch 100+ tags daily
- ✅ Trend scores update every 6 hours
- ✅ Recommender suggests 3-5 optimal tags
- ✅ Dashboard displays hashtags beautifully

---

### **WEEK 6: Personal Blog Auto-Publisher**
**Goal:** Generate long-form content and auto-publish to blog platforms

#### Day 36-37: Long-Form Content Generator (12 hours)
**Tasks:**
- [ ] Create `generators/blog_generator.py`
- [ ] Extend Ollama prompts for 2000+ words
- [ ] Implement blog post structure
  - Introduction (200 words)
  - Main analysis (3-4 sections, 1200 words)
  - Implications (300 words)
  - Conclusion (200 words)
- [ ] Add Table of Contents generation
- [ ] Format with proper markdown headings
- [ ] Add code block formatting
- [ ] Include citations and sources
- [ ] Calculate word count and reading time

**Generator Code:**
```python
class BlogPostGenerator:
    def generate_blog_post(self, article):
        prompt = f"""Write a 2000-word blog post about: {article.title}
        
        Structure:
        ## Introduction
        ## Main Analysis (3 sections)
        ## Implications
        ## Conclusion
        
        Include examples and real-world applications."""
        
        content = ollama.generate(model='llama3.1:8b', prompt=prompt)
        return self.format_blog_post(content)
```

---

#### Day 38-39: Platform Connectors (12 hours)
**Tasks:**
- [ ] Create `generators/blog_publishers/` directory
- [ ] Build Medium API connector
  - Authenticate with API token
  - Publish as draft
  - Support tags
- [ ] Build Dev.to API connector
  - Use API key authentication
  - Markdown support
  - Tag handling (max 4 tags)
- [ ] Build WordPress REST API connector
  - App password authentication
  - Convert markdown to HTML
  - Tag creation/assignment
- [ ] Add error handling for all publishers
- [ ] Test publishing to each platform

**Medium Publisher:**
```python
class MediumPublisher:
    def publish_post(self, title, content, tags=[], status='draft'):
        headers = {"Authorization": f"Bearer {self.api_token}"}
        data = {
            "title": title,
            "contentFormat": "markdown",
            "content": content,
            "tags": tags,
            "publishStatus": status
        }
        response = requests.post(f"{self.base_url}/users/{user_id}/posts", 
                               headers=headers, json=data)
        return response.json()
```

---

#### Day 40-41: SEO Optimization (10 hours)
**Tasks:**
- [ ] Build SEO optimizer module
- [ ] Generate meta descriptions (160 chars)
- [ ] Extract focus keywords
- [ ] Calculate readability score (Flesch-Kincaid)
- [ ] Optimize heading hierarchy (H1, H2, H3)
- [ ] Generate URL-friendly slugs
- [ ] Add internal linking suggestions
- [ ] Create alt text for images (if generated)

**SEO Code:**
```python
class SEOOptimizer:
    def generate_meta_description(self, content):
        first_paragraph = content.split('\n\n')[0]
        if len(first_paragraph) > 160:
            return first_paragraph[:157] + "..."
        return first_paragraph
    
    def extract_focus_keyword(self, title, content):
        # Use TF-IDF or simple frequency analysis
        words = content.lower().split()
        freq = {}
        for word in words:
            if len(word) > 4:
                freq[word] = freq.get(word, 0) + 1
        return max(freq, key=freq.get)
    
    def calculate_readability(self, content):
        import textstat
        return textstat.flesch_reading_ease(content)
```

---

#### Day 42: Final Integration & Deployment (6 hours)
**Tasks:**
- [ ] Add blog publisher to dashboard
- [ ] Create blog post preview modal
- [ ] Add platform selection checkboxes
- [ ] Implement "Publish as Draft" feature
- [ ] Add publishing history table
- [ ] Test complete workflow:
  1. Generate blog post
  2. Preview content
  3. Select platforms
  4. Publish as draft
  5. Verify on each platform
- [ ] Update documentation
- [ ] Deploy final version

**Dashboard Integration:**
```jsx
// src/components/BlogPublisher.jsx
function BlogPublisher({ article }) {
  const [blogPost, setBlogPost] = useState(null);
  
  const generateBlog = async () => {
    const response = await fetch(`/api/blog/generate/${article.id}`);
    const data = await response.json();
    setBlogPost(data);
  };
  
  const publishToPlatforms = async () => {
    // Publish to selected platforms
  };
  
  return (
    <div>
      <button onClick={generateBlog}>Generate Blog Post</button>
      {blogPost && (
        <div>
          <h4>{blogPost.title}</h4>
          <p>{blogPost.word_count} words · {blogPost.reading_time} min</p>
          <button onClick={publishToPlatforms}>Publish</button>
        </div>
      )}
    </div>
  );
}
```

---

**Week 6 Checkpoint:**
- ✅ Long-form generator creates 2000+ word articles
- ✅ Can publish to Medium, Dev.to, WordPress
- ✅ SEO optimization works
- ✅ Dashboard has complete blog publishing workflow

---

## 📊 Updated Time Allocation (6 Weeks Total)

| Phase | Hours | Percentage |
|-------|-------|------------|
| Data Collection (Week 1) | 24h | 20% |
| Processing/AI (Week 2) | 28h | 23% |
| Content Generation (Week 3) | 30h | 25% |
| Automation (Week 4) | 18h | 15% |
| Hashtag Intelligence (Week 5) | 20h | 17% |
| Blog Publishing (Week 6) | 20h | 17% |
| **TOTAL** | **140h** | **100%** |

---

## 🎯 Final Success Metrics (All Features)

### Core Features (Weeks 1-4)
- ✅ Fetch 50+ articles daily from 7 sources
- ✅ 90%+ deduplication accuracy
- ✅ Generate content for 15 platforms
- ✅ Dashboard loads in <3 seconds

### Hashtag Intelligence (Week 5)
- ✅ Track 100+ trending hashtags
- ✅ Update trends every 6 hours
- ✅ 80%+ recommendation relevance
- ✅ Platform-optimized suggestions

### Blog Publishing (Week 6)
- ✅ Generate 1500-2500 word posts
- ✅ Publish to 3+ platforms
- ✅ 70+ readability score
- ✅ Draft mode for manual review

---

## 📦 Complete Dependencies List

```txt
# Core (Weeks 1-4)
flask==3.0.0
flask-cors==4.0.0
python-dotenv==1.0.0
arxiv==2.1.0
praw==7.7.1
beautifulsoup4==4.12.2
requests==2.31.0
schedule==1.2.0
feedparser==6.0.10
ollama==0.1.6

# Hashtag Intelligence (Week 5)
tweepy==4.14.0
selenium==4.15.0

# Blog Publishing (Week 6)
python-wordpress-xmlrpc==2.3
markdown==3.5.1
python-frontmatter==1.0.0
pillow==10.1.0
textstat==0.7.3
```

---

## 🔧 Complete .env Configuration

```bash
# Data Sources
GMAIL_EMAIL=your_email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=AI-Pulse-Pro/1.0

# Hashtag Intelligence (Week 5)
TWITTER_BEARER_TOKEN=your_token_here  # Optional
INSTAGRAM_SESSION_ID=your_session_here  # Optional

# Blog Publishing (Week 6)
MEDIUM_API_TOKEN=your_integration_token
DEVTO_API_KEY=your_api_key
WORDPRESS_URL=https://yourblog.com
WORDPRESS_USERNAME=your_username
WORDPRESS_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Optional
STABLE_DIFFUSION_API_KEY=your_key_here  # For image generation
```

---

## 🚀 Complete 6-Week Launch Checklist

**Week 1:**
- [ ] All data fetchers working
- [ ] Database has 100+ articles
- [ ] No errors in logs

**Week 2:**
- [ ] LLM generates summaries
- [ ] Deduplication works >90%
- [ ] Scoring algorithm ranks correctly

**Week 3:**
- [ ] Dashboard displays stories
- [ ] All 15 platform templates ready
- [ ] Copy-to-clipboard works

**Week 4:**
- [ ] Automated daily pipeline runs
- [ ] Docker container builds
- [ ] Documentation complete

**Week 5:**
- [ ] Hashtag collectors fetch trends
- [ ] Recommender suggests tags
- [ ] Dashboard shows hashtags

**Week 6:**
- [ ] Blog generator creates posts
- [ ] Publishers connect to platforms
- [ ] Can publish drafts successfully

---

## 🎉 What You'll Have After 6 Weeks

A complete AI content automation system that:

1. **Monitors** 7+ AI news sources 24/7
2. **Processes** 50+ articles daily with AI
3. **Tracks** 100+ trending hashtags
4. **Generates** platform-specific content for 15 channels
5. **Recommends** optimal hashtags per post
6. **Creates** 2000-word blog posts
7. **Publishes** to Medium, Dev.to, WordPress
8. **Displays** everything in a beautiful dashboard
9. **Exports** reports and analytics
10. **Costs** $0/month to run

**Time to first post:** 5 minutes daily  
**Monthly value:** Saves 40+ hours of manual work  
**ROI:** Infinite (free to run)

---

**Document Version:** 2.0  
**Status:** Ready to Execute (Enhanced)  
**Next Step:** Start Week 1, Day 1 Setup

---

## 💬 Need Help?

**During Development:**
- Check logs first
- Re-read relevant blueprint/addon docs
- Google the specific error
- Ask Claude/ChatGPT for debugging help

**After Launch:**
- Join AI dev communities (Reddit, Discord)
- Share your project for feedback
- Connect with other builders

---

**Good luck building! 🚀**

*Remember: Perfect is the enemy of done. Ship the MVP first (Weeks 1-4), then add features (Weeks 5-6).*