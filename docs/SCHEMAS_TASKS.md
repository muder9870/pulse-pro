# Schema Tasks

All issues sourced from `backend/api/schemas.py`. All 6 tasks implemented.

---

## 1. `scheduled_time: str` has no validation — DONE

**File:** `backend/api/schemas.py`
**Model:** `ScheduleQueueRequest`

**Was:** `scheduled_time: str` with no validator — "banana" passed.

**Fix applied:** Changed field type to `datetime`. Pydantic v2 parses ISO 8601 automatically. Route in `schedule.py` updated — removed the manual `datetime.fromisoformat` parse block since `obj.scheduled_time` is now already a `datetime` object.

---

## 2. `platform` field has no allowlist validation — DONE

**File:** `backend/api/schemas.py`
**Model:** `ScheduleQueueRequest`

**Was:** Only checked non-empty. "fakeplatform" passed and silently failed inside `generator_v5.py`.

**Fix applied:** Added allowlist check in `platform_not_empty` validator using `_valid_platforms()` which reads keys from `PLATFORM_CONFIGS` at runtime. Stays in sync automatically if new platforms are added to `platform_templates.py`.

---

## 3. `article_id_positive` validator duplicated across two models — DONE

**File:** `backend/api/schemas.py`
**Models:** `GenerateRequest`, `ScheduleQueueRequest`

**Was:** Identical validator in both models.

**Fix applied:** Extracted into `ArticleIdMixin(BaseModel)`. Both `GenerateRequest` and `ScheduleQueueRequest` now inherit from it.

---

## 4. `validate_request` imports Flask inside the function body — DONE

**File:** `backend/api/schemas.py` + 3 route files

**Was:** `from flask import jsonify` inside `validate_request` — coupled pure validation to Flask context, blocked unit testing.

**Fix applied:** Removed Flask import from `schemas.py`. `validate_request` now returns `(None, (dict, status_code))` on failure instead of a Flask response tuple.

Updated all 3 callers:
- `backend/api/routes/schedule.py` — `if err: body, status = err; return jsonify(body), status`
- `backend/api/routes/export.py` — same pattern
- `backend/api/routes/content.py` — both `generate_content` and `set_tags` routes updated

---

## 5. `ExportBatchRequest` has no upper bound on list size — DONE

**File:** `backend/api/schemas.py`
**Model:** `ExportBatchRequest`

**Was:** No max size check — 100,000 IDs passed validation.

**Fix applied:** Added `if len(v) > 100: raise ValueError(...)` in `ids_not_empty` validator.

---

## 6. `tags` has no per-tag length validation — DONE

**File:** `backend/api/schemas.py`
**Model:** `TagRequest`

**Was:** Tags stripped and filtered but no length cap.

**Fix applied:** Added `if any(len(t) > 100 for t in cleaned): raise ValueError(...)` in `tags_not_empty` validator.

---

## Summary

| Task | Status | File(s) changed |
|---|---|---|
| 1 — `scheduled_time` datetime validation | Done | `schemas.py`, `routes/schedule.py` |
| 2 — `platform` allowlist | Done | `schemas.py` |
| 3 — duplicate `article_id_positive` | Done | `schemas.py` |
| 4 — Flask import in `validate_request` | Done | `schemas.py`, `routes/schedule.py`, `routes/export.py`, `routes/content.py` |
| 5 — `ExportBatchRequest` size cap | Done | `schemas.py` |
| 6 — tag length cap | Done | `schemas.py` |


---

## 1. `scheduled_time: str` has no validation — HIGH PRIORITY

**File:** `backend/api/schemas.py`
**Model:** `ScheduleQueueRequest`
**Field:** `scheduled_time: str`

**Problem:** No validator exists on this field. Any string passes — "banana", "", "yesterday" all pass schema validation. The route or downstream code then has to parse it and will either crash with an unhandled exception or silently store garbage in the DB.

**Fix — Option A (add validator, keep str type):**
```python
from datetime import datetime

@field_validator("scheduled_time")
@classmethod
def scheduled_time_is_iso(cls, v: str) -> str:
    try:
        datetime.fromisoformat(v)
    except ValueError:
        raise ValueError("scheduled_time must be a valid ISO 8601 datetime (e.g. 2026-04-05T14:00:00)")
    return v
```

**Fix — Option B (change field type to `datetime`):**
```python
from datetime import datetime

class ScheduleQueueRequest(BaseModel):
    article_id: int
    platform: str
    scheduled_time: datetime  # Pydantic v2 parses ISO 8601 automatically
```
Option B is cleaner — the route gets a real `datetime` object, no manual parsing needed.

---

