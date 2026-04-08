from datetime import datetime, timezone
import logging
from backend.db.session import SessionLocal
from backend.agents.orchestrator import MultiAgentOrchestrator
from backend.metrics import metrics

# NOTE: analytics.json is DEPRECATED
# Data is available via GET /api/analytics endpoint
# File can be safely deleted
def run_daily_pipeline() -> dict:
    """
    End-to-end pipeline driven by Multi-Agent Orchestrator.
    Transitional wrapper to maintain compatibility with existing callers.
    """
    metrics.increment("pipeline_runs_total")
    log = logging.getLogger("pipeline")
    log.info("stage=start msg=multi_agent_pipeline_starting")
    
    db = SessionLocal()
    try:
        orchestrator = MultiAgentOrchestrator(db)
        results = orchestrator.run_full_pipeline()
    finally:
        db.close()
        
    if results.get("success"):
        log.info("stage=done msg=pipeline_complete duration=%s", results.get("duration_seconds"))
        return {"ok": True, "errors": []}
    else:
        log.error("stage=error msg=pipeline_failed error=%s", results.get("error"))
        return {"ok": False, "errors": [results.get("error")]}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_daily_pipeline()
