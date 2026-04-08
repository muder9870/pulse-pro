from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from backend.models import RawArticle, ProcessedArticle, ArticleTag, GeneratedContent

class ArticleRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_top_stories(self, limit: int | None = 10, sort: str = "score") -> list[dict]:
        query = self.session.query(RawArticle).outerjoin(ProcessedArticle).filter(RawArticle.is_duplicate == 0).options(
            joinedload(RawArticle.processed_entry).joinedload(ProcessedArticle.generated_contents),
            joinedload(RawArticle.processed_entry).joinedload(ProcessedArticle.tags)
        )
        # Sorting
        if sort == "category":
            query = query.order_by(RawArticle.category.asc().nullsfirst(), RawArticle.fetched_at.desc())
        else:
            query = query.order_by(func.coalesce(ProcessedArticle.viral_score + ProcessedArticle.tech_score + ProcessedArticle.relevance_score, 0).desc(), RawArticle.fetched_at.desc())
        
        if limit: query = query.limit(limit)
        articles = query.all()
        return [self._format_story(raw) for raw in articles]

    def ensure_processed_id(self, article_id: int) -> int | None:
        """Resolve to ProcessedArticle.id.

        Callers (stories UI, deep-dive) pass **raw** ``RawArticle.id``. We must look up
        ``raw_article_id`` first: otherwise raw id 12 wrongly matches ``ProcessedArticle.id == 12``
        for a different paper and deep analysis is saved under the wrong row.
        """
        processed = (
            self.session.query(ProcessedArticle.id)
            .filter(ProcessedArticle.raw_article_id == article_id)
            .first()
        )
        if processed:
            return processed[0]
        return self.session.query(ProcessedArticle.id).filter(ProcessedArticle.id == article_id).scalar()

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
        total_score = float(article.viral_score or 0) + float(article.tech_score or 0) + float(article.relevance_score or 0) if article else 0.0
        
        category_score = 0.0
        if article:
            scores = [s for s in [article.viral_score, article.tech_score, article.relevance_score] if s is not None]
            category_score = sum(scores) / len(scores) if scores else 0.0

        tags = [t.tag for t in article.tags] if article else []
        
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
            "priority": article.priority if article else 0,
            "created_at": raw.fetched_at.isoformat() if raw.fetched_at else None,
            "fetched_at": raw.fetched_at.isoformat() if raw.fetched_at else None,
            "platforms": [c.platform for c in article.generated_contents] if article else [],
            "analyzed": bool(article),
            "viral_hook": article.viral_hook if article else "",
            "key_innovation": article.key_innovation if article else "",
            "implication": article.implication if article else "",
            "tags": tags,
            "hashtags": [self.tag_to_hashtag(t) for t in tags]
        }

    @staticmethod
    def tag_to_hashtag(tag: str) -> str:
        cleaned = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in (tag or ""))
        parts = [p for p in cleaned.split() if p]
        if not parts: return "#AI"
        core = "".join(p[:1].upper() + p[1:] for p in parts)
        return f"#{core or 'AI'}"
