# ORM Conversion Quick Reference Guide

## Common Conversion Patterns

### 1. Basic SELECT Query

**Before (Raw Cursor):**
```python
with get_connection() as conn:
    cur = conn.cursor()
    cur.execute("SELECT * FROM raw_articles WHERE state = ?", ("pending",))
    rows = cur.fetchall()
    for row in rows:
        print(row[0], row[1])  # Tuple access
```

**After (ORM):**
```python
with get_session() as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()
    for article in articles:
        print(article.id, article.title)  # Attribute access
```

---

### 2. SELECT with JOIN

**Before:**
```python
cur.execute("""
    SELECT p.id, r.title, p.summary 
    FROM processed_articles p 
    JOIN raw_articles r ON p.raw_article_id = r.id 
    WHERE p.priority = ?
""", ("HIGH",))
```

**After:**
```python
articles = session.query(ProcessedArticle).join(
    RawArticle
).filter(
    ProcessedArticle.priority == "HIGH"
).all()

for article in articles:
    print(article.id, article.raw_article.title, article.summary)
```

---

### 3. UPDATE Statement

**Before:**
```python
cur.execute(
    "UPDATE raw_articles SET state = ?, processed = 1 WHERE id = ?",
    ("analyzed", article_id)
)
conn.commit()
```

**After (Method 1 - Fetch then Update):**
```python
article = session.query(RawArticle).filter(RawArticle.id == article_id).first()
if article:
    article.state = "analyzed"
    article.processed = 1
    session.commit()
```

**After (Method 2 - Bulk Update):**
```python
from sqlalchemy import update as sql_update

session.execute(
    sql_update(RawArticle)
    .where(RawArticle.id == article_id)
    .values(state="analyzed", processed=1)
)
session.commit()
```

---

### 4. INSERT with Conflict Handling

**Before (SQLite):**
```python
cur.execute(
    "INSERT OR IGNORE INTO raw_articles (title, url, source) VALUES (?, ?, ?)",
    (title, url, source)
)
```

**Before (PostgreSQL with adapter):**
```python
cur.execute(
    "INSERT INTO raw_articles (title, url, source) VALUES (?, ?, ?) ON CONFLICT (url) DO NOTHING",
    (title, url, source)
)
```

**After (Dialect-Aware):**
```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

dialect = session.bind.dialect.name

if dialect == "postgresql":
    stmt = pg_insert(RawArticle).values(
        title=title, url=url, source=source
    ).on_conflict_do_nothing(index_elements=['url'])
    session.execute(stmt)
else:
    # Fallback for other dialects
    exists = session.query(RawArticle).filter_by(url=url).first()
    if not exists:
        article = RawArticle(title=title, url=url, source=source)
        session.add(article)

session.commit()
```

---

### 5. DELETE Statement

**Before:**
```python
cur.execute("DELETE FROM article_tags WHERE article_id = ?", (article_id,))
conn.commit()
```

**After:**
```python
session.query(ArticleTag).filter(
    ArticleTag.article_id == article_id
).delete()
session.commit()
```

---

### 6. COUNT Query

**Before:**
```python
cur.execute("SELECT COUNT(*) FROM raw_articles WHERE state = ?", ("pending",))
count = cur.fetchone()[0]
```

**After:**
```python
from sqlalchemy import func

count = session.query(func.count(RawArticle.id)).filter(
    RawArticle.state == "pending"
).scalar()
```

---

### 7. GROUP BY Query

**Before:**
```python
cur.execute("SELECT state, COUNT(*) FROM raw_articles GROUP BY state")
results = cur.fetchall()
for state, count in results:
    print(f"{state}: {count}")
```

**After:**
```python
results = session.query(
    RawArticle.state,
    func.count(RawArticle.id)
).group_by(RawArticle.state).all()

for state, count in results:
    print(f"{state}: {count}")
```

---

### 8. Atomic State Transition (Claim Pattern)

**Before:**
```python
cur.execute(
    "UPDATE raw_articles SET state = 'processing' WHERE id = ? AND state = 'pending'",
    (article_id,)
)
conn.commit()
if cur.rowcount == 0:
    return  # Someone else claimed it
```

**After:**
```python
from sqlalchemy import update as sql_update

result = session.execute(
    sql_update(RawArticle)
    .where(RawArticle.id == article_id, RawArticle.state == 'pending')
    .values(state='processing')
)
session.commit()

if result.rowcount == 0:
    return  # Someone else claimed it
```

---

### 9. ORDER BY and LIMIT

**Before:**
```python
cur.execute(
    "SELECT * FROM processed_articles ORDER BY viral_score DESC LIMIT ?",
    (limit,)
)
```

**After:**
```python
articles = session.query(ProcessedArticle).order_by(
    ProcessedArticle.viral_score.desc()
).limit(limit).all()
```

---

### 10. Complex WHERE Conditions

**Before:**
```python
cur.execute("""
    SELECT * FROM raw_articles 
    WHERE state IN ('pending', 'cleaning') 
    AND fetched_at > ? 
    AND is_duplicate = 0
""", (cutoff_date,))
```

**After:**
```python
articles = session.query(RawArticle).filter(
    RawArticle.state.in_(['pending', 'cleaning']),
    RawArticle.fetched_at > cutoff_date,
    RawArticle.is_duplicate == 0
).all()
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Forgetting to Commit
```python
# WRONG - Changes not saved
article.state = "processed"

# RIGHT
article.state = "processed"
session.commit()
```

### Pitfall 2: Accessing Relationships Without Loading
```python
# WRONG - May cause N+1 queries
for article in articles:
    print(article.raw_article.title)  # Separate query for each!

# RIGHT - Use joinedload
from sqlalchemy.orm import joinedload

articles = session.query(ProcessedArticle).options(
    joinedload(ProcessedArticle.raw_article)
).all()
```

### Pitfall 3: Modifying Query Results Outside Session
```python
# WRONG - Session closed, can't access relationships
with get_session() as session:
    articles = session.query(RawArticle).all()

for article in articles:
    print(article.title)  # This works
    print(article.processed_article.summary)  # ERROR! Session closed

# RIGHT - Access everything inside session
with get_session() as session:
    articles = session.query(RawArticle).all()
    for article in articles:
        print(article.title)
        if article.processed_article:
            print(article.processed_article.summary)
```

### Pitfall 4: Using String Concatenation for Queries
```python
# WRONG - SQL injection risk
query = f"SELECT * FROM raw_articles WHERE title = '{user_input}'"

# RIGHT - Use parameters
articles = session.query(RawArticle).filter(
    RawArticle.title == user_input
).all()
```

---

## Import Checklist

When converting a file, make sure to add these imports:

```python
# Core ORM
from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle, GeneratedContent, ArticleTag
# Add other models as needed

# For updates
from sqlalchemy import update as sql_update

# For aggregations
from sqlalchemy import func

# For PostgreSQL-specific inserts
from sqlalchemy.dialects.postgresql import insert as pg_insert

# For relationship loading
from sqlalchemy.orm import joinedload
```

---

## Testing Your Conversion

After converting a file:

1. **Check syntax**: `python -m py_compile backend/path/to/file.py`
2. **Run the application**: `docker logs pulsepro-backend-1 --tail 50`
3. **Test the feature**: Use the API or run the pipeline
4. **Check for errors**: Look for `NotImplementedError` or database errors

---

## Quick Reference: Model Attributes

### RawArticle
- `id`, `title`, `url`, `source`, `category`, `raw_content`
- `state`, `is_duplicate`, `processed`, `fetched_at`

### ProcessedArticle
- `id`, `raw_article_id`, `summary`, `key_points`
- `viral_score`, `tech_score`, `relevance_score`, `priority_score`
- `priority`, `analyzed_at`
- Relationship: `raw_article` (to RawArticle)

### GeneratedContent
- `id`, `article_id`, `platform`, `content`
- `posted`, `posted_at`, `generated_at`, `char_count`

### ArticleTag
- `id`, `article_id`, `tag`, `created_at`

---

## Need Help?

If you encounter an error:
1. Check the stack trace for the file and line number
2. Look for `NotImplementedError: Use get_session() instead of get_connection()`
3. Find the pattern above that matches your use case
4. Convert the code following the pattern
5. Test the feature again


---

## Phase 6 Completion - 100% ORM Coverage Achieved

### Migration Status: COMPLETE ✅

As of Phase 6 completion, the AI Pulse Pro application has achieved **100% ORM coverage** across all code:

- **Production Files**: 30/30 converted (100%)
- **Test Files**: 10/10 converted (100%)
- **Utility Scripts**: 7/7 converted (100%)
- **Compatibility Stubs**: Removed from database.py
- **Performance Monitoring**: Implemented and operational

### What Changed in Phase 6

#### 1. Compatibility Stubs Removed

The following compatibility functions have been **removed** from `backend/database.py`:

```python
# REMOVED - No longer available
def init_db():
    """Database initialization handled by Alembic migrations."""
    pass

@contextmanager
def get_connection():
    """Use get_session() instead."""
    raise NotImplementedError("Use get_session() instead of get_connection()")
```

**Migration Path:**
- All `init_db()` calls removed - database initialization is handled by Alembic migrations
- All `get_connection()` calls replaced with `get_session()`
- All cursor-based queries converted to ORM

#### 2. Test Files Converted

All 10 test files now use ORM exclusively:

- `tests/e2e_tests.py`
- `tests/smoke_test.py`
- `tests/test_decision_engine_refactor.py`
- `tests/test_e2e_api_flow.py`
- `tests/test_hashtag_module.py`
- `tests/test_phase2_visuals.py`
- `tests/test_pipeline_scoring_sanity.py`
- `tests/test_seo_optimizer.py`
- `tests/test_stories_keyerror_bugfix.py`
- `tests/test_stories_preservation.py`

**Test Pattern:**
```python
# Old pattern (removed)
def setUp(self):
    db.init_db()
    with db.get_connection() as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO raw_articles ...")
        conn.commit()

# New pattern (current)
def setUp(self):
    with db.get_session() as session:
        article = RawArticle(
            title="Test Article",
            url="https://example.com",
            source="test"
        )
        session.add(article)
        session.commit()
```

#### 3. Utility Scripts Converted

All 7 utility scripts now use ORM:

- `check_db_v2.py` - Database inspection
- `check_db_v3.py` - State distribution analysis
- `debug_gmail.py` - Gmail debugging
- `check_gmail.py` - Gmail verification
- `manage_gmail_senders.py` - Sender management
- `fix_rss_articles.py` - RSS article repair
- `scripts/seed_demo_data.py` - Demo data seeding

**Script Pattern:**
```python
# Old pattern (removed)
import sqlite3
conn = sqlite3.connect("database.db")
cur = conn.cursor()
cur.execute("SELECT * FROM raw_articles")

# New pattern (current)
from backend.database import get_session
from backend.models import RawArticle

with get_session() as session:
    articles = session.query(RawArticle).all()
```

#### 4. Performance Monitoring Added

New monitoring capabilities in `backend/database.py`:

**monitored_session() Context Manager:**
```python
from backend.database import monitored_session

with monitored_session("fetch_articles") as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()

# Automatically logs:
# - Query duration
# - Operation name
# - Slow query warnings (>100ms)
# - Error tracking
```

**Query Statistics API:**
```python
from backend.database import get_query_stats

stats = get_query_stats(hours=24)
# Returns:
# {
#     "total_queries": 1523,
#     "avg_duration_ms": 45.2,
#     "slow_queries": 12,
#     "queries_by_operation": {
#         "fetch_articles": {"count": 450, "avg_duration_ms": 35.1},
#         "update_status": {"count": 380, "avg_duration_ms": 12.5}
#     }
# }
```

**Monitoring Endpoint:**
```bash
curl http://localhost:5001/api/query-stats
curl http://localhost:5001/api/query-stats?hours=1
```

### Final Architecture

```
Application Layer
├── Production Files (30) ──┐
├── Test Files (10) ────────┤
└── Utility Scripts (7) ────┤
                            │
                            ▼
                    Database Access Layer
                    ├── get_session() - Standard ORM access
                    ├── monitored_session() - With performance tracking
                    └── get_query_stats() - Performance analytics
                            │
                            ▼
                    SQLAlchemy ORM
                    ├── Models (31 tables)
                    ├── Session Manager
                    └── Connection Pool
                            │
                            ▼
                    PostgreSQL 15
```

### Verification Results

Phase 6 verification confirmed:

✅ Zero references to `init_db()` in codebase
✅ Zero references to `get_connection()` in codebase
✅ Zero references to `cursor.execute()` in production code
✅ Zero references to `sqlite3` module in production code
✅ All 10 test files pass with ORM
✅ All 7 utility scripts execute successfully
✅ Performance monitoring operational
✅ Application healthy and stable
✅ All 31 tables present in PostgreSQL
✅ Foreign key constraints properly defined

### Database Statistics

- **Total Tables**: 31 (30 data tables + alembic_version)
- **Connection Pool**: 5 base connections, 10 overflow (15 max)
- **Migration History**: Single baseline migration
- **Schema Drift**: Zero (100% alignment between models and database)

---

## Troubleshooting Guide

### Common Issues After Phase 6

#### Issue 1: NameError for init_db or get_connection

**Error:**
```
NameError: name 'init_db' is not defined
NameError: name 'get_connection' is not defined
```

**Solution:**
These functions were removed in Phase 6. Update your code:

```python
# Remove init_db() calls - not needed
# Database is initialized by Alembic migrations

# Replace get_connection() with get_session()
from backend.database import get_session

with get_session() as session:
    # Your ORM code here
```

#### Issue 2: Cursor Attribute Errors

**Error:**
```
AttributeError: 'Session' object has no attribute 'cursor'
```

**Solution:**
You're trying to use cursor methods on a session. Convert to ORM:

```python
# Wrong
with get_session() as session:
    cur = session.cursor()  # Session doesn't have cursor()

# Right
with get_session() as session:
    articles = session.query(RawArticle).all()
```

#### Issue 3: Tuple Index Errors

**Error:**
```
TypeError: 'RawArticle' object is not subscriptable
```

**Solution:**
ORM returns objects, not tuples. Use attribute access:

```python
# Wrong
article = session.query(RawArticle).first()
title = article[1]  # Can't index objects

# Right
article = session.query(RawArticle).first()
title = article.title  # Use attribute access
```

#### Issue 4: Session Closed Errors

**Error:**
```
sqlalchemy.orm.exc.DetachedInstanceError: Instance is not bound to a Session
```

**Solution:**
Access relationships inside the session context:

```python
# Wrong
with get_session() as session:
    article = session.query(ProcessedArticle).first()

# Session closed here
print(article.raw_article.title)  # ERROR!

# Right
with get_session() as session:
    article = session.query(ProcessedArticle).options(
        joinedload(ProcessedArticle.raw_article)
    ).first()
    
    # Access inside session
    title = article.raw_article.title

print(title)  # OK - data already loaded
```

#### Issue 5: Slow Queries

**Symptoms:**
- Warnings in logs: "Slow query detected: operation_name took XXXms"
- High query counts in monitoring dashboard

**Solution:**
1. Check monitoring endpoint: `curl http://localhost:5001/api/query-stats`
2. Identify slow operations in `queries_by_operation`
3. Add eager loading to avoid N+1 queries:

```python
from sqlalchemy.orm import joinedload

# Before (slow - N+1 queries)
articles = session.query(ProcessedArticle).all()
for article in articles:
    print(article.raw_article.title)  # Separate query each time

# After (fast - single query with JOIN)
articles = session.query(ProcessedArticle).options(
    joinedload(ProcessedArticle.raw_article)
).all()
for article in articles:
    print(article.raw_article.title)  # No extra queries
```

