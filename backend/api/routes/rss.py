from flask import Blueprint, jsonify, request
from datetime import datetime, timezone

rss_bp = Blueprint('rss', __name__)

@rss_bp.get("/api/rss/feeds")
def rss_feeds_list():
    from backend.fetchers.rss_fetcher import RSSFetcher
    fetcher = RSSFetcher()
    return jsonify({"status": "success", "feeds": fetcher.get_feed_stats()}), 200

@rss_bp.post("/api/rss/feeds")
def rss_feeds_add():
    from backend.fetchers.rss_fetcher import RSSFetcher
    payload = request.json or {}
    url = payload.get("url", "").strip()
    category = payload.get("category", "AI/ML").strip()
    if not url: return jsonify({"error": "URL required"}), 400
    fetcher = RSSFetcher()
    feed_id = fetcher.add_feed(url, category)
    return jsonify({"status": "success", "feed_id": feed_id}), 200

@rss_bp.post("/api/rss/fetch-all")
def rss_fetch_all():
    from backend.fetchers.rss_fetcher import RSSFetcher
    fetcher = RSSFetcher()
    results = fetcher.fetch_all_feeds(max_items_per_feed=20)
    return jsonify({"status": "success", "results": results}), 200

@rss_bp.post("/api/rss/health-check")
def rss_health_check():
    """Check all active feeds for dead links and deactivate failing ones."""
    from backend.fetchers.rss_fetcher import RSSFetcher
    fetcher = RSSFetcher()
    result = fetcher.health_check_feeds()
    return jsonify({"status": "success", **result}), 200

@rss_bp.post("/api/rss/discover")
def rss_discover():
    """Discover and add new AI/ML RSS feeds."""
    from backend.fetchers.rss_fetcher import RSSFetcher
    payload = request.json or {}
    max_new = int(payload.get("max_new", 10))
    fetcher = RSSFetcher()
    result = fetcher.discover_new_feeds(max_new=max_new)
    return jsonify({"status": "success", **result}), 200

@rss_bp.delete("/api/rss/feeds/<int:feed_id>")
def rss_feed_delete(feed_id):
    """Permanently delete an RSS feed."""
    from backend.db.session import SessionLocal
    from backend.db.models import RSSFeed, RSSFeedItem
    db = SessionLocal()
    try:
        db.query(RSSFeedItem).filter(RSSFeedItem.feed_id == feed_id).delete()
        deleted = db.query(RSSFeed).filter(RSSFeed.id == feed_id).delete()
        db.commit()
        if deleted:
            return jsonify({"status": "success", "deleted": feed_id}), 200
        return jsonify({"error": "Feed not found"}), 404
    finally:
        db.close()
