from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from dataclasses import dataclass

from backend.db.session import get_session
from ..models import RawArticle, ProcessedArticle, GeneratedContent
from ..config import settings
from sqlalchemy import func, text


@dataclass
class ContentMetrics:
    platform: str
    total_posts: int
    avg_engagement: float
    best_time: str
    top_category: str
    performance_score: float


class PerformanceTracker:
    """Track content performance and provide analytics."""
    
    def __init__(self):
        self.log = logging.getLogger("performance_tracker")
    
    def create_analytics_tables(self):
        """Create analytics tables if they don't exist - using raw SQL for DDL."""
        with get_session() as session:
            # Content performance tracking
            session.execute(text("""
                CREATE TABLE IF NOT EXISTS content_performance (
                    id SERIAL PRIMARY KEY,
                    article_id INTEGER NOT NULL,
                    platform TEXT NOT NULL,
                    views INTEGER DEFAULT 0,
                    likes INTEGER DEFAULT 0,
                    shares INTEGER DEFAULT 0,
                    comments INTEGER DEFAULT 0,
                    clicks INTEGER DEFAULT 0,
                    engagement_rate REAL DEFAULT 0.0,
                    posted_at TIMESTAMP,
                    tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_id) REFERENCES processed_articles(id)
                )
            """))
            
            # Platform analytics summary
            session.execute(text("""
                CREATE TABLE IF NOT EXISTS platform_analytics (
                    id SERIAL PRIMARY KEY,
                    platform TEXT NOT NULL,
                    date DATE NOT NULL,
                    total_posts INTEGER DEFAULT 0,
                    total_views INTEGER DEFAULT 0,
                    total_engagement INTEGER DEFAULT 0,
                    avg_engagement_rate REAL DEFAULT 0.0,
                    best_performing_category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(platform, date)
                )
            """))
            
            session.commit()
    
    def log_content_performance(self, article_id: int, platform: str, 
                              metrics: Dict[str, int]):
        """Log performance metrics for a piece of content."""
        self.create_analytics_tables()
        
        views = metrics.get('views', 0)
        likes = metrics.get('likes', 0)
        shares = metrics.get('shares', 0)
        comments = metrics.get('comments', 0)
        clicks = metrics.get('clicks', 0)
        
        # Calculate engagement rate
        total_engagement = likes + shares + comments + clicks
        engagement_rate = (total_engagement / max(views, 1)) * 100
        
        with get_session() as session:
            # Try update-then-insert using raw SQL for this custom table
            result = session.execute(text("""
                UPDATE content_performance
                SET views = :views, likes = :likes, shares = :shares, 
                    comments = :comments, clicks = :clicks,
                    engagement_rate = :engagement_rate, posted_at = :posted_at
                WHERE article_id = :article_id AND platform = :platform
            """), {
                'views': views, 'likes': likes, 'shares': shares,
                'comments': comments, 'clicks': clicks,
                'engagement_rate': engagement_rate,
                'posted_at': datetime.now(timezone.utc),
                'article_id': article_id, 'platform': platform
            })
            
            if result.rowcount == 0:
                session.execute(text("""
                    INSERT INTO content_performance 
                    (article_id, platform, views, likes, shares, comments, clicks, 
                     engagement_rate, posted_at)
                    VALUES (:article_id, :platform, :views, :likes, :shares, 
                            :comments, :clicks, :engagement_rate, :posted_at)
                """), {
                    'article_id': article_id, 'platform': platform,
                    'views': views, 'likes': likes, 'shares': shares,
                    'comments': comments, 'clicks': clicks,
                    'engagement_rate': engagement_rate,
                    'posted_at': datetime.now(timezone.utc)
                })
            
            session.commit()
            
            self.log.info("performance_logged article_id=%s platform=%s engagement=%.2f%%", 
                         article_id, platform, engagement_rate)
    
    def get_platform_metrics(self, days: int = 30) -> List[ContentMetrics]:
        """Get performance metrics by platform for the last N days."""
        self.create_analytics_tables()
        
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        with get_session() as session:
            # Get metrics by platform using raw SQL for complex joins
            result = session.execute(text("""
                SELECT 
                    gc.platform,
                    COUNT(*) as total_posts,
                    AVG(COALESCE(cp.engagement_rate, 0)) as avg_engagement,
                    AVG(COALESCE(pa.viral_score, 0) + COALESCE(pa.tech_score, 0)) as avg_score
                FROM generated_content gc
                LEFT JOIN content_performance cp ON gc.article_id = cp.article_id 
                    AND gc.platform = cp.platform
                LEFT JOIN processed_articles pa ON gc.article_id = pa.id
                WHERE gc.generated_at >= :since_date
                GROUP BY gc.platform
                ORDER BY avg_engagement DESC
            """), {'since_date': since_date})
            
            results = []
            for row in result:
                platform, total_posts, avg_engagement, avg_score = row
                
                # Get best performing category for this platform
                category_result = session.execute(text("""
                    SELECT r.category, COUNT(*) as count
                    FROM generated_content gc
                    JOIN processed_articles pa ON gc.article_id = pa.id
                    JOIN raw_articles r ON pa.raw_article_id = r.id
                    WHERE gc.platform = :platform AND gc.generated_at >= :since_date
                    GROUP BY r.category
                    ORDER BY count DESC
                    LIMIT 1
                """), {'platform': platform, 'since_date': since_date})
                
                category_row = category_result.fetchone()
                top_category = category_row[0] if category_row else "Unknown"
                
                # Calculate performance score (0-100)
                performance_score = min(100, (avg_engagement or 0) + (avg_score or 0) / 2)
                
                results.append(ContentMetrics(
                    platform=platform,
                    total_posts=total_posts,
                    avg_engagement=avg_engagement or 0.0,
                    best_time="Not tracked",  # Would need posting time data
                    top_category=top_category,
                    performance_score=performance_score
                ))
            
            return results
    
    def get_trending_topics(self, days: int = 7, limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending topics based on engagement."""
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        with get_session() as session:
            # Use STRING_AGG for PostgreSQL instead of GROUP_CONCAT
            result = session.execute(text("""
                SELECT 
                    r.category,
                    COUNT(*) as post_count,
                    AVG(COALESCE(cp.engagement_rate, 0)) as avg_engagement,
                    AVG(pa.viral_score) as avg_viral_score,
                    STRING_AGG(DISTINCT r.title, ' | ') as sample_titles
                FROM raw_articles r
                JOIN processed_articles pa ON r.id = pa.raw_article_id
                LEFT JOIN content_performance cp ON pa.id = cp.article_id
                WHERE r.fetched_at >= :since_date
                GROUP BY r.category
                HAVING COUNT(*) >= 2
                ORDER BY avg_engagement DESC, avg_viral_score DESC
                LIMIT :limit
            """), {'since_date': since_date, 'limit': limit})
            
            return [
                {
                    "category": row[0],
                    "post_count": row[1],
                    "avg_engagement": row[2] or 0.0,
                    "avg_viral_score": row[3] or 0.0,
                    "sample_titles": (row[4] or "")[:200] + "..." if len(row[4] or "") > 200 else row[4]
                }
                for row in result
            ]
    
    def generate_daily_report(self) -> Dict[str, Any]:
        """Generate a daily performance report."""
        platform_metrics = self.get_platform_metrics(days=1)
        trending_topics = self.get_trending_topics(days=1)
        
        with get_session() as session:
            # Get today's stats
            today = datetime.now(timezone.utc).date()
            
            articles_fetched = session.query(func.count(RawArticle.id)).filter(
                func.date(RawArticle.fetched_at) == today
            ).scalar()
            
            content_generated = session.query(func.count(GeneratedContent.id)).filter(
                func.date(GeneratedContent.generated_at) == today
            ).scalar()
        
        return {
            "date": today.isoformat(),
            "articles_fetched": articles_fetched or 0,
            "content_generated": content_generated or 0,
            "platform_metrics": [
                {
                    "platform": m.platform,
                    "posts": m.total_posts,
                    "engagement": round(m.avg_engagement, 2),
                    "performance": round(m.performance_score, 1)
                }
                for m in platform_metrics
            ],
            "trending_topics": trending_topics[:5]
        }


def main():
    """Test the performance tracker."""
    tracker = PerformanceTracker()
    tracker.create_analytics_tables()
    
    # Generate sample report
    report = tracker.generate_daily_report()
    print("Daily Report:")
    print(f"Articles fetched: {report['articles_fetched']}")
    print(f"Content generated: {report['content_generated']}")
    print(f"Platform metrics: {len(report['platform_metrics'])} platforms")
    print(f"Trending topics: {len(report['trending_topics'])} topics")


if __name__ == "__main__":
    main()
