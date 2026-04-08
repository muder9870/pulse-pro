from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import Webhook, AffiliateLink

class IntegrationRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_webhooks(self) -> list[dict]:
        rows = self.session.query(Webhook).order_by(Webhook.created_at.desc()).all()
        return [{
            "id": w.id, "name": w.name, "url": w.url, "secret": w.secret,
            "events": w.events, "enabled": bool(w.enabled),
            "created_at": w.created_at.isoformat() if w.created_at else None,
        } for w in rows]

    def add_webhook(self, name: str, url: str, secret: str | None = None, events: str | None = None) -> dict:
        wh = Webhook(name=name, url=url, secret=secret, events=events, enabled=1)
        self.session.add(wh)
        self.session.commit()
        return {"id": wh.id, "name": wh.name, "url": wh.url}

    def delete_webhook(self, webhook_id: int):
        self.session.query(Webhook).filter(Webhook.id == webhook_id).delete()
        self.session.commit()

    def get_affiliate_links(self) -> list[dict]:
        links = self.session.query(AffiliateLink).order_by(AffiliateLink.keyword.asc()).all()
        return [{
            "id": l.id, "keyword": l.keyword, "url": l.url,
            "usage_count": l.usage_count,
            "last_used": l.last_used.isoformat() if l.last_used else None,
        } for l in links]

    def add_affiliate_link(self, keyword: str, url: str) -> dict:
        link = self.session.query(AffiliateLink).filter(AffiliateLink.keyword == keyword).first()
        if link: link.url = url
        else:
            link = AffiliateLink(keyword=keyword, url=url)
            self.session.add(link)
        self.session.commit()
        return {"id": link.id, "keyword": link.keyword, "url": link.url}
