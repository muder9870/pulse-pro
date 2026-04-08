from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.db.repositories.hashtag_repository import HashtagRepository
from backend.models import ProcessedArticle, RawArticle
from sqlalchemy import func


class HashtagAnalyzer:
    def __init__(self) -> None:
        self.log = logging.getLogger("hashtag_analyzer")

    def update_trending_hashtags(
        self,
        platforms: list[str],
        window_hours: int = 48,
        prev_window_hours: int = 48,
        limit: int = 50,
    ) -> int:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=window_hours)
        prev_start = window_start - timedelta(hours=prev_window_hours)

        db = SessionLocal()
        try:
            # Query processed articles with their raw article data
            articles = db.query(
                ProcessedArticle.id,
                RawArticle.category,
                RawArticle.fetched_at,
                (func.coalesce(ProcessedArticle.viral_score, 0) + 
                 func.coalesce(ProcessedArticle.tech_score, 0) + 
                 func.coalesce(ProcessedArticle.relevance_score, 0)).label('total_score')
            ).join(
                RawArticle
            ).filter(
                RawArticle.fetched_at >= prev_start
            ).all()
            
            a_repo = ArticleRepository(db)
            h_repo = HashtagRepository(db)

            current_counts: Counter[str] = Counter()
            prev_counts: Counter[str] = Counter()
            score_sum: defaultdict[str, float] = defaultdict(float)
            score_n: defaultdict[str, int] = defaultdict(int)
            category_counts: defaultdict[str, Counter[str]] = defaultdict(Counter)

            for article_id, category, fetched_at, total_score in articles:
                try:
                    ts = fetched_at.replace(tzinfo=timezone.utc) if fetched_at.tzinfo is None else fetched_at
                except Exception:
                    ts = now

                tags = a_repo.get_tags(int(article_id))
                if not tags:
                    continue

                hashtags = [a_repo.tag_to_hashtag(t) for t in tags]
                for h in hashtags:
                    if ts >= window_start:
                        current_counts[h] += 1
                        score_sum[h] += float(total_score or 0)
                        score_n[h] += 1
                        if category:
                            category_counts[h][str(category)] += 1
                    else:
                        prev_counts[h] += 1

            if not current_counts:
                self.log.info("update status=skipped reason=no_data")
                return 0

            top = current_counts.most_common(limit)
            updated = 0
            total_trend_score = 0

            for hashtag, volume in top:
                prev_volume = prev_counts.get(hashtag, 0)
                growth_rate = 0.0
                if prev_volume > 0:
                    growth_rate = (volume - prev_volume) / float(prev_volume)
                elif volume > 0:
                    growth_rate = 1.0

                avg_article_score = 0.0
                if score_n[hashtag] > 0:
                    avg_article_score = score_sum[hashtag] / float(score_n[hashtag])
                engagement_rate = max(0.0, min(avg_article_score / 300.0, 1.0))

                base = min(volume * 10, 70)
                growth_component = max(0.0, min(growth_rate * 20.0, 20.0))
                engagement_component = engagement_rate * 10.0
                trend_score = int(max(0.0, min(base + growth_component + engagement_component, 100.0)))
                total_trend_score += trend_score

                category_val = None
                if category_counts.get(hashtag):
                    category_val = category_counts[hashtag].most_common(1)[0][0]

                for platform in platforms:
                    h_repo.upsert_trending_hashtag(
                        hashtag=hashtag,
                        platform=platform,
                        volume=int(volume),
                        engagement_rate=float(engagement_rate),
                        growth_rate=float(growth_rate),
                        trend_score=int(trend_score),
                        category=category_val,
                    )
                    updated += 1

            # Log pipeline statistics for each platform
            if top:
                avg_trend_score = total_trend_score / len(top)
                for platform in platforms:
                    h_repo.log_pipeline_stats(
                        platform=platform,
                        total_hashtags=len(top),
                        avg_trend_score=avg_trend_score
                    )
        finally:
            db.close()

        self.log.info("update status=ok hashtags=%s platforms=%s", len(top), len(platforms))
        return updated

