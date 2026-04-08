# AI Pulse Pro - User Guide

**Version:** 2.0  
**Last Updated:** February 13, 2026

---

## 🎯 What is AI Pulse Pro?

AI Pulse Pro is your **personal AI content creation assistant** that:

1. **Monitors** 6+ sources for AI/ML news 24/7
2. **Analyzes** articles using local AI (Ollama)
3. **Scores** articles to find the most important ones
4. **Generates** platform-specific posts for 15+ platforms
5. **Recommends** trending hashtags for better reach
6. **Creates** long-form blog posts with SEO
7. **Publishes** to Medium, Dev.to, WordPress
8. **Schedules** content for optimal times

**All of this happens locally on your machine, with no cloud costs!**

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Ollama (for local LLM)
- Docker + Docker Compose (optional)

### Installation

**1. Backend Setup**

```bash
# Clone repository
cd "d:\Pulse Pro"

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your settings

# Start backend
python -m backend.main
```

**2. Frontend Setup**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**3. Ollama Setup**

```bash
# Install Ollama from https://ollama.ai

# Pull the model
ollama pull llama3.1:8b

# Verify it's running
ollama list
```

**4. Access Dashboard**
Open browser to: `http://localhost:5173`

---

## 🐳 Docker Quick Start

```bash
# Build and start services
docker compose up --build

# Access dashboard
# Open browser to http://localhost
```

---

## 📊 How It Works

### The Complete Workflow

```
1. FETCH (2-5 min)
   ↓ Collect articles from arXiv, GitHub, RSS, Gmail, Reddit

2. CLEAN (30 sec)
   ↓ Remove HTML, ads, normalize text

3. DEDUPLICATE (10 sec)
   ↓ Remove duplicate articles

4. ANALYZE (10-15 min) ⏱️ SLOWEST
   ↓ AI summarization, key points, sentiment

5. SCORE (5 sec)
   ↓ Viral, technical, relevance scores

6. GENERATE TAGS (30 sec)
   ↓ Create hashtags and tags

7. GENERATE CONTENT (10-15 min)
   ↓ Platform-specific posts

8. COMPLETE ✅
   ↓ Ready to review and post!
```

**Total Time:** 20-30 minutes

---

## 🎛️ Dashboard Guide

### Main Features

#### 1. **Stories Feed**

- View all processed articles
- Sorted by score (highest first)
- Color-coded by category
- Expandable cards for details

**Actions:**

- 📋 Copy content to clipboard
- ✏️ Edit content inline
- 🔄 Regenerate content
- ✓ Mark as posted
- 📝 Generate blog post

#### 2. **Platform Selector**

Toggle platforms on/off to view only relevant content:

- Twitter/X
- LinkedIn
- Reddit
- HackerNews
- Medium
- Facebook, Instagram, TikTok, YouTube, etc.

#### 3. **RSS Feed Manager**

- Add new RSS feeds
- Remove inactive feeds
- Import OPML files
- Enable/disable feeds
- View feed statistics

**To Add RSS Feed:**

1. Click "RSS Feeds" tab
2. Click "Add Feed"
3. Enter feed URL
4. Select category
5. Save

#### 4. **Blog Publisher**

- Generate long-form articles
- Preview before publishing
- Edit content
- Publish to Medium, Dev.to, WordPress
- View publication history

**To Publish Blog:**

1. Select article
2. Click "Generate Blog"
3. Review generated content
4. Edit if needed
5. Choose platform
6. Click "Publish"

#### 5. **Schedule Configuration**

- Enable/disable automation
- Set pipeline run time
- Select days of week
- Configure platforms

**To Configure Schedule:**

1. Click "Schedule" button
2. Enable schedule
3. Set time (e.g., 11:00 AM)
4. Select days (Mon-Sun)
5. Save

---

## 📅 Daily Workflow

### Morning Routine (10 minutes)

**Step 1: Open Dashboard**

```
http://localhost:5173
```

**Step 2: Run Pipeline** (optional if automated)

- Click "Fetch New Data" button
- Pipeline runs in background
- Takes 20-30 minutes

**Step 3: Get Coffee** ☕
While pipeline runs, grab coffee or do other tasks

**Step 4: Review Content**

- Refresh dashboard
- Review top articles (sorted by score)
- Check generated content for each platform

**Step 5: Edit & Post**

- Edit content if needed
- Copy to clipboard
- Paste into social media platforms
- Mark as posted

**Step 6: Optional - Publish Blog**

- Select high-scoring article
- Generate blog post
- Review and edit
- Publish to Medium/Dev.to/WordPress

**Total Time:** 10-15 minutes

---

## ⚙️ Configuration

### Essential Settings (.env)

