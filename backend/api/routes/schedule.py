from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository
from backend.db.repositories.article_repository import ArticleRepository
from backend.db.models import ScheduledPost
from backend.api.limiter import limiter
from backend.api.schemas import ScheduleQueueRequest, validate_request
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
schedule_bp = Blueprint('schedule', __name__)

@schedule_bp.get("/api/schedule/list")
def get_schedule_list():
    """Get list of scheduled posts."""
    db = SessionLocal()
    try:
        from backend.db.models import ProcessedArticle, RawArticle
        posts = db.query(ScheduledPost).order_by(ScheduledPost.scheduled_time.asc()).limit(50).all()
        
        schedule_list = []
        for post in posts:
            # Join to get article title via ProcessedArticle → RawArticle
            article_title = f"Article #{post.article_id}"
            try:
                processed = db.query(ProcessedArticle).filter(ProcessedArticle.id == post.article_id).first()
                if processed:
                    raw = db.query(RawArticle).filter(RawArticle.id == processed.raw_article_id).first()
                    if raw and raw.title:
                        article_title = raw.title
            except Exception:
                pass

            schedule_list.append({
                "id": post.id,
                "article_id": post.article_id,
                "article_title": article_title,
                "platform": post.platform,
                "status": post.status,
                "scheduled_time": post.scheduled_time.isoformat() if post.scheduled_time else None,
                "error_message": getattr(post, 'error_message', None),
            })
        
        return jsonify({"posts": schedule_list}), 200
        
    except Exception as e:
        logger.exception("Failed to list scheduled posts")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@schedule_bp.delete("/api/schedule/<int:post_id>")
def delete_scheduled_post(post_id):
    """Delete a scheduled post entry only — does NOT delete the article or generated content."""
    db = SessionLocal()
    try:
        post = db.query(ScheduledPost).filter(ScheduledPost.id == post_id).first()
        if not post:
            return jsonify({"error": f"Scheduled post {post_id} not found"}), 404
        db.delete(post)
        db.commit()
        return jsonify({"status": "deleted", "id": post_id}), 200
    except Exception as e:
        db.rollback()
        logger.exception("Failed to delete scheduled post")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
@schedule_bp.post("/api/schedule/queue")
@limiter.limit("20 per minute")
def queue_scheduled_post():
    """Queue an article for publishing on a specific platform at a scheduled time.
    ---
    tags:
      - Schedule
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [article_id, platform, scheduled_time]
          properties:
            article_id:
              type: integer
            platform:
              type: string
              example: twitter
            scheduled_time:
              type: string
              format: date-time
              example: "2026-04-10T11:00:00Z"
    responses:
      201:
        description: Post queued successfully
      404:
        description: Article not found or not processed
      422:
        description: Validation error
    """
    obj, err = validate_request(ScheduleQueueRequest, request.json or {})
    if err:
        body, status = err
        return jsonify(body), status

    db = SessionLocal()
    try:
        # Resolve raw article id → processed article id
        a_repo = ArticleRepository(db)
        processed_id = a_repo.ensure_processed_id(obj.article_id)
        if not processed_id:
            return jsonify({"error": f"Article {obj.article_id} not found or not yet processed"}), 404

        # scheduled_time is already a datetime object (parsed by Pydantic)
        scheduled_dt = obj.scheduled_time

        post = ScheduledPost(
            article_id=processed_id,
            platform=obj.platform,
            scheduled_time=scheduled_dt,
            status="pending",
        )
        db.add(post)
        db.commit()
        db.refresh(post)

        return jsonify({
            "status": "queued",
            "id": post.id,
            "article_id": obj.article_id,
            "platform": obj.platform,
            "scheduled_time": scheduled_dt.isoformat(),
        }), 201

    except Exception as e:
        db.rollback()
        logger.exception("Failed to queue scheduled post")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
