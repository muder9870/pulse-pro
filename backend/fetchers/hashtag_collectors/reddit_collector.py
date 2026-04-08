from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from backend.db.session import SessionLocal
from backend.db.repositories.hashtag_repository import HashtagRepository
from backend.models import RawArticle, ProcessedArticle


HASHTAG_RE = re.compile(r"(?<!\w)#([A-Za-z][A-Za-z0-9_]{1,49})")


@dataclass(frozen=True)
class RedditHashtagStat:
    hashtag: str
    volume: int
    trend_score: int
    growth_rate: float
    engagement_rate: float
    category: str | None


class RedditCollector:
    def run(self, window_hours: int = 48, prev_window_hours: int = 48, limit: int = 50) -> int:
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=window_hours)
        prev_start = window_start - timedelta(hours=prev_window_hours)

        db = SessionLocal()
        try:
            hashtag_repo = HashtagRepository(db)

            # Query using ORM with joins
            rows = db.query(
                ProcessedArticle.id,
                RawArticle.title,
                RawArticle.raw_content,
                RawArticle.category,
                RawArticle.fetched_at,
                (ProcessedArticle.viral_score + ProcessedArticle.tech_score + ProcessedArticle.relevance_score).label('total_score')
            ).join(
                RawArticle, ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                RawArticle.source == 'reddit',
                RawArticle.fetched_at >= prev_start
            ).all()

            current_counts: Counter[str] = Counter()
            prev_counts: Counter[str] = Counter()
            score_sum: defaultdict[str, float] = defaultdict(float)
            score_n: defaultdict[str, int] = defaultdict(int)
            category_counts: defaultdict[str, Counter[str]] = defaultdict(Counter)

            for article_id, title, raw_content, category, fetched_at, total_score in rows:
                try:
                    ts = datetime.fromisoformat(str(fetched_at)).replace(tzinfo=timezone.utc)
                except Exception:
                    ts = now

                tags = hashtag_repo.get_tags_for_article(int(article_id))
                hashtags: list[str] = []
                if tags:
                    hashtags.extend([hashtag_repo.tag_to_hashtag(t) for t in tags])
                else:
                    text = f"{title or ''}\n{raw_content or ''}"
                    for m in HASHTAG_RE.findall(text):
                        hashtags.append(f"#{m}".lower())

                if not hashtags:
                    continue

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
                return 0

            top = current_counts.most_common(limit)
            updated = 0

            for hashtag, volume in top:
                prev_volume = prev_counts.get(hashtag, 0)
                if prev_volume > 0:
                    growth_rate = (volume - prev_volume) / float(prev_volume)
                else:
                    growth_rate = 1.0 if volume > 0 else 0.0

                avg_score = score_sum[hashtag] / float(score_n[hashtag]) if score_n[hashtag] > 0 else 0.0
                engagement_rate = max(0.0, min(avg_score / 300.0, 1.0))

                base = min(volume * 10, 70)
                growth_component = max(0.0, min(growth_rate * 20.0, 20.0))
                engagement_component = engagement_rate * 10.0
                trend_score = int(max(0.0, min(base + growth_component + engagement_component, 100.0)))

                best_category = None
                if category_counts.get(hashtag):
                    best_category = category_counts[hashtag].most_common(1)[0][0]

                hashtag_repo.upsert_trending_hashtag(
                    hashtag=hashtag,
                    platform="reddit",
                    volume=int(volume),
                    engagement_rate=float(engagement_rate),
                    growth_rate=float(growth_rate),
                    trend_score=int(trend_score),
                    category=best_category,
                )
                updated += 1

            return updated
        finally:
            db.close()


if __name__ == "__main__":
    updated = RedditCollector().run()
    print(f"updated={updated}")

