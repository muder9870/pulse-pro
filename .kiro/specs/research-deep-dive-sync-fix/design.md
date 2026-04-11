# Research Deep Dive Sync Fix — Bugfix Design

## Overview

Four interconnected bugs make the Research Deep Dive feature non-functional. Bug 3 (wrong import path) is a hard prerequisite — it causes a 500 crash on every analytics endpoint, masking all other issues. Once that is fixed, Bug 1 (missing `deep_dive_analyzed` stat) and Bug 2 (`has_deep_analysis` never populated in story responses) can be addressed to restore the dashboard counter and the Deep Dive filter. Bug 4 (risky article ID chain) is an independent safety fix that prevents silent wrong-PDF downloads.

The fix strategy is minimal and surgical: no schema changes, no new endpoints, no client-side changes beyond what is already wired up.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers a specific bug — defined per-bug below
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behaviors that must remain unchanged after the fix
- **`AnalyticsRepository`**: Class in `backend/db/repositories/analytics_repository.py` that serves `/api/stats/dashboard`
- **`ArticleRepository`**: Class in `backend/db/repositories/article_repository.py`; `_format_story()` serializes each story dict
- **`PaperAnalysis`**: SQLAlchemy model in `backend/db/models.py`; `article_id` is a FK to `ProcessedArticle.id` (primary key)
- **`ProcessedArticle`**: Processed version of a raw article; `raw_article_id` links back to `RawArticle.id`
- **`RawArticle`**: The ingested article record; `id` is what the frontend passes as `article_id`
- **`ensure_processed_id`**: Helper in `ArticleRepository` that resolves a `RawArticle.id` to a `ProcessedArticle.id`
- **`deep_dive_analyzed`**: The stats dict key the frontend reads to populate the "Deep Dive Explorer" card
- **`has_deep_analysis`**: The story dict field the frontend reads for the Deep Dive filter (`story.has_deep_analysis === true`)

---

## Bug Details

### Bug 1 — Missing `deep_dive_analyzed` stat

The bug manifests when `GET /api/stats/dashboard` is called. `AnalyticsRepository.get_dashboard_stats()` queries `RawArticle`, `ProcessedArticle`, and `GeneratedContent` but never queries `PaperAnalysis`, so `deep_dive_analyzed` is absent from the returned dict. `DashboardStats.jsx` reads `data.deep_dive_analyzed || 0` and always renders `0`.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug1(stats_response)
  INPUT: stats_response of type dict
  OUTPUT: boolean

  RETURN "deep_dive_analyzed" NOT IN stats_response
      OR (stats_response["deep_dive_analyzed"] = 0
          AND COUNT(PaperAnalysis rows in DB) > 0)
END FUNCTION
```

**Examples:**
- 3 deep-dive analyses exist → response omits `deep_dive_analyzed` → card shows 0 (bug)
- 0 deep-dive analyses exist → response omits `deep_dive_analyzed` → card shows 0 (coincidentally correct, but still a bug)
- After fix with 3 analyses → response includes `deep_dive_analyzed: 3` → card shows 3 (correct)

---

### Bug 2 — `has_deep_analysis` never populated in story response

`ArticleRepository._format_story()` already queries `PaperAnalysis` and sets `has_deep_analysis` correctly — and the field **is** included in the returned dict. However, `analytics_repository.py` imports from `backend.models` (Bug 3), which crashes before `_format_story` is ever reached in the analytics path. Once Bug 3 is fixed, Bug 2 needs verification that `has_deep_analysis` is present and correct in the story dict.

Reviewing `article_repository.py` confirms `_format_story` already returns `"has_deep_analysis": has_deep_analysis`. The client-side filter in `App.jsx` (`story.has_deep_analysis === true`) is also already correct. Bug 2 is therefore a **verification task**: confirm the field is present and the import in `article_repository.py` is correct.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug2(story_dict)
  INPUT: story_dict of type dict (from _format_story output)
  OUTPUT: boolean

  RETURN "has_deep_analysis" NOT IN story_dict
      OR (PaperAnalysis EXISTS for story_dict["processed_article_id"]
          AND story_dict["has_deep_analysis"] = false)
END FUNCTION
```

**Examples:**
- Article has a `PaperAnalysis` row → `has_deep_analysis` should be `true` → filter shows it
- Article has no `PaperAnalysis` row → `has_deep_analysis` should be `false` → filter hides it
- `article_repository.py` imports from `backend.models` (wrong) → `ImportError` at startup (Bug 3 overlap)

---

### Bug 3 — Wrong import path in `analytics_repository.py`

`analytics_repository.py` line 4 imports:
```python
from backend.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent
```
The correct module is `backend.db.models`. `backend/models.py` exists as a legacy file but does not export `EngagementMetric`, causing an `ImportError` at module load time. Every endpoint that instantiates `AnalyticsRepository` returns 500.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug3(module_load)
  INPUT: import of analytics_repository
  OUTPUT: boolean

  RETURN "backend.models" IS USED AS IMPORT SOURCE
      AND "backend.models".EngagementMetric DOES NOT EXIST
END FUNCTION
```

**Examples:**
- `GET /api/stats/dashboard` → Python imports `analytics_repository` → `ImportError: cannot import name 'EngagementMetric' from 'backend.models'` → 500
- After fix → import resolves from `backend.db.models` → no error

---

### Bug 4 — Risky article ID chain in deep-dive flow

In `research.py`, `POST /api/research/deep-dive`:
```python
p_id = repo.ensure_processed_id(article_id)
...
analysis = analyzer.analyze_complex_paper(p_id)
```

`ensure_processed_id` first tries `ProcessedArticle.raw_article_id == article_id`, then falls back to `ProcessedArticle.id == article_id`. If the fallback path is taken (i.e., `article_id` happens to equal some `ProcessedArticle.id` that belongs to a *different* raw article), `analyze_complex_paper` will download the wrong PDF silently.

`analyze_complex_paper` in `research_analyzer.py` queries:
```python
article = db.query(RawArticle).join(
    ProcessedArticle, ProcessedArticle.raw_article_id == RawArticle.id
).filter(ProcessedArticle.id == processed_id).first()
```
This is correct given a valid `processed_id`, but there is no assertion that `processed_id` actually corresponds to the original `article_id` before this call.

**Formal Specification:**
```
FUNCTION isBugCondition_Bug4(article_id, resolved_processed_id)
  INPUT: article_id of type int (RawArticle.id from request)
         resolved_processed_id of type int (ProcessedArticle.id from ensure_processed_id)
  OUTPUT: boolean

  raw_parent_id ← ProcessedArticle WHERE id = resolved_processed_id → raw_article_id
  RETURN raw_parent_id ≠ article_id
END FUNCTION
```

**Examples:**
- `article_id=5`, `ensure_processed_id` returns `ProcessedArticle.id=5` (which belongs to `raw_article_id=99`) → wrong PDF downloaded silently (bug)
- `article_id=5`, `ensure_processed_id` returns `ProcessedArticle.id=7` (which belongs to `raw_article_id=5`) → correct (no bug)
- After fix: mismatch detected → 422 returned with clear error message

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All existing fields in the `/api/stats/dashboard` response (`total_articles`, `processed_articles`, `generated_content`, `avg_priority_score`, `coverage_percentage`, `daily_distribution`, `score_distribution`, etc.) must remain identical
- Stories without a `PaperAnalysis` record must continue to return `has_deep_analysis: false` and appear in the unfiltered story list
- The "Has Generated Content" and "Analyzed" filter checkboxes must continue to work independently
- `GET /api/research/analysis/<article_id>` response structure must remain unchanged
- `POST /api/research/deep-dive` with a valid, correctly-mapped `article_id` must continue to trigger analysis without re-processing

**Scope:**
All inputs that do NOT involve the `PaperAnalysis` table, the analytics import, or the deep-dive ID chain are completely unaffected by these fixes.

---

## Hypothesized Root Cause

1. **Copy-paste import error (Bug 3)**: `analytics_repository.py` was written referencing the legacy `backend/models.py` instead of the canonical `backend/db/models.py`. This is the root cause of all 500 errors on analytics endpoints.

2. **Missing query (Bug 1)**: When `get_dashboard_stats()` was written, `PaperAnalysis` did not yet exist or was not considered. No one added the `COUNT(PaperAnalysis.article_id)` query when the deep-dive feature was added.

3. **Field already present but masked (Bug 2)**: `_format_story()` in `article_repository.py` already correctly populates `has_deep_analysis`. The bug report was likely caused by the analytics import crash (Bug 3) making it appear the field was missing. Verification is still required.

4. **Implicit ID aliasing (Bug 4)**: `ensure_processed_id` has a dual-lookup fallback (first by `raw_article_id`, then by `ProcessedArticle.id` directly) intended to handle both ID types. This is useful but dangerous without a post-resolution integrity check, since the two ID spaces overlap numerically.

---

## Correctness Properties

Property 1: Bug Condition — Analytics Import Resolves Without Error

_For any_ import of `analytics_repository`, the fixed module SHALL load without raising `ImportError`, and `AnalyticsRepository` SHALL be instantiable with a valid SQLAlchemy session.

**Validates: Requirements 2.5, 2.6**

Property 2: Bug Condition — `deep_dive_analyzed` Reflects Actual Count

_For any_ call to `get_dashboard_stats()`, the fixed method SHALL include `deep_dive_analyzed` in the returned dict, and its value SHALL equal `COUNT(PaperAnalysis.article_id)` in the database at the time of the call.

**Validates: Requirements 2.1, 2.2**

Property 3: Bug Condition — `has_deep_analysis` Correctly Populated

_For any_ `RawArticle` serialized by `_format_story()`, the fixed method SHALL set `has_deep_analysis = True` if and only if a `PaperAnalysis` row exists where `PaperAnalysis.article_id == ProcessedArticle.id` for that article's processed entry.

**Validates: Requirements 2.3, 2.4**

Property 4: Bug Condition — Deep-Dive ID Mismatch Returns 422

_For any_ `POST /api/research/deep-dive` request where `ensure_processed_id(article_id)` resolves to a `ProcessedArticle` whose `raw_article_id != article_id`, the fixed route SHALL return HTTP 422 with a descriptive error message and SHALL NOT call `analyze_complex_paper`.

**Validates: Requirements 2.7**

Property 5: Preservation — Existing Stats Fields Unchanged

_For any_ call to `get_dashboard_stats()`, the fixed method SHALL return all previously-present keys (`total_articles`, `processed_articles`, `generated_content`, `avg_priority_score`, etc.) with values identical to the original implementation.

**Validates: Requirements 3.1**

Property 6: Preservation — Stories Without Deep Analysis Unaffected

_For any_ `RawArticle` with no corresponding `PaperAnalysis` row, `_format_story()` SHALL return `has_deep_analysis = False`, and the story SHALL appear in unfiltered story list responses.

**Validates: Requirements 3.2, 3.3**

Property 7: Preservation — Valid Deep-Dive Flow Unchanged

_For any_ `POST /api/research/deep-dive` request where `ensure_processed_id(article_id)` resolves to a `ProcessedArticle` whose `raw_article_id == article_id`, the fixed route SHALL behave identically to the original: trigger `analyze_complex_paper` and return the analysis result.

**Validates: Requirements 3.4**

---

## Fix Implementation

### Bug 3 — Fix import path (prerequisite for all others)

**File:** `backend/db/repositories/analytics_repository.py`

**Change:** Replace line 4:
```python
# Before
from backend.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent

# After
from backend.db.models import EngagementMetric, RawArticle, ProcessedArticle, GeneratedContent, PaperAnalysis
```

Note: `PaperAnalysis` is added here because it is needed for Bug 1.

---

### Bug 1 — Add `deep_dive_analyzed` query

**File:** `backend/db/repositories/analytics_repository.py`

**Function:** `get_dashboard_stats()`

**Change:** After the `generated_content` query, add:
```python
deep_dive_analyzed = self.session.query(func.count(PaperAnalysis.article_id)).scalar() or 0
```

Then add `"deep_dive_analyzed": deep_dive_analyzed` to the returned dict.

**Exact location in return dict** — add after `"generated_content"`:
```python
return {
    "total_articles": total_articles,
    "processed_articles": processed_articles,
    "generated_content": generated_content,
    "deep_dive_analyzed": deep_dive_analyzed,   # <-- new
    "avg_priority_score": round(avg_priority_score, 1),
    ...
}
```

---

### Bug 2 — Verify `has_deep_analysis` in `_format_story`

**File:** `backend/db/repositories/article_repository.py`

**Action:** Verify (no code change expected). The current implementation already:
1. Imports `PaperAnalysis` from `backend.models` — **this import must be checked**. If it reads `from backend.models import ...`, change to `from backend.db.models import ...`.
2. Queries `PaperAnalysis` and sets `has_deep_analysis = bool(paper_analysis)`.
3. Includes `"has_deep_analysis": has_deep_analysis` in the returned dict.

Reviewing the file confirms the import is already `from backend.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis` — this must be corrected to `from backend.db.models import ...` to match the canonical path.

**Change:**
```python
# Before
from backend.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis

# After
from backend.db.models import RawArticle, ProcessedArticle, ArticleTag, PaperAnalysis
```

No other changes needed in this file — `_format_story` logic is already correct.

---

### Bug 4 — Add ID integrity check in deep-dive route

**File:** `backend/api/routes/research.py`

**Function:** `research_deep_dive()`

**Change:** After `p_id` is resolved, add an explicit check before calling `analyze_complex_paper`:

```python
p_id = repo.ensure_processed_id(article_id)

if not p_id:
    from backend.processors.analyzer import ArticleAnalyzer
    logger.info(f"triggering_on_demand_analysis_for_deep_dive article_id={article_id}")
    p_id = ArticleAnalyzer().process_single_article(article_id)

if not p_id:
    return jsonify({"error": "Article not found or could not be processed"}), 404

# Bug 4 fix: verify the resolved processed_id actually belongs to article_id
processed = db.query(ProcessedArticle).filter(ProcessedArticle.id == p_id).first()
if processed and processed.raw_article_id != article_id:
    logger.error(
        f"deep_dive_id_mismatch article_id={article_id} "
        f"resolved_processed_id={p_id} "
        f"actual_raw_article_id={processed.raw_article_id}"
    )
    return jsonify({
        "error": "ID mismatch: resolved processed article does not belong to the requested raw article",
        "article_id": article_id,
        "resolved_processed_id": p_id,
        "actual_raw_article_id": processed.raw_article_id,
    }), 422
```

---

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on unfixed code to confirm root causes, then run fix-checking and preservation tests on the fixed code.

---

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples that demonstrate each bug on unfixed code. Confirm or refute root cause hypotheses.

**Test Plan:** Write unit tests that call the affected functions directly with a test database session. Run on unfixed code to observe failures.

**Test Cases:**

1. **Bug 3 — Import test**: Attempt `from backend.db.repositories.analytics_repository import AnalyticsRepository` — expect `ImportError` on unfixed code
2. **Bug 1 — Stats missing field**: Call `get_dashboard_stats()` with a seeded `PaperAnalysis` row — expect `deep_dive_analyzed` absent or 0 on unfixed code
3. **Bug 2 — Story field check**: Call `_format_story()` on an article with a `PaperAnalysis` row — verify `has_deep_analysis` is present and `True`; if import is wrong, expect `ImportError`
4. **Bug 4 — ID mismatch**: Call `POST /api/research/deep-dive` with an `article_id` where `ensure_processed_id` returns a `ProcessedArticle` belonging to a different raw article — expect silent wrong behavior on unfixed code

**Expected Counterexamples:**
- `ImportError: cannot import name 'EngagementMetric' from 'backend.models'` (Bug 3)
- `deep_dive_analyzed` key absent from stats dict (Bug 1)
- 422 not returned on ID mismatch; wrong PDF URL used (Bug 4)

---

### Fix Checking

**Goal:** Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
// Bug 1
FOR ALL calls TO get_dashboard_stats'() DO
  result ← get_dashboard_stats'()
  ASSERT "deep_dive_analyzed" IN result
  ASSERT result["deep_dive_analyzed"] = COUNT(PaperAnalysis rows)
END FOR

// Bug 2
FOR ALL raw_articles WHERE PaperAnalysis EXISTS for processed_entry.id DO
  result ← _format_story'(raw_article)
  ASSERT result["has_deep_analysis"] = true
END FOR

// Bug 3
ASSERT import("backend.db.repositories.analytics_repository") RAISES NO ImportError
ASSERT AnalyticsRepository(session) CAN BE INSTANTIATED

// Bug 4
FOR ALL (article_id, processed_id) WHERE isBugCondition_Bug4(article_id, processed_id) DO
  result ← deep_dive_route'({"article_id": article_id})
  ASSERT result.status_code = 422
  ASSERT "mismatch" IN result.json["error"].lower()
END FOR
```

---

### Preservation Checking

**Goal:** Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original.

**Pseudocode:**
```
// Bug 1 — existing stats keys unchanged
FOR ALL keys k IN original_stats_keys DO
  ASSERT get_dashboard_stats'()[k] = get_dashboard_stats_original()[k]
END FOR

// Bug 2 — stories without PaperAnalysis unaffected
FOR ALL raw_articles WHERE PaperAnalysis DOES NOT EXIST DO
  ASSERT _format_story'(raw_article)["has_deep_analysis"] = false
END FOR

// Bug 4 — valid ID chain still triggers analysis
FOR ALL (article_id, processed_id) WHERE NOT isBugCondition_Bug4 DO
  ASSERT deep_dive_route'({"article_id": article_id}) triggers analyze_complex_paper
  ASSERT analyze_complex_paper receives correct processed_id
END FOR
```

**Testing Approach:** Property-based testing is recommended for Bug 1 (generate random `PaperAnalysis` counts) and Bug 2 (generate random article sets with/without analyses) because it covers the full numeric range and catches off-by-one errors in counts.

---

### Unit Tests

- Import `AnalyticsRepository` and assert no `ImportError` (Bug 3)
- Seed 0, 1, and N `PaperAnalysis` rows; assert `get_dashboard_stats()["deep_dive_analyzed"]` equals N (Bug 1)
- Seed article with `PaperAnalysis`; assert `_format_story()["has_deep_analysis"] == True` (Bug 2)
- Seed article without `PaperAnalysis`; assert `_format_story()["has_deep_analysis"] == False` (Bug 2 preservation)
- Call deep-dive route with mismatched IDs; assert 422 response (Bug 4)
- Call deep-dive route with valid IDs; assert `analyze_complex_paper` is called with correct `processed_id` (Bug 4 preservation)

### Property-Based Tests

- Generate random counts of `PaperAnalysis` rows (0 to 1000); assert `deep_dive_analyzed` always equals the count (Property 2)
- Generate random sets of articles, some with and some without `PaperAnalysis`; assert `has_deep_analysis` is `True` iff a row exists (Property 3)
- Generate random `(article_id, processed_id)` pairs where `raw_article_id != article_id`; assert 422 is always returned (Property 4)
- Generate random `(article_id, processed_id)` pairs where `raw_article_id == article_id`; assert analysis is triggered (Property 7)

### Integration Tests

- Full request to `GET /api/stats/dashboard` with seeded data; assert `deep_dive_analyzed` is correct and all other fields are present (Properties 2, 5)
- Full request to `GET /api/stories`; assert each story dict contains `has_deep_analysis` with correct boolean value (Property 3)
- Full request to `POST /api/research/deep-dive` with valid article; assert 200 and analysis returned (Property 7)
- Full request to `POST /api/research/deep-dive` with mismatched IDs; assert 422 (Property 4)
