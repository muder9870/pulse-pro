import logging
from backend.processors.cleaner import Cleaner
from backend.processors.deduplicator import Deduplicator
from backend.processors.analyzer import ArticleAnalyzer
from backend.processors.scorer import score_all_articles
from backend.processors.decision_engine import decision_engine
from backend.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger("processor")

def process():
    init_db()
    
    log.info("--- Cleaning ---")
    cleaner = Cleaner()
    updated = cleaner.clean_all_articles()
    log.info(f"Cleaned {updated} articles")

    log.info("--- Deduplicating ---")
    dedup = Deduplicator()
    marked = dedup.deduplicate_articles()
    log.info(f"Marked {marked} duplicates")

    log.info("--- Analyzing (Wait...) ---")
    analyzer = ArticleAnalyzer()
    processed = analyzer.analyze_all_articles(limit=5) # Limit small for quick test
    log.info(f"Analyzed {processed} articles")

    log.info("--- Scoring ---")
    scored = score_all_articles()
    log.info(f"Scored {scored} articles")

    log.info("--- Decision Engine ---")
    prioritized = decision_engine.process_all_priorities()
    log.info(f"Prioritized {prioritized} articles")

if __name__ == "__main__":
    process()
