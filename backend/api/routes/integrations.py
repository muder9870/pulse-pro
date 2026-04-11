from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.integration_repository import IntegrationRepository

integrations_bp = Blueprint('integrations', __name__)

@integrations_bp.get("/api/integrations/webhooks")
def get_all_webhooks():
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        return jsonify(repo.get_webhooks()), 200
    finally:
        db.close()

@integrations_bp.post("/api/integrations/webhooks")
def add_new_webhook():
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        data = request.json or {}
        wh = repo.add_webhook(data["name"], data["url"], data.get("secret"), data.get("events"))
        return jsonify({"status": "success", "webhook": wh}), 201
    finally:
        db.close()

@integrations_bp.delete("/api/integrations/webhooks/<int:webhook_id>")
def delete_webhook(webhook_id):
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        repo.delete_webhook(webhook_id)
        return jsonify({"status": "success", "deleted": webhook_id}), 200
    finally:
        db.close()

@integrations_bp.post("/api/integrations/webhooks/<int:webhook_id>/toggle")
def toggle_webhook(webhook_id):
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        data = request.json or {}
        enabled = data.get("enabled", True)
        repo.toggle_webhook(webhook_id, enabled)
        return jsonify({"status": "success", "webhook_id": webhook_id, "enabled": enabled}), 200
    finally:
        db.close()

@integrations_bp.post("/api/integrations/test")
def test_webhooks():
    """Dispatch a test event to all enabled webhooks."""
    import requests as http_requests
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        webhooks = repo.get_webhooks()
        enabled = [w for w in webhooks if w.get("enabled")]
        results = []
        for wh in enabled:
            try:
                resp = http_requests.post(
                    wh["url"],
                    json={"event": "test", "source": "AI Pulse Pro"},
                    timeout=5,
                    headers={"X-Pulse-Secret": wh.get("secret") or ""},
                )
                results.append({"id": wh["id"], "name": wh["name"], "status": resp.status_code})
            except Exception as e:
                results.append({"id": wh["id"], "name": wh["name"], "error": str(e)})
        return jsonify({"status": "success", "dispatched": len(enabled), "results": results}), 200
    finally:
        db.close()

@integrations_bp.get("/api/monetization/links")
def get_monetization_links():
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        return jsonify(repo.get_affiliate_links()), 200
    finally:
        db.close()

@integrations_bp.post("/api/monetization/links")
def add_link():
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        data = request.json or {}
        link = repo.add_affiliate_link(str(data["keyword"]), str(data["url"]))
        return jsonify({"status": "success", "link": link}), 201
    finally:
        db.close()

@integrations_bp.delete("/api/monetization/links/<int:link_id>")
def delete_link(link_id):
    db = SessionLocal()
    try:
        repo = IntegrationRepository(db)
        repo.delete_affiliate_link(link_id)
        return jsonify({"status": "success", "deleted": link_id}), 200
    finally:
        db.close()

@integrations_bp.get("/api/feature-parity/check")
def feature_parity_check():
    """Stub endpoint for the Advanced tab feature parity verification tool."""
    return jsonify({"status": "ok", "parity": True}), 200
