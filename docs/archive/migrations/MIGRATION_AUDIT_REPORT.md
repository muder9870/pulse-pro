# PostgreSQL Migration Audit Report
## AI Pulse Pro - Full Repository Analysis

**Date**: February 24, 2026  
**Status**: CRITICAL - Multiple schema drift and data access inconsistencies detected  
**Recommendation**: FULL CLEAN REBUILD REQUIRED

---

## Executive Summary

This repository has undergone a partial SQLite → PostgreSQL migration that is **incomplete and broken**. The codebase exhibits:

- **Mixed data access patterns** (raw cursors + SQLAlchemy ORM)
- **Schema drift** (tables in code but not in migrations)
- **SQLite-specific code** still present throughout
- **Inconsistent row access** (tuple indexing vs dict access vs ORM)
- **Missing tables** in Alembic migrations
- **PostgresCursorAdapter hack** that masks underlying issues

**VERDICT**: The current state is unmaintainable. A clean rebuild is mandatory.

---

## 1. DATA ACCESS PATTERN CLASSIFICATION

### 1.1 Raw SQLite Cursor Usage (LEGACY - MUST REMOVE)

**Files with raw cursor access**:

1. **backend/database.py** - 600+ lines of raw cursor code with `get_connection()` context manager
   - `init_db()` - Creates tables with raw SQL (lines 45-500+)
   - `get_top_stories()` - Uses cursors with row_factory (line 624)
   - `get_tags_for_article()` - Raw cursor (line 695)
   - `get_content_for_platform()` - Raw cursor (line 720)
   - 20+ other functions using raw cursors

2. **backend/processors/monetization_engine.py** - Lines 18-24
   - Uses `conn.row_factory = sqlite3.Row` (SQLite-specific)
   - Accesses `row["keyword"]` after setting row_factory

3. **backend/processors/integrations_manager.py** - Lines 22-26
   - Uses `conn.row_factory = sqlite3.Row`
   - Raw cursor access to webhooks table

4. **backend/processors/analytics_engine.py** - Multiple functions
   - `get_category_distribution()` - Raw cursor with tuple access `row[0], row[1]`
   - `get_sentiment_stats()` - Raw cursor with tuple access

5. **backend/fetchers/rss_fetcher.py** - Lines 121-530
   - Creates tables with `CREATE TABLE IF NOT EXISTS` (bypasses Alembic)
   - Uses raw cursors throughout
   - Has both SQLite and Postgres branches

6. **backend/fetchers/gmail_fetcher_smart.py** - Lines 77-478
   - Creates `gmail_newsletter_senders` table with raw SQL
   - Bypasses Alembic entirely

7. **backend/schedulers/content_scheduler.py** - Lines 43-151
   - Creates `scheduled_posts` table with raw SQL
   - Uses tuple indexing `row[0], row[1], row[2]...`

8. **backend/monitoring.py** - Line 28
   - Uses `PRAGMA journal_mode` (SQLite-only command)

9. **All test files** - Use raw cursors extensively
   - tests/test_stories_preservation.py
   - tests/test_stories_keyerror_bugfix.py
   - tests/test_hashtag_module.py
   - tests/test_e2e_api_flow.py
   - tests/test_decision_engine_refactor.py

10. **Utility scripts** - All use raw cursors
    - check_db_v2.py, check_db_v3.py
    - debug_gmail.py, check_gmail.py
    - manage_gmail_senders.py
    - fix_rss_articles.py
    - scripts/seed_demo_data.py

### 1.2 SQLAlchemy ORM Usage (CORRECT - EXPAND THIS)

**Files using ORM correctly**:

1. **backend/processors/analyzer.py** - Lines 91-300
   - Uses `get_session()` context manager
   - ORM updates with `session.execute(update(RawArticle)...)`
   - Proper session.get() for fetching
   - **STATUS**: ✅ CORRECT PATTERN

2. **backend/generators/generator_v5.py** - Lines 53-184
   - Uses `get_session()` with joinedload
   - ORM queries and updates
   - **STATUS**: ✅ CORRECT PATTERN

3. **verify_week4.py** - Uses ORM throughout
   - **STATUS**: ✅ CORRECT PATTERN

4. **backend/verify_pg_e2e.py** - Uses ORM
   - **STATUS**: ✅ CORRECT PATTERN

