import os
import threading
from pathlib import Path
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository
from backend.models import RawArticle
from backend.config import settings
from backend.processors.health_monitor import health_monitor
from sqlalchemy import func, text

def get_db_vitals() -> dict:
    """Collect database vitals."""
    vitals = {
        "db_size_kb": 0,
        "connection_pool": "active",
    }
    
    # For PostgreSQL, we don't have a single file, but we can check connection
    try:
        db = SessionLocal()
        try:
            # Test connection
            db.execute(text("SELECT 1"))
            vitals["connection_pool"] = "healthy"
        finally:
            db.close()
    except Exception as e:
        vitals["connection_pool"] = f"error: {str(e)}"
        
    return vitals

def get_queue_vitals() -> dict:
    """Collect processing queue depths."""
    vitals = {}
    try:
        db = SessionLocal()
        try:
            # Get counts by state
            results = db.query(
                RawArticle.state,
                func.count(RawArticle.id)
            ).group_by(RawArticle.state).all()
            
            counts = dict(results)
            vitals["states"] = counts
            vitals["total_pending"] = sum(
                counts.get(s, 0) for s in ['pending', 'cleaning', 'cleaned', 'deduplicating', 'deduped']
            )
        finally:
            db.close()
    except Exception as e:
        vitals["error"] = f"failed_to_query_database: {str(e)}"
        
    return vitals

def get_llm_vitals() -> dict:
    """Collect LLM circuit breaker status."""
    fail_rate = health_monitor.get_failure_rate("llm", window=settings.CIRCUIT_BREAKER_WINDOW)
    return {
        "failure_rate": round(fail_rate, 2),
        "circuit_breaker_tripped": fail_rate >= settings.CIRCUIT_BREAKER_THRESHOLD,
        "threshold": settings.CIRCUIT_BREAKER_THRESHOLD,
    }

def get_all_vitals() -> dict:
    """Aggregate all system vitals."""
    db = SessionLocal()
    try:
        repo = SystemRepository(db)
        services = repo.get_system_health()
    finally:
        db.close()

    return {
        "database": get_db_vitals(),
        "queue": get_queue_vitals(),
        "llm": get_llm_vitals(),
        "active_threads": threading.active_count(),
        "services": services,
    }
