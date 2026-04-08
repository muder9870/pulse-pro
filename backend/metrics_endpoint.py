"""Add metrics endpoint to main.py"""

# Add this endpoint after the health endpoint in main.py

@app.get("/api/metrics")
def metrics():
    """Performance metrics endpoint."""
    from backend.cache_manager import get_cache
    from backend.llm_cache import get_cache_stats as get_llm_stats
    import time
    
    # Cache statistics
    cache = get_cache()
    cache_stats = cache.stats()
    
    # LLM cache statistics
    try:
        llm_stats = get_llm_stats()
    except Exception:
        llm_stats = {"error": "LLM cache not initialized"}
    
    # Pipeline statistics
    with pipeline_lock:
        pipeline_stats = {
            "running": pipeline_state["running"],
            "last_started_at": pipeline_state["last_started_at"],
            "last_finished_at": pipeline_state["last_finished_at"],
            "last_error": pipeline_state["last_error"]
        }
    
    # Database statistics
    try:
        from backend.db.session import SessionLocal
        from backend.models import RawArticle, ProcessedArticle, GeneratedContent
        from sqlalchemy import func
        
        db = SessionLocal()
        try:
            total_articles = db.query(func.count(RawArticle.id)).scalar()
            processed_articles = db.query(func.count(ProcessedArticle.id)).scalar()
            generated_content = db.query(func.count(GeneratedContent.id)).scalar()
            
            db_stats = {
                "total_articles": total_articles,
                "processed_articles": processed_articles,
                "generated_content": generated_content
            }
        finally:
            db.close()
    except Exception as e:
        db_stats = {"error": str(e)}
    
    return jsonify({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache": cache_stats,
        "llm_cache": llm_stats,
        "pipeline": pipeline_stats,
        "database": db_stats
    }), 200