### 1.3 PostgresCursorAdapter (HACK - REMOVE)

**Location**: backend/database.py lines 546-600

This adapter was added to make Postgres behave like SQLite:
- Converts `?` placeholders to `%s`
- Wraps psycopg2 cursors
- Converts rows to dicts when `row_factory = sqlite3.Row`
- **PROBLEM**: Masks the real issue instead of fixing it
- **RESULT**: KeyError bugs like the one we just fixed

**VERDICT**: This adapter is a band-aid. Remove it and use ORM.

---

## 2. SCHEMA DRIFT ANALYSIS

### 2.1 Tables in Models (backend/models.py) ✅

The following tables ARE defined in SQLAlchemy models:

1. RawArticle → raw_articles ✅
2. ProcessedArticle → processed_articles ✅
3. GeneratedContent → generated_content ✅
4. DailyIntelligence → daily_intelligence ✅
5. UserPreference → user_preferences ✅
6. ArticleTag → article_tags ✅
7. TrendingHashtag → trending_hashtags ✅
8. BlogPost → blog_posts ✅
9. BlogPublication → blog_publications ✅
10. SystemStatus → system_status ✅
11. HealthHistory → health_history ✅
12. PaperAnalysis → paper_analysis ✅
13. Webhook → webhooks ✅
14. ScheduledPost → scheduled_posts ✅
15. EngagementMetric → engagement_metrics ✅
16. UserStyle → user_styles ✅
17. ArticleImage → article_images ✅
18. ArticleAudio → article_audio ✅

### 2.2 Tables MISSING from Models ❌

These tables are created in code but NOT in backend/models.py:

1. **rss_feeds** ❌
   - Created in: backend/fetchers/rss_fetcher.py (lines 122-156)
   - Columns: id, url, title, description, category, active, last_fetched, last_error, fetch_count, error_count, updated_at
   - **IMPACT**: RSS functionality will fail on fresh Postgres DB

2. **rss_feed_items** ❌
   - Created in: backend/fetchers/rss_fetcher.py (lines 158-186)
   - Columns: id, feed_id, guid, url, title, published_date, created_at
   - Foreign key to rss_feeds
   - **IMPACT**: RSS tracking will fail

3. **gmail_newsletter_senders** ❌
   - Created in: backend/fetchers/gmail_fetcher_smart.py (lines 78-108)
   - Columns: id, sender_email, sender_name, sample_subject, confidence_score, is_ai_related, message_count, is_active, first_seen, last_seen
   - **IMPACT**: Gmail fetcher will fail

4. **content_history** ❌
   - Referenced in: backend/database.py init_db() (line 200)
   - Created with raw SQL
   - **IMPACT**: Content action tracking will fail

5. **hashtag_performance** ❌
   - Referenced in: backend/database.py init_db() (line 230)
   - Created with raw SQL
   - **IMPACT**: Hashtag analytics will fail

6. **content_hashtags** ❌
   - Referenced in: backend/database.py init_db() (line 250)
   - Created with raw SQL
   - **IMPACT**: Hashtag recommendations will fail

7. **blog_credentials** ❌
   - Referenced in: backend/database.py init_db() (line 310)
   - Created with raw SQL
   - **IMPACT**: Blog publishing will fail

8. **platform_roi** ❌
   - Referenced in: backend/database.py init_db() (line 360)
   - Created with raw SQL
   - **IMPACT**: Analytics will fail

9. **topic_trends** ❌
   - Referenced in: backend/database.py init_db() (line 380)
   - Created with raw SQL
   - **IMPACT**: Trend analysis will fail

10. **affiliate_links** ❌
    - Has migration: migrations/versions/d3e4f5a6b7c8_add_affiliate_links_table.py
    - But NOT in backend/models.py
    - **IMPACT**: Monetization will fail

11. **user_feedback** ❌
    - Has migration: migrations/versions/b7c4a1d2f3e4_add_user_feedback_and_audio_duration.py
    - But NOT in backend/models.py
    - **IMPACT**: Feedback tracking will fail

12. **video_scripts** ❌
    - Has migration: migrations/versions/c8d9e0f1a2b3_add_video_scripts_table.py
    - But NOT in backend/models.py
    - **IMPACT**: Video generation will fail

### 2.3 Alembic Migration Coverage

