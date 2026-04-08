from flask import Blueprint, jsonify, make_response, request
import json
from backend.db.session import SessionLocal
from backend.db.repositories.intelligence_repository import IntelligenceRepository

intelligence_bp = Blueprint('intelligence', __name__)

_POLL_CACHE_TTL = 30
_CACHE_HEADER = f"public, max-age={_POLL_CACHE_TTL}, stale-while-revalidate=60"

@intelligence_bp.get("/api/intelligence/daily")
def get_intelligence():
    """Return the most recent daily intelligence summary."""
    db = SessionLocal()
    try:
        repo = IntelligenceRepository(db)
        summary = repo.get_latest()
        if not summary:
            resp = make_response(jsonify({"summary": None, "status": "success"}), 200)
            resp.headers["Cache-Control"] = _CACHE_HEADER
            return resp

        try:
            summary["stories"] = json.loads(summary["top_stories_json"])
            summary.pop("top_stories_json")
        except Exception:
            summary["stories"] = []

        resp = make_response(jsonify({"status": "success", "data": summary}), 200)
        resp.headers["Cache-Control"] = _CACHE_HEADER
        return resp
    finally:
        db.close()
