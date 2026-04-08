# Analytics Quality Score Fix - Bugfix Design

## Overview

The Intelligence Analytics dashboard incorrectly displays all articles as "Poor" quality (0-49 range) because the `category_score` field in the API response is mapped to `priority_score`, which defaults to 0.0 in the ProcessedArticle model. The fix will calculate `category_score` as a composite of the existing score components (viral_score, tech_score, relevance_score) in the `get_top_stories` function, ensuring proper quality distribution across all ranges (Poor, Average, Good, Excellent) in the Quality Spectrum chart.

## Glossary

- **Bug_Condition (C)**: The condition where category_score is incorrectly set to priority_score (0.0) instead of being calculated from score components
- **Property (P)**: The desired behavior where category_score is calculated as a composite of viral_score, tech_score, and relevance_score
- **Preservation**: Existing API response structure, other article fields, and analytics calculations that must remain unchanged
- **get_top_stories**: The function in `backend/database.py` that queries and returns processed articles for the dashboard
- **category_score**: The composite quality score (0-100) that should represent overall article quality
- **priority_score**: The decision engine field in ProcessedArticle that defaults to 0.0 and is currently incorrectly used for category_score
- **Quality Spectrum**: The chart component in EnhancedAnalytics that displays article distribution across quality ranges

## Bug Details

### Fault Condition

The bug manifests when the `get_top_stories` function returns article data to the API. The function maps `category_score` to `article.priority_score`, which is a decision engine field that defaults to 0.0 for all articles. This causes all articles to appear in the "Poor" quality range (0-49) regardless of their actual viral_score, tech_score, and relevance_score values.

**Formal Specification:**
```
FUNCTION isBugCondition(article)
  INPUT: article of type ProcessedArticle
  OUTPUT: boolean
  
  RETURN (article.viral_score IS NOT NULL OR 
          article.tech_score IS NOT NULL OR 
          article.relevance_score IS NOT NULL)
         AND article.priority_score == 0.0
         AND category_score_returned == article.priority_score
END FUNCTION
```

### Examples

- **Example 1**: Article with viral_score=80, tech_score=75, relevance_score=70 → category_score returns 0 (expected: ~75)
- **Example 2**: Article with viral_score=95, tech_score=90, relevance_score=85 → category_score returns 0 (expected: ~90)
- **Example 3**: Article with viral_score=45, tech_score=50, relevance_score=55 → category_score returns 0 (expected: ~50)
- **Edge Case**: Article with all null scores (viral_score=null, tech_score=null, relevance_score=null) → category_score should default to 0

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Articles with null or missing score components must continue to default category_score to 0
- All other article fields (title, url, source, summary, tags, hashtags, priority, created_at, fetched_at) must be returned unchanged
- EnhancedAnalytics calculations for timeline data, source distribution, and other metrics must continue using the same logic
- The API response structure and field names must remain identical

**Scope:**
All aspects of the API response that do NOT involve the category_score calculation should be completely unaffected by this fix. This includes:
- Article metadata fields (title, url, source, category, summary)
- Score component fields (viral_score, tech_score, relevance_score remain as individual fields)
- Tag and hashtag processing
- Timestamp fields
- Priority and priority_reason fields
- Query sorting and filtering logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Incorrect Field Mapping**: The `get_top_stories` function at line 219 in `backend/database.py` maps `category_score` to `article.priority_score`, which is a decision engine field unrelated to quality scoring.

2. **Default Value Issue**: The `priority_score` field in the ProcessedArticle model (line 47 in `backend/models.py`) defaults to 0.0, causing all articles without explicit priority scores to return 0.

3. **Missing Calculation**: There is no logic to calculate a composite score from the existing viral_score, tech_score, and relevance_score fields, even though these fields contain meaningful quality data.

4. **Semantic Mismatch**: The priority_score field serves a different purpose (decision engine prioritization) than what the dashboard needs (quality assessment for analytics).

## Correctness Properties

Property 1: Fault Condition - Category Score Calculation

_For any_ article where at least one score component (viral_score, tech_score, relevance_score) is not null, the fixed get_top_stories function SHALL calculate category_score as the average of all non-null score components, resulting in a value between 0-100 that accurately represents article quality.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Score Field Behavior

_For any_ article field that is NOT category_score (including title, url, source, summary, tags, hashtags, individual score components, timestamps, and priority fields), the fixed function SHALL return exactly the same values as the original function, preserving all existing API response structure and data.

**Validates: Requirements 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `backend/database.py`

