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
        repo = SystemRepository(db)
        scheduled_posts = repo.list_scheduled_posts()
        
        # Transform to frontend format
        schedule_list = []
        for post in scheduled_posts:
            schedule_list.append({
                "id": post.id,
                "title": post.title or "Untitled",
                "platform": post.platform,
                "status": post.status,
                "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
                "created_at": post.created_at.isoformat() if post.created_at else None
            })
        
        return jsonify(schedule_list), 200
        
    except Exception as e:
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
