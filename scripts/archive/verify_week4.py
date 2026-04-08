import logging
import os
from backend.processors.analyzer import ArticleAnalyzer
from backend.database import engine, get_session
from backend.models import Base, RawArticle, ProcessedArticle
from sqlalchemy import text

def test_validation():
    # Force SQLite for local verification test if not already set
    if "DATABASE_URL" not in os.environ:
        os.environ["DATABASE_URL"] = "sqlite:///./verify_test.db"
    
    logging.basicConfig(level=logging.INFO)
    print("--- Week 4: Phase A (Validation) & SQLAlchemy Verification ---")
    print(f"Using DB: {os.environ.get('DATABASE_URL')}")
    
    # 1. Create tables using SQLAlchemy
    Base.metadata.create_all(engine)
    
    # 2. Mock an article
    with get_session() as session:
        exists = session.query(RawArticle).filter_by(url="http://test-pydantic.com").first()
        if not exists:
            new_art = RawArticle(
                title="Pydantic Test Article", 
                url="http://test-pydantic.com", 
                source="test", 
                state="deduped"
            )
            session.add(new_art)
            session.commit()
            row_id = new_art.id
        else:
            row_id = exists.id
            # Reset state for re-test
            exists.state = "deduped"
            session.commit()

    # 3. Run Analyzer
    analyzer = ArticleAnalyzer()
    print(f"Analyzing article {row_id}...")
    try:
        analyzer.analyze_all_articles()
    except Exception as e:
        print(f"Analysis failed (likely LLM connectivity): {e}")

    # 4. Check results in DB
    with get_session() as session:
        res = session.query(ProcessedArticle).filter_by(raw_article_id=row_id).first()
        if res:
            print("DB Entry Found (SQLAlchemy):")
            print(f"  Summary: {res.summary[:50]}...")
            print(f"  llm_raw_output: {str(res.llm_raw_output)[:50]}...")
            print(f"  llm_validation_error: {res.llm_validation_error}")
            print(f"  llm_fallback: {res.llm_fallback}")
        else:
            print("No processed article found in SQLAlchemy model.")

if __name__ == "__main__":
    test_validation()
