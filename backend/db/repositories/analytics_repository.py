from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.db.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent, PaperAnalysis

class AnalyticsRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_dashboard_stats(self) -> dict:
        total_articles = self.session.query(func.count(RawArticle.id)).scalar() or 0
        archived_articles = self.session.query(func.count(RawArticle.id)).filter(RawArticle.state == "archived").scalar() or 0
        processed_articles = self.session.query(func.count(ProcessedArticle.id)).scalar() or 0
        generated_content = self.session.query(func.count(GeneratedContent.id)).scalar() or 0
        deep_dive_analyzed = self.session.query(func.count(PaperAnalysis.article_id)).scalar() or 0
        
        # Calculate coverage percentage
        coverage_pct = round((processed_articles / total_articles * 100), 1) if total_articles > 0 else 0
        
        # Get average scores
        avg_priority_score = self.session.query(func.avg(ProcessedArticle.priority_score)).scalar() or 0
        avg_viral_score = self.session.query(func.avg(ProcessedArticle.viral_score)).scalar() or 0
        avg_tech_score = self.session.query(func.avg(ProcessedArticle.tech_score)).scalar() or 0
        
        # Breakdown by source
        sources_query = self.session.query(RawArticle.source, func.count(RawArticle.id)).group_by(RawArticle.source).all()
        
        # Breakdown by platform
        platforms_query = self.session.query(GeneratedContent.platform, func.count(GeneratedContent.id)).group_by(GeneratedContent.platform).all()
        
        # Recent activity (last 24h and last 7d)
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        last_24h = self.session.query(func.count(RawArticle.id)).filter(RawArticle.fetched_at >= now - timedelta(hours=24)).scalar() or 0
        last_7d = self.session.query(func.count(RawArticle.id)).filter(RawArticle.fetched_at >= now - timedelta(days=7)).scalar() or 0
        
        # Daily distribution (last 7 days)
        daily_dist = []
        for i in range(7):
            d = now - timedelta(days=i)
            start = d.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=1)
            count = self.session.query(func.count(RawArticle.id)).filter(
                RawArticle.fetched_at >= start,
                RawArticle.fetched_at < end
            ).scalar() or 0
            analyzed = self.session.query(func.count(ProcessedArticle.id)).filter(
                ProcessedArticle.processed_at >= start,
                ProcessedArticle.processed_at < end
            ).scalar() or 0
            daily_dist.append({
                "date": start.strftime("%b %d"),
                "articles": count,
                "analyzed": analyzed
            })
        
        # Score distribution (bins) - based on weighted priority score
        score_bins = [
            {"range": "90-100", "label": "Excellent", "count": self.session.query(func.count(ProcessedArticle.id)).filter(ProcessedArticle.priority_score >= 90).scalar() or 0},
            {"range": "70-89", "label": "Good", "count": self.session.query(func.count(ProcessedArticle.id)).filter(ProcessedArticle.priority_score >= 70, ProcessedArticle.priority_score < 90).scalar() or 0},
            {"range": "50-69", "label": "Average", "count": self.session.query(func.count(ProcessedArticle.id)).filter(ProcessedArticle.priority_score >= 50, ProcessedArticle.priority_score < 70).scalar() or 0},
            {"range": "0-49", "label": "Low", "count": self.session.query(func.count(ProcessedArticle.id)).filter(ProcessedArticle.priority_score < 50).scalar() or 0}
        ]

        # Content generation stats
        content_by_platform = {p: count for p, count in platforms_query}
        
        return {
            "archived_articles": archived_articles,
            "total_articles": total_articles,
            "processed_articles": processed_articles,
            "generated_content": generated_content,
            "deep_dive_analyzed": deep_dive_analyzed,
            "avg_priority_score": round(avg_priority_score, 1),
            "avg_viral_score": round(avg_viral_score, 1),
            "avg_tech_score": round(avg_tech_score, 1),
            "coverage_percentage": coverage_pct,
            "articles": {
                "by_source": dict(sources_query)
            },
            "content_generation": {
                "by_platform": content_by_platform
            },
            "recent_activity": {
                "last_24h": last_24h,
                "last_7d": last_7d
            },
            "daily_distribution": daily_dist[::-1], # Return chronological
            "score_distribution": score_bins
        }

    def log_interaction(self, event_type: str, article_id: int | None = None, platform: str | None = None, metadata: dict | None = None):
        """Log a user interaction event."""
        self.session.add(EngagementMetric(
            raw_article_id=article_id, 
            platform=platform, 
            metric_type=event_type, 
            metric_value=1.0
        ))
        self.session.commit()

    def log_engagement(self, article_id: int | None, platform: str | None, metric_type: str, value: float = 1.0):
        self.session.add(EngagementMetric(raw_article_id=article_id, platform=platform, metric_type=metric_type, metric_value=value))
        self.session.commit()

    def get_summary(self) -> list[dict]:
        results = self.session.query(
            EngagementMetric.metric_type,
            func.count(EngagementMetric.id).label("count"),
            func.sum(EngagementMetric.metric_value).label("total")
        ).group_by(EngagementMetric.metric_type).all()
        return [{"metric_type": r.metric_type, "count": r.count, "total": float(r.total) if r.total else 0.0} for r in results]

    def get_daily_engagement_stats(self, days: int = 7) -> list[dict]:
        from datetime import date, timedelta
        cutoff = date.today() - timedelta(days=days)
        results = self.session.query(
            func.date(EngagementMetric.recorded_at).label("date"),
            func.sum(EngagementMetric.metric_value).label("total_engagement")
        ).filter(
            func.date(EngagementMetric.recorded_at) >= cutoff
        ).group_by(
            func.date(EngagementMetric.recorded_at)
        ).order_by("date").all()
        return [{"date": r.date, "total_engagement": float(r.total_engagement)} for r in results]

    def upsert_platform_roi(self, platform, total_content, total_chars, time_saved_hours, engagement_score=0.0):
        from backend.models import PlatformROI
        today = datetime.now(timezone.utc).date()
        roi = self.session.query(PlatformROI).filter(
            PlatformROI.platform == platform,
            func.date(PlatformROI.timestamp) == today
        ).first()
        if roi:
            roi.total_content = total_content
            roi.total_chars = total_chars
            roi.time_saved_hours = time_saved_hours
            roi.engagement_score = engagement_score
        else:
            self.session.add(PlatformROI(
                platform=platform, total_content=total_content,
                total_chars=total_chars, time_saved_hours=time_saved_hours,
                engagement_score=engagement_score
            ))
        self.session.commit()

    def get_platform_roi(self, days: int = 30) -> list[dict]:
        from backend.models import PlatformROI
        rois = self.session.query(PlatformROI).order_by(
            PlatformROI.timestamp.desc()
        ).limit(days).all()
        return [{"platform": r.platform, "total_content": r.total_content} for r in rois]

    def get_hashtag_pipeline_stats(self, days: int = 7) -> list[dict]:
        from backend.models import HealthHistory
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        entries = self.session.query(HealthHistory).filter(
            HealthHistory.service_name.like('hashtag_pipeline_%'),
            HealthHistory.created_at >= cutoff
        ).all()
        
        if not entries: return []
        
        stats_by_platform = {}
        for entry in entries:
            platform = entry.service_name.replace('hashtag_pipeline_', '', 1)
            if entry.error_message:
                try:
                    parts = entry.error_message.split(', ')
                    hashtags = int(parts[0].split('=')[1])
                    avg_score = float(parts[1].split('=')[1])
                    
                    if platform not in stats_by_platform:
                        stats_by_platform[platform] = {"platform": platform, "total_runs": 0, "total_hashtags": 0, "avg_trend_score": 0.0}
                    
                    stats_by_platform[platform]["total_runs"] += 1
                    stats_by_platform[platform]["total_hashtags"] += hashtags
                    stats_by_platform[platform]["avg_trend_score"] += avg_score
                except (IndexError, ValueError): continue
        
        result = []
        for stats in stats_by_platform.values():
            if stats["total_runs"] > 0:
                stats["avg_trend_score"] = round(stats["avg_trend_score"] / stats["total_runs"], 2)
            result.append(stats)
        return result
