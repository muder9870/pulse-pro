# AI Pulse Pro - Feature Addons
## Hashtag Intelligence Module + Personal Blog Publisher

**Version:** 2.0  
**New Features:** Trending Hashtags + Auto-Blog Publishing  
**Additional Time:** +2 weeks (6 weeks total)

---

## 🏷️ FEATURE 1: Hashtag Intelligence Module

### Overview
Automatically discovers, tracks, and recommends trending AI/ML hashtags across multiple platforms to maximize content reach and engagement.

### What It Does
1. **Discovers Trending Hashtags**
   - Scrapes Twitter/X trending topics
   - Monitors Reddit flairs and tags
   - Tracks LinkedIn hashtag performance
   - Analyzes Instagram AI community tags
   - Watches TikTok AI creator hashtags

2. **Hashtag Analytics**
   - Tracks hashtag volume (tweets/posts per hour)
   - Measures engagement rate per hashtag
   - Identifies rising vs declining hashtags
   - Detects niche vs mainstream tags

3. **Smart Recommendations**
   - Suggests 3-5 optimal hashtags per post
   - Mix of trending + evergreen tags
   - Platform-specific recommendations
   - Avoids spam/banned hashtags

---

### Architecture Addition

```
┌─────────────────────────────────────────┐
│     HASHTAG INTELLIGENCE LAYER          │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │   Hashtag Collectors           │    │
│  │  • Twitter/X Trending API      │    │
│  │  • Reddit Tag Scraper          │    │
│  │  • LinkedIn Hashtag Explorer   │    │
│  │  • Instagram Tag Scraper       │    │
│  │  • TikTok Discover Page        │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Hashtag Analyzer             │    │
│  │  • Volume tracking             │    │
│  │  • Engagement calculation      │    │
│  │  • Trend detection             │    │
│  │  • Category matching           │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Hashtag Database             │    │
│  │  • trending_hashtags table     │    │
│  │  • hashtag_performance table   │    │
│  │  • hashtag_history table       │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Smart Recommender            │    │
│  │  • Match hashtags to content   │    │
│  │  • Optimize for platform       │    │
│  │  • Balance trending + niche    │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Database Schema Updates

```sql
-- New Table 1: Trending Hashtags
CREATE TABLE trending_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hashtag TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,  -- 'twitter', 'instagram', etc.
    volume INTEGER DEFAULT 0,  -- posts per hour
    engagement_rate REAL DEFAULT 0.0,  -- avg likes/comments
    trend_score INTEGER DEFAULT 0,  -- 0-100
    category TEXT,  -- 'LLM', 'ComputerVision', etc.
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'  -- 'rising', 'trending', 'declining'
);

-- New Table 2: Hashtag Performance History
CREATE TABLE hashtag_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hashtag_id INTEGER,
    platform TEXT,
    volume INTEGER,
    engagement_rate REAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hashtag_id) REFERENCES trending_hashtags(id)
);

-- New Table 3: Content-Hashtag Mapping
CREATE TABLE content_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    hashtag_id INTEGER,
    platform TEXT,
    relevance_score REAL,  -- How relevant this hashtag is (0-1)
    recommended BOOLEAN DEFAULT 1,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id),
    FOREIGN KEY (hashtag_id) REFERENCES trending_hashtags(id)
);
```

---

### Implementation Code

#### 1. Twitter/X Hashtag Scraper
```python
# fetchers/hashtag_collectors/twitter_collector.py
import requests
from bs4 import BeautifulSoup
import time

class TwitterHashtagCollector:
    def __init__(self):
        self.trending_url = "https://twitter.com/explore"
        self.ai_hashtags = []
    
    def fetch_trending_topics(self):
        """Scrape Twitter trending topics"""
        # Note: Twitter requires authentication now
        # Alternative: Use unofficial API or browser automation
        pass
    
    def filter_ai_related(self, hashtags):
        """Filter only AI/ML related hashtags"""
        ai_keywords = [
            'ai', 'ml', 'deeplearning', 'machinelearning', 
            'gpt', 'llm', 'chatgpt', 'openai', 'neural',
            'computervision', 'nlp', 'robotics', 'agi'
        ]
        
        filtered = []
        for tag in hashtags:
            if any(kw in tag.lower() for kw in ai_keywords):
                filtered.append(tag)
        
        return filtered
    
    def calculate_trend_score(self, hashtag_data):
        """Calculate 0-100 trend score"""
        # Volume (40%)
        volume_score = min(hashtag_data['volume'] / 1000, 40)
        
        # Growth rate (30%)
        growth = hashtag_data.get('growth_rate', 0)
        growth_score = min(growth * 30, 30)
        
        # Engagement (20%)
        engagement = hashtag_data.get('engagement_rate', 0)
        engagement_score = min(engagement * 20, 20)
        
        # Recency (10%)
        hours_old = hashtag_data.get('hours_trending', 0)
        recency_score = max(10 - hours_old, 0)
        
        return int(volume_score + growth_score + engagement_score + recency_score)
