"""
LLM Response Cache with persistent storage.

Caches LLM responses to reduce redundant API calls and improve performance.
Uses SQLite for persistent storage and SHA256 hashing for prompt matching.
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from backend.db.session import SessionLocal
from backend.config import settings
from sqlalchemy import text

log = logging.getLogger("llm_cache")


def init_llm_cache_table():
    """Create LLM cache table if it doesn't exist."""
    # Table is managed by Alembic migrations - no need to create
    pass


def hash_prompt(prompt: str, model: str = "") -> str:
    """
    Generate hash for prompt + model combination.
    
    Args:
        prompt: LLM prompt text
        model: Model name
        
    Returns:
        SHA256 hash (first 32 chars)
    """
    combined = f"{model}:{prompt}"
    return hashlib.sha256(combined.encode()).hexdigest()[:32]


def get_cached_response(prompt: str, model: str = "") -> str | None:
    """
    Get cached LLM response if available.
    
    Args:
        prompt: LLM prompt text
        model: Model name
        
    Returns:
        Cached response or None if not found
    """
    init_llm_cache_table()
    
    prompt_hash = hash_prompt(prompt, model)
    
    db = SessionLocal()
    try:
        result = db.execute(
            text("SELECT response, hit_count FROM llm_cache WHERE prompt_hash = :hash"),
            {"hash": prompt_hash}
        ).first()
        
        if result:
            response, hit_count = result
            
            # Update hit count and last accessed time
            db.execute(
                text("UPDATE llm_cache SET hit_count = :count, last_accessed_at = CURRENT_TIMESTAMP WHERE prompt_hash = :hash"),
                {"count": hit_count + 1, "hash": prompt_hash}
            )
            db.commit()
            
            log.info(f"LLM cache hit (hits={hit_count + 1}): {prompt[:50]}...")
            return response
        
        log.debug(f"LLM cache miss: {prompt[:50]}...")
        return None
    finally:
        db.close()


def cache_llm_response(prompt: str, response: str, model: str = ""):
    """
    Cache LLM response for future use.
    
    Args:
        prompt: LLM prompt text
        response: LLM response text
        model: Model name
    """
    init_llm_cache_table()
    
    prompt_hash = hash_prompt(prompt, model)
    
    db = SessionLocal()
    try:
        # PostgreSQL upsert
        db.execute(
            text("""
                INSERT INTO llm_cache (prompt_hash, prompt, response, model, hit_count, created_at, last_accessed_at)
                VALUES (:hash, :prompt, :response, :model, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (prompt_hash) DO UPDATE SET
                    prompt = EXCLUDED.prompt,
                    response = EXCLUDED.response,
                    model = EXCLUDED.model,
                    last_accessed_at = CURRENT_TIMESTAMP
            """),
            {"hash": prompt_hash, "prompt": prompt, "response": response, "model": model}
        )
        db.commit()
    finally:
        db.close()
    
    log.debug(f"LLM response cached: {prompt[:50]}...")


def cleanup_old_cache(days: int = 30):
    """
    Remove cache entries not accessed in specified days.
    
    Args:
        days: Number of days of inactivity before cleanup
        
    Returns:
        Number of entries removed
    """
    init_llm_cache_table()
    
    db = SessionLocal()
    try:
        result = db.execute(
            text("DELETE FROM llm_cache WHERE last_accessed_at < (NOW() - (:days || ' days')::interval)"),
            {"days": str(days)}
        )
        deleted = result.rowcount
        db.commit()
    finally:
        db.close()
    
    if deleted > 0:
        log.info(f"Cleaned up {deleted} old LLM cache entries")
    
    return deleted


def get_cache_stats() -> dict:
    """
    Get LLM cache statistics.
    
    Returns:
        Dictionary with cache stats
    """
    init_llm_cache_table()
    
    db = SessionLocal()
    try:
        # Total entries
        total_entries = db.execute(text("SELECT COUNT(*) FROM llm_cache")).scalar()
        
        # Total hits
        total_hits = db.execute(text("SELECT SUM(hit_count) FROM llm_cache")).scalar() or 0
        
        # Most used prompts
        top_results = db.execute(text("""
            SELECT prompt, hit_count, model
            FROM llm_cache 
            ORDER BY hit_count DESC 
            LIMIT 5
        """)).fetchall()
        
        top_prompts = [
            {
                "prompt": row[0][:100] + "..." if len(row[0]) > 100 else row[0],
                "hits": row[1],
                "model": row[2]
            }
            for row in top_results
        ]
        
        return {
            "total_entries": total_entries,
            "total_hits": total_hits,
            "top_prompts": top_prompts
        }
    finally:
        db.close()


def clear_llm_cache():
    """Clear all LLM cache entries."""
    init_llm_cache_table()
    
    db = SessionLocal()
    try:
        result = db.execute(text("DELETE FROM llm_cache"))
        deleted = result.rowcount
        db.commit()
    finally:
        db.close()
    
    log.info(f"Cleared {deleted} LLM cache entries")
    return deleted
