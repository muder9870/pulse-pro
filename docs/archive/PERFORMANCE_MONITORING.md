# Database Performance Monitoring Guide

## Introduction

As part of Phase 6 of the PostgreSQL migration, AI Pulse Pro now includes comprehensive database performance monitoring. This guide explains how to use the monitoring system to track query performance, identify bottlenecks, and optimize database operations.

## Table of Contents

1. [Overview](#overview)
2. [Using monitored_session()](#using-monitored_session)
3. [Reading Query Statistics](#reading-query-statistics)
4. [Identifying Slow Queries](#identifying-slow-queries)
5. [Optimization Strategies](#optimization-strategies)
6. [Monitoring Dashboard](#monitoring-dashboard)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What Gets Monitored

The performance monitoring system tracks:

- **Query Duration**: Time taken for each database operation (in milliseconds)
- **Operation Names**: Labeled operations for easy identification
- **Slow Queries**: Queries exceeding 100ms threshold
- **Error Tracking**: Failed queries with error messages
- **Operation Statistics**: Aggregated metrics by operation type

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Application Code                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  with monitored_session("operation_name"):        │ │
│  │      # Your database operations                   │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Performance Monitoring Layer                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │  • Start timer                                    │ │
│  │  • Execute database operations                    │ │
│  │  • Calculate duration                             │ │
│  │  • Log to health_history table                    │ │
│  │  • Warn if slow (>100ms)                          │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  health_history Table                                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │  service_name: "db_operation_name"                │ │
│  │  status: "ok" or "error"                          │ │
│  │  duration_ms: 45                                  │ │
│  │  error_message: null                              │ │
│  │  created_at: 2026-02-24 10:30:15                  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Storage

Performance data is stored in the `health_history` table:

```sql
CREATE TABLE health_history (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR NOT NULL,      -- "db_operation_name"
    status VARCHAR NOT NULL,            -- "ok" or "error"
    duration_ms INTEGER,                -- Query duration
    error_message TEXT,                 -- Error details if failed
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Using monitored_session()

### Basic Usage

Replace `get_session()` with `monitored_session()` to enable monitoring:

```python
from backend.database import monitored_session

# Standard session (no monitoring)
with get_session() as session:
    articles = session.query(RawArticle).all()

# Monitored session (with performance tracking)
with monitored_session("fetch_articles") as session:
    articles = session.query(RawArticle).all()
```

### Operation Naming

Choose descriptive operation names that identify the purpose:

```python
# Good operation names
with monitored_session("fetch_pending_articles") as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()

with monitored_session("update_article_state") as session:
    article.state = "processed"
    session.commit()

with monitored_session("generate_daily_intelligence") as session:
    intel = DailyIntelligence(date=today, top_stories_json=json_data)
    session.add(intel)
    session.commit()
```

**Naming Conventions:**
- Use snake_case: `fetch_articles`, not `FetchArticles`
- Be specific: `fetch_pending_articles`, not `query`
- Include context: `scheduler_fetch_articles`, `api_update_tags`
- Keep it short: `fetch_articles`, not `fetch_all_articles_from_database`

### When to Use monitored_session()

**Use monitored_session() for:**
- Critical operations that need performance tracking
- Operations that might be slow (complex queries, large datasets)
- Operations in scheduled jobs or background tasks
- Operations you want to optimize

**Use get_session() for:**
- Simple, fast operations (single record lookups)
- Operations called very frequently (hundreds per second)
- Operations where monitoring overhead is unacceptable
- Development/debugging code

### Example: Monitoring a Fetcher

```python
from backend.database import monitored_session
from backend.models import RawArticle

def fetch_arxiv_papers():
    """Fetch papers from arXiv and store in database."""
    papers = arxiv_api.fetch_recent_papers()
    
    with monitored_session("arxiv_fetch_papers") as session:
        for paper in papers:
            article = RawArticle(
                title=paper['title'],
                url=paper['url'],
                source='arxiv',
                category=paper['category']
            )
            session.add(article)
        session.commit()
    
    # Monitoring automatically logs:
    # - Operation: "db_arxiv_fetch_papers"
    # - Duration: e.g., 234ms
    # - Status: "ok"
```

### Example: Monitoring a Processor

```python
from backend.database import monitored_session
from backend.models import RawArticle, ProcessedArticle

def process_articles(batch_size=10):
    """Process pending articles."""
    
    # Fetch articles with monitoring
    with monitored_session("processor_fetch_pending") as session:
        articles = session.query(RawArticle).filter(
            RawArticle.state == "pending"
        ).limit(batch_size).all()
    
    for article in articles:
        # Process each article
        summary = generate_summary(article.raw_content)
        
        # Save results with monitoring
        with monitored_session("processor_save_results") as session:
            processed = ProcessedArticle(
                raw_article_id=article.id,
                summary=summary,
                viral_score=calculate_score(article)
            )
            session.add(processed)
            
            article.state = "processed"
            session.commit()
```

### Automatic Features

When using `monitored_session()`, you get:

1. **Automatic Timing**: Duration calculated automatically
2. **Automatic Logging**: Results logged to `health_history` table
3. **Slow Query Warnings**: Warnings logged for queries >100ms
4. **Error Tracking**: Errors logged with stack traces
5. **Graceful Degradation**: Monitoring failures don't break operations

---

## Reading Query Statistics

### Using get_query_stats()

The `get_query_stats()` function provides aggregated performance metrics:

```python
from backend.database import get_query_stats

# Get stats for last 24 hours (default)
stats = get_query_stats()

# Get stats for last hour
stats = get_query_stats(hours=1)

# Get stats for last week
stats = get_query_stats(hours=168)
```

### Statistics Format

```python
{
    "total_queries": 1523,              # Total database operations
    "avg_duration_ms": 45.2,            # Average query duration
    "slow_queries": 12,                 # Queries exceeding 100ms
    "time_window_hours": 24,            # Time window used
    "queries_by_operation": {
        "fetch_pending_articles": {
            "count": 450,               # Number of times called
            "avg_duration_ms": 35.1,    # Average duration
            "slow_count": 2,            # Slow queries
            "error_count": 0            # Failed queries
        },
        "update_article_state": {
            "count": 380,
            "avg_duration_ms": 12.5,
            "slow_count": 0,
            "error_count": 1
        },
        "generate_daily_intelligence": {
            "count": 24,
            "avg_duration_ms": 156.3,
            "slow_count": 10,
            "error_count": 0
        }
    }
}
```

### Example: Analyzing Performance

```python
from backend.database import get_query_stats

def analyze_database_performance():
    """Analyze database performance and identify issues."""
    stats = get_query_stats(hours=24)
    
    print(f"Total queries: {stats['total_queries']}")
    print(f"Average duration: {stats['avg_duration_ms']}ms")
    print(f"Slow queries: {stats['slow_queries']}")
    
    # Find slowest operations
    operations = stats['queries_by_operation']
    slowest = sorted(
        operations.items(),
        key=lambda x: x[1]['avg_duration_ms'],
        reverse=True
    )
    
    print("\nSlowest operations:")
    for op_name, op_stats in slowest[:5]:
        print(f"  {op_name}: {op_stats['avg_duration_ms']}ms "
              f"({op_stats['count']} calls, {op_stats['slow_count']} slow)")
    
    # Find operations with errors
    errors = [(name, stats) for name, stats in operations.items() 
              if stats['error_count'] > 0]
    
    if errors:
        print("\nOperations with errors:")
        for op_name, op_stats in errors:
            print(f"  {op_name}: {op_stats['error_count']} errors")
```

---

## Identifying Slow Queries

### Slow Query Threshold

Queries are considered "slow" if they exceed **100ms**. This threshold is defined in `backend/database.py`:

```python
# In monitored_session()
if duration_ms > 100:
    logger.warning(f"Slow query detected: {operation_name} took {duration_ms}ms")
```

### Finding Slow Queries in Logs

Check application logs for slow query warnings:

```bash
# View recent slow queries
docker logs backend | grep "Slow query"

# Example output:
# WARNING: Slow query detected: generate_daily_intelligence took 156ms
# WARNING: Slow query detected: fetch_pending_articles took 234ms
```

### Finding Slow Queries via API

Use the monitoring endpoint to identify slow operations:

```bash
# Get query statistics
curl http://localhost:5001/api/query-stats

# Filter for operations with high slow_count
curl http://localhost:5001/api/query-stats | jq '.queries_by_operation | 
  to_entries | 
  map(select(.value.slow_count > 0)) | 
  sort_by(.value.avg_duration_ms) | 
  reverse'
```

### Example: Monitoring Script

Create a script to monitor slow queries:

```python
#!/usr/bin/env python3
"""Monitor database performance and alert on slow queries."""

import time
from backend.database import get_query_stats

def monitor_performance(threshold_ms=100, check_interval=60):
    """Monitor database performance continuously."""
    while True:
        stats = get_query_stats(hours=1)
        
        # Check for slow operations
        for op_name, op_stats in stats['queries_by_operation'].items():
            if op_stats['avg_duration_ms'] > threshold_ms:
                print(f"⚠️  SLOW: {op_name} averaging {op_stats['avg_duration_ms']}ms")
                print(f"   Calls: {op_stats['count']}, Slow: {op_stats['slow_count']}")
            
            if op_stats['error_count'] > 0:
                print(f"❌ ERROR: {op_name} has {op_stats['error_count']} errors")
        
        # Overall statistics
        if stats['avg_duration_ms'] > threshold_ms:
            print(f"⚠️  Overall average duration high: {stats['avg_duration_ms']}ms")
        
        time.sleep(check_interval)

if __name__ == "__main__":
    monitor_performance()
```

---

## Optimization Strategies

### Strategy 1: Add Eager Loading

**Problem**: N+1 queries causing slow performance

**Symptoms**:
- High query count for fetch operations
- Multiple queries for related data
- Slow operations with many database calls

**Solution**: Use `joinedload()` or `selectinload()`

```python
from sqlalchemy.orm import joinedload

# Before (slow - N+1 queries)
with monitored_session("fetch_articles") as session:
    articles = session.query(ProcessedArticle).limit(100).all()
    for article in articles:
        print(article.raw_article.title)  # Separate query each time!

# After (fast - single query with JOIN)
with monitored_session("fetch_articles") as session:
    articles = session.query(ProcessedArticle).options(
        joinedload(ProcessedArticle.raw_article)
    ).limit(100).all()
    for article in articles:
        print(article.raw_article.title)  # No extra queries!
```

**Expected Improvement**: 10-100x faster for operations accessing relationships

### Strategy 2: Use Bulk Operations

**Problem**: Multiple commits in loops

**Symptoms**:
- High duration for insert/update operations
- Many individual database calls
- Operation name called hundreds of times

**Solution**: Batch operations and commit once

```python
# Before (slow - multiple commits)
for article_data in article_list:
    with monitored_session("insert_article") as session:
        article = RawArticle(**article_data)
        session.add(article)
        session.commit()  # Commit for each article - SLOW!

# After (fast - single commit)
with monitored_session("insert_articles_batch") as session:
    articles = [RawArticle(**data) for data in article_list]
    session.add_all(articles)
    session.commit()  # Single commit - FAST!
```

**Expected Improvement**: 5-50x faster for bulk operations

### Strategy 3: Add Database Indexes

**Problem**: Slow queries on filtered columns

**Symptoms**:
- Slow SELECT queries with WHERE clauses
- High duration for filter operations
- Queries on large tables

**Solution**: Add indexes to frequently queried columns

```python
# In backend/models.py
class RawArticle(Base):
    __tablename__ = "raw_articles"
    
    id = mapped_column(Integer, primary_key=True)
    state = mapped_column(String, index=True)  # Add index
    source = mapped_column(String, index=True)  # Add index
    fetched_at = mapped_column(DateTime, index=True)  # Add index
```

**Create migration**:
```bash
alembic revision -m "add_indexes_to_raw_articles"
```

**Expected Improvement**: 10-1000x faster for filtered queries on large tables

### Strategy 4: Use Bulk Updates

**Problem**: Slow updates in loops

**Symptoms**:
- High duration for update operations
- Many individual UPDATE queries
- Fetch-then-update pattern

**Solution**: Use bulk update with `sql_update()`

```python
from sqlalchemy import update as sql_update

# Before (slow - fetch and update each)
with monitored_session("update_articles") as session:
    articles = session.query(RawArticle).filter(
        RawArticle.state == "pending"
    ).all()
    for article in articles:
        article.state = "processing"
    session.commit()

# After (fast - bulk update)
with monitored_session("update_articles_bulk") as session:
    session.execute(
        sql_update(RawArticle)
        .where(RawArticle.state == "pending")
        .values(state="processing")
    )
    session.commit()
```

**Expected Improvement**: 5-20x faster for bulk updates

### Strategy 5: Limit Result Sets

**Problem**: Fetching too much data

**Symptoms**:
- Very high duration for SELECT queries
- Large result sets
- Memory issues

**Solution**: Add `.limit()` to queries

```python
# Before (slow - fetches all records)
with monitored_session("fetch_articles") as session:
    articles = session.query(RawArticle).all()  # Could be thousands!

# After (fast - fetches only what's needed)
with monitored_session("fetch_articles") as session:
    articles = session.query(RawArticle).limit(100).all()
```

**Expected Improvement**: 2-10x faster, reduced memory usage

### Strategy 6: Use Connection Pooling

**Problem**: Connection overhead

**Symptoms**:
- Slow query startup time
- Connection errors under load
- High latency for simple queries

**Solution**: Connection pooling is already configured in `database.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,          # 5 persistent connections
    max_overflow=10,      # Up to 15 total connections
    pool_pre_ping=True,   # Verify connections before use
    pool_recycle=1800     # Recycle after 30 minutes
)
```

**Tuning**: Adjust pool_size based on workload:
- Low traffic: pool_size=5 (default)
- Medium traffic: pool_size=10
- High traffic: pool_size=20

### Strategy 7: Cache Frequently Accessed Data

**Problem**: Repeated queries for same data

**Symptoms**:
- Same operation called many times
- High query count for read operations
- Queries for static/rarely changing data

**Solution**: Use caching decorator

```python
from backend.cache_manager import cache_result

@cache_result(ttl=300, key_prefix="trending_hashtags")
def get_trending_hashtags(platform: str):
    """Get trending hashtags (cached for 5 minutes)."""
    with monitored_session("fetch_trending_hashtags") as session:
        hashtags = session.query(TrendingHashtag).filter(
            TrendingHashtag.platform == platform
        ).all()
        return hashtags
```

**Expected Improvement**: 100-1000x faster for cached hits

---

## Monitoring Dashboard

### API Endpoint

Access query statistics via HTTP:

```bash
# Get statistics for last 24 hours
curl http://localhost:5001/api/query-stats

# Get statistics for last hour
curl http://localhost:5001/api/query-stats?hours=1

# Get statistics for last week
curl http://localhost:5001/api/query-stats?hours=168
```

### Response Format

```json
{
  "total_queries": 1523,
  "avg_duration_ms": 45.2,
  "slow_queries": 12,
  "time_window_hours": 24,
  "queries_by_operation": {
    "fetch_pending_articles": {
      "count": 450,
      "avg_duration_ms": 35.1,
      "slow_count": 2,
      "error_count": 0
    },
    "update_article_state": {
      "count": 380,
      "avg_duration_ms": 12.5,
      "slow_count": 0,
      "error_count": 1
    }
  }
}
```

### Using jq for Analysis

```bash
# Get top 5 slowest operations
curl -s http://localhost:5001/api/query-stats | jq '
  .queries_by_operation | 
  to_entries | 
  sort_by(.value.avg_duration_ms) | 
  reverse | 
  .[0:5]'

# Get operations with errors
curl -s http://localhost:5001/api/query-stats | jq '
  .queries_by_operation | 
  to_entries | 
  map(select(.value.error_count > 0))'

# Get total slow query count
curl -s http://localhost:5001/api/query-stats | jq '.slow_queries'
```

### Building a Dashboard

Create a simple monitoring dashboard:

```python
#!/usr/bin/env python3
"""Simple performance monitoring dashboard."""

import requests
import time
from datetime import datetime

def display_dashboard():
    """Display performance dashboard."""
    while True:
        # Clear screen
        print("\033[2J\033[H")
        
        # Fetch statistics
        response = requests.get("http://localhost:5001/api/query-stats?hours=1")
        stats = response.json()
        
        # Display header
        print("=" * 80)
        print(f"Database Performance Dashboard - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        print()
        
        # Overall statistics
        print(f"Total Queries:    {stats['total_queries']}")
        print(f"Avg Duration:     {stats['avg_duration_ms']:.1f}ms")
        print(f"Slow Queries:     {stats['slow_queries']}")
        print()
        
        # Top operations
        operations = stats['queries_by_operation']
        sorted_ops = sorted(
            operations.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        print("Top Operations (by call count):")
        print("-" * 80)
        print(f"{'Operation':<40} {'Calls':>8} {'Avg (ms)':>10} {'Slow':>6} {'Errors':>8}")
        print("-" * 80)
        
        for op_name, op_stats in sorted_ops[:10]:
            print(f"{op_name:<40} {op_stats['count']:>8} "
                  f"{op_stats['avg_duration_ms']:>10.1f} "
                  f"{op_stats['slow_count']:>6} "
                  f"{op_stats['error_count']:>8}")
        
        print()
        print("Refreshing in 10 seconds... (Ctrl+C to exit)")
        
        time.sleep(10)

if __name__ == "__main__":
    try:
        display_dashboard()
    except KeyboardInterrupt:
        print("\nDashboard stopped.")
```

---

## Troubleshooting

### Issue 1: No Statistics Showing

**Symptoms**:
- `get_query_stats()` returns zero queries
- Monitoring endpoint shows empty data

**Possible Causes**:
1. No operations using `monitored_session()`
2. Time window too narrow
3. health_history table empty

**Solutions**:
```python
# Check if any monitored operations exist
stats = get_query_stats(hours=168)  # Check last week
print(f"Total queries: {stats['total_queries']}")

# Verify health_history table has data
with get_session() as session:
    count = session.query(HealthHistory).filter(
        HealthHistory.service_name.like('db_%')
    ).count()
    print(f"Records in health_history: {count}")
```

### Issue 2: Monitoring Overhead Too High

**Symptoms**:
- Operations slower with monitoring
- High CPU usage
- Database connection issues

**Solutions**:
1. Use monitoring selectively (not for every operation)
2. Increase monitoring threshold
3. Reduce logging frequency

```python
# Use get_session() for fast operations
with get_session() as session:
    article = session.query(RawArticle).filter(
        RawArticle.id == article_id
    ).first()

# Use monitored_session() only for slow operations
with monitored_session("complex_query") as session:
    results = session.query(ProcessedArticle).join(
        RawArticle
    ).filter(...).all()
```

### Issue 3: Slow Query Warnings Flooding Logs

**Symptoms**:
- Too many slow query warnings
- Logs filling up quickly
- Difficult to find real issues

**Solutions**:
1. Optimize the slow queries (see optimization strategies)
2. Adjust slow query threshold
3. Filter logs

```python
# Adjust threshold in database.py
SLOW_QUERY_THRESHOLD_MS = 200  # Increase from 100ms

if duration_ms > SLOW_QUERY_THRESHOLD_MS:
    logger.warning(f"Slow query: {operation_name} took {duration_ms}ms")
```

### Issue 4: health_history Table Growing Too Large

**Symptoms**:
- Database size increasing
- Slow monitoring queries
- Disk space issues

**Solutions**:
1. Add cleanup job to delete old records
2. Partition the table
3. Archive old data

```python
# Cleanup script
from datetime import datetime, timedelta
from backend.database import get_session
from backend.models import HealthHistory

def cleanup_old_monitoring_data(days=30):
    """Delete monitoring data older than specified days."""
    cutoff = datetime.now() - timedelta(days=days)
    
    with get_session() as session:
        deleted = session.query(HealthHistory).filter(
            HealthHistory.created_at < cutoff
        ).delete()
        session.commit()
        
        print(f"Deleted {deleted} old monitoring records")

# Run daily
cleanup_old_monitoring_data(days=30)
```

---

## Best Practices

### DO ✅

1. **Use descriptive operation names**
   ```python
   with monitored_session("scheduler_fetch_pending_articles") as session:
   ```

2. **Monitor critical operations**
   ```python
   # Monitor scheduled jobs, API endpoints, background tasks
   with monitored_session("api_update_article_tags") as session:
   ```

3. **Check statistics regularly**
   ```bash
   curl http://localhost:5001/api/query-stats
   ```

4. **Optimize slow queries**
   ```python
   # Add eager loading, indexes, bulk operations
   ```

5. **Clean up old monitoring data**
   ```python
   # Delete records older than 30 days
   ```

### DON'T ❌

1. **Don't monitor every single operation**
   ```python
   # WRONG - Too much overhead
   with monitored_session("get_article_by_id") as session:
       article = session.query(RawArticle).filter(
           RawArticle.id == id
       ).first()
   ```

2. **Don't use generic operation names**
   ```python
   # WRONG - Not descriptive
   with monitored_session("query") as session:
   ```

3. **Don't ignore slow query warnings**
   ```python
   # If you see warnings, investigate and optimize!
   ```

4. **Don't let health_history grow unbounded**
   ```python
   # Set up cleanup job
   ```

---

## Summary

The performance monitoring system provides:

- **Automatic tracking** of database operation duration
- **Slow query detection** with 100ms threshold
- **Aggregated statistics** via `get_query_stats()`
- **HTTP API** for external monitoring tools
- **Error tracking** for failed operations

Use this system to:
- Identify performance bottlenecks
- Track optimization improvements
- Monitor production database health
- Debug slow operations

For more information:
- **ORM_PATTERNS.md** - ORM usage patterns
- **ORM_CONVERSION_GUIDE.md** - Migration guide
- **DEVELOPER_GUIDE.md** - Development workflows

---

*Last Updated: Phase 6 Completion*
*Monitoring Status: Operational ✅*