**Function**: `get_top_stories` (starting at line 188)

**Specific Changes**:

1. **Calculate Composite Score**: Replace the direct mapping `"category_score": article.priority_score` with a calculation that computes the average of non-null score components.

2. **Handle Null Values**: Implement logic to collect only non-null scores from viral_score, tech_score, and relevance_score before averaging.

3. **Default to Zero**: When all score components are null, default category_score to 0 to maintain backward compatibility.

4. **Implementation Approach**:
   ```python
   # Collect non-null scores
   scores = []
   if article.viral_score is not None:
       scores.append(article.viral_score)
   if article.tech_score is not None:
       scores.append(article.tech_score)
   if article.relevance_score is not None:
       scores.append(article.relevance_score)
   
   # Calculate average or default to 0
   category_score = sum(scores) / len(scores) if scores else 0.0
   ```

5. **Update Dictionary Assignment**: Change line 219 from `"category_score": article.priority_score` to `"category_score": category_score` (using the calculated value).

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that articles with valid score components return category_score=0 on unfixed code.

**Test Plan**: Query the database for articles with non-null score components and verify that the API returns category_score=0. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **High Quality Article Test**: Query article with viral_score=90, tech_score=85, relevance_score=88 → expect category_score=0 on unfixed code (should be ~87.67)
2. **Medium Quality Article Test**: Query article with viral_score=60, tech_score=55, relevance_score=65 → expect category_score=0 on unfixed code (should be ~60)
3. **Mixed Scores Test**: Query article with viral_score=80, tech_score=null, relevance_score=70 → expect category_score=0 on unfixed code (should be 75)
4. **All Null Scores Test**: Query article with all null scores → expect category_score=0 on unfixed code (should remain 0 after fix)

**Expected Counterexamples**:
- All articles return category_score=0 regardless of their actual score component values
- Root cause confirmed: category_score is mapped to priority_score which defaults to 0.0

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (articles with non-null score components), the fixed function produces the expected composite score.

**Pseudocode:**
```
FOR ALL article WHERE isBugCondition(article) DO
  result := get_top_stories_fixed()
  article_data := find_article_in_result(article.id)
  ASSERT article_data.category_score == average_of_non_null_scores(article)
  ASSERT article_data.category_score > 0
  ASSERT article_data.category_score <= 100
END FOR
```

### Preservation Checking

**Goal**: Verify that for all article fields except category_score, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL article IN database DO
  result_original := get_top_stories_original()
  result_fixed := get_top_stories_fixed()
  
  FOR EACH field IN [title, url, source, summary, tags, hashtags, 
                     viral_score, tech_score, relevance_score, 
                     priority, created_at, fetched_at] DO
    ASSERT result_original[field] == result_fixed[field]
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different article configurations
- It catches edge cases that manual unit tests might miss (null values, empty strings, special characters)
- It provides strong guarantees that behavior is unchanged for all non-category_score fields

**Test Plan**: Capture the current API response structure on UNFIXED code for various articles, then write property-based tests to verify all fields except category_score remain identical after the fix.

**Test Cases**:
1. **Field Preservation Test**: Verify all non-score fields (title, url, source, summary, tags) return identical values before and after fix
2. **Individual Score Preservation Test**: Verify viral_score, tech_score, relevance_score fields are returned unchanged (not modified by the composite calculation)
3. **Null Handling Preservation Test**: Verify articles with null score components still return those fields as null (not converted to 0)
4. **Response Structure Preservation Test**: Verify the JSON structure, field names, and data types remain identical

### Unit Tests

- Test category_score calculation with all three scores present (viral, tech, relevance)
- Test category_score calculation with only two scores present (one null)
- Test category_score calculation with only one score present (two null)
- Test category_score defaults to 0 when all scores are null
- Test that individual score fields remain unchanged in the response
- Test that other article fields (title, url, source) remain unchanged

### Property-Based Tests

- Generate random articles with various score combinations and verify category_score is correctly calculated as the average of non-null scores
- Generate random articles and verify all non-category_score fields are preserved identically
- Generate edge cases (all nulls, all zeros, all 100s, mixed nulls) and verify correct handling

### Integration Tests

- Test full API endpoint `/api/stories` returns properly calculated category_scores
- Test EnhancedAnalytics component displays proper distribution across quality ranges (Poor, Average, Good, Excellent)
- Test Quality Spectrum chart shows multiple colored bars instead of single red bar
- Test that sorting and filtering functionality continues to work with the new category_score calculation
