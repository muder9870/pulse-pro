from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from backend.config import settings
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(fail_max=3, reset_timeout=60)

engine = create_engine(
    settings.DATABASE_URL, 
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@breaker
def get_session():
    return SessionLocal()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db(drop_all: bool = False) -> None:
    import time
    import logging
    from backend.db.models import Base

    retries = 10
    for attempt in range(retries):
        try:
            if drop_all:
                Base.metadata.drop_all(bind=engine)
            Base.metadata.create_all(bind=engine)
            return
        except Exception as e:
            if attempt < retries - 1:
                logging.warning(f"DB not ready (attempt {attempt + 1}/{retries}): {e}. Retrying in 3s...")
                time.sleep(3)
            else:
                raise

def set_posted_status(article_id: int, platform: str, posted: int = 1):
    """Set the posted status for generated content."""
    from backend.models import GeneratedContent
    with get_session() as session:
        content = session.query(GeneratedContent).filter(
            GeneratedContent.article_id == article_id,
            GeneratedContent.platform == platform
        ).first()
        if content:
            content.posted = posted
            session.commit()

def save_paper_analysis(article_id: int, data: dict):
    """Save deep analysis results for a research paper."""
    from backend.db.models import PaperAnalysis
    import json
    
    with get_session() as session:
        # Check if analysis already exists
        analysis = session.query(PaperAnalysis).filter(PaperAnalysis.article_id == article_id).first()
        
        authors = data.get("authors", [])
        if isinstance(authors, list):
            authors_str = ", ".join(authors)
        else:
            authors_str = str(authors)
            
        if not analysis:
            analysis = PaperAnalysis(
                article_id=article_id,
                methodology=data.get("methodology"),
                limitations=data.get("limitations"),
                results=data.get("results"),
                citations_count=data.get("citations_count", 0),
                authors=authors_str,
                affiliations=data.get("affiliations")
            )
            session.add(analysis)
        else:
            analysis.methodology = data.get("methodology")
            analysis.limitations = data.get("limitations")
            analysis.results = data.get("results")
            analysis.citations_count = data.get("citations_count", 0)
            analysis.authors = authors_str
            analysis.affiliations = data.get("affiliations")
            analysis.analyzed_at = func.now() if hasattr(analysis, 'analyzed_at') else None
            
        session.commit()

def get_db_health():
    """Check database health by attempting a simple query."""
    try:
        with get_session() as session:
            session.execute(func.now())  # Simple query to test connection
        return True
    except Exception as e:
        logging.error(f"Database health check failed: {e}")
        return False
