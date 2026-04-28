from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timezone
import logging
import os
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository
from backend.monitoring import get_all_vitals
from backend.metrics import metrics
from backend.api.state import pipeline_lock, pipeline_state

logger = logging.getLogger(__name__)
system_bp = Blueprint('system', __name__)

@system_bp.get("/api/health")
def health():
    """Simple health check endpoint."""
    return {"status": "ok"}, 200

@system_bp.get("/api/system/feature-flags")
def get_feature_flags():
    """Get all feature flags."""
    from backend.feature_flags import feature_flags
    return jsonify({
        "flags": feature_flags.get_all_flags(),
        "disabled": feature_flags.get_disabled_features()
    }), 200


@system_bp.post("/api/system/feature-flags")
def update_feature_flags():
    """Update feature flags dynamically (runtime only, not persisted to .env)."""
    from backend.feature_flags import FeatureFlags
    
    data = request.json or {}
    updates = data.get("flags", {})
    
    if not updates:
        return jsonify({"error": "No flags provided"}), 400
    
    # Update feature flags in memory
    updated = []
    for flag_name, enabled in updates.items():
        flag_attr = flag_name.upper().replace("_GENERATION", "").replace("_", "_")
        if flag_name == "audio_generation":
            FeatureFlags.FEATURE_AUDIO = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "image_generation":
            FeatureFlags.FEATURE_IMAGE = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "quote_card_generation":
            FeatureFlags.FEATURE_QUOTE_CARD = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "content_generation":
            FeatureFlags.FEATURE_CONTENT_GENERATION = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "blog_generation":
            FeatureFlags.FEATURE_BLOG_GENERATION = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "research_analysis":
            FeatureFlags.FEATURE_RESEARCH_ANALYSIS = bool(enabled)
            updated.append(flag_name)
        elif flag_name == "hashtag_recommendations":
            FeatureFlags.FEATURE_HASHTAG_RECOMMENDATIONS = bool(enabled)
            updated.append(flag_name)
    
    return jsonify({
        "message": f"Updated {len(updated)} feature flag(s)",
        "updated": updated,
        "flags": FeatureFlags.get_all_flags()
    }), 200


@system_bp.get("/api/system/health")
def system_health_route():
    """Comprehensive system health endpoint with circuit breaker state and feature flags."""
    db = SessionLocal()
    try:
        from backend.processors.health_monitor import health_monitor
        from backend.llm.llm_router import smart_router
        from backend.feature_flags import feature_flags
        
        repo = SystemRepository(db)
        circuit_breaker_state = {
            "enabled": True,
            "providers": list(smart_router.clients.keys()),
            "total_providers": len(smart_router.clients),
            "failure_rate": health_monitor.get_failure_rate("llm", window=10),
            "threshold": settings.CIRCUIT_BREAKER_THRESHOLD if hasattr(settings, 'CIRCUIT_BREAKER_THRESHOLD') else 0.5,
        }
        
        fallback_stats = repo.get_fallback_stats()
        services = repo.get_health()
        
        feature_status = feature_flags.get_all_flags()
        disabled_features = feature_flags.get_disabled_features()
        vitals = get_all_vitals()
        
        with pipeline_lock:
            pipeline_info = {
                "running": pipeline_state["running"],
                "last_started_at": pipeline_state["last_started_at"],
                "last_finished_at": pipeline_state["last_finished_at"],
                "last_error": pipeline_state["last_error"]
            }

        return jsonify({
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "circuit_breaker": circuit_breaker_state,
            "fallback_statistics": fallback_stats,
            "feature_flags": feature_status,
            "disabled_features": disabled_features,
            "stability_mode": len(disabled_features) > 0,
            "vitals": vitals,
            "services": services,
            "pipeline": pipeline_info
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}), 500
    finally:
        db.close()

@system_bp.get("/api/monitoring/vitals")
def get_vitals():
    return jsonify(get_all_vitals()), 200

