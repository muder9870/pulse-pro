from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from backend.db.session import SessionLocal
from backend.db.repositories.keyword_repository import KeywordRepository

keywords_bp = Blueprint('keywords', __name__)


def _keyword_to_dict(kw) -> dict:
    return {
        "id": kw.id,
        "keyword": kw.keyword,
        "category": kw.category,
        "created_at": kw.created_at.isoformat() if kw.created_at else None,
        "updated_at": kw.updated_at.isoformat() if kw.updated_at else None,
    }


@keywords_bp.get("/api/keywords")
def list_keywords():
    db = SessionLocal()
    try:
        repo = KeywordRepository(db)
        keywords = repo.get_all()
        return jsonify([_keyword_to_dict(kw) for kw in keywords]), 200
    finally:
        db.close()


@keywords_bp.post("/api/keywords/bulk")
def bulk_add_keywords():
    db = SessionLocal()
    try:
        payload = request.json or {}
        keywords = payload.get("keywords", [])
        category = payload.get("category", None)
        repo = KeywordRepository(db)
        result = repo.bulk_add(keywords, category=category)
        return jsonify(result), 200
    finally:
        db.close()


@keywords_bp.post("/api/keywords")
def add_keyword():
    db = SessionLocal()
    try:
        payload = request.json or {}
        keyword = payload.get("keyword", "").strip()
        category = payload.get("category", None)
        repo = KeywordRepository(db)
        kw = repo.add(keyword, category)
        return jsonify(_keyword_to_dict(kw)), 201
    except IntegrityError:
        return jsonify({"error": "Keyword already exists"}), 409
    finally:
        db.close()


@keywords_bp.delete("/api/keywords/<int:keyword_id>")
def delete_keyword(keyword_id: int):
    db = SessionLocal()
    try:
        repo = KeywordRepository(db)
        deleted = repo.delete(keyword_id)
        if not deleted:
            return jsonify({"error": "Keyword not found"}), 404
        return "", 204
    finally:
        db.close()
