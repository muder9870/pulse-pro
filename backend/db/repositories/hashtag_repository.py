from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.models import TrendingHashtag, ContentHashtag, HealthHistory
from backend.db.repositories.article_repository import ArticleRepository


class HashtagRepository:
    def __init__(self, session: Session):
        self.session = session
        self.article_repo = ArticleRepository(session)

    # 🔥 NEW — FIXED METHOD (this solves your error)
    def get_tags_for_article(self, article_id: int, platform: str | None = None):
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id:
            return []

        query = self.session.query(ContentHashtag).filter(
            ContentHashtag.article_id == p_id
        )

        if platform:
            query = query.filter(ContentHashtag.platform == platform)

        rows = query.all()

        return [
            {
                "hashtag": r.hashtag,
                "relevance_score": r.relevance_score,
                "trend_score": r.trend_score,
                "final_score": r.final_score
            }
            for r in rows
        ]

    def upsert_trending_hashtag(
        self,
        hashtag: str,
        platform: str,
        volume: int = 0,
        engagement_rate: float = 0.0,
        growth_rate: float = 0.0,
        trend_score: int = 0,
        category: str | None = None,
        status: str = "active"
    ) -> None:
        existing = self.session.query(TrendingHashtag).filter(
            TrendingHashtag.hashtag == hashtag,
            TrendingHashtag.platform == platform
        ).first()

        if existing:
            existing.volume = volume
            existing.engagement_rate = engagement_rate
            existing.growth_rate = growth_rate
            existing.trend_score = trend_score
            existing.category = category
            existing.status = status
            existing.updated_at = datetime.now(timezone.utc)
        else:
            self.session.add(TrendingHashtag(
                hashtag=hashtag,
                platform=platform,
                volume=volume,
                engagement_rate=engagement_rate,
                growth_rate=growth_rate,
                trend_score=trend_score,
                category=category,
                status=status
            ))

        self.session.commit()

    def list_trending_hashtags(self, platform: str, limit: int = 30) -> list[dict]:
        hashtags = self.session.query(TrendingHashtag).filter(
            TrendingHashtag.platform == platform,
            TrendingHashtag.status == "active"
        ).order_by(TrendingHashtag.trend_score.desc()).limit(limit).all()

        return [
            {
                "hashtag": h.hashtag,
                "platform": h.platform,
                "volume": h.volume,
                "engagement_rate": h.engagement_rate,
                "trend_score": h.trend_score
            }
            for h in hashtags
        ]

    def save_content_hashtags(self, article_id: int, platform: str, rows: list[dict]) -> None:
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id:
            return

        # Clear old hashtags for this article + platform
        self.session.query(ContentHashtag).filter(
            ContentHashtag.article_id == p_id,
            ContentHashtag.platform == platform
        ).delete()

        # Insert new ones
        for row in rows:
            self.session.add(ContentHashtag(
                article_id=p_id,
                platform=platform,
                hashtag=row.get("hashtag", ""),
                relevance_score=row.get("relevance_score", 0.0),
                trend_score=row.get("trend_score", 0),
                final_score=row.get("final_score", 0.0)
            ))

        self.session.commit()

    def log_pipeline_stats(self, platform: str, total_hashtags: int, avg_trend_score: float) -> None:
        self.session.add(HealthHistory(
            service_name=f"hashtag_pipeline_{platform}",
            status="ok",
            duration_ms=0,
            error_message=f"hashtags={total_hashtags}, avg_score={avg_trend_score:.2f}"
        ))

        self.session.commit()