@system_bp.get("/api/metrics/realtime")
def get_metrics_endpoint():
    return jsonify(metrics.get_all()), 200

@system_bp.get("/api/pipeline/status")
def pipeline_status():
    with pipeline_lock:
        is_running = pipeline_state.get("running", False)
        last_error = pipeline_state.get("last_error")
        last_finished_at = pipeline_state.get("last_finished_at")

        if is_running:
            status_val = "running"
        elif last_error:
            status_val = "error"
        elif last_finished_at:
            status_val = "success"
        else:
            status_val = "idle"

        response_data = {
            "running": is_running,
            "status": status_val,
            "last_started_at": pipeline_state.get("last_started_at"),
            "last_finished_at": last_finished_at,
            "last_error": last_error,
            "message": pipeline_state.get("last_message", ""),
            "progress": pipeline_state.get("progress", {"current": 0, "total": 0}),
            "partial_success": pipeline_state.get("partial_success", False)
        }
        return jsonify(response_data), 200



@system_bp.get("/api/scheduler/status")
@system_bp.get("/api/schedule")
def get_schedule():
    if hasattr(current_app, 'scheduler_manager'):
        return jsonify(current_app.scheduler_manager.get_info()), 200
    return jsonify({"error": "Scheduler not initialized"}), 500

@system_bp.post("/api/scheduler/enable")
def scheduler_enable():
    if hasattr(current_app, 'scheduler_manager'):
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            repo.set_preference("scheduler_force_enabled", "1")
            current_app.scheduler_manager.start()
            return jsonify({"status": "success", "info": current_app.scheduler_manager.get_info()}), 200
        finally:
            db.close()
    return jsonify({"error": "Scheduler not initialized"}), 500

@system_bp.post("/api/scheduler/disable")
def scheduler_disable():
    if hasattr(current_app, 'scheduler_manager'):
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            repo.set_preference("scheduler_force_enabled", "0")
            current_app.scheduler_manager.shutdown()
            return jsonify({"status": "success", "info": current_app.scheduler_manager.get_info()}), 200
        finally:
            db.close()
    return jsonify({"error": "Scheduler not initialized"}), 500

