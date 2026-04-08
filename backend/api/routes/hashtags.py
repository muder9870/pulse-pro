from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.processors.hashtag_recommender import HashtagRecommender

hashtags_bp = Blueprint('hashtags', __name__)

@hashtags_bp.get("/api/tags/<int:article_id>")
def get_tags(article_id: int):
    db = SessionLocal()
    try:
        repo = ArticleRepository(db)
        tags = repo.get_tags(article_id)
        return jsonify({"tags": tags, "hashtags": [repo.tag_to_hashtag(t) for t in tags]}), 200
    finally:
        db.close()

@hashtags_bp.post("/api/tags/<int:article_id>")
def set_tags(article_id: int):
    db = SessionLocal()
    try:
        repo = ArticleRepository(db)
        payload = request.json or {}
        tags = payload.get("tags", [])
        saved = repo.set_tags(article_id, tags)
        return jsonify({"status": "success", "tags": saved}), 200
    finally:
        db.close()

@hashtags_bp.get("/api/hashtags/<int:article_id>/<platform>")
def hashtags_for_article(article_id: int, platform: str):
    limit = request.args.get('limit', default=5, type=int)
    recs = HashtagRecommender().recommend(article_id, platform, limit=limit)
    return jsonify({
        "article_id": article_id,
        "platform": platform,
        "hashtags": [{"hashtag": r.hashtag, "final_score": r.final_score} for r in recs]
    }), 200
