# backend/redis_keys.py
# Single source of truth for all Redis key formats.
# Import this function everywhere a Redis key for article state is constructed.

def get_article_status_key(article_id: int) -> str:
    """
    Returns the canonical Redis key for an article's current status.
    Change this function to update the key format system-wide.
    """
    return f"article:status:{article_id}"
