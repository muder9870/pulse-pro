from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from backend.db.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis, ScheduledPost

class ArticleRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_top_stories(self, limit: int | None = 10, offset: int = 0, sort: str = "score", source: str | None = None, state: str | None = None) -> list[dict]:
        # Use selectinload (not joinedload) for to-many collections.
        # joinedload on collections produces a cartesian-product JOIN that
        # inflates result rows by N×M — selectinload runs separate IN queries
        # which is far cheaper for large datasets.
        query = (
            self.session.query(RawArticle)
            .outerjoin(ProcessedArticle)
            .filter(RawArticle.is_duplicate == 0)
            .options(
                selectinload(RawArticle.processed_entry).selectinload(ProcessedArticle.generated_contents),
                selectinload(RawArticle.processed_entry).selectinload(ProcessedArticle.tags),
            )
        )
        
        if state == "archived":
            query = query.filter(RawArticle.state == "archived")
        else:
            query = query.filter(RawArticle.state != "archived")

        # Filter by source if provided
        if source:
            query = query.filter(func.lower(RawArticle.source) == func.lower(source))

        # Sorting
        if sort == "category":
            query = query.order_by(
                RawArticle.category.asc().nullsfirst(),
                ProcessedArticle.priority_score.desc().nullslast(),
                RawArticle.fetched_at.desc(),
            )
        else:
            # Default: highest intelligence score first (highest to lowest)
            query = query.order_by(
                ProcessedArticle.priority_score.desc().nullslast(),
                RawArticle.fetched_at.desc(),
            )

        # Apply pagination — offset MUST come before limit in SQLAlchemy
        if offset > 0:
            query = query.offset(offset)
        if limit is not None and limit > 0:
            query = query.limit(limit)

        articles = query.all()
        return [self._format_story(raw) for raw in articles]

    def _next_scheduled_iso(self, processed_article_id: int | None) -> str | None:
        if not processed_article_id:
            return None
        row = (
            self.session.query(ScheduledPost)
            .filter(
                ScheduledPost.article_id == processed_article_id,
                ScheduledPost.status.in_(("pending", "scheduled", "queued")),
            )
            .order_by(ScheduledPost.scheduled_time.asc())
            .first()
        )
        if row and row.scheduled_time:
            return row.scheduled_time.isoformat()
        return None

    def update_pipeline_state(
        self,
        raw_article_id: int,
        *,
        review_status: str | None = None,
        content_approved: bool | None = None,
        needs_review: bool | None = None,
        ready_to_schedule: bool | None = None,
    ) -> dict | None:
        """Update workflow flags on ProcessedArticle for a raw article id. Returns formatted story or None."""
        raw = self.session.query(RawArticle).filter(RawArticle.id == raw_article_id).first()
        if not raw or not raw.processed_entry:
            return None
        pa = raw.processed_entry
        changed = False
        if review_status is not None:
            if review_status not in ("none", "pending", "approved"):
                raise ValueError("review_status must be none, pending, or approved")
            pa.story_review_status = review_status
            changed = True
        if content_approved is not None:
            pa.content_approved = bool(content_approved)
            changed = True
        if needs_review is not None:
            pa.pipeline_needs_review = bool(needs_review)
            changed = True
        if ready_to_schedule is not None:
            pa.ready_to_schedule = bool(ready_to_schedule)
            changed = True
        if changed:
            self.session.commit()
        self.session.refresh(pa)
        return self._format_story(raw)

    def ensure_processed_id(self, article_id: int) -> int | None:
        """Resolve raw ``RawArticle.id`` to ``ProcessedArticle.id``.

        Primary path: look up by raw_article_id (correct relationship).
        Fallback path: look up by ProcessedArticle.id == article_id, but ONLY
        if that ProcessedArticle actually belongs to the requested raw article.
        This prevents silently returning a ProcessedArticle that belongs to a
        different RawArticle when the numeric IDs happen to collide.
        """
        processed = (
            self.session.query(ProcessedArticle.id)
            .filter(ProcessedArticle.raw_article_id == article_id)
            .first()
        )
        if processed:
            return processed[0]
        # Fallback: check if a ProcessedArticle with id == article_id exists,
        # but verify it actually belongs to the requested raw article.
        fallback = (
            self.session.query(ProcessedArticle)
            .filter(ProcessedArticle.id == article_id)
            .first()
        )
        if fallback and fallback.raw_article_id == article_id:
            return fallback.id
        return None

    def get_tags(self, article_id: int) -> list[str]:
        p_id = self.ensure_processed_id(article_id)
        if not p_id: return []
        tags = self.session.query(ArticleTag).filter(ArticleTag.article_id == p_id).all()
        return [tag.tag for tag in tags]

    def set_tags(self, article_id: int, tags: list[str]) -> list[str]:
        p_id = self.ensure_processed_id(article_id)
        if not p_id: return []
        self.session.query(ArticleTag).filter(ArticleTag.article_id == p_id).delete()
        normalized = []
        for tag in (tags or []):
            tag_clean = (tag or "").strip()
            if tag_clean and tag_clean not in normalized:
                normalized.append(tag_clean)
                self.session.add(ArticleTag(article_id=p_id, tag=tag_clean))
        self.session.commit()
        return normalized

    def _format_story(self, raw: RawArticle) -> dict:
        article = raw.processed_entry
        # Use the Decision Engine's priority_score as the primary score
        total_score = float(article.priority_score or 0.0) if article else 0.0
        
        category_score = 0.0
        if article:
            scores = [s for s in [article.viral_score, article.tech_score, article.relevance_score] if s is not None]
            category_score = sum(scores) / len(scores) if scores else 0.0

        tags = [t.tag for t in article.tags] if article else []
        
        # Check if article has deep dive analysis
        has_deep_analysis = False
        if article:
            paper_analysis = self.session.query(PaperAnalysis).filter(
                PaperAnalysis.article_id == article.id
            ).first()
            has_deep_analysis = bool(paper_analysis)
        
        scheduled_at = self._next_scheduled_iso(article.id if article else None)

        return {
            "id": raw.id,
            "title": raw.title,
            "url": raw.url,
            "source": raw.source,
            "category": raw.category,
            "summary": article.summary if article else "",
            "viral_score": article.viral_score if article else 0,
            "tech_score": article.tech_score if article else 0,
            "relevance_score": article.relevance_score if article else 0,
            "category_score": category_score,
            "total_score": round(total_score, 2),
            "priority": article.priority if article else "LOW",
            "created_at": raw.fetched_at.isoformat() if raw.fetched_at else None,
            "fetched_at": raw.fetched_at.isoformat() if raw.fetched_at else None,
            "platforms": [c.platform for c in article.generated_contents] if article else [],
            "posts": [
                {
                    "platform": c.platform,
                    "content": c.content,
                    "posted": bool(c.posted),
                    "posted_at": c.posted_at.isoformat() if c.posted_at else None
                } 
                for c in article.generated_contents
            ] if article else [],
            "analyzed": bool(article),
            "has_deep_analysis": has_deep_analysis,
            "viral_hook": article.viral_hook if article else "",
            "key_innovation": article.key_innovation if article else "",
            "implication": article.implication if article else "",
            "tags": tags,
            "hashtags": [self.tag_to_hashtag(t) for t in tags],
            # Pipeline flags (StoryCard / storyState.js)
            "review_status": (article.story_review_status if article else "none"),
            "content_approved": bool(article.content_approved) if article else False,
            "needs_review": bool(article.pipeline_needs_review) if article else False,
            "ready_to_schedule": bool(article.ready_to_schedule) if article else False,
            "scheduled_at": scheduled_at,
        }

    @staticmethod
    def tag_to_hashtag(tag: str) -> str:
        cleaned = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in (tag or ""))
        parts = [p for p in cleaned.split() if p]
        if not parts: return "#AI"
        core = "".join(p[:1].upper() + p[1:] for p in parts)
        return f"#{core or 'AI'}"
