import collections
import re
from datetime import datetime, timedelta
from backend.db.session import SessionLocal
from backend.db.repositories.analytics_repository import AnalyticsRepository
from backend.db.repositories.learning_repository import LearningRepository
from backend.models import ProcessedArticle, RawArticle, GeneratedContent
from backend.cache_manager import cache_result
from sqlalchemy import func

class AnalyticsEngine:
    def __init__(self):
        self.stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'}

    @cache_result(ttl=1800, key_prefix="trends")
    def detect_topic_trends(self, days: int = 7) -> list[dict]:
        """Analyze recent articles to find trending AI topics."""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        db = SessionLocal()
        try:
            articles = db.query(
                RawArticle.title,
                ProcessedArticle.summary,
                ProcessedArticle.viral_score
            ).join(
                ProcessedArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                ProcessedArticle.processed_at >= cutoff_date
            ).all()
        finally:
            db.close()

        if not articles:
            return []

        word_counts = collections.Counter()
        topic_scores = collections.defaultdict(list)

        for title, summary, viral_score in articles:
            # Combine title and summary for analysis
            text = f"{title} {summary}".lower()
            # Extract words (3+ chars, alphanumeric)
            words = re.findall(r'\b[a-z]{3,}\b', text)
            
            # Simple keyword filtering
            unique_words = set(words) - self.stop_words
            for word in unique_words:
                word_counts[word] += 1
                topic_scores[word].append(viral_score or 0)

        # Calculate final trends
        trends = []
        for word, count in word_counts.most_common(15):
            avg_score = sum(topic_scores[word]) / len(topic_scores[word])
            trends.append({
                "topic": word,
                "count": count,
                "avg_score": round(avg_score, 1)
            })

        # Persist to DB
        db = SessionLocal()
        try:
            repo = LearningRepository(db)
            repo.save_topic_trends(trends)
        finally:
            db.close()
        return trends

    def calculate_roi_metrics(self) -> dict:
        """Calculate Return on Investment (Time Saved)."""
        db = SessionLocal()
        try:
            # Total content generated
            result = db.query(
                func.count(GeneratedContent.id),
                func.sum(GeneratedContent.char_count)
            ).first()
            
            count = result[0] or 0
            total_chars = result[1] or 0
        finally:
            db.close()

            # Estimates:
            # 1. Manual content creation: ~20 mins per 1000 characters
            # 2. Manual search & reading: ~10 mins per article
            
            time_saved_minutes = (total_chars / 1000 * 20) + (count * 10)
            boost_factor = 1.0
            if count > 0:
                # Assuming manual process takes 30 mins per article, calculate boost
                manual_time = count * 30
                if time_saved_minutes > 0:
                     boost_factor = round(manual_time / (manual_time - time_saved_minutes), 1) if (manual_time - time_saved_minutes) > 0 else 10.0
                
            return {
                "total_generated": count,
                "total_characters": total_chars,
                "estimated_time_saved_hours": round(time_saved_minutes / 60, 1),
                "productivity_boost": f"{min(boost_factor, 25.0)}x",
                "manual_time_equivalent_hours": round((count * 30) / 60, 1)
            }

    def get_category_stats(self) -> list[dict]:
        """Distribution of articles by category."""
        db = SessionLocal()
        try:
            results = db.query(
                ProcessedArticle.category,
                func.count(ProcessedArticle.id).label('count')
            ).filter(
                ProcessedArticle.category.isnot(None),
                ProcessedArticle.category != ''
            ).group_by(
                ProcessedArticle.category
            ).order_by(
                func.count(ProcessedArticle.id).desc()
            ).all()
            
            return [{"category": row[0], "count": row[1]} for row in results]
        finally:
            db.close()

    def get_sentiment_stats(self) -> list[dict]:
        """Distribution of articles by sentiment."""
        db = SessionLocal()
        try:
            results = db.query(
                ProcessedArticle.sentiment,
                func.count(ProcessedArticle.id).label('count')
            ).filter(
                ProcessedArticle.sentiment.isnot(None),
                ProcessedArticle.sentiment != ''
            ).group_by(
                ProcessedArticle.sentiment
            ).all()
            
            return [{"sentiment": row[0], "count": row[1]} for row in results]
        finally:
            db.close()

    @cache_result(ttl=600, key_prefix="analytics")
    def get_full_analytics_summary(self) -> dict:
        """Get a comprehensive summary for the frontend.
        
        Cached for 10 minutes to improve performance.
        """
        db = SessionLocal()
        try:
            a_repo = AnalyticsRepository(db)
            l_repo = LearningRepository(db)
            
            return {
                "engagement": a_repo.get_summary(),
                "daily_stats": a_repo.get_daily_engagement_stats(),
                "trends": l_repo.get_topic_trends(10),
                "roi": self.calculate_roi_metrics(),
                "platform_roi": a_repo.get_platform_roi(7),
                "hashtag_stats": a_repo.get_hashtag_pipeline_stats(7),
                "categories": self.get_category_stats(),
                "sentiments": self.get_sentiment_stats()
            }
        finally:
            db.close()

    def update_all_platform_roi(self) -> int:
        """Calculate and store ROI for all platforms based on generated content."""
        db = SessionLocal()
        try:
            results = db.query(
                GeneratedContent.platform,
                func.count(GeneratedContent.id),
                func.sum(GeneratedContent.char_count)
            ).group_by(
                GeneratedContent.platform
            ).all()
        finally:
            db.close()

        updated = 0
        for platform, count, total_chars in results:
            # ROI Estimate logic:
            # - 20 mins per 1000 chars manual creation
            # - 10 mins per article manual search
            time_saved_minutes = (total_chars / 1000 * 20) + (count * 10)
            time_saved_hours = round(time_saved_minutes / 60, 2)
            
            # Engagement score proxy: based on posted status and char count density
            engagement_score = round(count * 1.5, 1) # simple proxy for now
            
            db = SessionLocal()
            try:
                repo = AnalyticsRepository(db)
                repo.upsert_platform_roi(
                    platform=platform,
                    total_content=count,
                    total_chars=total_chars,
                    time_saved_hours=time_saved_hours,
                    engagement_score=engagement_score
                )
            finally:
                db.close()
            updated += 1
        
        return updated

# Singleton instance
analytics_engine = AnalyticsEngine()
