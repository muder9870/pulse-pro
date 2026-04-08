from __future__ import annotations

import json
import logging
import requests
from typing import List, Dict, Any

from backend.db.session import get_session
from ..models import Webhook

log = logging.getLogger(__name__)

class IntegrationsManager:
    """Handles outbound webhooks and integrations."""

    def __init__(self):
        self._webhooks: List[Dict[str, Any]] = []
        self._load_webhooks()

    def _load_webhooks(self) -> None:
        """Load enabled webhooks from database."""
        with get_session() as session:
            webhooks = session.query(Webhook).filter(Webhook.enabled == 1).all()
            self._webhooks = [{
                "id": w.id,
                "name": w.name,
                "url": w.url,
                "secret": w.secret,
                "events": w.events
            } for w in webhooks]

    def refresh(self) -> None:
        """Refresh webhooks from database."""
        self._load_webhooks()

    def trigger_event(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Trigger webhooks registered for a specific event."""
        log.info("trigger_event name=%s", event_name)
        
        for webhook in self._webhooks:
            registered_events = [e.strip() for e in (webhook.get("events") or "").split(",") if e.strip()]
            
            # If no events specified, trigger for all
            if not registered_events or event_name in registered_events:
                self._send_payload(webhook, event_name, payload)

    def _send_payload(self, webhook: Dict[str, Any], event_name: str, payload: Dict[str, Any]) -> None:
        """Send POST request to a webhook URL."""
        url = webhook["url"]
        name = webhook["name"]
        
        full_payload = {
            "event": event_name,
            "timestamp": payload.get("timestamp"),
            "data": payload
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-AI-Pulse-Event": event_name
        }
        
        if webhook.get("secret"):
            headers["X-AI-Pulse-Secret"] = webhook["secret"]

        try:
            log.info("dispatching_webhook name=%s url=%s", name, url)
            response = requests.post(
                url, 
                data=json.dumps(full_payload), 
                headers=headers, 
                timeout=10
            )
            response.raise_for_status()
            log.info("webhook_success name=%s status=%s", name, response.status_code)
        except Exception as exc:
            log.error("webhook_failure name=%s error=%s", name, exc)

# Singleton instance
integrations_manager = IntegrationsManager()
