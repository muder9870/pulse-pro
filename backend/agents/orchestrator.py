from backend.agents.ingestion_agent import IngestionAgent
from backend.agents.analysis_agent import AnalysisAgent
from backend.agents.creative_agent import CreativeAgent
from backend.utils.event_emitter import pipeline_emitter
from backend.processors.decision_engine import decision_engine
from backend.schedulers.content_scheduler import ContentScheduler
import logging
import os
import time

logger = logging.getLogger(__name__)

class MultiAgentOrchestrator:
    def __init__(self, db):
        self.db = db
        self.ingestion = IngestionAgent(db)
        self.analysis = AnalysisAgent(db)
        self.creative = CreativeAgent(db)

    def run_full_pipeline(self, sources: list[str] = None):
        start_time = time.monotonic()
        self.log_status("start", "Multi-Agent Pipeline starting...")
        
        try:
            # 1. Ingestion
            self.log_status("fetch", "Agents fetching content from sources...")
            ingestion_results = self.ingestion.run(sources=sources)
            
            # 2. Analysis & Scoring
            self.log_status("analyze", "Agents analyzing and scoring articles...")
            analysis_results = self.analysis.run()

            # 2.1 Generate content from prioritized articles
            gen_limit_env = os.getenv("GENERATION_TOP_N")
            gen_limit = int(gen_limit_env) if gen_limit_env and str(gen_limit_env).strip() else int(os.getenv("CONTENT_TOP_LIMIT", "10"))
            self.log_status("generate", f"Generating content for top {gen_limit} articles...")
            from backend.generators.generator_v5 import ContentGenerator
            platforms_env = os.getenv("CONTENT_PLATFORMS", "")
            platforms = [p.strip() for p in platforms_env.split(",") if p.strip()] or None
            gen_results = ContentGenerator().generate_for_top_articles(limit=gen_limit, platforms=platforms)
            generated_article_ids = sorted(gen_results.keys())
            if str(os.getenv("DEBUG_PIPELINE", "")).lower() in {"1", "true", "yes"}:
                logger.info("content_generation article_ids=%s", generated_article_ids)

            # 2.2 Schedule generated content.
            # Without this step, ScheduledPost rows are never created and
            # the scheduler's process_queue() permanently logs
            # "No posts ready for publishing".
            if generated_article_ids:
                self.log_status("schedule", f"Scheduling {len(generated_article_ids)} generated articles...")
                content_scheduler = ContentScheduler()
                schedule_platforms = platforms or ["twitter", "linkedin"]
                total_scheduled = 0
                for art_id in generated_article_ids:
                    try:
                        ids = content_scheduler.schedule_content(art_id, schedule_platforms)
                        total_scheduled += len(ids)
                    except Exception as sched_err:
                        logger.warning(
                            "schedule_content_failed article_id=%s error=%s",
                            art_id, sched_err
                        )
                logger.info("scheduling_done total_scheduled=%d", total_scheduled)

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
                "summary": summary
            }
        except Exception as e:
            logger.error(f"Pipeline Orchestrator error: {e}")
            self.log_status("error", f"Pipeline failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def log_status(self, stage: str, message: str):
        logger.info(f"stage={stage} msg={message}")
        pipeline_emitter.emit("status", {"stage": stage, "message": message})
