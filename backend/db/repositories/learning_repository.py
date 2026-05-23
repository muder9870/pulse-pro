from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models import UserFeedback, UserStyle, TopicTrend

class LearningRepository:
    def __init__(self, session: Session):
        self.session = session

    # User Feedback
    def add_feedback(self, article_id: int, platform: str, is_positive: bool, 
                     comment: str = None, original_content: str = None, 
                     edited_content: str = None) -> UserFeedback:
        feedback = UserFeedback(
            article_id=article_id,
            platform=platform,
            is_positive=is_positive,
            comment=comment,
            original_content=original_content,
            edited_content=edited_content
        )
        self.session.add(feedback)
        self.session.commit()
        return feedback

    def get_feedback_for_article(self, article_id: int) -> list[UserFeedback]:
        return self.session.query(UserFeedback).filter(UserFeedback.article_id == article_id).all()

    # User Style / Personalization
    def get_style(self, key: str) -> str | None:
        style = self.session.query(UserStyle).filter(UserStyle.key == key).first()
        return style.value if style else None

    def set_style(self, key: str, value: str):
        style = self.session.query(UserStyle).filter(UserStyle.key == key).first()
        if style:
            style.value = value
            style.last_updated = datetime.now(timezone.utc)
        else:
            style = UserStyle(key=key, value=value)
            self.session.add(style)
        self.session.commit()

    def get_style_preferences(self) -> dict | None:
        """Return all learned style preferences as a flat dict.

        Returns None (not an empty dict) when no preferences have been
        learned yet, so callers can distinguish 'empty' from 'not learned'.
        """
        rows = self.session.query(UserStyle).order_by(UserStyle.key).all()
        if not rows:
            return None
        return {row.key: row.value for row in rows}

    # Topic Trends
    def save_topic_trends(self, trends: list[dict]):
        for trend in trends:
            self.session.add(TopicTrend(
                topic=trend.get("topic", ""),
                occurrence_count=trend.get("count", 0),
                avg_viral_score=trend.get("avg_score", 0.0)
            ))
        self.session.commit()

    def get_feedback_count(self, platform: str = None) -> int:
        """Get total feedback count for a platform."""
        query = self.session.query(func.count(UserFeedback.id))
        if platform:
            query = query.filter(UserFeedback.platform == platform)
        return query.scalar() or 0
