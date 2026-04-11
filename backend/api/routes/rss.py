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

@rss_bp.patch("/api/rss/feeds/<int:feed_id>")
def rss_feed_toggle(feed_id):
    """Toggle a feed's active status."""
    from backend.db.session import SessionLocal
    from backend.db.models import RSSFeed
    db = SessionLocal()
    try:
        feed = db.query(RSSFeed).filter(RSSFeed.id == feed_id).first()
        if not feed:
            return jsonify({"error": "Feed not found"}), 404
        payload = request.json or {}
        if "active" in payload:
            feed.active = bool(payload["active"])
        else:
            feed.active = not feed.active
        db.commit()
        return jsonify({"status": "success", "feed_id": feed_id, "active": feed.active}), 200
    finally:
        db.close()

@rss_bp.post("/api/rss/add-defaults")
def rss_add_defaults():
    """Add the built-in set of default AI/ML RSS feeds."""
    from backend.fetchers.rss_fetcher import RSSFetcher
    fetcher = RSSFetcher()
    result = fetcher.add_default_feeds()
    total_new = result.get("added", 0)
    failed = result.get("failed", 0)
    return jsonify({
        "status": "success",
        "added": total_new,
        "failed": failed,
        "failures": result.get("failures", []),
    }), 200

@rss_bp.post("/api/rss/import-opml")
def rss_import_opml():
    """Import RSS feeds from an OPML XML string."""
    import xml.etree.ElementTree as ET
    from backend.fetchers.rss_fetcher import RSSFetcher

    payload = request.json or {}
    opml_content = payload.get("opml_content", "")
    if not opml_content:
        return jsonify({"error": "opml_content is required"}), 400

    try:
        root = ET.fromstring(opml_content)
    except ET.ParseError as e:
        return jsonify({"error": f"Invalid OPML XML: {e}"}), 400

    feeds_to_add = []
    for outline in root.iter("outline"):
        url = outline.get("xmlUrl") or outline.get("url")
        if url:
            feeds_to_add.append({
                "url": url.strip(),
                "category": outline.get("category", "AI/ML"),
            })

    if not feeds_to_add:
        return jsonify({"error": "No feed URLs found in OPML"}), 400

    fetcher = RSSFetcher()
    added = 0
    for feed in feeds_to_add:
        try:
            fetcher.add_feed(feed["url"], feed["category"])
            added += 1
        except Exception:
            pass

    return jsonify({"status": "success", "added": added, "total": len(feeds_to_add)}), 200
