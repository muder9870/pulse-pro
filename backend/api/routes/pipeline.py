from flask import Blueprint, Response, stream_with_context, jsonify
import queue
import json
import threading

from backend.utils.event_emitter import pipeline_emitter
from backend.api.state import pipeline_lock
from backend.api.limiter import limiter
from backend.main_pipeline import run_daily_pipeline


pipeline_bp = Blueprint("pipeline_v2", __name__, url_prefix="/api/pipeline")


# =========================
# 🔥 RUN PIPELINE ENDPOINT
# =========================
@pipeline_bp.route("/run", methods=["POST", "GET"])
@limiter.limit("2 per minute")
def run():
    """Start the full pipeline (fetch → analyze → generate → schedule).
    ---
    tags:
      - Pipeline
    responses:
      200:
        description: Pipeline started successfully
      409:
        description: Pipeline is already running
      429:
        description: Rate limit exceeded (2 per minute)
    """
    from backend.api.state import pipeline_state, pipeline_lock
    from datetime import datetime, timezone
    import threading

    if pipeline_state.get("running"):
        return jsonify({
            "status": "already_running",
            "message": "Pipeline already in progress"
        }), 409

    def run_wrapper():

        started_at = datetime.now(timezone.utc).isoformat()
        with pipeline_lock:
            pipeline_state["running"] = True
            pipeline_state["last_started_at"] = started_at
            pipeline_state["last_error"] = None
            pipeline_state["last_result"] = None

        try:
            result = run_daily_pipeline()
            with pipeline_lock:
                pipeline_state["last_result"] = result
        except Exception as e:
            import logging
            logging.getLogger("pipeline").error(f"Manual pipeline run failed: {e}")
            with pipeline_lock:
                pipeline_state["last_error"] = str(e)
        finally:
            finished_at = datetime.now(timezone.utc).isoformat()
            with pipeline_lock:
                pipeline_state["running"] = False
                pipeline_state["last_finished_at"] = finished_at

    try:
        thread = threading.Thread(target=run_wrapper, daemon=True)
        thread.start()
        return jsonify({
            "status": "started",
            "message": "Pipeline execution started"
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================
# 🔥 SSE STREAM ENDPOINT
# =========================
@pipeline_bp.route("/stream")
def stream():
    def event_stream():
        q = pipeline_emitter.subscribe()

        try:
            # Initial connection message
            yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE connected'})}\n\n"

            while True:
                try:
                    msg = q.get(timeout=15)

                    # Ensure JSON-safe
                    # `pipeline_emitter` already queues a JSON string, so don't double-encode it.
                    yield f"data: {msg}\n\n"

                except queue.Empty:
                    # Keep connection alive
                    yield ": heartbeat\n\n"

                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        except GeneratorExit:
            pipeline_emitter.unsubscribe(q)

    return Response(
        stream_with_context(event_stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )