from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models import UserPreference, SystemStatus, HealthHistory, AffiliateLink, ScheduledPost

class SystemRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_preference(self, key: str) -> str | None:
        pref = self.session.query(UserPreference).filter(UserPreference.key == key).first()
        return pref.value if pref else None

    def set_preference(self, key: str, value: str) -> None:
        pref = self.session.query(UserPreference).filter(UserPreference.key == key).first()
        if pref:
            pref.value = value
            pref.updated_at = datetime.now(timezone.utc)
        else:
            pref = UserPreference(key=key, value=value)
            self.session.add(pref)
        self.session.commit()

    def update_health(self, service_name: str, status: str, error: str | None = None, duration_ms: int = 0):
        service = self.session.query(SystemStatus).filter(SystemStatus.service_name == service_name).first()
        if service:
            service.status = status
            service.last_run_at = datetime.now(timezone.utc)
            service.last_error = error
            if status == "ok": service.success_count += 1
            else: service.failure_count += 1
        else:
            service = SystemStatus(service_name=service_name, status=status, last_error=error,
                                   success_count=1 if status == "ok" else 0,
                                   failure_count=0 if status == "ok" else 1)
            self.session.add(service)
        self.session.add(HealthHistory(service_name=service_name, status=status, error_message=error, duration_ms=duration_ms))
        self.session.commit()

    def get_affiliate_links(self) -> list[dict]:
        links = self.session.query(AffiliateLink).all()
        return [{"id": l.id, "keyword": l.keyword, "url": l.url} for l in links]

    def add_affiliate_link(self, keyword: str, url: str) -> dict:
        link = AffiliateLink(keyword=keyword, url=url)
        self.session.add(link)
        self.session.commit()
        return {"id": link.id, "keyword": link.keyword, "url": link.url}

    def get_system_health(self) -> list[dict]:
        services = self.session.query(SystemStatus).all()
        return [{
            "service_name": s.service_name,
            "status": s.status,
            "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
            "last_error": s.last_error,
            "success_count": s.success_count,
            "failure_count": s.failure_count,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        } for s in services]

    def get_health(self) -> list[dict]:
        """Alias for get_system_health to maintain compatibility."""
        return self.get_system_health()

    def get_fallback_stats(self) -> dict:
        from backend.db.models import ProcessedArticle
        total_processed = self.session.query(func.count(ProcessedArticle.id)).scalar() or 0
        total_fallback = self.session.query(func.count(ProcessedArticle.id)).filter(ProcessedArticle.llm_fallback == 1).scalar() or 0
        return {
            "total_processed": total_processed,
            "fallback_count": total_fallback,
            "fallback_rate": round(total_fallback / total_processed, 4) if total_processed > 0 else 0.0
        }

    def list_scheduled_posts(self, status: str | None = None, limit: int = 50) -> list[dict]:
        query = self.session.query(ScheduledPost)
        if status:
            query = query.filter(ScheduledPost.status == status)
        posts = query.order_by(ScheduledPost.scheduled_time.asc()).limit(limit).all()
        return [{"id": p.id, "article_id": p.article_id, "platform": p.platform,
                 "scheduled_time": p.scheduled_time, "status": p.status} for p in posts]

    def update_scheduled_post_status(self, post_id: int, status: str, error: str | None = None) -> None:
        post = self.session.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
        if post:
            post.status = status
            post.error_message = error
            self.session.commit()

    def get_recent_failure_rate(self, service_name: str, window: int = 10) -> float:
        recent = self.session.query(HealthHistory).filter(
            HealthHistory.service_name == service_name
        ).order_by(HealthHistory.created_at.desc()).limit(window).all()
        if not recent:
            return 0.0
        failures = sum(1 for r in recent if r.status != "ok")
        return failures / len(recent)
