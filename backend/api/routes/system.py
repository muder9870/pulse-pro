from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timezone
import os
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository
from backend.monitoring import get_all_vitals
from backend.metrics import metrics
from backend.api.state import pipeline_lock, pipeline_state

system_bp = Blueprint('system', __name__)

@system_bp.get("/api/health")
def health():
    """Simple health check endpoint."""
    return {"status": "ok"}, 200

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
