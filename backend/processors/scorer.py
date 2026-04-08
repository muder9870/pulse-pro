from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import os
from typing import Dict, Any

from backend.db.session import get_session
from ..models import ProcessedArticle, RawArticle, UserPreference, UserFeedback, GeneratedContent
from sqlalchemy import update as sql_update, func, or_


TREND_KEYWORDS = [
    "gpt-5",
    "gpt5",
    "agi",
    "transformer",
    "breakthrough",
    "beats",
    "surpasses",
]

log = logging.getLogger("scorer")

TECH_KEYWORDS = [
    "peer-reviewed",
    "reproducible",
    "benchmark",
    "state-of-the-art",
    "open-source",
]


@dataclass
class ArticleScorer:
    def calculate_viral_score(self, row: Dict[str, Any]) -> int:
        title = (row.get("title") or "").lower()
        fetched_at = row.get("fetched_at")

        now = datetime.now(timezone.utc)
        ts = self._parse_timestamp(fetched_at, now)
        hours_old = max((now - ts).total_seconds() / 3600.0, 0.0)

        # Recency: 0â€“40 points
        recency = max(0.0, 100.0 - hours_old * 2.0)  # 2 pts decay per hour
        score = recency * 0.4

        # Trending keywords: up to 30 points
        matches = sum(1 for kw in TREND_KEYWORDS if kw in title)
        score += min(matches * 10.0, 30.0)

        # Simplicity: shorter titles get a small boost (up to 15)
        length = len(title.split())
        if 0 < length <= 12:
            score += 15.0
        elif length <= 20:
            score += 7.0

        return int(max(0, min(score, 100)))

    def calculate_tech_score(self, row: Dict[str, Any]) -> int:
        title = (row.get("title") or "").lower()
        summary = (row.get("summary") or "").lower()
        source = (row.get("source") or "").lower()

        score = 0.0

        # Source authority: arXiv > Gmail > Reddit/GitHub
        if source == "arxiv":
            score += 40.0
        elif source == "gmail":
            score += 25.0
        elif source in {"github", "reddit"}:
            score += 15.0

        # Technical keywords
        text = title + " " + summary
        matches = sum(1 for kw in TECH_KEYWORDS if kw in text)
        score += min(matches * 10.0, 30.0)

        return int(max(0, min(score, 100)))

    def calculate_relevance_score(self, row: Dict[str, Any], user_prefs: Dict[str, str]) -> int:
        category = (row.get("category") or "").lower()
        source = (row.get("source") or "").lower()
        title = (row.get("title") or "").lower()

        score = 0.0

        # Preference matching
        preferred_categories = [c.strip().lower() for c in user_prefs.get("preferred_categories", "").split(",") if c.strip()]
        preferred_sources = [s.strip().lower() for s in user_prefs.get("preferred_sources", "").split(",") if s.strip()]
        preferred_keywords = [k.strip().lower() for k in user_prefs.get("preferred_keywords", "").split(",") if k.strip()]

        if category and preferred_categories and category in preferred_categories:
            score += 40.0

        if source and preferred_sources and source in preferred_sources:
            score += 20.0

        kw_matches = sum(1 for kw in preferred_keywords if kw in title)
        score += min(kw_matches * 10.0, 20.0)

        # Behavioral boost (ML-lite)
        behavior_boost = self._calculate_behavior_boost(category, source)
        score += behavior_boost

        return int(max(0, min(score, 100)))

    def _calculate_behavior_boost(self, category: str, source: str) -> float:
        """Adjust score based on historical engagement with similar content."""
        boost = 0.0
        with get_session() as session:
            # Check if user frequently posts articles from this source or category
            if category:
                posted_count = session.query(func.count(ProcessedArticle.id)).join(
                    RawArticle
                ).filter(
                    RawArticle.category == category,
                    ProcessedArticle.generated == 1
                ).scalar() or 0
                boost += min(posted_count * 2.0, 10.0)

            if source:
                posted_source = session.query(func.count(ProcessedArticle.id)).join(
                    RawArticle
                ).filter(
                    RawArticle.source == source,
                    ProcessedArticle.generated == 1
                ).scalar() or 0
                boost += min(posted_source * 2.0, 10.0)
            
            # Factor in explicit positive feedback
            positive_feedback = session.query(func.count(UserFeedback.id)).filter(
                UserFeedback.is_positive == True
            ).scalar() or 0
            boost += min(positive_feedback * 1.0, 5.0)

        return boost

    def _parse_timestamp(self, value: Any, fallback: datetime) -> datetime:
        if not value:
            return fallback
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc)
        try:
            # SQLite default format for CURRENT_TIMESTAMP is ISO-like
            return datetime.fromisoformat(str(value)).replace(tzinfo=timezone.utc)
        except Exception:
            return fallback


