from __future__ import annotations

import re
from collections import Counter

from backend.db.session import SessionLocal
from backend.models import ProcessedArticle, RawArticle, ArticleTag
from sqlalchemy.dialects.postgresql import insert as pg_insert


STOPWORDS = {
    "a","an","the","and","or","but","if","then","else","when","while","for","to","of","in","on","at","by","with","as",
    "is","are","was","were","be","been","being","it","its","this","that","these","those","from","into","over","under",
    "about","against","between","among","after","before","during","without","within","across","per","via","new","now",
    "we","you","they","their","our","your","i","me","my","mine","us",
}


def _normalize_word(w: str) -> str:
    w = w.strip().lower()
    if not w or w in STOPWORDS:
        return ""
    if len(w) < 3:
        return ""
    return w


def _to_tag(w: str) -> str:
    if not w:
        return w
    if w.isupper():
        return w
    return w[:1].upper() + w[1:]


def generate_tags_for_article(article_id: int, max_tags: int = 6, overwrite: bool = True) -> list[str]:
    db = SessionLocal()
    try:
        # Query article data
        article = db.query(
            RawArticle.title,
            RawArticle.source,
            RawArticle.category,
            ProcessedArticle.summary,
            ProcessedArticle.key_takeaways
        ).join(
            ProcessedArticle,
            ProcessedArticle.raw_article_id == RawArticle.id
        ).filter(
            ProcessedArticle.id == article_id
        ).first()
        
        if not article:
            raise ValueError(f"Article with id {article_id} not found in processed_articles.")

        title, source, category, summary, key_takeaways = article

        text_parts: list[str] = [title or ""]
        if summary:
            text_parts.append(str(summary))
        if key_takeaways:
            text_parts.append(str(key_takeaways))
        if category:
            text_parts.append(str(category))
        if source:
            text_parts.append(str(source))

        text = " ".join(text_parts)
        words = re.findall(r"[A-Za-z][A-Za-z0-9\-\+]{2,}", text)
        normalized = [_normalize_word(w.replace("-", "").replace("+", "")) for w in words]
        normalized = [w for w in normalized if w]

        c = Counter(normalized)

        curated: list[str] = []
        cat = (category or "").lower()
        if "llm" in cat or "language" in cat:
            curated.append("LLM")
        if "vision" in cat:
            curated.append("ComputerVision")
        if "robot" in cat:
            curated.append("Robotics")
        if (source or "").lower() == "arxiv":
            curated.append("Research")

        tags: list[str] = []
        for t in curated:
            if t not in tags:
                tags.append(t)

        for w, _cnt in c.most_common(40):
            if w in {"ai", "ml", "llm"}:
                tag = w.upper()
            elif w == "arxiv":
                tag = "arXiv"
            elif w in {"transformer", "transformers"}:
                tag = "Transformers"
            else:
                tag = _to_tag(w)
            if tag not in tags:
                tags.append(tag)
            if len(tags) >= max_tags:
                break

        if overwrite:
            db.query(ArticleTag).filter(
                ArticleTag.article_id == article_id
            ).delete()

        for tag in tags:
            # Use PostgreSQL upsert
            stmt = pg_insert(ArticleTag).values(
                article_id=article_id,
                tag=tag
            ).on_conflict_do_nothing(
                index_elements=['article_id', 'tag']
            )
            db.execute(stmt)
        
        db.commit()
    finally:
        db.close()

    return tags
