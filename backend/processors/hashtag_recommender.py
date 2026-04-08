from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from backend.db.session import SessionLocal
from backend.db.repositories.hashtag_repository import HashtagRepository
from backend.db.repositories.article_repository import ArticleRepository
from backend.models import ProcessedArticle, RawArticle
from backend.cache_manager import cache_result


@dataclass
class HashtagRecommendation:
    hashtag: str
    trend_score: int
    relevance_score: float
    final_score: float
    volume: int
    growth_rate: float
    engagement_rate: float
    category: str | None


class HashtagRecommender:
    def __init__(self) -> None:
        self.log = logging.getLogger("hashtag_recommender")

    @cache_result(ttl=600, key_prefix="hashtags")
    def recommend(self, article_id: int, platform: str, limit: int = 5) -> list[HashtagRecommendation]:
        db = SessionLocal()

        try:
            a_repo = ArticleRepository(db)

            # Ensure processed article
            p_id = a_repo.ensure_processed_id(article_id)
            if not p_id:
                from backend.processors.analyzer import ArticleAnalyzer

                analyzer = ArticleAnalyzer()
                self.log.info(f"triggering_on_demand_analysis article_id={article_id}")

                p_id = analyzer.process_single_article(article_id)
                if not p_id:
                    self.log.warning(f"Cannot recommend hashtags: article_id {article_id} failed.")
                    return []

            hashtag_repo = HashtagRepository(db)

            # ✅ FIXED: pass article_id + platform
            tags = hashtag_repo.get_tags_for_article(article_id, platform)

            # ✅ FIXED: extract hashtag strings properly
            normalized_tags = {
                t["hashtag"].lower() for t in tags if t.get("hashtag")
            }

            trending_raw = hashtag_repo.list_trending_hashtags(platform, limit=50)
            keywords = self._article_keywords(p_id)

            if not trending_raw:
                return []

            recs: list[HashtagRecommendation] = []

            for t in trending_raw:
                hashtag = str(t.get("hashtag") or "")
                trend_score = int(t.get("trend_score") or 0)
                volume = int(t.get("volume") or 0)
                growth_rate = float(t.get("growth_rate") or 0.0)
                engagement_rate = float(t.get("engagement_rate") or 0.0)
                category = t.get("category")

                relevance = self._relevance(hashtag, list(normalized_tags), keywords)
                final_score = 0.65 * float(trend_score) + 0.35 * relevance * 100.0

                recs.append(
                    HashtagRecommendation(
                        hashtag=hashtag,
                        trend_score=trend_score,
                        relevance_score=relevance,
                        final_score=final_score,
                        volume=volume,
                        growth_rate=growth_rate,
                        engagement_rate=engagement_rate,
                        category=category,
                    )
                )

            # Sort
            recs.sort(key=lambda r: (r.final_score, r.trend_score, r.volume), reverse=True)

            # Deduplicate + limit
            picked: list[HashtagRecommendation] = []
            for r in recs:
                if r.hashtag not in {p.hashtag for p in picked}:
                    picked.append(r)
                if len(picked) >= limit:
                    break

            # Save
            hashtag_repo.save_content_hashtags(
                article_id,
                platform,
                [
                    {
                        "hashtag": r.hashtag,
                        "trend_score": r.trend_score,
                        "relevance_score": r.relevance_score,
                        "final_score": r.final_score
                    }
                    for r in picked
                ]
            )

            db.commit()
            return picked

        finally:
            db.close()

    def _article_keywords(self, article_id: int) -> set[str]:
        db = SessionLocal()

        try:
            article = db.query(
                RawArticle.title,
                ProcessedArticle.summary
            ).join(
                ProcessedArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                ProcessedArticle.id == article_id
            ).first()

            if not article:
                return set()

            title, summary = article

        finally:
            db.close()

        text = f"{title or ''} {summary or ''}"
        words = re.findall(r"[A-Za-z][A-Za-z0-9]{2,}", text.lower())

        return set(words)

    def _relevance(self, hashtag: str, tags: list[str], keywords: set[str]) -> float:
        h = hashtag.lstrip("#").lower()
        if not h:
            return 0.0

        # Direct match with existing tags
        for t in tags:
            if t and t in h:
                return 1.0

        # Keyword match
        hit = 0
        for kw in keywords:
            if kw in h or h in kw:
                hit += 1

        if hit <= 0:
            return 0.0

        return min(1.0, 0.25 + 0.15 * hit)