def _load_user_prefs() -> Dict[str, str]:
    prefs: Dict[str, str] = {}
    with get_session() as session:
        preferences = session.query(UserPreference).all()
        for pref in preferences:
            prefs[str(pref.key)] = str(pref.value or "")
    return prefs


def score_all_articles() -> int:
    """Score all processed_articles that do not yet have scores."""
    scorer = ArticleScorer()
    user_prefs = _load_user_prefs()

    debug = str(os.getenv("DEBUG_PIPELINE", "")).lower() in {"1", "true", "yes"}
    fallback_top_n = int(os.getenv("SCORING_FALLBACK_TOP_N", "10"))

    updated = 0
    with get_session() as session:
        # Query articles that need scoring
        articles = session.query(
            ProcessedArticle.id,
            RawArticle.id.label('raw_id'),
            RawArticle.title,
            RawArticle.source,
            RawArticle.category,
            RawArticle.fetched_at,
            ProcessedArticle.summary,
            ProcessedArticle.viral_score,
            ProcessedArticle.tech_score,
            ProcessedArticle.relevance_score
        ).join(
            RawArticle,
            ProcessedArticle.raw_article_id == RawArticle.id
        ).filter(
            RawArticle.state == 'analyzed'
        ).all()

        if debug:
            log.info(
                "scoring_candidates state=analyzed count=%d fallback_top_n=%d",
                len(articles),
                fallback_top_n,
            )

        using_fallback = False
        if not articles:
            # Safety net: if analyzer state transitions didn't persist for some reason,
            # score at least a small set of processed, non-duplicate articles that still
            # have missing scores.
            using_fallback = True
            articles = session.query(
                ProcessedArticle.id,
                RawArticle.id.label('raw_id'),
                RawArticle.title,
                RawArticle.source,
                RawArticle.category,
                RawArticle.fetched_at,
                ProcessedArticle.summary,
                ProcessedArticle.viral_score,
                ProcessedArticle.tech_score,
                ProcessedArticle.relevance_score,
            ).join(
                RawArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                RawArticle.is_duplicate == 0,
                RawArticle.processed == 1,
                or_(
                    ProcessedArticle.viral_score.is_(None),
                    ProcessedArticle.tech_score.is_(None),
                    ProcessedArticle.relevance_score.is_(None),
                ),
            ).limit(fallback_top_n).all()

            if debug:
                log.info("scoring_fallback_candidates count=%d", len(articles))

        for article in articles:
            pid = article.id
            raw_id = article.raw_id
            
            # Atomic claim - try to update state
            if using_fallback:
                # Allow claiming from other states, but avoid re-scoring already scored rows.
                result = session.execute(
                    sql_update(RawArticle)
                    .where(RawArticle.id == raw_id, RawArticle.state != 'scored')
                    .values(state='scoring')
                )
            else:
                result = session.execute(
                    sql_update(RawArticle)
                    .where(RawArticle.id == raw_id, RawArticle.state == 'analyzed')
                    .values(state='scoring')
                )
            session.commit()
            
            if result.rowcount == 0:
                if debug:
                    log.info("scoring_claim_skipped raw_id=%s (already claimed/scored)", raw_id)
                continue  # Someone else claimed it

            row = {
                "title": article.title,
                "source": article.source,
                "category": article.category,
                "fetched_at": article.fetched_at,
                "summary": article.summary,
            }

            new_viral = scorer.calculate_viral_score(row)
            new_tech = scorer.calculate_tech_score(row)
            new_rel = scorer.calculate_relevance_score(row, user_prefs)

            if debug:
                log.info(
                    "scoring_article raw_id=%s processed_id=%s viral=%d tech=%d rel=%d",
                    raw_id,
                    pid,
                    new_viral,
                    new_tech,
                    new_rel,
                )

            # Update scores
            session.execute(
                sql_update(ProcessedArticle)
                .where(ProcessedArticle.id == pid)
                .values(
                    viral_score=new_viral,
                    tech_score=new_tech,
                    relevance_score=new_rel
                )
            )
            
            session.execute(
                sql_update(RawArticle)
                .where(RawArticle.id == raw_id)
                .values(state='scored')
            )
            
            updated += 1

        session.commit()

    return updated


def main() -> None:
    print("[scorer] Calculating scores for processed_articles...")
    updated = score_all_articles()
    print(f"[scorer] Updated scores for {updated} articles.")


if __name__ == "__main__":
    main()