**Baseline migration**: migrations/versions/cf9ab5967e77_baseline_production.py

**Tables in baseline** (18 tables):
- daily_intelligence ✅
- health_history ✅
- raw_articles ✅
- system_status ✅
- trending_hashtags ✅
- user_preferences ✅
- webhooks ✅
- processed_articles ✅
- article_tags ✅
- blog_posts ✅
- generated_content ✅
- paper_analysis ✅
- scheduled_posts ✅
- blog_publications ✅

**Additional migrations**:
1. a1d2c3e4f5a6_add_analytics_and_media_tables.py
   - engagement_metrics ✅
   - user_styles ✅
   - article_images ✅
   - article_audio ✅

2. b7c4a1d2f3e4_add_user_feedback_and_audio_duration.py
   - user_feedback (NOT in models.py) ❌

3. c8d9e0f1a2b3_add_video_scripts_table.py
   - video_scripts (NOT in models.py) ❌

4. d3e4f5a6b7c8_add_affiliate_links_table.py
   - affiliate_links (NOT in models.py) ❌

5. 8c053d5f0a83_sync_missing_legacy_columns.py
   - Column additions

6. 0e1f90079a01_fix_system_status_drift.py
   - Schema fixes

**MISSING from migrations** (12 tables):
- rss_feeds ❌
- rss_feed_items ❌
- gmail_newsletter_senders ❌
- content_history ❌
- hashtag_performance ❌
- content_hashtags ❌
- blog_credentials ❌
- platform_roi ❌
- topic_trends ❌

---

## 3. ROW ACCESS INCONSISTENCIES

### 3.1 Tuple-Style Access (row[0], row[1])

**Files using tuple indexing**:

1. backend/schedulers/content_scheduler.py - Lines 145-151
   - `row[0], row[1], row[2], row[3], row[4], row[5]`

2. backend/scheduler.py - Line 27
   - `row[0]`

3. backend/processors/analytics_engine.py - Lines 114, 128
   - `row[0], row[1]`

4. backend/processors/content_quality.py - Line 180
   - `row[0]`

5. backend/processors/deduplicator.py - Line 121
   - `row[0]`

6. backend/main.py - Lines 275, 1712
   - `row[0]`

7. backend/llm_cache.py - Lines 226-228
   - `row[0], row[1], row[2]`

8. backend/database.py - Lines 84, 118, 343, 348, 1188-1189, 1511, 1727
   - Multiple tuple accesses

9. backend/fetchers/gmail_fetcher_smart.py - Line 177
   - `row[0]`

10. backend/fetchers/rss_fetcher.py - Lines 214, 533-536
    - Multiple tuple accesses

### 3.2 Dict-Style Access (row["column"])

**Files using dict indexing**:

1. backend/database.py - Lines 682-683 (JUST FIXED)
   - `row['article_id'], row['tag']`

2. backend/database.py - Line 709
   - `row["tag"]`

3. backend/database.py - Line 739
   - `row["content"]`

4. backend/database.py - Line 795
   - `row["id"]`

5. backend/processors/monetization_engine.py - Line 23
   - `row["keyword"], row["url"]`

6. backend/main.py - Lines 1629, 1750-1751, 1806-1809
   - Multiple dict accesses

7. backend/generators/video_generator.py - Lines 27, 29
   - `article['title'], article['summary']`

### 3.3 Mixed Access in Same Function ⚠️

**CRITICAL ISSUE**: backend/database.py `get_top_stories()`
- Line 659: `dict(row)` - converts to dict
- Lines 682-683: `row['article_id'], row['tag']` - dict access
- **PROBLEM**: Inconsistent pattern, depends on PostgresCursorAdapter

### 3.4 ORM Attribute Access (CORRECT)

**Files using ORM correctly**:
- backend/processors/analyzer.py - `raw.state = "analyzed"`
- backend/generators/generator_v5.py - `article.raw_article.title`

---

## 4. SQLITE-SPECIFIC CODE

### 4.1 SQLite-Only SQL Syntax

1. **AUTOINCREMENT** - Used in migrations (should be removed for Postgres)
   - migrations/versions/*.py - All use `autoincrement=True`
   - **NOTE**: SQLAlchemy handles this, but migrations show SQLite heritage

2. **PRAGMA commands** - SQLite-only
   - backend/database.py line 66: `PRAGMA journal_mode=WAL`
   - backend/database.py line 67: `PRAGMA synchronous=NORMAL`
   - backend/database.py line 84: `PRAGMA table_info(raw_articles)`
   - backend/monitoring.py line 28: `PRAGMA journal_mode`
   - **IMPACT**: These will fail silently on Postgres

3. **? placeholders** - SQLite-style
   - Used throughout backend/database.py
   - PostgresCursorAdapter converts to %s
   - **PROBLEM**: Should use SQLAlchemy bindparams instead

4. **INTEGER PRIMARY KEY** - SQLite-specific
   - backend/schedulers/content_scheduler.py line 45
   - **NOTE**: Postgres uses SERIAL or BIGSERIAL

5. **sqlite3.Row** - SQLite-specific
   - backend/database.py line 626: `conn.row_factory = sqlite3.Row`
   - backend/processors/monetization_engine.py line 19
   - backend/processors/integrations_manager.py line 23
   - **PROBLEM**: Doesn't exist in Postgres

6. **sqlite3.connect** - SQLite-specific
   - backend/database.py line 600: `sqlite3.connect(DB_PATH)`
   - Multiple test files
   - **PROBLEM**: Hardcoded SQLite connection

### 4.2 Conditional SQLite/Postgres Branches

**Files with if/else branches**:

1. backend/database.py - Lines 22-29
   - Checks `"sqlite" not in settings.DATABASE_URL`
   - Sets pool_size for Postgres

2. backend/database.py - Lines 50-52
   - Skips init_db() for Postgres
   - **PROBLEM**: Means Postgres relies on Alembic, but Alembic is incomplete

3. backend/database.py - Lines 547-600
   - Entire PostgresCursorAdapter implementation
   - **PROBLEM**: Hack to make Postgres act like SQLite

4. backend/fetchers/rss_fetcher.py - Lines 121-186
   - Separate CREATE TABLE for SQLite vs Postgres
   - **PROBLEM**: Bypasses Alembic

5. backend/fetchers/gmail_fetcher_smart.py - Lines 77-108
   - Separate CREATE TABLE for SQLite vs Postgres
   - **PROBLEM**: Bypasses Alembic

---

## 5. ALEMBIC CONFIGURATION VERIFICATION

### 5.1 migrations/env.py Analysis

**Line 18**: `from backend.models import Base` ✅  
**Line 21**: `target_metadata = Base.metadata` ✅

**VERDICT**: Alembic IS configured to use models.py as source of truth.

**PROBLEM**: Models.py is incomplete (missing 12 tables).

### 5.2 Migration Chain

```
cf9ab5967e77_baseline_production (root)
  ↓
a1d2c3e4f5a6_add_analytics_and_media_tables
  ↓
b7c4a1d2f3e4_add_user_feedback_and_audio_duration
  ↓
c8d9e0f1a2b3_add_video_scripts_table
  ↓
d3e4f5a6b7c8_add_affiliate_links_table
  ↓
8c053d5f0a83_sync_missing_legacy_columns
  ↓
0e1f90079a01_fix_system_status_drift
```

**STATUS**: Linear chain, no branches ✅

**PROBLEM**: Migrations add tables not in models.py ❌

---

## 6. PRODUCTION DEPLOYMENT ISSUES

### 6.1 Current Error Patterns

Based on the bugfix we just completed and the audit:

1. **KeyError: 0** - Row indexing on dict objects
   - Caused by PostgresCursorAdapter converting rows to dicts
   - Fixed in get_top_stories(), likely exists elsewhere

2. **UndefinedTable errors** - Missing tables
   - rss_feeds, rss_feed_items, gmail_newsletter_senders
   - content_history, hashtag_performance, content_hashtags
   - blog_credentials, platform_roi, topic_trends

3. **Missing column errors** - Schema drift
   - Columns added in init_db() but not in migrations
   - Columns in migrations but not in models

4. **PRAGMA failures** - SQLite commands on Postgres
   - Silent failures, no error raised
   - Monitoring and diagnostics broken

### 6.2 Data Integrity Risks

1. **No foreign key enforcement** in raw SQL
2. **No transaction management** in cursor code
3. **Race conditions** in state machine (analyzer.py uses ORM correctly, but other code doesn't)
4. **Duplicate table creation** - init_db() vs Alembic

---

## 7. CLEAN REBUILD PLAN

### Phase 1: Prepare Models (1-2 hours)

**Goal**: Single source of truth in backend/models.py

**Actions**:

1. Add missing models to backend/models.py:
   ```python
   class RSSFeed(Base):
       __tablename__ = "rss_feeds"
       id: Mapped[int] = mapped_column(primary_key=True)
       url: Mapped[str] = mapped_column(String, unique=True)
       title: Mapped[Optional[str]] = mapped_column(String)
       description: Mapped[Optional[str]] = mapped_column(Text)
       category: Mapped[Optional[str]] = mapped_column(String)
       active: Mapped[int] = mapped_column(Integer, default=1)
       last_fetched: Mapped[Optional[datetime]] = mapped_column(DateTime)
       last_error: Mapped[Optional[str]] = mapped_column(Text)
       fetch_count: Mapped[int] = mapped_column(Integer, default=0)
       error_count: Mapped[int] = mapped_column(Integer, default=0)
       updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class RSSFeedItem(Base):
       __tablename__ = "rss_feed_items"
       id: Mapped[int] = mapped_column(primary_key=True)
       feed_id: Mapped[int] = mapped_column(ForeignKey("rss_feeds.id"))
       guid: Mapped[str] = mapped_column(String)
       url: Mapped[str] = mapped_column(String)
       title: Mapped[str] = mapped_column(String)
       published_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
       created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
       __table_args__ = (UniqueConstraint("feed_id", "guid"),)
   
   class GmailNewsletterSender(Base):
       __tablename__ = "gmail_newsletter_senders"
       id: Mapped[int] = mapped_column(primary_key=True)
       sender_email: Mapped[str] = mapped_column(String, unique=True)
       sender_name: Mapped[Optional[str]] = mapped_column(String)
       sample_subject: Mapped[Optional[str]] = mapped_column(Text)
       confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
       is_ai_related: Mapped[int] = mapped_column(Integer, default=0)
       message_count: Mapped[int] = mapped_column(Integer, default=0)
       is_active: Mapped[int] = mapped_column(Integer, default=1)
       first_seen: Mapped[datetime] = mapped_column(DateTime, default=func.now())
       last_seen: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class ContentHistory(Base):
       __tablename__ = "content_history"
       id: Mapped[int] = mapped_column(primary_key=True)
       article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
       platform: Mapped[str] = mapped_column(String)
       action: Mapped[str] = mapped_column(String)
       timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class HashtagPerformance(Base):
       __tablename__ = "hashtag_performance"
       id: Mapped[int] = mapped_column(primary_key=True)
       hashtag: Mapped[str] = mapped_column(String)
       platform: Mapped[str] = mapped_column(String)
       volume: Mapped[int] = mapped_column(Integer, default=0)
       engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
       growth_rate: Mapped[float] = mapped_column(Float, default=0.0)
       trend_score: Mapped[int] = mapped_column(Integer, default=0)
       captured_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class ContentHashtag(Base):
       __tablename__ = "content_hashtags"
       id: Mapped[int] = mapped_column(primary_key=True)
       article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
       platform: Mapped[str] = mapped_column(String)
       hashtag: Mapped[str] = mapped_column(String)
       relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
       trend_score: Mapped[int] = mapped_column(Integer, default=0)
       final_score: Mapped[float] = mapped_column(Float, default=0.0)
       created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
       __table_args__ = (UniqueConstraint("article_id", "platform", "hashtag"),)
   
   class BlogCredential(Base):
       __tablename__ = "blog_credentials"
       id: Mapped[int] = mapped_column(primary_key=True)
       platform: Mapped[str] = mapped_column(String, unique=True)
       api_key: Mapped[Optional[str]] = mapped_column(String)
       site_url: Mapped[Optional[str]] = mapped_column(String)
       username: Mapped[Optional[str]] = mapped_column(String)
       enabled: Mapped[int] = mapped_column(Integer, default=0)
       updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class PlatformROI(Base):
       __tablename__ = "platform_roi"
       id: Mapped[int] = mapped_column(primary_key=True)
       platform: Mapped[str] = mapped_column(String)
       total_content: Mapped[int] = mapped_column(Integer, default=0)
       total_chars: Mapped[int] = mapped_column(Integer, default=0)
       time_saved_hours: Mapped[float] = mapped_column(Float, default=0.0)
       engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
       timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
       __table_args__ = (UniqueConstraint("platform", "timestamp"),)
   
   class TopicTrend(Base):
       __tablename__ = "topic_trends"
       id: Mapped[int] = mapped_column(primary_key=True)
       topic: Mapped[str] = mapped_column(String)
       occurrence_count: Mapped[int] = mapped_column(Integer, default=0)
       avg_viral_score: Mapped[float] = mapped_column(Float, default=0.0)
       detected_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
       __table_args__ = (UniqueConstraint("topic", "detected_at"),)
   
   class AffiliateLink(Base):
       __tablename__ = "affiliate_links"
       id: Mapped[int] = mapped_column(primary_key=True)
       keyword: Mapped[str] = mapped_column(String, unique=True)
       url: Mapped[str] = mapped_column(String)
       usage_count: Mapped[int] = mapped_column(Integer, default=0)
       last_used: Mapped[Optional[datetime]] = mapped_column(DateTime)
   
   class UserFeedback(Base):
       __tablename__ = "user_feedback"
       id: Mapped[int] = mapped_column(primary_key=True)
       article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
       platform: Mapped[str] = mapped_column(String)
       is_positive: Mapped[bool] = mapped_column(Boolean)
       comment: Mapped[Optional[str]] = mapped_column(Text)
       original_content: Mapped[Optional[str]] = mapped_column(Text)
       edited_content: Mapped[Optional[str]] = mapped_column(Text)
       created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   
   class VideoScript(Base):
       __tablename__ = "video_scripts"
       id: Mapped[int] = mapped_column(primary_key=True)
       article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
       platform: Mapped[str] = mapped_column(String)
       script_text: Mapped[str] = mapped_column(Text)
       visual_cues: Mapped[Optional[str]] = mapped_column(Text)
       duration_est: Mapped[Optional[int]] = mapped_column(Integer)
       created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
   ```

2. Add relationships to existing models where needed

3. Add indices:
   ```python
   Index("idx_rss_feeds_active", RSSFeed.active)
   Index("idx_rss_feed_items_feed", RSSFeedItem.feed_id)
   Index("idx_gmail_senders_active", GmailNewsletterSender.is_active)
   Index("idx_content_history_article", ContentHistory.article_id)
   Index("idx_hashtag_perf_platform", HashtagPerformance.platform, HashtagPerformance.captured_at)
   Index("idx_content_hashtags_article", ContentHashtag.article_id, ContentHashtag.platform)
   Index("idx_topic_trends_detected", TopicTrend.detected_at)
   ```

### Phase 2: Delete Old Migrations (5 minutes)

**Goal**: Clean slate for Alembic

**Actions**:
1. Backup existing migrations: `cp -r migrations/versions migrations/versions.backup`
2. Delete all migration files: `rm migrations/versions/*.py`
3. Keep only `__init__.py` and `__pycache__/`

### Phase 3: Generate New Baseline Migration (10 minutes)

**Goal**: Single migration from complete models.py

**Actions**:
1. Ensure DATABASE_URL points to Postgres
2. Generate migration:
   ```bash
   alembic revision --autogenerate -m "baseline_complete_schema"
   ```
3. Review generated migration
4. Verify all 30+ tables are included

### Phase 4: Wipe and Rebuild Database (5 minutes)

**Goal**: Clean Postgres database

**Actions**:
1. Connect to Postgres:
   ```bash
   docker exec -it <postgres_container> psql -U <user> -d <dbname>
   ```

2. Drop all tables:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO <user>;
   GRANT ALL ON SCHEMA public TO public;
   ```

3. Run migration:
   ```bash
   alembic upgrade head
   ```

4. Verify tables:
   ```sql
   \dt
   ```

### Phase 5: Remove SQLite Code (2-3 hours)

**Goal**: Pure Postgres, pure ORM

**Actions**:

1. **Delete PostgresCursorAdapter** (backend/database.py lines 546-600)

2. **Delete init_db()** (backend/database.py lines 45-500)
   - All table creation now handled by Alembic

3. **Delete get_connection()** (backend/database.py lines 530-600)
   - Replace all usage with get_session()

4. **Convert all raw cursor functions to ORM**:
   - get_top_stories() → Use session.query()
   - get_tags_for_article() → Use session.query()
   - get_content_for_platform() → Use session.query()
   - 20+ other functions

5. **Remove SQLite imports**:
   ```python
   # DELETE THESE
   import sqlite3
   conn.row_factory = sqlite3.Row
   ```

6. **Remove PRAGMA commands**:
   - backend/database.py lines 66-67
   - backend/monitoring.py line 28

7. **Convert fetchers to ORM**:
   - backend/fetchers/rss_fetcher.py - Remove CREATE TABLE, use ORM
   - backend/fetchers/gmail_fetcher_smart.py - Remove CREATE TABLE, use ORM

8. **Convert schedulers to ORM**:
   - backend/schedulers/content_scheduler.py - Remove CREATE TABLE, use ORM

9. **Update all processors to use ORM**:
   - backend/processors/monetization_engine.py
   - backend/processors/integrations_manager.py
   - backend/processors/analytics_engine.py
   - backend/processors/content_quality.py
   - backend/processors/deduplicator.py

### Phase 6: Update Tests (1-2 hours)

**Goal**: Tests use ORM and Postgres

**Actions**:
1. Update test fixtures to use get_session()
2. Remove sqlite3.connect() from tests
3. Use ORM for test data setup
4. Update assertions to use ORM queries

### Phase 7: Update Utility Scripts (1 hour)

**Goal**: Scripts use ORM

**Actions**:
1. Update all scripts in root directory
2. Update scripts/ directory
3. Remove raw cursor usage

---

## 8. MIGRATION COMMANDS

### 8.1 Safe Wipe + Rebuild (Docker)

```bash
# 1. Stop application
docker-compose down

# 2. Wipe Postgres data
docker volume rm <project>_postgres_data

# 3. Start Postgres only
docker-compose up -d postgres

# 4. Wait for Postgres to be ready
docker-compose exec postgres pg_isready

# 5. Run migrations
docker-compose exec app alembic upgrade head

# 6. Verify schema
docker-compose exec postgres psql -U <user> -d <dbname> -c "\dt"

# 7. Start application
docker-compose up -d
```

### 8.2 Manual Wipe (if not using Docker)

```bash
# 1. Connect to Postgres
psql -U <user> -d <dbname>

# 2. Drop and recreate schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO <user>;
GRANT ALL ON SCHEMA public TO public;
\q

# 3. Run migrations
alembic upgrade head

# 4. Verify
psql -U <user> -d <dbname> -c "\dt"
```

---

## 9. CODE REFACTOR EXAMPLES

### 9.1 Before: Raw Cursor (WRONG)

```python
def get_top_stories(limit: int = 10):
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title, url FROM processed_articles
            WHERE processed = 1
            ORDER BY viral_score DESC
            LIMIT ?
        """, (limit,))
        return [dict(row) for row in cur.fetchall()]
```

### 9.2 After: ORM (CORRECT)

```python
def get_top_stories(limit: int = 10):
    with get_session() as session:
        stories = session.query(ProcessedArticle).join(
            RawArticle
        ).filter(
            RawArticle.processed == 1
        ).order_by(
            ProcessedArticle.viral_score.desc()
        ).limit(limit).all()
        
        return [
            {
                "id": s.id,
                "title": s.raw_article.title,
                "url": s.raw_article.url,
                "viral_score": s.viral_score
            }
            for s in stories
        ]
```

### 9.3 Before: CREATE TABLE (WRONG)

```python
def init_rss_tables():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rss_feeds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT
            )
        """)
```

### 9.4 After: Use Alembic (CORRECT)

```python
# NO CODE NEEDED - Alembic handles it
# Just define model in backend/models.py
# Run: alembic revision --autogenerate -m "add rss tables"
# Run: alembic upgrade head
```

---

## 10. VERIFICATION CHECKLIST

After rebuild, verify:

### 10.1 Schema Verification

```sql
-- Should return 30+ tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify foreign keys exist
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Verify indices exist
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 10.2 Code Verification

```bash
# No sqlite3 imports (except in tests if needed)
grep -r "import sqlite3" backend/

# No get_connection() usage
grep -r "get_connection()" backend/

# No PRAGMA commands
grep -r "PRAGMA" backend/

# No ? placeholders (use SQLAlchemy bindparams)
grep -r "execute.*\?" backend/

# No row[0] tuple access (use ORM)
grep -r "row\[0\]" backend/

# All use get_session()
grep -r "get_session()" backend/
```

### 10.3 Functional Verification

1. Start application
2. Test each endpoint:
   - GET /api/stories (should return stories with tags)
   - GET /api/rss/feeds (should work)
   - POST /api/rss/feeds (should work)
   - GET /api/analytics/summary (should work)
3. Check logs for errors
4. Run test suite: `pytest`

---

## 11. RECOMMENDATIONS

### 11.1 MUST DO (Critical)

1. ✅ **Delete existing migrations and regenerate baseline**
   - Current migrations are incomplete and inconsistent
   - New baseline from complete models.py is required

2. ✅ **Remove ALL SQLite compatibility code**
   - PostgresCursorAdapter
   - init_db()
   - get_connection()
   - sqlite3 imports
   - PRAGMA commands
   - ? placeholders

3. ✅ **Enforce ORM-only access**
   - No raw cursors
   - No raw SQL (except complex queries where needed)
   - All data access through get_session()

4. ✅ **Add missing models to backend/models.py**
   - 12 tables currently missing
   - Must be in models.py for Alembic to manage

### 11.2 SHOULD DO (Important)

1. Add type hints to all ORM queries
2. Add database connection pooling configuration
3. Add query logging for debugging
4. Add database migration testing in CI/CD
5. Document ORM patterns for team

### 11.3 NICE TO HAVE (Optional)

1. Add database query performance monitoring
2. Add read replicas for scaling
3. Add database backup automation
4. Add schema versioning documentation

---

## 12. TIMELINE ESTIMATE

| Phase | Duration | Complexity |
|-------|----------|------------|
| 1. Add missing models | 1-2 hours | Medium |
| 2. Delete old migrations | 5 minutes | Low |
| 3. Generate new baseline | 10 minutes | Low |
| 4. Wipe and rebuild DB | 5 minutes | Low |
| 5. Remove SQLite code | 2-3 hours | High |
| 6. Update tests | 1-2 hours | Medium |
| 7. Update scripts | 1 hour | Low |
| **TOTAL** | **6-9 hours** | **High** |

**Recommendation**: Allocate 2 full days for implementation and testing.

---

## 13. RISK ASSESSMENT

### 13.1 Risks of NOT Doing This

- **HIGH**: Continued production errors (KeyError, UndefinedTable)
- **HIGH**: Data corruption from mixed access patterns
- **MEDIUM**: Unable to scale (SQLite limitations)
- **MEDIUM**: Technical debt compounds
- **LOW**: Team confusion from mixed patterns

### 13.2 Risks of Doing This

- **LOW**: Downtime during migration (planned maintenance)
- **LOW**: Bugs in refactored code (mitigated by tests)
- **VERY LOW**: Data loss (we can wipe data per requirements)

### 13.3 Mitigation Strategies

1. **Backup before starting**: `pg_dump` before wipe
2. **Test in staging first**: Run full rebuild in staging environment
3. **Incremental rollout**: Phase 5 can be done incrementally
4. **Rollback plan**: Keep old code in git branch

---

## 14. FINAL VERDICT

**RECOMMENDATION**: **PROCEED WITH FULL CLEAN REBUILD**

**Justification**:
1. Current state is unmaintainable
2. Schema drift is severe (12 missing tables)
3. Mixed access patterns cause bugs
4. SQLite code blocks Postgres features
5. Data can be wiped (per requirements)
6. Time investment (6-9 hours) is reasonable
7. Result will be clean, maintainable, scalable

**Alternative (NOT RECOMMENDED)**: Continue patching bugs
- Will take longer in the long run
- Technical debt will compound
- Team velocity will decrease
- Production stability will suffer

---

## 15. NEXT STEPS

1. **Get approval** for 2-day maintenance window
2. **Create feature branch**: `git checkout -b postgres-clean-rebuild`
3. **Follow Phase 1-7** in order
4. **Test thoroughly** in staging
5. **Deploy to production** during maintenance window
6. **Monitor closely** for 24 hours post-deployment

---

**END OF AUDIT REPORT**

Generated: February 24, 2026  
Auditor: Kiro AI Assistant  
Repository: AI Pulse Pro  
Status: CRITICAL - ACTION REQUIRED
