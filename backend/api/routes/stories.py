from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.api.limiter import limiter
from sqlalchemy import func
from backend.db.models import RawArticle

stories_bp = Blueprint("stories_v2", __name__, url_prefix="/api/stories")


@stories_bp.route("/<int:article_id>/pipeline", methods=["PATCH"])
@limiter.limit("120 per minute")
def patch_story_pipeline(article_id: int):
    """Update pipeline workflow flags for a story (raw article id). Body: optional review_status, content_approved, needs_review, ready_to_schedule."""
    db = SessionLocal()
    try:
        body = request.get_json(silent=True) or {}
        repo = ArticleRepository(db)
        try:
            updated = repo.update_pipeline_state(
                article_id,
                review_status=body.get("review_status"),
                content_approved=body.get("content_approved"),
                needs_review=body.get("needs_review"),
                ready_to_schedule=body.get("ready_to_schedule"),
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        if updated is None:
            return jsonify({"error": "Story not found or not analyzed yet"}), 404
        return jsonify(updated), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@stories_bp.route("/sources")
def get_sources():
    """Get unique sources from raw_articles with counts."""
    db = SessionLocal()
    try:
        sources = db.query(
            RawArticle.source, 
            func.count(RawArticle.id)
        ).filter(RawArticle.source != None).group_by(RawArticle.source).all()
        
        # Return list of dicts with name and count
        source_list = [{"name": s[0], "count": s[1]} for s in sources]
        return jsonify(source_list)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@stories_bp.route("/", strict_slashes=False)
@limiter.limit("60 per minute")
def get_stories():
    """Fetch analyzed articles with pagination and filtering.
    ---
    tags:
      - Stories
    parameters:
      - name: limit
        in: query
        type: integer
        default: 20
        description: Number of stories per page (max 100)
      - name: page
        in: query
        type: integer
        default: 1
        description: Page number (1-indexed)
      - name: sort
        in: query
        type: string
        default: score
        description: Sort order (score or category)
      - name: source
        in: query
        type: string
        description: Filter by source name
    responses:
      200:
        description: Array of story objects
    """
    db = SessionLocal()
    try:
        limit_raw     = request.args.get("limit", "20")
        page          = max(int(request.args.get("page", "1") or "1"), 1)
        source_filter = request.args.get("source")
        sort          = request.args.get("sort", "score")
        state_filter  = request.args.get("state")

        # Hard cap — never allow unlimited dumps to the frontend.
        # The old `limit=all` path was causing 1MB+ responses on every poll.
        MAX_LIMIT = 100
        if limit_raw == "all":
            limit = MAX_LIMIT
        else:
            try:
                limit = min(int(limit_raw), MAX_LIMIT)
            except (ValueError, TypeError):
                limit = 20

        offset = (page - 1) * limit

        repo   = ArticleRepository(db)
        result = repo.get_top_stories(
            limit=limit, offset=offset, sort=sort, source=source_filter, state=state_filter
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