```bash
# === LLM Configuration ===
LLM_PROVIDER=local
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# === Performance Tuning ===
ANALYSIS_LIMIT=10              # How many articles to analyze
CONTENT_TOP_LIMIT=2            # Generate content for top N
CONTENT_PLATFORMS=twitter,linkedin,reddit,hackernews,medium

# === Data Sources (Optional) ===
# Gmail Newsletter Fetching
GMAIL_ADDRESS=your@email.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret
REDDIT_USER_AGENT=ai-pulse-pro/0.1

# === Blog Publishing (Optional) ===
# Medium
MEDIUM_API_KEY=your_api_key

# Dev.to
DEVTO_API_KEY=your_api_key

# WordPress
WORDPRESS_SITE_URL=https://yoursite.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=your_app_password

# === Notifications (Optional) ===
NOTIFY_ON=off                  # off|failure|success|always
NOTIFY_WEBHOOK_URL=https://hooks.slack.com/...
NOTIFY_EMAIL_TO=you@email.com
```

---

## 🔧 Setup Guides

### Gmail IMAP Setup

**Purpose:** Fetch AI newsletters from Gmail

**Steps:**

1. **Enable 2-Step Verification**
   - Go to Google Account settings
   - Security → 2-Step Verification
   - Turn on

2. **Create App Password**
   - Google Account → Security
   - App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure .env**

   ```bash
   GMAIL_ADDRESS=your@email.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

4. **Test Connection**

   ```bash
   python test_gmail_connection.py
   ```

---

### Reddit API Setup

**Purpose:** Fetch posts from r/MachineLearning, r/ArtificialIntelligence

**Steps:**

1. **Create Reddit App**
   - Go to <https://www.reddit.com/prefs/apps>
   - Click "Create App" or "Create Another App"
   - Select "script"
   - Name: `ai-pulse-pro`
   - Redirect URI: `http://localhost:8080`
   - Create app

2. **Get Credentials**
   - Client ID: Under app name (14-character string)
   - Client Secret: Click "edit" to reveal

3. **Configure .env**

   ```bash
   REDDIT_CLIENT_ID=your_14_char_id
   REDDIT_CLIENT_SECRET=your_27_char_secret
   REDDIT_USER_AGENT=ai-pulse-pro/0.1 (by u/your_username)
   ```

---

### Blog Platform Setup

#### Medium

1. Go to <https://medium.com/me/settings>
2. Scroll to "Integration tokens"
3. Enter description: "AI Pulse Pro"
4. Click "Get integration token"
5. Copy token to `.env`: `MEDIUM_API_KEY=...`

#### Dev.to

1. Go to <https://dev.to/settings/extensions>
2. Generate API Key
3. Copy to `.env`: `DEVTO_API_KEY=...`

#### WordPress

1. Log into WordPress admin
2. Users → Profile
3. Scroll to "Application Passwords"
4. Name: "AI Pulse Pro"
5. Click "Add New Application Password"
6. Copy password to `.env`:

   ```bash
   WORDPRESS_SITE_URL=https://yoursite.com
   WORDPRESS_USERNAME=admin
   WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

---

## 🚦 Performance Tips

### Speed Up Pipeline

**Reduce Analysis Limit:**

```bash
ANALYSIS_LIMIT=5       # Analyze fewer articles
```

**Reduce Content Generation:**

```bash
CONTENT_TOP_LIMIT=1    # Generate for top 1 only
```

**Select Fewer Platforms:**

```bash
CONTENT_PLATFORMS=twitter,linkedin
```

**Expected Improvement:**

- Pipeline time: 20-30 min → 10-15 min
- LLM calls: 50% reduction

---

### Improve Content Quality

**1. Update Style Preferences**

- Provide feedback on generated content
- System learns your writing style
- Regenerate with improved prompts

**2. Add Better Sources**

- Add high-quality RSS feeds
- Remove low-quality sources
- Focus on authoritative sources

**3. Customize Platform Templates**

- Edit `backend/generators/platform_templates.py`
- Adjust tone, length, format
- Add custom instructions

---

### Save Resources

**Disable Scheduler (Manual Mode):**

```bash
# Run pipeline only when needed
# Click "Fetch New Data" manually
```

**Reduce RSS Feeds:**

- Keep only best 10-15 feeds
- Disable inactive feeds
- Focus on your niche

**Lower Docker Limits:**

```yaml
# docker-compose.yml
services:
  backend:
    mem_limit: 1g
    cpus: 2
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Pipeline takes too long"

**Cause:** Too many articles to analyze  
**Solution:**

```bash
# Edit .env
ANALYSIS_LIMIT=5
CONTENT_TOP_LIMIT=1
CONTENT_PLATFORMS=twitter,linkedin
```

#### 2. "Database is locked" warnings

**Status:** Non-critical  
**Cause:** LLM calls hold database connection  
**Impact:** Minimal - system uses fallback  
**Solution:** Ignore or increase connection timeout

#### 3. "No articles from Gmail/Reddit"

**Cause:** Missing credentials  
**Solution:**