@system_bp.post("/api/scheduler/config")
def update_scheduler_config():
    """Update scheduler configuration (days and time)."""
    if not hasattr(current_app, 'scheduler_manager'):
        return jsonify({"error": "Scheduler not initialized"}), 500
    
    try:
        from backend.scheduler import save_schedule, normalize_schedule
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No configuration provided"}), 400
        
        # Validate required fields
        if "days" not in data or "time" not in data:
            return jsonify({"error": "Missing required fields: days and time"}), 400
        
        # Validate days format (should be list of day abbreviations)
        valid_days = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
        if not isinstance(data["days"], list) or not all(day in valid_days for day in data["days"]):
            return jsonify({"error": "Invalid days format. Expected list of: mon, tue, wed, thu, fri, sat, sun"}), 400
        
        # Validate time format (should be HH:MM)
        import re
        if not isinstance(data["time"], str) or not re.match(r"^\d{1,2}:\d{2}$", data["time"]):
            return jsonify({"error": "Invalid time format. Expected HH:MM"}), 400
        
        # Ensure enabled field exists
        if "enabled" not in data:
            data["enabled"] = True
        
        # Save configuration to database
        normalized = save_schedule(data)
        
        # Apply configuration to running scheduler
        current_app.scheduler_manager.apply(normalized)
        
        logger.info(f"Scheduler configuration updated: days={data['days']}, time={data['time']}, enabled={data['enabled']}")
        
        return jsonify({
            "status": "success",
            "message": "Scheduler configuration updated",
            "config": normalized,
            "info": current_app.scheduler_manager.get_info()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to update scheduler config: {e}")
        return jsonify({"error": str(e)}), 500

@system_bp.get("/api/system/llm-providers")
def llm_providers_status():
    """Return configuration status for all LLM providers."""
    from backend.config import settings

    providers = [
        {
            "name": "Groq",
            "key": "GROQ_API_KEY",
            "configured": bool(getattr(settings, "GROQ_API_KEY", None)),
            "model": getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile"),
            "free": True,
            "get_key_url": "https://console.groq.com",
            "notes": "Free tier, 30 RPM. Fastest option.",
        },
        {
            "name": "Cerebras",
            "key": "CEREBRAS_API_KEY",
            "configured": bool(getattr(settings, "CEREBRAS_API_KEY", None)),
            "model": getattr(settings, "CEREBRAS_MODEL", "llama3.1-8b"),
            "free": True,
            "get_key_url": "https://cloud.cerebras.ai",
            "notes": "Free tier, fast inference.",
        },
        {
            "name": "Google Gemini",
            "key": "GEMINI_API_KEY",
            "configured": bool(getattr(settings, "GEMINI_API_KEY", None)),
            "model": getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite"),
            "free": True,
            "get_key_url": "https://aistudio.google.com",
            "notes": "Free tier: 30 RPM, 1000 RPD. No credit card.",
        },
        {
            "name": "Mistral",
            "key": "MISTRAL_API_KEY",
            "configured": bool(getattr(settings, "MISTRAL_API_KEY", None)),
            "model": getattr(settings, "MISTRAL_MODEL", "mistral-small-latest"),
            "free": True,
            "get_key_url": "https://console.mistral.ai",
            "notes": "Free Experiment plan (~1B tokens/month). Phone verification required.",
        },
        {
            "name": "OpenRouter",
            "key": "OPENROUTER_API_KEY",
            "configured": bool(getattr(settings, "OPENROUTER_API_KEY", None)),
            "model": getattr(settings, "OPENROUTER_MODEL", "anthropic/claude-3-haiku"),
            "free": False,
            "get_key_url": "https://openrouter.ai/keys",
            "notes": "Pay-per-use. Some models are free.",
        },
        {
            "name": "OpenAI",
            "key": "OPENAI_API_KEY",
            "configured": bool(getattr(settings, "OPENAI_API_KEY", None)),
            "model": getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
            "free": False,
            "get_key_url": "https://platform.openai.com/api-keys",
            "notes": "Paid. Used for DALL-E 3 image generation too.",
        },
        {
            "name": "Anthropic",
            "key": "ANTHROPIC_API_KEY",
            "configured": bool(getattr(settings, "ANTHROPIC_API_KEY", None)),
            "model": getattr(settings, "ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
            "free": False,
            "get_key_url": "https://console.anthropic.com",
            "notes": "Paid.",
        },
        {
            "name": "Ollama (Local)",
            "key": None,
            "configured": True,  # Always available — just needs Ollama running
            "model": getattr(settings, "OLLAMA_MODEL", "llama3.2"),
            "free": True,
            "get_key_url": "https://ollama.com",
            "notes": "Local GPU required. No API key needed.",
        },
        {
            "name": "Pollinations.ai (Text)",
            "key": None,
            "configured": getattr(settings, "POLLINATIONS_TEXT_ENABLED", True),
            "model": "openai (GPT-5 Nano)",
            "free": True,
            "get_key_url": None,
            "notes": "No key required. Last-resort fallback.",
        },
        {
            "name": "HuggingFace (Images)",
            "key": "HF_TOKEN",
            "configured": bool(getattr(settings, "HF_TOKEN", None)),
            "model": getattr(settings, "HF_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0"),
            "free": True,
            "get_key_url": "https://huggingface.co/settings/tokens",
            "notes": "Free tier for image generation.",
        },
    ]

    configured_count = sum(1 for p in providers if p["configured"])
    return jsonify({
        "providers": providers,
        "configured_count": configured_count,
        "total_count": len(providers),
    }), 200


@system_bp.post("/api/system/cleanup-orphans")
def cleanup_orphans():
    """
    Remove ProcessedArticle rows that have no corresponding RawArticle.
    Also removes GeneratedContent rows with system_fallback placeholder text.
    Safe to run at any time — only deletes genuinely orphaned/junk records.
    """
    from backend.db.session import SessionLocal
    from backend.db.models import ProcessedArticle, RawArticle, GeneratedContent

    db = SessionLocal()
    try:
        # Find ProcessedArticle IDs with no matching RawArticle
        orphaned = (
            db.query(ProcessedArticle.id)
            .outerjoin(RawArticle, RawArticle.id == ProcessedArticle.raw_article_id)
            .filter(RawArticle.id.is_(None))
            .all()
        )
        orphan_ids = [r.id for r in orphaned]

        deleted_processed = 0
        if orphan_ids:
            # Delete generated content for orphans first (FK constraint)
            db.query(GeneratedContent).filter(
                GeneratedContent.article_id.in_(orphan_ids)
            ).delete(synchronize_session=False)
            deleted_processed = db.query(ProcessedArticle).filter(
                ProcessedArticle.id.in_(orphan_ids)
            ).delete(synchronize_session=False)

        # Remove system_fallback placeholder content
        FALLBACK_PHRASES = [
            "Content generation unavailable at the moment.",
            "Content generation unavailable.",
        ]
        deleted_fallback = 0
        for phrase in FALLBACK_PHRASES:
            deleted_fallback += db.query(GeneratedContent).filter(
                GeneratedContent.content == phrase
            ).delete(synchronize_session=False)

        db.commit()
        return jsonify({
            "status": "success",
            "orphaned_processed_articles_deleted": deleted_processed,
            "fallback_content_deleted": deleted_fallback,
            "orphan_ids": orphan_ids,
        }), 200
    except Exception as e:
        db.rollback()
        logger.error("Cleanup failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@system_bp.post("/api/system/reset-data")
def reset_data():
    """
    Clean-state reset for development.
    Wipes all article data, generated content, analysis, and scheduled posts.
    PRESERVES: rss_feeds, webhooks, affiliate_links, user_preferences, system_status.

    Requires header: X-Reset-Confirm: yes
    """
    if request.headers.get("X-Reset-Confirm") != "yes":
        return jsonify({
            "error": "Missing confirmation header. Send X-Reset-Confirm: yes to proceed."
        }), 400

    from backend.db.session import SessionLocal
    import redis as redis_lib

    db = SessionLocal()
    counts = {}
    try:
        # Use TRUNCATE CASCADE — handles all FK dependencies atomically
        # Preserves: rss_feeds, webhooks, affiliate_links, user_preferences, system_status
        data_tables = [
            "scheduled_posts", "content_history", "content_hashtags",
            "paper_analysis", "article_images", "article_audio", "video_scripts",
            "generated_content", "article_tags", "blog_publications", "blog_posts",
            "user_feedback", "user_styles",
            "processed_articles", "rss_feed_items", "raw_articles",
            "daily_intelligence", "trending_hashtags", "hashtag_performance",
            "engagement_metrics", "llm_cache", "idempotency_logs",
            "health_history", "system_status",
        ]

        from sqlalchemy import text
        for table in data_tables:
            try:
                db.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                counts[table] = "truncated"
            except Exception as e:
                db.rollback()
                logger.warning("Could not truncate %s: %s — skipping", table, e)
                counts[table] = f"skipped"

        db.commit()

        # Clear Redis cache
        redis_cleared = 0
        try:
            from backend.config import settings
            r = redis_lib.Redis.from_url(settings.REDIS_URL)
            redis_cleared = r.dbsize()
            r.flushdb()
        except Exception as e:
            logger.warning("Redis flush failed: %s", e)

        logger.info("clean_state_reset completed rows_deleted=%s redis_keys_cleared=%d",
                    sum(v for v in counts.values() if isinstance(v, int)), redis_cleared)

        return jsonify({
            "status": "success",
            "message": "Clean state reset complete. All article data wiped. Config preserved.",
            "rows_deleted": counts,
            "redis_keys_cleared": redis_cleared,
        }), 200

    except Exception as e:
        db.rollback()
        logger.error("Reset failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