#### Issue 6: Database Connection Errors

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify DATABASE_URL in environment: `echo $DATABASE_URL`
3. Check connection pool settings in `backend/database.py`
4. Review connection pool statistics in logs

#### Issue 7: Migration Conflicts

**Error:**
```
alembic.util.exc.CommandError: Target database is not up to date
```

**Solution:**
1. Check current migration: `alembic current`
2. Check pending migrations: `alembic history`
3. Apply migrations: `alembic upgrade head`
4. If issues persist, check `alembic_version` table in database

---

## Best Practices Summary

### DO ✅

1. **Use get_session() for all database access**
   ```python
   with get_session() as session:
       articles = session.query(RawArticle).all()
   ```

2. **Use monitored_session() for performance tracking**
   ```python
   with monitored_session("operation_name") as session:
       # Your database operations
   ```

3. **Use eager loading to avoid N+1 queries**
   ```python
   from sqlalchemy.orm import joinedload
   articles = session.query(ProcessedArticle).options(
       joinedload(ProcessedArticle.raw_article)
   ).all()
   ```

4. **Use bulk operations for multiple records**
   ```python
   session.add_all(articles)
   session.commit()
   ```

5. **Use atomic updates for state transitions**
   ```python
   from sqlalchemy import update as sql_update
   result = session.execute(
       sql_update(RawArticle)
       .where(RawArticle.id == id, RawArticle.state == "pending")
       .values(state="processing")
   )
   ```

### DON'T ❌

1. **Don't use init_db() - it's removed**
   ```python
   # WRONG - Function removed
   db.init_db()
   ```

2. **Don't use get_connection() - it's removed**
   ```python
   # WRONG - Function removed
   with db.get_connection() as conn:
       cur = conn.cursor()
   ```

3. **Don't use raw SQL cursors**
   ```python
   # WRONG - Use ORM instead
   cur.execute("SELECT * FROM raw_articles")
   ```

4. **Don't access relationships outside session**
   ```python
   # WRONG - Session closed
   with get_session() as session:
       article = session.query(ProcessedArticle).first()
   print(article.raw_article.title)  # ERROR!
   ```

5. **Don't commit in loops**
   ```python
   # WRONG - Multiple commits
   for article in articles:
       session.add(article)
       session.commit()  # Slow!
   
   # RIGHT - Single commit
   session.add_all(articles)
   session.commit()
   ```

---

## Additional Resources

### Documentation

- **ORM_PATTERNS.md** - Comprehensive ORM patterns and examples
- **PERFORMANCE_MONITORING.md** - Query performance tracking guide
- **DEVELOPER_GUIDE.md** - Development workflows and onboarding
- **SQLAlchemy Docs** - https://docs.sqlalchemy.org/

### Code Examples

- **backend/database.py** - Database access layer with all ORM functions
- **backend/models.py** - All 31 table models with relationships
- **tests/** - Test files showing ORM usage patterns
- **backend/fetchers/** - Production code examples

### Monitoring

- **Query Stats Endpoint**: `http://localhost:5001/api/query-stats`
- **Health Endpoint**: `http://localhost:5001/health`
- **Logs**: `docker logs backend | grep "Slow query"`

### Support

For questions or issues:
1. Check this guide's troubleshooting section
2. Review ORM_PATTERNS.md for pattern examples
3. Check SQLAlchemy documentation
4. Review git history for conversion examples: `git log --grep="ORM"`

---

## Migration Timeline

- **Phase 1-4**: Schema migration and baseline creation (Complete)
- **Phase 5**: Production file ORM conversion - 30 files (Complete)
- **Phase 6**: Final cleanup and optimization (Complete)
  - Removed compatibility stubs
  - Converted 10 test files
  - Converted 7 utility scripts
  - Added performance monitoring
  - Completed documentation

**Result**: 100% ORM coverage, zero legacy code, production-ready PostgreSQL system.

---

*Last Updated: Phase 6 Completion*
*Migration Status: COMPLETE ✅*
*ORM Coverage: 100%*
