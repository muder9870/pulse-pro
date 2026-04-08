from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import DailyIntelligence, TopicTrend

class IntelligenceRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_latest(self) -> dict | None:
        intel = self.session.query(DailyIntelligence).order_by(DailyIntelligence.date.desc()).first()
        if not intel: return None
        return {
            "date": intel.date,
            "top_stories_json": intel.top_stories_json,
            "created_at": intel.created_at
        }

    def save_topic_trends(self, trends: list[dict]):
        for trend in trends:
            self.session.add(TopicTrend(
                topic=trend.get("topic", ""),
                occurrence_count=trend.get("count", 0),
                avg_viral_score=trend.get("avg_score", 0.0)
            ))
        self.session.commit()

    def get_latest_trends(self, limit: int = 10) -> list[dict]:
        trends = self.session.query(TopicTrend).order_by(TopicTrend.detected_at.desc()).limit(limit).all()
        return [{"topic": t.topic, "occurrence_count": t.occurrence_count, "avg_viral_score": t.avg_viral_score} for t in trends]
