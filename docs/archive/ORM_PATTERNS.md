# ORM Patterns Guide

## Introduction

This guide provides comprehensive patterns and best practices for working with SQLAlchemy ORM in the AI Pulse Pro application. After completing the PostgreSQL migration, all database access uses SQLAlchemy ORM exclusively. This guide will help you write efficient, maintainable database code.

## Table of Contents

1. [Basic CRUD Operations](#basic-crud-operations)
2. [Query Patterns](#query-patterns)
3. [Relationship Loading](#relationship-loading)
4. [Transaction Management](#transaction-management)
5. [Error Handling](#error-handling)
6. [Performance Tips](#performance-tips)

---

## Basic CRUD Operations

### Create (Insert)

**Single Record:**
```python
from backend.database import get_session
from backend.models import RawArticle

with get_session() as session:
    article = RawArticle(
        title="New AI Breakthrough",
        url="https://example.com/article",
        source="arxiv",
        category="cs.AI",
        state="pending"
    )
    session.add(article)
    session.commit()
    
    # Access the ID after commit
    article_id = article.id
```

**Multiple Records:**
```python
with get_session() as session:
    articles = [
        RawArticle(title="Article 1", url="https://example.com/1", source="arxiv"),
        RawArticle(title="Article 2", url="https://example.com/2", source="github"),
        RawArticle(title="Article 3", url="https://example.com/3", source="rss")
    ]
    session.add_all(articles)
    session.commit()
```

**Insert with Conflict Handling (PostgreSQL):**
```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

with get_session() as session:
    stmt = pg_insert(RawArticle).values(
        title="Article",
        url="https://example.com/article",
        source="arxiv"
    ).on_conflict_do_nothing(index_elements=['url'])
    
    session.execute(stmt)
    session.commit()
```

### Read (Select)

**Get Single Record by ID:**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    if article:
        print(f"Title: {article.title}")
```

**Get All Records:**
```python
with get_session() as session:
    articles = session.query(RawArticle).all()
    
    for article in articles:
        print(f"{article.id}: {article.title}")
```

**Get with Filter:**
```python
with get_session() as session:
    pending_articles = session.query(RawArticle).filter(
        RawArticle.state == "pending",
        RawArticle.is_duplicate == 0
    ).all()
```

**Get One or None:**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.url == "https://example.com/article"
    ).one_or_none()
    
    if article is None:
        print("Article not found")
```

### Update

**Update Single Record (Fetch First):**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    if article:
        article.state = "processed"
        article.processed = 1
        session.commit()
```

**Bulk Update:**
```python
from sqlalchemy import update as sql_update

with get_session() as session:
    session.execute(
        sql_update(RawArticle)
        .where(RawArticle.state == "pending")
        .values(state="processing")
    )
    session.commit()
```

**Atomic Update (with WHERE condition):**
```python
from sqlalchemy import update as sql_update

with get_session() as session:
    result = session.execute(
        sql_update(RawArticle)
        .where(
            RawArticle.id == article_id,
            RawArticle.state == "pending"  # Only update if still pending
        )
        .values(state="processing")
    )
    session.commit()
    
    if result.rowcount == 0:
        print("Article was already claimed by another process")
```

### Delete

**Delete Single Record:**
```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    if article:
        session.delete(article)
        session.commit()
```

**Bulk Delete:**
```python
with get_session() as session:
    session.query(ArticleTag).filter(
        ArticleTag.article_id == article_id
    ).delete()
    session.commit()
```

---

## Query Patterns

### Filtering

**Simple Equality:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.source == "arxiv"
).all()
```

**Multiple Conditions (AND):**
```python
articles = session.query(RawArticle).filter(
    RawArticle.state == "pending",
    RawArticle.is_duplicate == 0,
    RawArticle.source == "arxiv"
).all()
```

**OR Conditions:**
```python
from sqlalchemy import or_

articles = session.query(RawArticle).filter(
    or_(
        RawArticle.state == "pending",
        RawArticle.state == "cleaning"
    )
).all()
```

**IN Clause:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.state.in_(['pending', 'cleaning', 'analyzing'])
).all()
```

**LIKE Pattern Matching:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.title.like('%AI%')
).all()
```

**Comparison Operators:**
```python
from datetime import datetime, timedelta

cutoff = datetime.now() - timedelta(days=7)

articles = session.query(RawArticle).filter(
    RawArticle.fetched_at > cutoff,
    RawArticle.viral_score >= 50
).all()
```

**NULL Checks:**
```python
# IS NULL
articles = session.query(RawArticle).filter(
    RawArticle.category.is_(None)
).all()

# IS NOT NULL
articles = session.query(RawArticle).filter(
    RawArticle.category.isnot(None)
).all()
```

### Joins

**Inner Join:**
```python
results = session.query(ProcessedArticle).join(
    RawArticle
).filter(
    RawArticle.source == "arxiv"
).all()

for processed in results:
    print(f"{processed.id}: {processed.raw_article.title}")
```

**Left Outer Join:**
```python
from sqlalchemy import outerjoin

results = session.query(RawArticle).outerjoin(
    ProcessedArticle
).filter(
    ProcessedArticle.id.is_(None)  # Articles not yet processed
).all()
```

**Join with Multiple Tables:**
```python
results = session.query(GeneratedContent).join(
    ProcessedArticle
).join(
    RawArticle
).filter(
    RawArticle.category == "cs.AI",
    GeneratedContent.platform == "twitter"
).all()
```

### Aggregations

**Count:**
```python
from sqlalchemy import func

count = session.query(func.count(RawArticle.id)).filter(
    RawArticle.state == "pending"
).scalar()

print(f"Pending articles: {count}")
```

**Sum:**
```python
total_score = session.query(
    func.sum(ProcessedArticle.viral_score)
).scalar()
```

**Average:**
```python
avg_score = session.query(
    func.avg(ProcessedArticle.viral_score)
).scalar()
```

**Group By:**
```python
results = session.query(
    RawArticle.state,
    func.count(RawArticle.id).label('count')
).group_by(RawArticle.state).all()

for state, count in results:
    print(f"{state}: {count}")
```

**Group By with Having:**
```python
results = session.query(
    RawArticle.source,
    func.count(RawArticle.id).label('count')
).group_by(
    RawArticle.source
).having(
    func.count(RawArticle.id) > 10
).all()
```

### Ordering

**Order By Single Column:**
```python
articles = session.query(RawArticle).order_by(
    RawArticle.fetched_at.desc()
).all()
```

**Order By Multiple Columns:**
```python
articles = session.query(ProcessedArticle).order_by(
    ProcessedArticle.priority.desc(),
    ProcessedArticle.viral_score.desc()
).all()
```

**Order By Computed Value:**
```python
articles = session.query(ProcessedArticle).order_by(
    (ProcessedArticle.viral_score + 
     ProcessedArticle.tech_score + 
     ProcessedArticle.relevance_score).desc()
).all()
```

### Limiting and Pagination

**Limit:**
```python
top_articles = session.query(ProcessedArticle).order_by(
    ProcessedArticle.viral_score.desc()
).limit(10).all()
```

**Offset and Limit (Pagination):**
```python
page = 2
page_size = 20
offset = (page - 1) * page_size

articles = session.query(RawArticle).order_by(
    RawArticle.fetched_at.desc()
).offset(offset).limit(page_size).all()
```

---

## Relationship Loading

### Lazy Loading (Default)

By default, relationships are loaded lazily - they're fetched when accessed:

```python
with get_session() as session:
    article = session.query(ProcessedArticle).first()
    
    # This triggers a separate query
    title = article.raw_article.title
```

**Problem:** This causes N+1 queries when iterating:

```python
# BAD: Causes 1 + N queries
articles = session.query(ProcessedArticle).limit(100).all()
for article in articles:
    print(article.raw_article.title)  # Separate query for each!
```

### Eager Loading with joinedload

Use `joinedload` to load relationships in a single query with a JOIN:

```python
from sqlalchemy.orm import joinedload

with get_session() as session:
    articles = session.query(ProcessedArticle).options(
        joinedload(ProcessedArticle.raw_article)
    ).limit(100).all()
    
    # No additional queries - data already loaded
    for article in articles:
        print(article.raw_article.title)
```

**When to use joinedload:**
- One-to-one relationships
- Many-to-one relationships
- When you know you'll need the related data
- When the related table is small

### Eager Loading with selectinload

Use `selectinload` for one-to-many relationships to avoid cartesian products:

```python
from sqlalchemy.orm import selectinload

with get_session() as session:
    articles = session.query(RawArticle).options(
        selectinload(RawArticle.tags)
    ).limit(100).all()
    
    # Tags loaded with a separate SELECT IN query
    for article in articles:
        for tag in article.tags:
            print(tag.tag)
```

**When to use selectinload:**
- One-to-many relationships
- Many-to-many relationships
- When joinedload would create too many duplicate rows

### Loading Multiple Relationships

```python
from sqlalchemy.orm import joinedload, selectinload

articles = session.query(ProcessedArticle).options(
    joinedload(ProcessedArticle.raw_article),
    selectinload(ProcessedArticle.tags),
    selectinload(ProcessedArticle.generated_content)
).all()
```

### Nested Relationship Loading

```python
articles = session.query(GeneratedContent).options(
    joinedload(GeneratedContent.processed_article).joinedload(
        ProcessedArticle.raw_article
    )
).all()

for content in articles:
    print(content.processed_article.raw_article.title)
```

---

## Transaction Management

### Basic Transaction (Automatic Commit)

The `get_session()` context manager automatically commits on success:

```python
with get_session() as session:
    article = RawArticle(title="Test", url="https://example.com")
    session.add(article)
    # Automatically commits when exiting the context
```

### Explicit Rollback

```python
with get_session() as session:
    try:
        article = RawArticle(title="Test", url="https://example.com")
        session.add(article)
        
        # Some operation that might fail
        if not validate_article(article):
            session.rollback()
            return
        
        session.commit()
    except Exception as e:
        session.rollback()
        raise
```

### Multiple Operations in One Transaction

```python
with get_session() as session:
    # All operations in one transaction
    article = RawArticle(title="Test", url="https://example.com")
    session.add(article)
    session.flush()  # Get the ID without committing
    
    processed = ProcessedArticle(
        raw_article_id=article.id,
        summary="Test summary"
    )
    session.add(processed)
    
    # Both committed together
    session.commit()
```

### Savepoints (Nested Transactions)

```python
with get_session() as session:
    article = RawArticle(title="Test", url="https://example.com")
    session.add(article)
    
    # Create a savepoint
    savepoint = session.begin_nested()
    
    try:
        # Risky operation
        process_article(article)
        savepoint.commit()
    except Exception:
        # Rollback to savepoint, keep article
        savepoint.rollback()
    
    session.commit()
```

### Read-Only Transactions

For read-only operations, you can still use `get_session()`:

```python
with get_session() as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()
    
    # No changes made, commit is a no-op
```

---

## Error Handling

### Handling Integrity Errors

```python
from sqlalchemy.exc import IntegrityError

with get_session() as session:
    try:
        article = RawArticle(
            title="Test",
            url="https://example.com/duplicate"  # Duplicate URL
        )
        session.add(article)
        session.commit()
    except IntegrityError as e:
        session.rollback()
        if "unique constraint" in str(e).lower():
            print("Article with this URL already exists")
        else:
            print(f"Database integrity error: {e}")
```

### Handling Not Found

```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    if article is None:
        raise ValueError(f"Article {article_id} not found")
    
    # Process article
    article.state = "processed"
    session.commit()
```

### Handling Concurrent Updates

```python
from sqlalchemy import update as sql_update
from sqlalchemy.exc import StaleDataError

with get_session() as session:
    # Atomic update with version check
    result = session.execute(
        sql_update(RawArticle)
        .where(
            RawArticle.id == article_id,
            RawArticle.state == "pending"
        )
        .values(state="processing")
    )
    session.commit()
    
    if result.rowcount == 0:
        raise StaleDataError("Article was modified by another process")
```

### Retry Logic for Transient Errors

```python
from sqlalchemy.exc import OperationalError
import time

def execute_with_retry(operation, max_retries=3):
    for attempt in range(max_retries):
        try:
            with get_session() as session:
                return operation(session)
        except OperationalError as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff

# Usage
def fetch_articles(session):
    return session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()

articles = execute_with_retry(fetch_articles)
```

---

## Performance Tips

### 1. Use Bulk Operations

**Bad - Multiple Commits:**
```python
with get_session() as session:
    for article_data in article_list:
        article = RawArticle(**article_data)
        session.add(article)
        session.commit()  # Commit for each article - SLOW!
```

**Good - Single Commit:**
```python
with get_session() as session:
    articles = [RawArticle(**data) for data in article_list]
    session.add_all(articles)
    session.commit()  # Single commit - FAST!
```

### 2. Use Eager Loading to Avoid N+1 Queries

**Bad:**
```python
articles = session.query(ProcessedArticle).all()
for article in articles:
    print(article.raw_article.title)  # N+1 queries!
```

**Good:**
```python
from sqlalchemy.orm import joinedload

articles = session.query(ProcessedArticle).options(
    joinedload(ProcessedArticle.raw_article)
).all()

for article in articles:
    print(article.raw_article.title)  # No extra queries!
```

### 3. Use Bulk Updates Instead of Fetch-Update

**Bad:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.state == "pending"
).all()

for article in articles:
    article.state = "processing"
session.commit()
```

**Good:**
```python
from sqlalchemy import update as sql_update

session.execute(
    sql_update(RawArticle)
    .where(RawArticle.state == "pending")
    .values(state="processing")
)
session.commit()
```

### 4. Use Indexes for Frequently Queried Columns

Indexes are defined in the model:

```python
class RawArticle(Base):
    __tablename__ = "raw_articles"
    
    id = mapped_column(Integer, primary_key=True)
    state = mapped_column(String, index=True)  # Indexed for fast filtering
    url = mapped_column(String, unique=True, index=True)  # Unique index
```

### 5. Use select() for Better Performance

For read-only queries, use `select()` instead of `query()`:

```python
from sqlalchemy import select

stmt = select(RawArticle).where(RawArticle.state == "pending")
articles = session.execute(stmt).scalars().all()
```

### 6. Limit Result Sets

Always use `.limit()` when you don't need all results:

```python
# Get top 10 articles
articles = session.query(RawArticle).order_by(
    RawArticle.fetched_at.desc()
).limit(10).all()
```

### 7. Use exists() for Existence Checks

**Bad:**
```python
article = session.query(RawArticle).filter(
    RawArticle.url == url
).first()

if article:
    print("Article exists")
```

**Good:**
```python
from sqlalchemy import exists

article_exists = session.query(
    exists().where(RawArticle.url == url)
).scalar()

if article_exists:
    print("Article exists")
```

### 8. Use Connection Pooling

Connection pooling is already configured in `database.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,          # 5 connections in pool
    max_overflow=10,      # Up to 15 total connections
    pool_pre_ping=True,   # Verify connections before use
    pool_recycle=1800     # Recycle connections after 30 minutes
)
```

### 9. Use Monitored Sessions for Performance Tracking

Use `monitored_session()` to track query performance:

```python
from backend.database import monitored_session

with monitored_session("fetch_pending_articles") as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()
    
# Query timing automatically logged to health_history
# Slow queries (>100ms) trigger warnings
```

### 10. Avoid Loading Unnecessary Columns

Use `defer()` to skip loading large columns:

```python
from sqlalchemy.orm import defer

articles = session.query(RawArticle).options(
    defer(RawArticle.raw_content)  # Don't load large text field
).all()
```

---

## Common Patterns in AI Pulse Pro

### Pattern 1: Fetch Pending Articles for Processing

```python
from sqlalchemy.orm import joinedload

with get_session() as session:
    articles = session.query(RawArticle).options(
        joinedload(RawArticle.processed_article)
    ).filter(
        RawArticle.state == "pending",
        RawArticle.is_duplicate == 0
    ).order_by(
        RawArticle.fetched_at.asc()
    ).limit(batch_size).all()
```

### Pattern 2: Atomic State Transition (Claim Pattern)

```python
from sqlalchemy import update as sql_update

with get_session() as session:
    result = session.execute(
        sql_update(RawArticle)
        .where(
            RawArticle.id == article_id,
            RawArticle.state == "pending"
        )
        .values(state="processing")
    )
    session.commit()
    
    if result.rowcount == 0:
        return None  # Already claimed
    
    # Fetch the article we just claimed
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()
    
    return article
```

### Pattern 3: Upsert (Insert or Update)

```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

with get_session() as session:
    stmt = pg_insert(TrendingHashtag).values(
        hashtag="#AI",
        platform="twitter",
        volume=1000,
        trend_score=85
    ).on_conflict_do_update(
        index_elements=['hashtag', 'platform'],
        set_={
            'volume': 1000,
            'trend_score': 85,
            'updated_at': datetime.now(timezone.utc)
        }
    )
    
    session.execute(stmt)
    session.commit()
```

### Pattern 4: Get or Create

```python
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.url == url
    ).first()
    
    if article is None:
        article = RawArticle(
            title=title,
            url=url,
            source=source
        )
        session.add(article)
        session.commit()
    
    return article
```

### Pattern 5: Delete Related Records

```python
with get_session() as session:
    # Delete all tags for an article
    session.query(ArticleTag).filter(
        ArticleTag.article_id == article_id
    ).delete()
    
    # Add new tags
    for tag in new_tags:
        session.add(ArticleTag(
            article_id=article_id,
            tag=tag
        ))
    
    session.commit()
```

---

## Summary

This guide covers the essential ORM patterns used in AI Pulse Pro:

- **CRUD Operations**: Create, read, update, and delete records
- **Query Patterns**: Filtering, joins, aggregations, ordering
- **Relationship Loading**: Lazy, eager (joinedload, selectinload)
- **Transaction Management**: Commits, rollbacks, savepoints
- **Error Handling**: Integrity errors, not found, concurrent updates
- **Performance Tips**: Bulk operations, eager loading, indexes

For more examples, see:
- `ORM_CONVERSION_GUIDE.md` - Conversion patterns from raw SQL
- `PERFORMANCE_MONITORING.md` - Query performance tracking
- `DEVELOPER_GUIDE.md` - Development workflows

For questions or issues, refer to the SQLAlchemy documentation: https://docs.sqlalchemy.org/
