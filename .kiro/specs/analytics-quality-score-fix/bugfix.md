# Bugfix Requirements Document

## Introduction

The Intelligence Analytics dashboard displays incorrect quality score distribution, showing all articles in the "Poor" quality range (0-49) with red bars in the Quality Spectrum chart. This occurs because the `category_score` field returned by the API is incorrectly mapped to `priority_score`, which defaults to 0.0 for all articles in the ProcessedArticle model. The fix will ensure that quality scores are properly calculated from existing score components (viral_score, tech_score, relevance_score) to provide meaningful distribution across all quality ranges.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the API endpoint `/api/stories` returns article data THEN the system maps `category_score` to `article.priority_score` which defaults to 0.0

1.2 WHEN the EnhancedAnalytics component processes score data THEN the system places all articles in the "0-49" (Poor/Low) quality range

1.3 WHEN the Quality Spectrum chart is rendered THEN the system displays a single large red bar representing all articles as "Poor" quality

1.4 WHEN articles have valid viral_score, tech_score, and relevance_score values THEN the system ignores these scores and returns category_score as 0

### Expected Behavior (Correct)

2.1 WHEN the API endpoint `/api/stories` returns article data THEN the system SHALL calculate category_score as a composite of viral_score, tech_score, and relevance_score

2.2 WHEN the EnhancedAnalytics component processes score data THEN the system SHALL distribute articles across quality ranges based on their calculated composite scores

2.3 WHEN the Quality Spectrum chart is rendered THEN the system SHALL display a proper distribution showing articles in Excellent (90-100), Good (70-89), Average (50-69), and Low (0-49) ranges

2.4 WHEN articles have valid viral_score, tech_score, and relevance_score values THEN the system SHALL use these to compute a meaningful category_score between 0-100

### Unchanged Behavior (Regression Prevention)

3.1 WHEN articles have null or missing score components THEN the system SHALL CONTINUE TO default category_score to 0

3.2 WHEN the API returns other article fields (title, url, source, summary, tags, etc.) THEN the system SHALL CONTINUE TO return these fields unchanged

3.3 WHEN the EnhancedAnalytics component calculates other metrics (timeline data, source distribution) THEN the system SHALL CONTINUE TO calculate these metrics using the same logic

3.4 WHEN the frontend processes articles for display in other components THEN the system SHALL CONTINUE TO use the same data structure and field names
