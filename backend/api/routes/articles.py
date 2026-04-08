"""
/api/articles — Article management endpoints.
"""
from __future__ import annotations
import logging
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, field_validator
from backend.db.session import SessionLocal
from backend.db.models import (
    RawArticle, ProcessedArticle, GeneratedContent,
    ArticleTag, ArticleImage, ArticleAudio, ScheduledPost,
    BlogPost, PaperAnalysis, ContentHistory, ContentHashtag,
    UserFeedback, VideoScript
)
from backend.api.limiter import limiter

logger = logging.getLogger(__name__)
articles_bp = Blueprint("articles", __name__)


class BulkDeleteRequest(BaseModel):
    article_ids: list[int]

    @field_validator("article_ids")
    @classmethod
    def ids_not_empty(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("article_ids must contain at least one id")
        if any(i <= 0 for i in v):
            raise ValueError("all article_ids must be positive integers")
        return v


def _validate(schema_class, data: dict):
    from flask import jsonify
    try:
        return schema_class.model_validate(data), None
    except Exception as exc:
        errors = []
        if hasattr(exc, "errors"):
            for e in exc.errors():
                field = ".".join(str(x) for x in e.get("loc", []))
                errors.append({"field": field, "message": e.get("msg", str(e))})
        else:
            errors.append({"field": "body", "message": str(exc)})
        return None, (jsonify({"error": "Validation failed", "details": errors}), 422)


@articles_bp.post("/api/articles/bulk-delete")
@limiter.limit("10 per minute")
def bulk_delete_articles():
    """Delete multiple articles by raw article ID.

    Cascades through all related tables:
    processed_articles → generated_content, article_tags, article_images,
    article_audio, scheduled_posts, blog_posts, paper_analysis,
    content_history, content_hashtags, user_feedback, video_scripts

    Body: { "article_ids": [int, ...] }
    """
    obj, err = _validate(BulkDeleteRequest, request.json or {})
    if err:
        return err

    db = SessionLocal()
    try:
        raw_ids = obj.article_ids

        # Resolve raw_article_id → processed_article_id for cascade deletes
        processed_rows = (
            db.query(ProcessedArticle.id)
            .filter(ProcessedArticle.raw_article_id.in_(raw_ids))
            .all()
        )
        processed_ids = [r.id for r in processed_rows]

        if processed_ids:
            # Delete all child records of processed_articles
            db.query(GeneratedContent).filter(GeneratedContent.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ArticleTag).filter(ArticleTag.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ArticleImage).filter(ArticleImage.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ArticleAudio).filter(ArticleAudio.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ScheduledPost).filter(ScheduledPost.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(PaperAnalysis).filter(PaperAnalysis.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ContentHistory).filter(ContentHistory.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(ContentHashtag).filter(ContentHashtag.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(UserFeedback).filter(UserFeedback.article_id.in_(processed_ids)).delete(synchronize_session=False)
            db.query(VideoScript).filter(VideoScript.article_id.in_(processed_ids)).delete(synchronize_session=False)

            # Delete blog_posts (has its own children: blog_publications)
            blog_ids = [r.id for r in db.query(BlogPost.id).filter(BlogPost.article_id.in_(processed_ids)).all()]
            if blog_ids:
                from backend.db.models import BlogPublication
                db.query(BlogPublication).filter(BlogPublication.blog_post_id.in_(blog_ids)).delete(synchronize_session=False)
                db.query(BlogPost).filter(BlogPost.id.in_(blog_ids)).delete(synchronize_session=False)

            # Delete processed_articles
            db.query(ProcessedArticle).filter(ProcessedArticle.id.in_(processed_ids)).delete(synchronize_session=False)

        # Delete raw_articles
        deleted = db.query(RawArticle).filter(RawArticle.id.in_(raw_ids)).delete(synchronize_session=False)
        db.commit()

        return jsonify({
            "status": "success",
            "deleted": deleted,
            "requested": len(raw_ids),
        }), 200

    except Exception as e:
        db.rollback()
        logger.exception("Bulk delete failed")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