## 2. `platform` field has no allowlist validation

**File:** `backend/api/schemas.py`
**Model:** `ScheduleQueueRequest`
**Validator:** `platform_not_empty`

**Problem:** The validator only checks non-empty and normalizes case. Any string passes — "fakeplatform", "tiktok", "xyz" all pass schema validation. These only fail later inside `generator_v5.py` at `if platform_key not in PLATFORM_CONFIGS` (line 123), which logs a warning and silently skips generation. The caller gets no error feedback.

**Canonical valid platforms** are the keys of `PLATFORM_CONFIGS` in `backend/generators/platform_templates.py`:
`twitter`, `linkedin`, `facebook`, `instagram`, `youtube`, `blog`, `reddit`, `threads`

**Fix:**
```python
from backend.generators.platform_templates import PLATFORM_CONFIGS

@field_validator("platform")
@classmethod
def platform_not_empty(cls, v: str) -> str:
    normalized = v.strip().lower()
    if not normalized:
        raise ValueError("platform must not be empty")
    if normalized not in PLATFORM_CONFIGS:
        raise ValueError(f"platform must be one of: {', '.join(sorted(PLATFORM_CONFIGS.keys()))}")
    return normalized
```

Importing directly from `PLATFORM_CONFIGS` ensures the allowlist never drifts out of sync if new platforms are added.

---

## 3. `article_id_positive` validator is duplicated across two models

**File:** `backend/api/schemas.py`
**Models:** `GenerateRequest` (line 14) and `ScheduleQueueRequest` (line 33)

**Problem:** Identical validator body exists in both models. If the rule changes (e.g. add a max ID bound, change error message), it must be updated in two places.

**Fix — shared base class:**
```python
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

class ScheduleQueueRequest(ArticleIdMixin):
    platform: str
    scheduled_time: str  # or datetime after task 1 is applied
```

---

## 4. `validate_request` imports Flask inside the function body

**File:** `backend/api/schemas.py`
**Function:** `validate_request` — line `from flask import jsonify`

**Problem:** `from flask import jsonify` is inside the function body. This couples a pure validation utility to Flask's request context. The module cannot be used or tested outside a Flask app context. It also hides the dependency — it's not visible at the top of the file.

**Fix — return raw dict, let caller handle `jsonify`:**

In `schemas.py`:
```python
def validate_request(schema_class, data: dict):
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
```

In each route:
```python
obj, err = validate_request(GenerateRequest, request.json or {})
if err:
    body, status = err
    return jsonify(body), status
```

---

## 5. `ExportBatchRequest` has no upper bound on list size

**File:** `backend/api/schemas.py`
**Model:** `ExportBatchRequest`
**Validator:** `ids_not_empty`

**Problem:** No maximum size check. A POST with `{"article_ids": [1, 2, ..., 100000]}` passes validation and the route will attempt to query and export 100,000 articles.

**Fix:**
```python
@field_validator("article_ids")
@classmethod
def ids_not_empty(cls, v: list[int]) -> list[int]:
    if not v:
        raise ValueError("article_ids must contain at least one id")
    if len(v) > 100:
        raise ValueError("article_ids must contain 100 or fewer ids")
    if any(i <= 0 for i in v):
        raise ValueError("all article_ids must be positive integers")
    return v
```

---

## 6. `tags` has no per-tag length validation

**File:** `backend/api/schemas.py`
**Model:** `TagRequest`
**Validator:** `tags_not_empty`

**Problem:** Tags are stripped and filtered for empty strings but no length cap per tag. A tag of 2,000 characters passes validation.

**Fix:**
```python
@field_validator("tags")
@classmethod
def tags_not_empty(cls, v: list[str]) -> list[str]:
    cleaned = [t.strip() for t in v if t.strip()]
    if not cleaned:
        raise ValueError("tags must contain at least one non-empty string")
    if any(len(t) > 100 for t in cleaned):
        raise ValueError("each tag must be 100 characters or fewer")
    return cleaned
```

---

## Priority Order

| Priority | Task | Reason |
|---|---|---|
| High | 1 — `scheduled_time` validation | Only issue that causes a real runtime crash or silent data corruption |
| High | 2 — `platform` allowlist | Unknown platforms pass schema, fail silently inside generator with no error returned to caller |
| Medium | 3 — duplicate `article_id_positive` | Maintenance hazard, no runtime impact |
| Medium | 4 — Flask import inside function | Blocks unit testing of schemas outside Flask context |
| Low | 5 — `ExportBatchRequest` size cap | DoS risk but low likelihood in current usage |
| Low | 6 — tag length cap | Data quality issue, no crash risk |
