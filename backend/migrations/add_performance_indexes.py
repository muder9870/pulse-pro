"""
Add performance indexes to frequently queried columns.

This migration adds indexes to improve query performance for:
- Article filtering by source and processed status
- Scoring and sorting operations
- Hashtag trending queries
- Blog post lookups
"""

import sqlite3
import logging
from pathlib import Path
from backend.config import settings

log = logging.getLogger("migrations")

def apply_indexes():
    """Apply performance indexes to the database."""
    db_path = settings.DB_PATH
    
    if not db_path.exists():
        log.error(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Get existing indexes
        cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = {row[0] for row in cur.fetchall()}
        
        indexes_to_create = [
            # raw_articles indexes
            ("idx_raw_articles_source", "CREATE INDEX IF NOT EXISTS idx_raw_articles_source ON raw_articles(source)"),
            ("idx_raw_articles_processed", "CREATE INDEX IF NOT EXISTS idx_raw_articles_processed ON raw_articles(processed)"),
            ("idx_raw_articles_fetched_at", "CREATE INDEX IF NOT EXISTS idx_raw_articles_fetched_at ON raw_articles(fetched_at DESC)"),
            ("idx_raw_articles_is_duplicate", "CREATE INDEX IF NOT EXISTS idx_raw_articles_is_duplicate ON raw_articles(is_duplicate)"),
            
            # processed_articles indexes
            ("idx_processed_articles_viral_score", "CREATE INDEX IF NOT EXISTS idx_processed_articles_viral_score ON processed_articles(viral_score DESC)"),
            ("idx_processed_articles_tech_score", "CREATE INDEX IF NOT EXISTS idx_processed_articles_tech_score ON processed_articles(tech_score DESC)"),
            ("idx_processed_articles_relevance_score", "CREATE INDEX IF NOT EXISTS idx_processed_articles_relevance_score ON processed_articles(relevance_score DESC)"),
            ("idx_processed_articles_processed_at", "CREATE INDEX IF NOT EXISTS idx_processed_articles_processed_at ON processed_articles(processed_at DESC)"),
            ("idx_processed_articles_category", "CREATE INDEX IF NOT EXISTS idx_processed_articles_category ON processed_articles(category)"),
            ("idx_processed_articles_sentiment", "CREATE INDEX IF NOT EXISTS idx_processed_articles_sentiment ON processed_articles(sentiment)"),
            
            # generated_content indexes
            ("idx_generated_content_platform", "CREATE INDEX IF NOT EXISTS idx_generated_content_platform ON generated_content(platform)"),
            ("idx_generated_content_article_id", "CREATE INDEX IF NOT EXISTS idx_generated_content_article_id ON generated_content(article_id)"),
            
            # trending_hashtags indexes (if table exists)
            ("idx_trending_hashtags_platform", "CREATE INDEX IF NOT EXISTS idx_trending_hashtags_platform ON trending_hashtags(platform)"),
            ("idx_trending_hashtags_trend_score", "CREATE INDEX IF NOT EXISTS idx_trending_hashtags_trend_score ON trending_hashtags(trend_score DESC)"),
            ("idx_trending_hashtags_status", "CREATE INDEX IF NOT EXISTS idx_trending_hashtags_status ON trending_hashtags(status)"),
            
            # blog_posts indexes (if table exists)
            ("idx_blog_posts_status", "CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status)"),
            ("idx_blog_posts_article_id", "CREATE INDEX IF NOT EXISTS idx_blog_posts_article_id ON blog_posts(article_id)"),
            
            # scheduled_posts indexes (if table exists)
            ("idx_scheduled_posts_status", "CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status)"),
            ("idx_scheduled_posts_scheduled_time", "CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time)"),
        ]
        
        created_count = 0
        skipped_count = 0
        
        for index_name, create_sql in indexes_to_create:
            try:
                cur.execute(create_sql)
                if index_name not in existing_indexes:
                    created_count += 1
                    log.info(f"Created index: {index_name}")
                else:
                    skipped_count += 1
            except sqlite3.OperationalError as e:
                # Table might not exist yet (e.g., trending_hashtags, blog_posts)
                if "no such table" in str(e).lower():
                    log.debug(f"Skipped index {index_name}: table doesn't exist")
                    skipped_count += 1
                else:
                    log.warning(f"Failed to create index {index_name}: {e}")
        
        conn.commit()
        conn.close()
        
        log.info(f"Index migration complete: {created_count} created, {skipped_count} skipped")
        return True
        
    except Exception as e:
        log.error(f"Failed to apply indexes: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = apply_indexes()
    if success:
        print("✅ Performance indexes applied successfully")
    else:
        print("❌ Failed to apply performance indexes")
