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
