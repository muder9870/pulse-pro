from backend.agents.ingestion_agent import IngestionAgent
from backend.agents.analysis_agent import AnalysisAgent
from backend.utils.event_emitter import pipeline_emitter
from backend.processors.decision_engine import decision_engine
import logging
import time

logger = logging.getLogger(__name__)

class MultiAgentOrchestrator:
    def __init__(self, db):
        self.db = db
        self.ingestion = IngestionAgent(db)
        self.analysis = AnalysisAgent(db)

    def run_full_pipeline(self, sources: list[str] = None):
        from datetime import datetime, timezone
        from backend.api.state import pipeline_state

        start_time = time.monotonic()
        self.log_status("start", "Pipeline starting...")

        try:
            # 1. Ingestion
            self.log_status("fetch", "Agents fetching content from sources...")
            ingestion_results = self.ingestion.run(sources=sources)

            # 2. Analysis & Scoring
            self.log_status("analyze", "Agents analyzing and scoring articles...")
            analysis_results = self.analysis.run()

            # 3. Summary
            self.log_status("summary", "Agents generating daily intelligence summary...")
            summary = decision_engine.generate_daily_summary()

            self.log_status("done", "Multi-Agent Pipeline completed successfully!")

            duration = time.monotonic() - start_time
            return {
                "success": True,
                "duration_seconds": round(duration, 2),
                "ingestion": ingestion_results,
                "analysis": analysis_results,
                "summary": summary,
            }
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error("Pipeline error: %s", error_msg, exc_info=True)
            self.log_status("error", f"Pipeline failed: {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "duration_seconds": round(time.monotonic() - start_time, 2),
            }

    def log_status(self, stage: str, message: str):
        logger.info(f"stage={stage} msg={message}")
        pipeline_emitter.emit("status", {"stage": stage, "message": message})
