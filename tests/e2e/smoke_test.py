from __future__ import annotations

import argparse
import sys
from typing import Any

import requests


def _get_json(url: str, timeout: float = 10.0) -> Any:
    res = requests.get(url, timeout=timeout)
    res.raise_for_status()
    return res.json()


def _post_json(url: str, payload: dict[str, Any] | None = None, timeout: float = 10.0) -> Any:
    res = requests.post(url, json=(payload or {}), timeout=timeout)
    res.raise_for_status()
    return res.json()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:5000", help="Base URL, e.g. http://localhost:5000")
    args = parser.parse_args()

    base = str(args.base).rstrip("/")

    health = _get_json(f"{base}/api/health")
    if health.get("status") != "ok":
        raise RuntimeError(f"Health check failed: {health}")

    stories = _get_json(f"{base}/api/stories")
    if not isinstance(stories, list):
        raise RuntimeError("Expected /api/stories to return a list")

    status = _get_json(f"{base}/api/pipeline/status")
    if not isinstance(status, dict) or "running" not in status:
        raise RuntimeError(f"Unexpected pipeline status: {status}")

    sched = _get_json(f"{base}/api/schedule")
    if not isinstance(sched, dict) or "schedule" not in sched:
        raise RuntimeError(f"Unexpected schedule payload: {sched}")

    if stories:
        article_id = int((stories[0] or {}).get("id") or 0)
        if article_id:
            try:
                _post_json(f"{base}/api/hashtags/update")
            except Exception:
                pass
            try:
                rec = _get_json(f"{base}/api/hashtags/{article_id}/twitter")
                if not isinstance(rec, dict) or "hashtags" not in rec:
                    raise RuntimeError(f"Unexpected hashtag payload: {rec}")
            except Exception:
                pass

    print("OK: health, stories, pipeline status, schedule")
    print(f"stories_count={len(stories)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"SMOKE_TEST_FAILED: {e}", file=sys.stderr)
        raise SystemExit(1)
