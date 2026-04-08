from flask import Blueprint, jsonify, make_response
from backend.db.session import SessionLocal
from backend.db.repositories.analytics_repository import AnalyticsRepository

analytics_bp = Blueprint('analytics', __name__)

# Cache TTL in seconds for frequently-polled read-only endpoints.
# Keeps responses consistent while dramatically reducing DB load.
_POLL_CACHE_TTL = 30
_CACHE_HEADER = f"public, max-age={_POLL_CACHE_TTL}, stale-while-revalidate=60"


@analytics_bp.get("/api/analytics")
def analytics():
    """Get analytics data for frontend."""
    db = SessionLocal()
    try:
        repo = AnalyticsRepository(db)
        stats = repo.get_dashboard_stats()
        resp = make_response(jsonify(stats), 200)
        resp.headers["Cache-Control"] = _CACHE_HEADER
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@analytics_bp.get("/api/stats/dashboard")
def stats_dashboard():
    """Get dashboard statistics."""
    db = SessionLocal()
    try:
        repo = AnalyticsRepository(db)
        stats = repo.get_dashboard_stats()
        resp = make_response(jsonify(stats), 200)
        resp.headers["Cache-Control"] = _CACHE_HEADER
        return resp
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
