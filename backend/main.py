from __future__ import annotations
from datetime import datetime, timezone
import logging
import threading
import os
from os import getenv
import redis
from flask import Flask
from flask_cors import CORS
from flask_compress import Compress
from flask_talisman import Talisman
from flasgger import Swagger

from .logging_utils import init_logging
from .config import settings
from .db.session import init_db, SessionLocal, get_db_health
from .db.repositories.system_repository import SystemRepository
from .db.repositories.keyword_repository import KeywordRepository
from .main_pipeline import run_daily_pipeline
from .notifications import notify_pipeline_run
from .scheduler import SchedulerManager

# Import blueprints
from .api.routes.stories import stories_bp
from .api.routes.pipeline import pipeline_bp
from .api.routes.analytics import analytics_bp
from .api.routes.system import system_bp
from .api.routes.content import content_bp
from .api.routes.blog import blog_bp
from .api.routes.hashtags import hashtags_bp
from .api.routes.intelligence import intelligence_bp
from .api.routes.config import config_bp
from .api.routes.rss import rss_bp
from .api.routes.integrations import integrations_bp
from .api.routes.research import research_bp
from .api.routes.schedule import schedule_bp
from .api.routes.media import media_bp
from .api.routes.performance import performance_bp
from .api.routes.export import export_bp
from .api.routes.articles import articles_bp
from .api.routes.podcast import podcast_bp
from .api.routes.keywords import keywords_bp

# Shared state
from .api.state import pipeline_lock, pipeline_state
from .processors.hashtag_analyzer import HashtagAnalyzer
from .api.limiter import limiter

def create_app() -> Flask:
    init_logging()
    log = logging.getLogger("app")

    # Fail fast if SECRET_KEY is still the default — insecure sessions
    if settings.SECRET_KEY in ("change-me", "change-me-in-.env", ""):
        raise RuntimeError(
            "SECRET_KEY is not set or is using the default value. "
            "Add a random SECRET_KEY to your .env file. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.SECRET_KEY
    app.config["DEBUG"] = settings.DEBUG

    redis_client = redis.Redis(host='redis', port=6379, db=0)

    CORS(app)
    Compress(app)

    # OpenAPI docs — accessible at /apidocs
    Swagger(app, template={
        "info": {
            "title": "AI Pulse Pro API",
            "version": "2.2",
            "description": "Backend API for AI Pulse Pro content automation platform",
        },
        "securityDefinitions": {},
    })

    # Security headers — no 'unsafe-inline' (Tailwind is compiled CSS, doesn't need it)
    Talisman(
        app,
        force_https=False,  # nginx handles HTTPS termination
        content_security_policy={
            "default-src": "'self'",
            "script-src": "'self'",
            "style-src": "'self'",
            "img-src": ["'self'", "data:", "https:"],
            "connect-src": ["'self'"],   # SSE /api/pipeline/stream
            "font-src": "'self'",
            "frame-ancestors": "'none'",
        },
        content_security_policy_nonce_in=["script-src"],
        referrer_policy="no-referrer-when-downgrade",
        feature_policy={},
    )

    # Rate limiting — backed by Redis so limits survive worker restarts
    limiter.init_app(app)
    app.config["RATELIMIT_STORAGE_URI"] = settings.REDIS_URL

    # Register modular blueprints
    app.register_blueprint(stories_bp)
    app.register_blueprint(pipeline_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(content_bp)
    app.register_blueprint(blog_bp)
    app.register_blueprint(hashtags_bp)
    app.register_blueprint(intelligence_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(rss_bp)
    app.register_blueprint(integrations_bp)
    app.register_blueprint(research_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(media_bp)
    app.register_blueprint(performance_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(articles_bp)
    app.register_blueprint(podcast_bp)
    app.register_blueprint(keywords_bp)

    # Metrics endpoint
    @app.route('/metrics')
    def metrics_endpoint():
        from .metrics import metrics
        return metrics.get_prometheus_metrics(), 200, {'Content-Type': 'text/plain; charset=utf-8'}

    # Ensure schema exists
    init_db()

    # Seed default keywords on first run (no-op if table already has rows)
    _seed_db = SessionLocal()
    try:
        KeywordRepository(_seed_db).seed_defaults()
    finally:
        _seed_db.close()

    def _get_pref(key: str) -> str | None:
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            return repo.get_preference(key)
        finally:
            db.close()

    def _set_pref(key: str, value: str) -> None:
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            repo.set_preference(key, value)
        finally:
            db.close()

    def _start_pipeline_if_idle() -> None:
        with pipeline_lock:
            if pipeline_state["running"]:
                return
            t = threading.Thread(target=_pipeline_thread_target, daemon=True)
            t.start()

    def _pipeline_thread_target() -> None:
        started_at = datetime.now(timezone.utc).isoformat()
        with pipeline_lock:
            pipeline_state["running"] = True
            pipeline_state["last_started_at"] = started_at
            pipeline_state["last_error"] = None
            pipeline_state["last_result"] = None

        try:
            result = run_daily_pipeline()
            with pipeline_lock:
                pipeline_state["last_result"] = result
        except Exception as e:
            with pipeline_lock:
                pipeline_state["last_error"] = str(e)
        finally:
            finished_at = datetime.now(timezone.utc).isoformat()
            with pipeline_lock:
                pipeline_state["running"] = False
                pipeline_state["last_finished_at"] = finished_at

            try:
                notify_pipeline_run({
                    "outcome": "failure" if pipeline_state.get("last_error") else "success",
                    "started_at": started_at,
                    "finished_at": finished_at
                })
            except Exception:
                pass

    def _update_hashtags_job() -> None:
        HashtagAnalyzer().update_trending_hashtags(
            platforms=["twitter", "linkedin", "reddit"]
        )

    scheduler_manager = SchedulerManager(start_pipeline=_start_pipeline_if_idle, update_hashtags=_update_hashtags_job)
    app.scheduler_manager = scheduler_manager 
    
    scheduler_override = _get_pref("scheduler_force_enabled")
    scheduler_disabled_env = str(getenv("DISABLE_SCHEDULER", "")).lower() in {"1", "true", "yes"}
    if (not scheduler_disabled_env) or (scheduler_override in {"1", "true", "yes"}):
        scheduler_manager.start()
        log.info("scheduler_started")
    else:
        log.info("scheduler_disabled")

    @app.route("/health/performance")
    def performance_health():
        from flask import jsonify
        import time
        results  = {}
        degraded = False

        # 1. DB latency
        start = time.time()
        db_ok = get_db_health()
        db_latency = round(time.time() - start, 3)
        results["db"] = {"ok": db_ok, "latency_s": db_latency}
        if not db_ok or db_latency > 1.0:
            degraded = True

        # 2. Redis latency
        start = time.time()
        try:
            redis_client.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
        redis_latency = round(time.time() - start, 3)
        results["redis"] = {"ok": redis_ok, "latency_s": redis_latency}
        if not redis_ok or redis_latency > 0.1:
            degraded = True

        # 3. Celery queue reachability
        try:
            from backend.celery_app import celery_app
            celery_app.control.inspect(timeout=1).ping()
            results["queue"] = {"ok": True}
        except Exception:
            results["queue"] = {"ok": False}
            degraded = True

        # HTTP 503 lets load balancers and uptime monitors act automatically
        status_code = 503 if degraded else 200
        response_data = {"status": "degraded" if degraded else "healthy", **results}
        return jsonify(response_data), status_code

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=False)