```bash
# Add to .env
GMAIL_ADDRESS=your@email.com
GMAIL_APP_PASSWORD=xxxx
REDDIT_CLIENT_ID=xxxx
REDDIT_CLIENT_SECRET=xxxx
```

#### 4. "Ollama connection failed"

**Cause:** Ollama not running  
**Solution:**

```bash
# Check if Ollama is running
ollama list

# Start Ollama (if not running)
ollama serve

# Pull model (if not installed)
ollama pull llama3.1:8b
```

#### 5. "Frontend proxy error"

**Cause:** Backend not running or crashed  
**Solution:**

```bash
# Check backend logs
tail -f logs/app.log

# Restart backend
python -m backend.main
```

#### 6. "CORS error in browser"

**Cause:** Frontend/backend mismatch  
**Solution:**

```bash
# Verify backend is running on port 5000
# Verify frontend proxies to localhost:5000
# Check vite.config.js proxy configuration
```

---

## 📈 Understanding Scores

### Viral Score (0-100)

**What it means:** How likely this will perform on social media

**High Score (80-100):**

- Recent news (last 24 hours)
- Trending keywords (GPT-5, AGI, breakthrough)
- High Reddit upvotes
- Simple, clear title

**Low Score (0-30):**

- Old news (>7 days)
- Academic/complex
- Low engagement
- Niche topic

### Technical Score (0-100)

**What it means:** How technically significant/rigorous

**High Score (80-100):**

- arXiv paper
- Peer-reviewed
- Novel methodology
- High citations

**Low Score (0-30):**

- Blog post
- Opinion piece
- No technical details
- Marketing content

### Relevance Score (0-100)

**What it means:** How relevant to your audience

**High Score (80-100):**

- Matches your categories
- Contains your keywords
- From preferred sources
- Recent and timely

**Low Score (0-30):**

- Off-topic
- Wrong audience
- Old news
- Low-authority source

---

## 🎓 Advanced Features

### Importing RSS Feeds (OPML)

**Export from Inoreader/Feedly:**

1. Go to Settings → Import/Export
2. Export OPML file
3. Save as `feeds.opml`

**Import to AI Pulse Pro:**

1. Open Dashboard → RSS Feeds
2. Click "Import OPML"
3. Select `feeds.opml`
4. Click Import
5. Feeds added automatically

---

### Customizing Content Templates

**Edit Platform Templates:**

```python
# backend/generators/platform_templates.py

PLATFORM_CONFIGS = {
    'twitter': {
        'max_length': 280,
        'tone': 'casual',
        'emoji': True,
        'hashtags': 3,
        'template': 'Your custom template here'
    }
}
```

---

### Scheduling Automation

**Configure Daily Pipeline:**

1. Dashboard → Schedule
2. Enable: ON
3. Time: 06:00 AM
4. Days: Mon, Tue, Wed, Thu, Fri
5. Save

**What Happens:**

- Pipeline runs every weekday at 6 AM
- Fetches new articles
- Analyzes with AI
- Generates content
- Ready to review when you wake up!

---

## 📞 Getting Help

### Documentation

- [README.md](../README.md) - Quick start
- [FEATURES.md](FEATURES.md) - Feature list
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - System design
- [DEVELOPMENT.md](DEVELOPMENT.md) - Contributing

### Logs

```bash
# View application logs
tail -f logs/app.log

# View pipeline logs
tail -f logs/pipeline.log
```

### Health Check

```bash
# Check system health
python verify_health.py

# Verify database
python check_db.py
```

---

## 🎯 Best Practices

### Content Workflow

1. **Review top 5 articles** - Focus on high scores
2. **Edit before posting** - Add personal touch
3. **Mark as posted** - Track what's published
4. **Use hashtags** - Copy recommended hashtags
5. **Vary timing** - Post at different times

### Source Management

1. **Quality over quantity** - 10 great feeds > 50 mediocre
2. **Regular cleanup** - Remove inactive feeds monthly
3. **Category balance** - Mix papers, news, tutorials
4. **Authority matters** - Prefer authoritative sources

### Performance

1. **Run during off-hours** - Schedule for night/morning
2. **Monitor resources** - Keep an eye on disk/memory
3. **Backup database** - Copy `data/app.db` weekly
4. **Update models** - Refresh Ollama model quarterly

---

## 🔐 Privacy & Security

### Data Location

- **Database:** `data/app.db` (local)
- **Logs:** `logs/` (local)
- **Credentials:** `.env` (never committed)

### What's Shared

- **Nothing!** All processing is local
- No cloud API calls (except optional blog publishing)
- No telemetry or analytics
- No external tracking

### Backup Recommendations

```bash
# Backup database
copy data\app.db data\app-backup-2026-02-13.db

# Backup .env
copy .env .env.backup
```

---

**Need more help?** Check the [DEVELOPMENT.md](DEVELOPMENT.md) guide for advanced configuration and troubleshooting.

---

**Document Version:** 2.0  
**Last Updated:** February 13, 2026
