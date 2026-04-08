import sys
import os
import logging
from datetime import datetime, timezone, timedelta

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle
from backend.processors.decision_engine import decision_engine
from backend.generators.generator_v5 import ContentGenerator

def setup_test_data():
    with get_session() as session:
        now_ts = datetime.now(timezone.utc).timestamp()
        
        # 1. Insert a HIGH priority candidate (arXiv, fresh, high scores)
        raw_high = RawArticle(
            title="Breakthrough in Quantum Neural Networks",
            url=f"https://arxiv.org/abs/test_{now_ts}",
            source="arxiv",
            category="cs.AI",
            raw_content="Full paper content about breakthrough...",
            fetched_at=datetime.now(timezone.utc)
        )
        session.add(raw_high)
        session.flush()  # Get the ID
        
        proc_high = ProcessedArticle(
            raw_article_id=raw_high.id,
            summary="A major breakthrough in QNNs.",
            viral_score=80,
            tech_score=90,
            relevance_score=85,
            category="LLM"
        )
        session.add(proc_high)
        session.flush()
        pid_high = proc_high.id

        # 2. Insert a MEDIUM priority candidate (GitHub, old, decent scores)
        raw_med = RawArticle(
            title="Useful Utility for React",
            url=f"https://github.com/user/repo_{now_ts}",
            source="github",
            category="General",
            raw_content="A small helper library.",
            fetched_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        session.add(raw_med)
        session.flush()
        
        proc_med = ProcessedArticle(
            raw_article_id=raw_med.id,
            summary="A useful utility.",
            viral_score=60,
            tech_score=50,
            relevance_score=40,
            category="Other"
        )
        session.add(proc_med)
        session.flush()
        pid_med = proc_med.id
        
        session.commit()
    return pid_high, pid_med

def verify_refactor():
    print("--- Starting Decision Engine Verification ---")
    
    # Setup
    pid_high, pid_med = setup_test_data()
    print(f"Test data setup complete. High ID: {pid_high}, Med ID: {pid_med}")

    # 1. Test Priority Classification
    print("\nTesting Priority Classification...")
    updated = decision_engine.process_all_priorities()
    print(f"Processed priorities for {updated} articles.")
    
    with get_session() as session:
        high_article = session.query(ProcessedArticle).filter(
            ProcessedArticle.id == pid_high
        ).first()
        high_res = (high_article.priority, high_article.priority_score, high_article.priority_reason) if high_article else None
        print(f"High Candidate Result: {high_res}")
        
        med_article = session.query(ProcessedArticle).filter(
            ProcessedArticle.id == pid_med
        ).first()
        med_res = (med_article.priority, med_article.priority_score, med_article.priority_reason) if med_article else None
        print(f"Med Candidate Result: {med_res}")

    # 2. Test Generation Filter
    print("\nTesting Generation Filter (Limit 1 HIGH)...")
    gen = ContentGenerator()
    results = gen.generate_for_priority(priority_filter='HIGH', limit=1, platforms=['twitter'])
    print(f"Generated content for {len(results)} articles. Expected: 1.")
    
    # 3. Test Daily Summary
    print("\nTesting Daily Intelligence Summary...")
    summary = decision_engine.generate_daily_summary()
    print(summary)
    
    print("\n--- Verification Finished ---")

if __name__ == "__main__":
    verify_refactor()