```

#### 2. Reddit Hashtag Collector
```python
# fetchers/hashtag_collectors/reddit_collector.py
import praw

class RedditHashtagCollector:
    def __init__(self, client_id, client_secret, user_agent):
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent
        )
    
    def fetch_trending_flairs(self, subreddit_name='MachineLearning'):
        """Get trending post flairs from r/MachineLearning"""
        subreddit = self.reddit.subreddit(subreddit_name)
        
        flairs = {}
        for post in subreddit.hot(limit=100):
            if post.link_flair_text:
                flair = post.link_flair_text
                if flair in flairs:
                    flairs[flair]['count'] += 1
                    flairs[flair]['total_score'] += post.score
                else:
                    flairs[flair] = {
                        'count': 1,
                        'total_score': post.score,
                        'avg_score': 0
                    }
        
        # Calculate average scores
        for flair in flairs:
            flairs[flair]['avg_score'] = flairs[flair]['total_score'] / flairs[flair]['count']
        
        return flairs
    
    def extract_hashtags_from_posts(self, subreddit_name='MachineLearning'):
        """Extract hashtags from post titles/comments"""
        subreddit = self.reddit.subreddit(subreddit_name)
        hashtags = {}
        
        for post in subreddit.hot(limit=50):
            # Extract hashtags from title
            words = post.title.split()
            for word in words:
                if word.startswith('#'):
                    tag = word.lower().strip('#')
                    if tag in hashtags:
                        hashtags[tag] += 1
                    else:
                        hashtags[tag] = 1
        
        return hashtags
```

#### 3. Hashtag Recommender
```python
# processors/hashtag_recommender.py
from database import get_trending_hashtags, get_article_category

class HashtagRecommender:
    def __init__(self):
        self.max_hashtags = 5
        self.trending_weight = 0.6
        self.relevance_weight = 0.4
    
    def recommend_for_article(self, article, platform='twitter'):
        """Recommend hashtags for a specific article and platform"""
        
        # Get article category and keywords
        category = article.category
        keywords = self.extract_keywords(article.title + " " + article.summary)
        
        # Fetch trending hashtags for this platform
        trending = get_trending_hashtags(platform=platform, limit=50)
        
        # Score each hashtag
        scored_hashtags = []
        for hashtag in trending:
            # Relevance score (0-1)
            relevance = self.calculate_relevance(hashtag, category, keywords)
            
            # Trend score (0-100) normalized to (0-1)
            trend = hashtag.trend_score / 100
            
            # Combined score
            final_score = (trend * self.trending_weight) + (relevance * self.relevance_weight)
            
            scored_hashtags.append({
                'hashtag': hashtag.hashtag,
                'score': final_score,
                'trend_score': hashtag.trend_score,
                'relevance': relevance
            })
        
        # Sort by score and return top N
        scored_hashtags.sort(key=lambda x: x['score'], reverse=True)
        
        # Mix: 3 trending + 2 niche
        trending_tags = scored_hashtags[:3]
        niche_tags = self.get_niche_tags(category, platform)[:2]
        
        return trending_tags + niche_tags
    
    def calculate_relevance(self, hashtag, category, keywords):
        """Calculate how relevant a hashtag is to the content"""
        score = 0.0
        hashtag_lower = hashtag.hashtag.lower()
        
        # Direct category match
        if category.lower() in hashtag_lower:
            score += 0.5
        
        # Keyword matches
        keyword_matches = sum(1 for kw in keywords if kw.lower() in hashtag_lower)
        score += min(keyword_matches * 0.1, 0.3)
        
        # Hashtag category match
        if hashtag.category == category:
            score += 0.2
        
        return min(score, 1.0)
    
    def get_niche_tags(self, category, platform, limit=2):
        """Get niche/evergreen hashtags for category"""
        niche_map = {
            'LLM': ['#LargeLanguageModels', '#NLProc'],
            'Computer Vision': ['#ComputerVision', '#ImageRecognition'],
            'Robotics': ['#Robotics', '#Automation'],
            'Deep Learning': ['#DeepLearning', '#NeuralNetworks']
        }
        
        tags = niche_map.get(category, ['#AI', '#MachineLearning'])
        return [{'hashtag': tag, 'score': 0.7, 'type': 'niche'} for tag in tags[:limit]]
    
    def extract_keywords(self, text, top_n=5):
        """Extract top keywords from text"""
        # Simple implementation - can be improved with NLP
        words = text.lower().split()
        # Filter common words
        stop_words = {'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of'}
        keywords = [w for w in words if w not in stop_words and len(w) > 3]
        
        # Count frequency
        freq = {}
        for kw in keywords:
            freq[kw] = freq.get(kw, 0) + 1
        
        # Return top N
        sorted_keywords = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [kw[0] for kw in sorted_keywords[:top_n]]
```

---

### Platform-Specific Hashtag Strategies

| Platform | Max Tags | Strategy | Example |
|----------|----------|----------|---------|
| **Twitter/X** | 3-5 | Mix trending + niche | #AI #GPT4 #MachineLearning |
| **Instagram** | 20-30 | Use all slots, mix popular + niche | #AI #ArtificialIntelligence #TechNews #MLEngineering |
| **LinkedIn** | 3-5 | Professional, industry-focused | #ArtificialIntelligence #TechInnovation #DataScience |
| **TikTok** | 3-5 | Trending challenges + AI tags | #AITok #TechTok #LearnOnTikTok |
| **Pinterest** | 5-10 | Descriptive, searchable | #AITools #MachineLearningTutorial #TechInfographic |
| **Threads** | 3-5 | Similar to Twitter | #AI #TechNews #Innovation |

---

### Dashboard Integration

Add new section to dashboard:

```jsx
// src/components/HashtagPanel.jsx
import React from 'react';
import { TrendingUp, Hash } from 'lucide-react';

function HashtagPanel({ article, platform }) {
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    fetch(`/api/hashtags/${article.id}/${platform}`)
      .then(res => res.json())
      .then(data => setHashtags(data));
  }, [article, platform]);

  return (
    <div className="bg-blue-50 rounded-lg p-4 mt-4">
      <h4 className="flex items-center gap-2 font-semibold mb-3">
        <Hash className="w-5 h-5" />
        Recommended Hashtags for {platform}
      </h4>
      
      <div className="flex flex-wrap gap-2">
        {hashtags.map(tag => (
          <div key={tag.hashtag} className="relative group">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              {tag.hashtag}
            </span>
            {tag.trend_score > 80 && (
              <TrendingUp className="absolute -top-1 -right-1 w-4 h-4 text-red-500" />
            )}
            
            {/* Tooltip */}
            <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-800 text-white text-xs rounded p-2 whitespace-nowrap">
              Trend: {tag.trend_score}/100<br/>
              Relevance: {(tag.relevance * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✍️ FEATURE 2: Personal Blog Auto-Publisher

### Overview
Automatically publishes long-form AI analysis to your personal blog (Medium, Dev.to, Substack, or self-hosted WordPress/Ghost).

### What It Does
1. **Generates Long-Form Content**
   - Expands summaries into 1500-2500 word articles
   - Adds introduction, analysis, implications, conclusion
   - Includes code examples (if applicable)
   - Formats with proper headings and structure

2. **Multi-Platform Publishing**
   - **Medium:** Via API
   - **Dev.to:** Via API
   - **Hashnode:** Via API
   - **WordPress:** Via REST API
   - **Ghost:** Via Admin API
   - **Substack:** Via email (draft mode)

3. **SEO Optimization**
   - Generates meta descriptions
   - Suggests focus keywords
   - Creates alt text for images
   - Optimized headings (H1, H2, H3)

4. **Image Generation** (Optional)
   - Featured image for blog post
   - Charts/diagrams for data
   - Infographics for key points

---

### Architecture Addition

```
┌─────────────────────────────────────────┐
│       BLOG PUBLISHING ENGINE            │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │   Long-Form Generator          │    │
│  │  • Ollama (extended prompt)    │    │
│  │  • 1500-2500 word articles     │    │
│  │  • Proper markdown formatting  │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   SEO Optimizer                │    │
│  │  • Meta descriptions           │    │
│  │  • Focus keywords              │    │
│  │  • Internal linking            │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Image Generator (Optional)   │    │
│  │  • Featured image via Stable   │    │
│  │    Diffusion (local) or DALL-E │    │
│  │  • Diagram generation          │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Blog Platform Connectors     │    │
│  │  • Medium API                  │    │
│  │  • Dev.to API                  │    │
│  │  • WordPress REST API          │    │
│  │  • Ghost Admin API             │    │
│  └──────────────┬─────────────────┘    │
│                 │                       │
│                 ▼                       │
│  ┌────────────────────────────────┐    │
│  │   Publishing Queue             │    │
│  │  • Draft mode first            │    │
│  │  • User approval               │    │
│  │  • Scheduled publishing        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

### Database Schema Updates

```sql
-- New Table: Blog Posts
CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT NOT NULL,  -- Full markdown content
    excerpt TEXT,  -- Meta description
    featured_image_url TEXT,
    focus_keyword TEXT,
    word_count INTEGER,
    reading_time INTEGER,  -- Minutes
    status TEXT DEFAULT 'draft',  -- 'draft', 'published', 'scheduled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
);

-- New Table: Blog Publications
CREATE TABLE blog_publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER,
    platform TEXT NOT NULL,  -- 'medium', 'devto', 'wordpress'
    platform_post_id TEXT,  -- ID from the platform
    url TEXT,  -- Published URL
    status TEXT DEFAULT 'pending',  -- 'pending', 'published', 'failed'
    published_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id)
);

-- New Table: Blog Platform Credentials
CREATE TABLE blog_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT UNIQUE NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    site_url TEXT,  -- For WordPress/Ghost
    enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Implementation Code

#### 1. Long-Form Content Generator
```python
# generators/blog_generator.py
import ollama

class BlogPostGenerator:
    def __init__(self):
        self.model = "llama3.1:8b"
        self.target_words = 2000
    
    def generate_blog_post(self, article):
        """Generate a comprehensive blog post"""
        
        prompt = f"""You are a professional AI/ML technical writer. Write a comprehensive blog post about this topic.

ARTICLE DETAILS:
Title: {article.title}
Summary: {article.summary}
Key Points: {article.key_takeaways}
Source: {article.source}
Category: {article.category}

REQUIREMENTS:
- Length: 1500-2500 words
- Structure: Introduction, Main Analysis (3-4 sections), Implications, Conclusion
- Tone: Professional but accessible
- Include: Technical details, real-world applications, future outlook
- Format: Use markdown headings (##, ###)
- Add: 2-3 relevant examples or use cases

BLOG POST:"""

        response = ollama.generate(
            model=self.model,
            prompt=prompt,
            options={'num_predict': 3000}  # Allow longer output
        )
        
        content = response['response']
        
        # Post-process
        content = self.add_toc(content)
        content = self.add_citations(content, article)
        content = self.format_code_blocks(content)
        
        return content
    
    def add_toc(self, content):
        """Add table of contents"""
        lines = content.split('\n')
        headings = [line for line in lines if line.startswith('##')]
        
        if len(headings) > 3:
            toc = "## Table of Contents\n\n"
            for heading in headings:
                title = heading.replace('##', '').strip()
                slug = title.lower().replace(' ', '-')
                toc += f"- [{title}](#{slug})\n"
            
            # Insert TOC after first paragraph
            return content.replace(headings[0], f"{headings[0]}\n\n{toc}")
        
        return content
    
    def add_citations(self, content, article):
        """Add source citations at the end"""
        citation = f"\n\n---\n\n## Sources\n\n"
        citation += f"- Original Article: [{article.title}]({article.url})\n"
        citation += f"- Source: {article.source}\n"
        citation += f"- Published: {article.fetched_at.strftime('%B %d, %Y')}\n"
        
        return content + citation
    
    def format_code_blocks(self, content):
        """Ensure code blocks are properly formatted"""
        # Add language hints to code blocks
        return content
    
    def generate_meta_description(self, content, max_chars=160):
        """Generate SEO meta description"""
        # Extract first paragraph or generate from summary
        lines = content.split('\n')
        for line in lines:
            if line and not line.startswith('#'):
                description = line.strip()
                if len(description) > max_chars:
                    description = description[:max_chars-3] + "..."
                return description
        return ""
    
    def calculate_reading_time(self, content):
        """Calculate reading time (avg 200 words/min)"""
        word_count = len(content.split())
        return max(1, round(word_count / 200))
    
    def generate_slug(self, title):
        """Generate URL-friendly slug"""
        slug = title.lower()
        slug = ''.join(c if c.isalnum() or c in ' -' else '' for c in slug)
        slug = slug.replace(' ', '-')
        return slug
```

#### 2. Platform Connectors

**Medium API:**
```python
# generators/blog_publishers/medium_publisher.py
import requests

class MediumPublisher:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://api.medium.com/v1"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def get_user_id(self):
        """Get authenticated user's ID"""
        response = requests.get(
            f"{self.base_url}/me",
            headers=self.headers
        )
        return response.json()['data']['id']
    
    def publish_post(self, title, content, tags=[], status='draft'):
        """Publish post to Medium"""
        user_id = self.get_user_id()
        
        data = {
            "title": title,
            "contentFormat": "markdown",
            "content": content,
            "tags": tags,
            "publishStatus": status  # 'draft' or 'public'
        }
        
        response = requests.post(
            f"{self.base_url}/users/{user_id}/posts",
            headers=self.headers,
            json=data
        )
        
        if response.status_code == 201:
            return {
                'success': True,
                'url': response.json()['data']['url'],
                'id': response.json()['data']['id']
            }
        else:
            return {
                'success': False,
                'error': response.text
            }
```

**Dev.to API:**
```python
# generators/blog_publishers/devto_publisher.py
import requests

class DevToPublisher:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://dev.to/api"
        self.headers = {
            "api-key": api_key,
            "Content-Type": "application/json"
        }
    
    def publish_post(self, title, content, tags=[], published=False):
        """Publish article to Dev.to"""
        
        # Dev.to requires specific tag format
        tag_list = tags[:4]  # Max 4 tags
        
        data = {
            "article": {
                "title": title,
                "body_markdown": content,
                "published": published,
                "tags": tag_list
            }
        }
        
        response = requests.post(
            f"{self.base_url}/articles",
            headers=self.headers,
            json=data
        )
        
        if response.status_code == 201:
            article_data = response.json()
            return {
                'success': True,
                'url': article_data['url'],
                'id': article_data['id']
            }
        else:
            return {
                'success': False,
                'error': response.text
            }
```

**WordPress API:**
```python
# generators/blog_publishers/wordpress_publisher.py
import requests
from requests.auth import HTTPBasicAuth

class WordPressPublisher:
    def __init__(self, site_url, username, app_password):
        self.site_url = site_url.rstrip('/')
        self.auth = HTTPBasicAuth(username, app_password)
        self.api_url = f"{self.site_url}/wp-json/wp/v2"
    
    def publish_post(self, title, content, status='draft', tags=[]):
        """Publish post to WordPress"""
        
        # Convert markdown to HTML (WordPress prefers HTML)
        import markdown
        html_content = markdown.markdown(content)
        
        data = {
            "title": title,
            "content": html_content,
            "status": status,  # 'draft', 'publish', 'future'
            "tags": self.get_or_create_tags(tags)
        }
        
        response = requests.post(
            f"{self.api_url}/posts",
            auth=self.auth,
            json=data
        )
        
        if response.status_code == 201:
            post_data = response.json()
            return {
                'success': True,
                'url': post_data['link'],
                'id': post_data['id']
            }
        else:
            return {
                'success': False,
                'error': response.text
            }
    
    def get_or_create_tags(self, tag_names):
        """Get tag IDs or create if they don't exist"""
        tag_ids = []
        
        for tag_name in tag_names:
            # Search for existing tag
            response = requests.get(
                f"{self.api_url}/tags",
                params={"search": tag_name},
                auth=self.auth
            )
            
            if response.json():
                tag_ids.append(response.json()[0]['id'])
            else:
                # Create new tag
                create_response = requests.post(
                    f"{self.api_url}/tags",
                    auth=self.auth,
                    json={"name": tag_name}
                )
                if create_response.status_code == 201:
                    tag_ids.append(create_response.json()['id'])
        
        return tag_ids
```

---

### Dashboard Integration

Add blog publishing section:

```jsx
// src/components/BlogPublisher.jsx
import React, { useState } from 'react';
import { FileText, Send, Eye, Edit } from 'lucide-react';

function BlogPublisher({ article }) {
  const [blogPost, setBlogPost] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [platforms, setPlatforms] = useState({
    medium: false,
    devto: false,
    wordpress: false
  });

  const generateBlogPost = async () => {
    setGenerating(true);
    const response = await fetch(`/api/blog/generate/${article.id}`);
    const data = await response.json();
    setBlogPost(data);
    setGenerating(false);
  };

  const publishToPlatforms = async () => {
    const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
    
    for (const platform of selectedPlatforms) {
      await fetch('/api/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },