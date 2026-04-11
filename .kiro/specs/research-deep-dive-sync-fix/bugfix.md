# Bugfix Requirements Document

## Introduction

The Research Deep Dive feature in AI Pulse Pro has four interconnected bugs that together make the feature largely non-functional. A broken import crashes any endpoint that touches analytics, the dashboard stat for Deep Dive Explorer always shows 0, the Deep Dive filter checkbox has no visible effect, and the article ID chain used when triggering a deep-dive analysis is risky and may silently pass the wrong ID to the analyzer. All four must be fixed together to restore correct end-to-end behavior.

---

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — Dashboard stat always shows 0 Deep Dives**

1.1 WHEN the frontend calls `GET /api/stats/dashboard` THEN the system returns `deep_dive_analyzed: 0` (or omits the field entirely) because `AnalyticsRepository.get_dashboard_stats()` never queries the `PaperAnalysis` table

1.2 WHEN `DashboardStats.jsx` reads `data.deep_dive_analyzed` from the response THEN the system displays `0` in the "Deep Dive Explorer" stat card regardless of how many deep-dive analyses exist in the database

**Bug 2 — Deep Dive filter checkbox does nothing**

2.1 WHEN a user checks the "Deep Dive" checkbox in `FilterBar.jsx` THEN the system sets `filters.deepDive = true` but the `/api/stories` backend endpoint applies no `has_deep_analysis` filter, so the full unfiltered story list is returned from the server

2.2 WHEN `App.jsx` applies the client-side `filters.deepDive` filter (`story.has_deep_analysis === true`) THEN the system shows no stories because `has_deep_analysis` is never populated in the story response objects returned by the stories endpoint

**Bug 3 — Wrong import path crashes analytics repo at runtime**

3.1 WHEN any endpoint that instantiates `AnalyticsRepository` is called (e.g. `GET /api/stats/dashboard`) THEN the system crashes with an `ImportError` because `analytics_repository.py` imports models from `backend.models` instead of the correct path `backend.db.models`

3.2 WHEN the import error is raised THEN the system returns a 500 error for every analytics-dependent endpoint, making the entire analytics surface unavailable at runtime

**Bug 4 — Risky article ID handling in deep-dive flow**

4.1 WHEN `POST /api/research/deep-dive` receives an `article_id` (a `RawArticle.id`) THEN the system calls `repo.ensure_processed_id(article_id)` and passes the resulting `processed_id` (`ProcessedArticle.id`) to `ResearchAnalyzer.analyze_complex_paper(p_id)`

4.2 WHEN `ResearchAnalyzer.analyze_complex_paper(processed_id)` executes THEN the system queries `RawArticle` joined through `ProcessedArticle.id == processed_id` to retrieve the article URL — if `ensure_processed_id` returns a `ProcessedArticle.id` that does not correspond to the original `RawArticle`, the system silently downloads the wrong PDF or raises a `ValueError` with no clear indication of the ID mismatch

---

### Expected Behavior (Correct)

**Bug 1 — Dashboard stat always shows 0 Deep Dives**

2.1 WHEN `AnalyticsRepository.get_dashboard_stats()` is called THEN the system SHALL query `COUNT(PaperAnalysis.article_id)` and include the result as `deep_dive_analyzed` in the returned stats dictionary

2.2 WHEN `DashboardStats.jsx` reads `data.deep_dive_analyzed` from the response THEN the system SHALL display the correct count of completed deep-dive analyses in the "Deep Dive Explorer" stat card

**Bug 2 — Deep Dive filter checkbox does nothing**

2.3 WHEN `ArticleRepository._format_story()` serializes a story THEN the system SHALL populate `has_deep_analysis` as `true` when a `PaperAnalysis` record exists for that article's `ProcessedArticle.id`, and `false` otherwise

2.4 WHEN `App.jsx` applies `filters.deepDive` client-side THEN the system SHALL correctly filter the story list to only stories where `has_deep_analysis === true`, producing a visible change in the displayed results

**Bug 3 — Wrong import path crashes analytics repo at runtime**

2.5 WHEN `analytics_repository.py` is imported THEN the system SHALL resolve all model imports from `backend.db.models` (the correct module path) without raising an `ImportError`

2.6 WHEN any analytics endpoint is called after the import fix THEN the system SHALL execute without a 500 error caused by the broken import

**Bug 4 — Risky article ID handling in deep-dive flow**

2.7 WHEN `POST /api/research/deep-dive` resolves `article_id` to `processed_id` via `ensure_processed_id` THEN the system SHALL verify that the resolved `processed_id` traces back to the original `RawArticle.id` before passing it to `ResearchAnalyzer.analyze_complex_paper`

2.8 WHEN `ResearchAnalyzer.analyze_complex_paper(processed_id)` looks up the article URL THEN the system SHALL retrieve the URL from the `RawArticle` that is the direct parent of the given `ProcessedArticle.id`, ensuring the correct PDF is downloaded

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN `GET /api/stats/dashboard` is called THEN the system SHALL CONTINUE TO return all existing stats fields (`total_articles`, `processed_articles`, `generated_content`, `avg_priority_score`, `coverage_percentage`, `daily_distribution`, `score_distribution`, etc.) unchanged

3.2 WHEN a story has no `PaperAnalysis` record THEN the system SHALL CONTINUE TO return `has_deep_analysis: false` in the story response and the story SHALL CONTINUE TO appear in the unfiltered story list

3.3 WHEN the "Deep Dive" checkbox is unchecked THEN the system SHALL CONTINUE TO display all stories without any deep-dive filter applied

3.4 WHEN `POST /api/research/deep-dive` is called with a valid `article_id` that already has a `ProcessedArticle` THEN the system SHALL CONTINUE TO trigger deep analysis without re-processing the article

3.5 WHEN `GET /api/research/analysis/<article_id>` is called THEN the system SHALL CONTINUE TO return the existing analysis response structure (with or without `paper_analysis` data) unchanged

3.6 WHEN other filter checkboxes ("Has Generated Content", "Analyzed") are used THEN the system SHALL CONTINUE TO filter stories correctly and independently of the Deep Dive filter

---

## Bug Condition Pseudocode

### Bug 1 — Missing `deep_dive_analyzed` count

```pascal
FUNCTION isBugCondition_Bug1(stats_response)
  INPUT: stats_response of type dict
  OUTPUT: boolean

  RETURN "deep_dive_analyzed" NOT IN stats_response
      OR stats_response["deep_dive_analyzed"] = 0
         AND COUNT(PaperAnalysis) > 0
END FUNCTION

// Property: Fix Checking
FOR ALL calls TO get_dashboard_stats() WHERE COUNT(PaperAnalysis) >= 0 DO
  result ← get_dashboard_stats'()
  ASSERT "deep_dive_analyzed" IN result
  ASSERT result["deep_dive_analyzed"] = COUNT(PaperAnalysis)
END FOR

// Property: Preservation Checking
FOR ALL other keys k IN original_stats_keys DO
  ASSERT get_dashboard_stats'()[k] = get_dashboard_stats()[k]
END FOR
```

### Bug 2 — `has_deep_analysis` never populated

```pascal
FUNCTION isBugCondition_Bug2(story)
  INPUT: story of type dict (from /api/stories response)
  OUTPUT: boolean

  RETURN "has_deep_analysis" NOT IN story
      OR (PaperAnalysis EXISTS for story.processed_id
          AND story["has_deep_analysis"] = false)
END FUNCTION

// Property: Fix Checking
FOR ALL stories WHERE PaperAnalysis EXISTS for story.processed_id DO
  result ← _format_story'(raw_article)
  ASSERT result["has_deep_analysis"] = true
END FOR

// Property: Preservation Checking
FOR ALL stories WHERE PaperAnalysis DOES NOT EXIST DO
  ASSERT _format_story'(raw_article)["has_deep_analysis"] = false
END FOR
```

### Bug 3 — Wrong import path

```pascal
FUNCTION isBugCondition_Bug3(module)
  INPUT: module = analytics_repository
  OUTPUT: boolean

  RETURN import("backend.models") RAISES ImportError
      OR import("backend.models").PaperAnalysis DOES NOT EXIST
END FUNCTION

// Property: Fix Checking
FOR ALL imports OF analytics_repository DO
  ASSERT NO ImportError IS RAISED
  ASSERT AnalyticsRepository CAN BE INSTANTIATED
END FOR
```

### Bug 4 — ID chain integrity

```pascal
FUNCTION isBugCondition_Bug4(article_id, processed_id)
  INPUT: article_id of type int (RawArticle.id)
         processed_id of type int (ProcessedArticle.id)
  OUTPUT: boolean

  raw_via_processed ← RawArticle WHERE ProcessedArticle.id = processed_id
  RETURN raw_via_processed.id ≠ article_id
END FUNCTION

// Property: Fix Checking
FOR ALL (article_id, processed_id) WHERE isBugCondition_Bug4(article_id, processed_id) DO
  result ← deep_dive_route'(article_id)
  ASSERT result.status IN {400, 404, 422}  // explicit error, not silent mismatch
END FOR

// Property: Preservation Checking
FOR ALL (article_id, processed_id) WHERE NOT isBugCondition_Bug4(article_id, processed_id) DO
  ASSERT analyze_complex_paper'(processed_id).url = RawArticle(article_id).url
END FOR
```
