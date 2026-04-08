"""
Request body schemas for API endpoints.
Uses Pydantic v2 for validation — returns HTTP 422 with field errors on invalid input.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator

# Canonical platform allowlist — sourced from PLATFORM_CONFIGS keys.
# Import lazily to avoid circular imports at module load time.
def _valid_platforms() -> frozenset[str]:
    from backend.generators.platform_templates import PLATFORM_CONFIGS
    return frozenset(PLATFORM_CONFIGS.keys())


# Task 3: shared base to eliminate duplicated article_id_positive validator
class ArticleIdMixin(BaseModel):
    article_id: int

    @field_validator("article_id")
    @classmethod
    def article_id_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("article_id must be a positive integer")
        return v


class GenerateRequest(ArticleIdMixin):
    platform: Optional[str] = None


class TagRequest(BaseModel):
    tags: list[str]

    @field_validator("tags")
    @classmethod
    def tags_not_empty(cls, v: list[str]) -> list[str]:
        cleaned = [t.strip() for t in v if t.strip()]
        if not cleaned:
            raise ValueError("tags must contain at least one non-empty string")
        # Task 6: per-tag length cap
        if any(len(t) > 100 for t in cleaned):
            raise ValueError("each tag must be 100 characters or fewer")
        return cleaned


class ScheduleQueueRequest(ArticleIdMixin):
    platform: str
    # Task 1: datetime type — Pydantic v2 parses ISO 8601 automatically,
    # route gets a real datetime object instead of a raw string.
    scheduled_time: datetime

    @field_validator("platform")
    @classmethod
    def platform_not_empty(cls, v: str) -> str:
        normalized = v.strip().lower()
        if not normalized:
            raise ValueError("platform must not be empty")
        # Task 2: allowlist validation against PLATFORM_CONFIGS
        valid = _valid_platforms()
        if normalized not in valid:
            raise ValueError(f"platform must be one of: {', '.join(sorted(valid))}")
        return normalized


class ExportBatchRequest(BaseModel):
    article_ids: list[int]

    @field_validator("article_ids")
    @classmethod
    def ids_not_empty(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("article_ids must contain at least one id")
        # Task 5: upper bound to prevent exporting 100k articles in one request
        if len(v) > 100:
            raise ValueError("article_ids must contain 100 or fewer ids")
        if any(i <= 0 for i in v):
            raise ValueError("all article_ids must be positive integers")
        return v


def validate_request(schema_class, data: dict):
    """
    Validate `data` against `schema_class`.
    Returns (instance, None) on success or (None, (error_dict, status_code)) on failure.

    Task 4: removed `from flask import jsonify` — returns raw dict so this
    module has no Flask dependency. Callers must call jsonify themselves.

    Usage:
        obj, err = validate_request(GenerateRequest, request.json or {})
        if err:
            body, status = err
            return jsonify(body), status
    """
    try:
        instance = schema_class.model_validate(data)
        return instance, None
    except Exception as exc:
        errors = []
        if hasattr(exc, "errors"):
            for e in exc.errors():
                field = ".".join(str(x) for x in e.get("loc", []))
                errors.append({"field": field, "message": e.get("msg", str(e))})
        else:
            errors.append({"field": "body", "message": str(exc)})
        return None, ({"error": "Validation failed", "details": errors}, 422)
