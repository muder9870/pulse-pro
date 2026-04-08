# AI Pulse Pro Developer Guide

## Introduction

Welcome to AI Pulse Pro! This guide will help you get started with development, understand the database architecture, and follow best practices. After completing the PostgreSQL migration in Phase 6, the application now uses SQLAlchemy ORM exclusively for all database operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Database Architecture](#database-architecture)
3. [Database Access Patterns](#database-access-patterns)
4. [Testing with ORM](#testing-with-orm)
5. [Running Utility Scripts](#running-utility-scripts)
6. [Common Pitfalls](#common-pitfalls)
7. [Quick Reference](#quick-reference)
8. [Development Workflow](#development-workflow)

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Python 3.11+
- PostgreSQL 15 (via Docker)
- Git

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ai-pulse-pro
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**:
   ```bash
   docker exec backend alembic upgrade head
   ```

5. **Verify the application is running**:
   ```bash
   curl http://localhost:5001/health
   ```

### Project Structure

```
ai-pulse-pro/
├── backend/
│   ├── database.py          # Database access layer (ORM)
│   ├── models.py            # SQLAlchemy models (31 tables)
│   ├── config.py            # Configuration settings
│   ├── main.py              # Flask application
│   ├── fetchers/            # Data fetchers (arXiv, GitHub, RSS, Gmail)
│   ├── generators/          # Content generators
│   ├── processors/          # Data processors
│   └── schedulers/          # Background job schedulers
├── tests/                   # Test files
├── scripts/                 # Utility scripts
├── migrations/              # Alembic migrations
├── docker-compose.yml       # Docker configuration
└── requirements.txt         # Python dependencies
```

---

## Database Architecture

### Overview

AI Pulse Pro uses PostgreSQL 15 with SQLAlchemy ORM for all database operations. The database contains 31 tables organized into several categories:

### Core Tables

**Content Pipeline:**
- `raw_articles` - Fetched articles from various sources
- `processed_articles` - Analyzed articles with scores
- `generated_content` - Platform-specific content
- `article_tags` - Tags for articles

**Content Sources:**
- `rss_feeds` - RSS feed configurations
- `rss_feed_items` - Individual RSS items
- `gmail_newsletter_senders` - Trusted Gmail senders

**Analytics:**
- `trending_hashtags` - Trending hashtags by platform
- `content_hashtags` - Hashtags assigned to content
- `hashtag_performance` - Historical hashtag metrics
- `engagement_metrics` - User engagement tracking
- `platform_roi` - Platform ROI metrics

**Publishing:**
- `blog_posts` - Blog post content
- `blog_credentials` - Blog platform credentials
- `scheduled_posts` - Scheduled content posts

**System:**
- `system_status` - Service health status
- `health_history` - Historical health records
- `user_styles` - User style preferences
- `user_feedback` - User feedback records

### Database Connection

Connection pooling is configured in `backend/database.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,          # 5 persistent connections
    max_overflow=10,      # Up to 15 total connections
    pool_pre_ping=True,   # Verify connections before use
    pool_recycle=1800     # Recycle after 30 minutes
)
```

### Schema Management

All schema changes are managed through Alembic migrations:

```bash
# Create a new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history

# View current version
alembic current
```

---

## Database Access Patterns

### Basic Pattern: get_session()

All database operations use the `get_session()` context manager:

```python
from backend.database import get_session
from backend.models import RawArticle

def fetch_pending_articles():
    """Fetch articles in pending state."""
    with get_session() as session:
        articles = session.query(RawArticle).filter(
            RawArticle.state == "pending"
        ).all()
        
        return articles
```

**Key Points:**
- Always use `with get_session()` for automatic commit/rollback
- Session automatically commits on success
- Session automatically rolls back on exception
- Session automatically closes when exiting context

### Pattern: Create Records

```python
from backend.database import get_session
from backend.models import RawArticle

def save_article(title, url, source):
    """Save a new article to the database."""
    with get_session() as session:
        article = RawArticle(
            title=title,
            url=url,
            source=source,
            state="pending"
        )
        session.add(article)
        session.commit()
        
        # Access ID after commit
        return article.id
```

### Pattern: Read Records

```python
from backend.database import get_session
from backend.models import RawArticle

def get_article_by_id(article_id):
    """Get article by ID."""
    with get_session() as session:
        article = session.query(RawArticle).filter(
            RawArticle.id == article_id
        ).first()
        
        if article is None:
            raise ValueError(f"Article {article_id} not found")
        
        return {
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "state": article.state
        }
```

### Pattern: Update Records

```python
from backend.database import get_session
from backend.models import RawArticle

def update_article_state(article_id, new_state):
    """Update article state."""
    with get_session() as session:
        article = session.query(RawArticle).filter(
            RawArticle.id == article_id
        ).first()
        
        if article:
            article.state = new_state
            session.commit()
            return True
        
        return False
```

### Pattern: Delete Records

```python
from backend.database import get_session
from backend.models import ArticleTag

def delete_article_tags(article_id):
    """Delete all tags for an article."""
    with get_session() as session:
        session.query(ArticleTag).filter(
            ArticleTag.article_id == article_id
        ).delete()
        session.commit()
```

### Pattern: Relationships

```python
from backend.database import get_session
from backend.models import ProcessedArticle
from sqlalchemy.orm import joinedload

def get_processed_article_with_raw(article_id):
    """Get processed article with raw article data."""
    with get_session() as session:
        article = session.query(ProcessedArticle).options(
            joinedload(ProcessedArticle.raw_article)
        ).filter(
            ProcessedArticle.id == article_id
        ).first()
        
        if article:
            return {
                "id": article.id,
                "summary": article.summary,
                "title": article.raw_article.title,
                "url": article.raw_article.url
            }
        
        return None
```

### Pattern: Aggregations

```python
from backend.database import get_session
from backend.models import RawArticle
from sqlalchemy import func

def get_article_counts_by_state():
    """Get count of articles by state."""
    with get_session() as session:
        results = session.query(
            RawArticle.state,
            func.count(RawArticle.id).label('count')
        ).group_by(RawArticle.state).all()
        
        return {state: count for state, count in results}
```

### Pattern: Monitored Operations

For operations you want to track performance:

```python
from backend.database import monitored_session
from backend.models import RawArticle

def fetch_articles_for_processing(batch_size=10):
    """Fetch articles with performance monitoring."""
    with monitored_session("fetch_articles_for_processing") as session:
        articles = session.query(RawArticle).filter(
            RawArticle.state == "pending"
        ).limit(batch_size).all()
        
        return articles
```

---

## Testing with ORM

### Test Setup

Tests use the same database as development. Set up test data in `setUp()`:

```python
import unittest
from backend.database import get_session
from backend.models import RawArticle

class TestArticleProcessor(unittest.TestCase):
    def setUp(self):
        """Set up test data."""
        with get_session() as session:
            # Create test article
            self.test_article = RawArticle(
                title="Test Article",
                url="https://example.com/test",
                source="test",
                state="pending"
            )
            session.add(self.test_article)
            session.commit()
            
            # Store ID for use in tests
            self.article_id = self.test_article.id
    
    def tearDown(self):
        """Clean up test data."""
        with get_session() as session:
            session.query(RawArticle).filter(
                RawArticle.id == self.article_id
            ).delete()
            session.commit()
    
    def test_process_article(self):
        """Test article processing."""
        # Your test code here
        pass
```

### Test Patterns

**Testing Database Operations:**
```python
def test_save_article(self):
    """Test saving an article."""
    with get_session() as session:
        article = RawArticle(
            title="New Article",
            url="https://example.com/new",
            source="test"
        )
        session.add(article)
        session.commit()
        article_id = article.id
    
    # Verify article was saved
    with get_session() as session:
        saved = session.query(RawArticle).filter(
            RawArticle.id == article_id
        ).first()
        
        self.assertIsNotNone(saved)
        self.assertEqual(saved.title, "New Article")
```

**Testing Relationships:**
```python
def test_article_tags(self):
    """Test article tags relationship."""
    with get_session() as session:
        article = RawArticle(
            title="Test",
            url="https://example.com/test",
            source="test"
        )
        session.add(article)
        session.flush()
        
        # Add tags
        tag1 = ArticleTag(article_id=article.id, tag="AI")
        tag2 = ArticleTag(article_id=article.id, tag="ML")
        session.add_all([tag1, tag2])
        session.commit()
        
        article_id = article.id
    
    # Verify tags
    with get_session() as session:
        article = session.query(RawArticle).filter(
            RawArticle.id == article_id
        ).first()
        
        self.assertEqual(len(article.tags), 2)
        tag_names = [tag.tag for tag in article.tags]
        self.assertIn("AI", tag_names)
        self.assertIn("ML", tag_names)
```

### Running Tests

```bash
# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_article_processor.py

# Run with verbose output
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=backend
```

---

## Running Utility Scripts

### Database Inspection Scripts

**check_db_v3.py** - View database state distribution:
```bash
python check_db_v3.py
```

Output:
```
Database Statistics:
Total articles: 158

State Distribution:
  pending: 12
  cleaning: 5
  analyzing: 3
  processed: 138
```

**check_db_v2.py** - Detailed database inspection:
```bash
python check_db_v2.py
```

### Gmail Management Scripts

**manage_gmail_senders.py** - Manage Gmail newsletter senders:
```bash
# List all senders
python manage_gmail_senders.py list

# Add a sender
python manage_gmail_senders.py add "sender@example.com" "Sender Name"

# Remove a sender
python manage_gmail_senders.py remove "sender@example.com"
```

**debug_gmail.py** - Debug Gmail fetcher:
```bash
python debug_gmail.py
```

### RSS Management Scripts

**fix_rss_articles.py** - Fix RSS article issues:
```bash
python fix_rss_articles.py
```

### Demo Data Scripts

**scripts/seed_demo_data.py** - Seed database with demo data:
```bash
python scripts/seed_demo_data.py
```

### Creating New Scripts

When creating utility scripts, follow this pattern:

```python
#!/usr/bin/env python3
"""
Script description here.
"""

import sys
from backend.database import get_session
from backend.models import RawArticle

def main():
    """Main script logic."""
    with get_session() as session:
        articles = session.query(RawArticle).all()
        
        for article in articles:
            print(f"{article.id}: {article.title}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Commit

**Problem:**
```python
with get_session() as session:
    article = session.query(RawArticle).first()
    article.state = "processed"
    # Missing commit - changes not saved!
```

**Solution:**
```python
with get_session() as session:
    article = session.query(RawArticle).first()
    article.state = "processed"
    session.commit()  # ✅ Changes saved
```

### Pitfall 2: Accessing Relationships Outside Session

**Problem:**
```python
with get_session() as session:
    article = session.query(ProcessedArticle).first()

# Session closed here
print(article.raw_article.title)  # ❌ ERROR!
```

**Solution:**
```python
from sqlalchemy.orm import joinedload

with get_session() as session:
    article = session.query(ProcessedArticle).options(
        joinedload(ProcessedArticle.raw_article)
    ).first()
    
    # Access inside session
    title = article.raw_article.title  # ✅ OK

print(title)  # ✅ OK - data already loaded
```

### Pitfall 3: N+1 Query Problem

**Problem:**
```python
with get_session() as session:
    articles = session.query(ProcessedArticle).all()
    
    for article in articles:
        print(article.raw_article.title)  # ❌ Separate query for each!
```

**Solution:**
```python
from sqlalchemy.orm import joinedload

with get_session() as session:
    articles = session.query(ProcessedArticle).options(
        joinedload(ProcessedArticle.raw_article)
    ).all()
    
    for article in articles:
        print(article.raw_article.title)  # ✅ No extra queries
```

### Pitfall 4: Using Removed Functions

**Problem:**
```python
from backend.database import init_db, get_connection

init_db()  # ❌ Function removed in Phase 6

with get_connection() as conn:  # ❌ Function removed in Phase 6
    cur = conn.cursor()
```

**Solution:**
```python
from backend.database import get_session

# Database initialized by Alembic migrations
# No need for init_db()

with get_session() as session:  # ✅ Use get_session()
    articles = session.query(RawArticle).all()
```

### Pitfall 5: Tuple Access on ORM Objects

**Problem:**
```python
with get_session() as session:
    article = session.query(RawArticle).first()
    title = article[1]  # ❌ Can't index objects
```

**Solution:**
```python
with get_session() as session:
    article = session.query(RawArticle).first()
    title = article.title  # ✅ Use attribute access
```

### Pitfall 6: Committing in Loops

**Problem:**
```python
with get_session() as session:
    for article_data in article_list:
        article = RawArticle(**article_data)
        session.add(article)
        session.commit()  # ❌ Slow - commits for each article
```

**Solution:**
```python
with get_session() as session:
    articles = [RawArticle(**data) for data in article_list]
    session.add_all(articles)
    session.commit()  # ✅ Fast - single commit
```

### Pitfall 7: Not Handling None Results

**Problem:**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    print(article.title)  # ❌ Crashes if article is None
```

**Solution:**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    if article is None:
        raise ValueError(f"Article {article_id} not found")
    
    print(article.title)  # ✅ Safe
```

---

## Quick Reference

### Common Imports

```python
# Database access
from backend.database import get_session, monitored_session, get_query_stats

# Models
from backend.models import (
    RawArticle, ProcessedArticle, GeneratedContent, ArticleTag,
    TrendingHashtag, BlogPost, SystemStatus, HealthHistory
)

# SQLAlchemy utilities
from sqlalchemy import func, update as sql_update, delete as sql_delete
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert
```

### Common Queries

**Get by ID:**
```python
article = session.query(RawArticle).filter(RawArticle.id == id).first()
```

**Get all:**
```python
articles = session.query(RawArticle).all()
```

**Filter:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.state == "pending",
    RawArticle.is_duplicate == 0
).all()
```

**Count:**
```python
count = session.query(func.count(RawArticle.id)).scalar()
```

**Order and limit:**
```python
articles = session.query(RawArticle).order_by(
    RawArticle.fetched_at.desc()
).limit(10).all()
```

**Join:**
```python
results = session.query(ProcessedArticle).join(RawArticle).filter(
    RawArticle.source == "arxiv"
).all()
```

**Eager load:**
```python
articles = session.query(ProcessedArticle).options(
    joinedload(ProcessedArticle.raw_article)
).all()
```

### Common Operations

**Insert:**
```python
article = RawArticle(title="Test", url="https://example.com")
session.add(article)
session.commit()
```

**Update:**
```python
article.state = "processed"
session.commit()
```

**Bulk update:**
```python
session.execute(
    sql_update(RawArticle)
    .where(RawArticle.state == "pending")
    .values(state="processing")
)
session.commit()
```

**Delete:**
```python
session.query(ArticleTag).filter(
    ArticleTag.article_id == article_id
).delete()
session.commit()
```

### Model Attributes

**RawArticle:**
- `id`, `title`, `url`, `source`, `category`
- `state`, `is_duplicate`, `processed`
- `fetched_at`, `raw_content`

**ProcessedArticle:**
- `id`, `raw_article_id`, `summary`, `key_points`
- `viral_score`, `tech_score`, `relevance_score`
- `priority`, `analyzed_at`
- Relationship: `raw_article`

**GeneratedContent:**
- `id`, `article_id`, `platform`, `content`
- `posted`, `posted_at`, `generated_at`

**ArticleTag:**
- `id`, `article_id`, `tag`, `created_at`

---

## Development Workflow

### 1. Starting Development

```bash
# Start services
docker-compose up -d

# Check logs
docker logs backend --tail 50

# Verify health
curl http://localhost:5001/health
```

### 2. Making Database Changes

```bash
# Edit backend/models.py to add/modify models

# Create migration
alembic revision -m "add_new_field"

# Edit migration file in migrations/versions/

# Apply migration
alembic upgrade head

# Verify migration
alembic current
```

### 3. Adding New Features

1. **Define models** in `backend/models.py`
2. **Create migration** with Alembic
3. **Add database functions** in `backend/database.py`
4. **Write tests** in `tests/`
5. **Implement feature** in appropriate module
6. **Test locally** with Docker
7. **Commit changes** to git

### 4. Testing Changes

```bash
# Run tests
python -m pytest tests/ -v

# Run specific test
python -m pytest tests/test_article_processor.py::TestArticleProcessor::test_process_article

# Check coverage
python -m pytest tests/ --cov=backend --cov-report=html
```

### 5. Debugging

**Check application logs:**
```bash
docker logs backend --tail 100 -f
```

**Check database:**
```bash
# Connect to PostgreSQL
docker exec -it postgres psql -U postgres -d ai_pulse_pro

# List tables
\dt

# Query data
SELECT * FROM raw_articles LIMIT 10;

# Exit
\q
```

**Check query performance:**
```bash
curl http://localhost:5001/api/query-stats | jq
```

### 6. Code Review Checklist

Before submitting code:

- [ ] All tests pass
- [ ] No `init_db()` or `get_connection()` calls
- [ ] Using `get_session()` for database access
- [ ] Using eager loading for relationships
- [ ] Proper error handling
- [ ] Descriptive operation names for monitoring
- [ ] Database migrations created if needed
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Proper logging

---

## Additional Resources

### Documentation

- **ORM_PATTERNS.md** - Comprehensive ORM patterns and examples
- **ORM_CONVERSION_GUIDE.md** - Migration guide and troubleshooting
- **PERFORMANCE_MONITORING.md** - Query performance tracking
- **SQLAlchemy Docs** - https://docs.sqlalchemy.org/

### Code Examples

- **backend/database.py** - Database access layer
- **backend/models.py** - All table models
- **backend/fetchers/** - Data fetching examples
- **backend/processors/** - Data processing examples
- **tests/** - Test examples

### Tools

- **Alembic** - Database migrations
- **Docker** - Containerization
- **PostgreSQL** - Database
- **Flask** - Web framework
- **SQLAlchemy** - ORM

### Getting Help

1. Check this guide
2. Review ORM_PATTERNS.md
3. Check SQLAlchemy documentation
4. Review existing code examples
5. Check git history: `git log --grep="ORM"`

---

## Summary

Key points for AI Pulse Pro development:

1. **Always use `get_session()`** for database access
2. **Use `monitored_session()`** for performance tracking
3. **Use eager loading** to avoid N+1 queries
4. **Manage schema** with Alembic migrations
5. **Write tests** for all database operations
6. **Follow patterns** in existing code
7. **Check performance** with monitoring endpoint
8. **Handle errors** gracefully

Welcome to the team! 🚀

---

*Last Updated: Phase 6 Completion*
*Database: PostgreSQL 15*
*ORM: SQLAlchemy 2.x*
*Migration Status: Complete ✅*
