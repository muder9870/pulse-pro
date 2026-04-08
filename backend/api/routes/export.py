"""
/api/export — Content export endpoint.

Was returning 404 because no route existed.  The frontend "Export" button
calls this endpoint to download generated posts as JSON or CSV.

Supported query params:
  format   = json | csv          (default: json)
  platform = twitter | linkedin… (default: all platforms)
  limit    = 1-500               (default: 100)
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, make_response, request

from backend.db.session import SessionLocal
from backend.db.models import GeneratedContent, ProcessedArticle, RawArticle
from backend.api.limiter import limiter
from backend.api.schemas import ExportBatchRequest, validate_request

logger = logging.getLogger(__name__)

export_bp = Blueprint("export", __name__)

_MAX_EXPORT_LIMIT = 500


@export_bp.get("/api/export", strict_slashes=False)
def export_content():
    """Export generated content as JSON or CSV.

    Query params:
      format   — 'json' (default) or 'csv'
      platform — filter by platform name (optional)
      limit    — max rows to return, capped at 500 (default 100)
    """
    db = SessionLocal()
    try:
        fmt      = (request.args.get("format", "json") or "json").lower().strip()
        platform = (request.args.get("platform") or "").strip() or None
        try:
            limit = min(int(request.args.get("limit", "100") or "100"), _MAX_EXPORT_LIMIT)
        except (ValueError, TypeError):
            limit = 100

        # ── Build query ───────────────────────────────────────────────────
        query = (
            db.query(
                GeneratedContent.id,
                GeneratedContent.platform,
                GeneratedContent.content,
                GeneratedContent.char_count,
                GeneratedContent.generated_at,
                GeneratedContent.posted,
                GeneratedContent.posted_at,
                RawArticle.title,
                RawArticle.url,
                RawArticle.source,
            )
            .join(ProcessedArticle, GeneratedContent.article_id == ProcessedArticle.id)
            .join(RawArticle, ProcessedArticle.raw_article_id == RawArticle.id)
        )

        if platform:
            query = query.filter(GeneratedContent.platform.ilike(platform))

        rows = query.order_by(GeneratedContent.generated_at.desc()).limit(limit).all()

        # ── Serialise ─────────────────────────────────────────────────────
        records = [
            {
                "id":           r.id,
                "platform":     r.platform,
                "content":      r.content,
                "char_count":   r.char_count,
                "generated_at": r.generated_at.isoformat() if r.generated_at else None,
                "posted":       bool(r.posted),
                "posted_at":    r.posted_at.isoformat() if r.posted_at else None,
                "article_title": r.title,
                "article_url":   r.url,
                "source":        r.source,
            }
            for r in rows
        ]

        if fmt == "csv":
            output = io.StringIO()
            writer = csv.DictWriter(
                output,
                fieldnames=list(records[0].keys()) if records else [],
                extrasaction="ignore",
                lineterminator="\n",
            )
            writer.writeheader()
            writer.writerows(records)
            csv_data = output.getvalue()

            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            filename  = f"pulse_export_{timestamp}.csv"

            resp = make_response(csv_data, 200)
            resp.headers["Content-Type"]        = "text/csv; charset=utf-8"
            resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
            resp.headers["Cache-Control"]        = "no-store"
            return resp

        # Default: JSON
        resp = make_response(
            jsonify({
                "status":     "success",
                "count":      len(records),
                "limit":      limit,
                "platform":   platform,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "records":    records,
            }),
            200,
        )
        resp.headers["Cache-Control"] = "no-store"
        return resp

    except Exception as e:
        logger.error("Export failed: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@export_bp.post("/api/export/batch")
@limiter.limit("10 per minute")
def export_batch():
    """Export generated content for a set of article IDs as a Markdown file.

    Body: { "article_ids": [int, ...] }
    Returns: .md file download

    ---
    tags:
      - Export
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [article_ids]
          properties:
            article_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Markdown file download
        content:
          text/markdown:
            schema:
              type: string
      422:
        description: Validation error
    """
    obj, err = validate_request(ExportBatchRequest, request.json or {})
    if err:
        body, status = err
        return jsonify(body), status

    db = SessionLocal()
    try:
        rows = (
            db.query(
                RawArticle.id,
                RawArticle.title,
                RawArticle.url,
                RawArticle.source,
                ProcessedArticle.summary,
                ProcessedArticle.viral_hook,
                GeneratedContent.platform,
                GeneratedContent.content,
            )
            .join(ProcessedArticle, ProcessedArticle.raw_article_id == RawArticle.id)
            .join(GeneratedContent, GeneratedContent.article_id == ProcessedArticle.id)
            .filter(RawArticle.id.in_(obj.article_ids))
            .order_by(RawArticle.id, GeneratedContent.platform)
            .all()
        )

        # Group by article
        articles: dict[int, dict] = {}
        for row in rows:
            if row.id not in articles:
                articles[row.id] = {
                    "title": row.title,
                    "url": row.url,
                    "source": row.source,
                    "summary": row.summary or "",
                    "viral_hook": row.viral_hook or "",
                    "posts": [],
                }
            articles[row.id]["posts"].append({
                "platform": row.platform,
                "content": row.content,
            })

        # Build Markdown
        lines = [f"# AI Pulse Pro — Batch Export\n",
                 f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
                 f"Articles: {len(articles)}\n",
                 "---\n"]

        for art in articles.values():
            lines.append(f"## {art['title']}")
            lines.append(f"**Source:** {art['source']}  ")
            lines.append(f"**URL:** {art['url']}\n")
            if art["summary"]:
                lines.append(f"**Summary:** {art['summary']}\n")
            if art["viral_hook"]:
                lines.append(f"**Hook:** {art['viral_hook']}\n")
            for post in art["posts"]:
                lines.append(f"### {post['platform'].title()}")
                lines.append(f"{post['content']}\n")
            lines.append("---\n")

        md_content = "\n".join(lines)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"pulse_export_{len(articles)}_articles_{timestamp}.md"

        resp = make_response(md_content, 200)
        resp.headers["Content-Type"] = "text/markdown; charset=utf-8"
        resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        resp.headers["Cache-Control"] = "no-store"
        return resp

    except Exception as e:
        logger.exception("Batch export failed")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
