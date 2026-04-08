from backend.agents.base_agent import BaseAgent
from backend.processors.cleaner import Cleaner
from backend.processors.deduplicator import Deduplicator
from backend.processors.analyzer import ArticleAnalyzer, wait_for_raw_analysis_complete
from backend.processors.scorer import score_all_articles
from backend.processors.decision_engine import decision_engine
from backend.generators.tag_generator import generate_tags_for_article
from os import getenv

class AnalysisAgent(BaseAgent):
    def __init__(self, db):
        super().__init__("AnalysisAgent", db)
        self.cleaner = Cleaner()
        self.deduplicator = Deduplicator()
        self.analyzer = ArticleAnalyzer()

    def run(self, limit: int = None):
        limit = limit or int(getenv("ANALYSIS_LIMIT", "3"))
        self.log(f"Starting analysis (Limit: {limit})")
        
        # 1. Clean
        cleaned = self.cleaner.clean_all_articles()
        self.log(f"Cleaned {cleaned} articles")
        
        # 2. Dedup
        deduped = self.deduplicator.deduplicate_articles()
        self.log(f"Deduplicated {deduped} articles")
        
        # 3. Enqueue Celery analysis, then wait so DB has state=analyzed before scoring
        processed, raw_ids = self.analyzer.analyze_all_articles(limit=limit)
        self.log(f"Enqueued {processed} articles for analysis")
        skip_wait = getenv("ANALYSIS_SKIP_WAIT", "").lower() in {"1", "true", "yes"}
        if raw_ids and not skip_wait:
            wait_for_raw_analysis_complete(raw_ids)
        elif skip_wait and raw_ids:
            self.log("Skipping post-enqueue analysis wait (ANALYSIS_SKIP_WAIT)")

        # 4. Score & Priority (requires analyzed + ProcessedArticle rows)
        scored = score_all_articles()
        prioritized = decision_engine.process_all_priorities()
        self.log(f"Scored {scored} and prioritized {prioritized} articles")
        
        return {
            "cleaned": cleaned,
            "deduped": deduped,
            "processed": processed,
            "scored": scored
        }
