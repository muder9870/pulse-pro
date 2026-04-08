from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import GeneratedContent
from backend.db.repositories.article_repository import ArticleRepository

class ContentRepository:
    def __init__(self, session: Session):
        self.session = session
        self.article_repo = ArticleRepository(session)

    def get_content_record(self, article_id: int, platform: str) -> dict | None:
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id: return None
        content = self.session.query(GeneratedContent).filter(
            GeneratedContent.article_id == p_id,
            GeneratedContent.platform == platform
        ).order_by(GeneratedContent.generated_at.desc()).first()
        if not content: return None
        return {
            "id": content.id,
            "content": content.content,
            "posted": bool(content.posted),
            "posted_at": content.posted_at,
            "generated_at": content.generated_at
        }

    def set_posted(self, article_id: int, platform: str, posted: bool) -> dict | None:
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id: return None
        content = self.session.query(GeneratedContent).filter(
            GeneratedContent.article_id == p_id,
            GeneratedContent.platform == platform
        ).order_by(GeneratedContent.generated_at.desc()).first()
        if not content: return None
        content.posted = 1 if posted else 0
        if posted: content.posted_at = datetime.now(timezone.utc)
        self.session.commit()
        return {"id": content.id, "posted": content.posted, "posted_at": content.posted_at}

    def update_content(self, article_id: int, platform: str, content_text: str) -> dict | None:
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id: return None
        content = self.session.query(GeneratedContent).filter(
            GeneratedContent.article_id == p_id,
            GeneratedContent.platform == platform
        ).order_by(GeneratedContent.generated_at.desc()).first()
        if content:
            content.content = content_text
            content.char_count = len(content_text)
            content.generated_at = datetime.now(timezone.utc)
        else:
            content = GeneratedContent(article_id=p_id, platform=platform, content=content_text, char_count=len(content_text))
            self.session.add(content)
        self.session.commit()
        return {"id": content.id, "content": content.content}
