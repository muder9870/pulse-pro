# Stories KeyError Fix Bugfix Design

## Overview

The `/api/stories` endpoint crashes with a `KeyError: 0` when attempting to retrieve top stories. The bug occurs in the `get_top_stories` function in `backend/database.py` at line 682-683, where the code uses integer indexing (`row[0]`, `row[1]`) to access columns from query results. After migrating from SQLite to Postgres, the `PostgresCursorAdapter._process_row()` method converts rows to dictionaries when `conn.row_factory = sqlite3.Row` is set (line 626). Dictionaries don't support integer indexing, only named key access. The fix requires changing the integer indexing to named column access (`row['article_id']`, `row['tag']`) to work with the dictionary format. This is a minimal, targeted fix that only affects the tags query result processing.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the tags query results are processed using integer indexing on a Row object configured for named access
- **Property (P)**: The desired behavior - tags should be successfully retrieved and mapped to stories using named column access
- **Preservation**: All existing story retrieval, sorting, filtering, and data structure behaviors that must remain unchanged
- **get_top_stories**: The function in `backend/database.py` (line 624) that retrieves processed articles for the dashboard
- **sqlite3.Row**: A row factory that provides both integer and named access to columns, but in this context is configured for named access only
- **tags_map**: A dictionary that maps article IDs to their associated tags, populated from the article_tags table

## Bug Details

### Fault Condition

The bug manifests when the `get_top_stories` function processes the tags query results. After setting `conn.row_factory = sqlite3.Row` at line 626, the `PostgresCursorAdapter._process_row()` method (introduced during the SQLite → Postgres migration) converts each row to a dictionary. The code then attempts to access columns using integer indexing (`row[0]`, `row[1]`), which raises a `KeyError: 0` because dictionaries don't support integer indexing - they require string keys.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type QueryExecution
  OUTPUT: boolean
  
  RETURN input.database_type == "postgresql"
         AND input.connection.row_factory == sqlite3.Row
         AND input.adapter._process_row() returns dict
         AND input.result_access_method == "integer_indexing"
         AND NOT tags_successfully_retrieved
END FUNCTION
```

### Examples

- **Example 1**: User calls `/api/stories` endpoint → `get_top_stories()` executes → tags query runs → code attempts `row[0]` → `KeyError: 0` raised → endpoint crashes
- **Example 2**: User calls `/api/stories?limit=5` → same crash occurs regardless of limit parameter
- **Example 3**: User calls `/api/stories?sort=category` → same crash occurs regardless of sort parameter
- **Edge case**: If no stories exist, the function returns early before the tags query, so no crash occurs (but this is not the normal case)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Stories must continue to be retrieved with the correct data structure (id, title, url, source, category, summary, scores, timestamps)
- Sorting by score (default) and by category must continue to work exactly as before
- Limit parameter handling (including None/"all" for unlimited results) must remain unchanged
- Stories with no tags must continue to return empty arrays for tags and hashtags fields
- The total_score calculation and removal from final output must remain unchanged
- Duplicate filtering (is_duplicate = 0) must continue to work

**Scope:**
All inputs and behaviors that do NOT involve the specific tags query result processing (lines 682-683) should be completely unaffected by this fix. This includes:
- The main stories query and its results processing
- All sorting logic (score-based and category-based)
- All filtering logic (duplicates, limits)
- The story data structure transformation
- The hashtag generation from tags

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Postgres Migration Adapter Issue**: After migrating from SQLite to Postgres, a `PostgresCursorAdapter` was introduced to handle compatibility. When `conn.row_factory = sqlite3.Row` is set at line 626, the adapter's `_process_row()` method converts each row to a dictionary (to emulate SQLite's Row behavior). However, the tags query result processing at lines 682-683 uses integer indexing (`row[0]`, `row[1]`), which doesn't work on dictionaries.

2. **Inconsistent Access Pattern**: The main stories query results are correctly accessed using named columns (e.g., `dict(row)` at line 659), but the tags query results use a different access pattern (integer indexing), creating an inconsistency that wasn't caught during migration.

3. **Dictionary vs Tuple Mismatch**: The adapter returns dictionaries when `row_factory = sqlite3.Row`, but the code assumes tuple-like integer indexing will work. Dictionaries require string keys (`row['article_id']`, `row['tag']`).

## Correctness Properties

Property 1: Fault Condition - Tags Retrieved Successfully

_For any_ execution where the tags query returns results and the connection uses Postgres with `PostgresCursorAdapter` that converts rows to dictionaries, the fixed function SHALL successfully access the article_id and tag columns using named column access (`row['article_id']`, `row['tag']`), populate the tags_map dictionary correctly, and return stories with their associated tags without raising a KeyError.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Story Retrieval Behavior

_For any_ input parameters (limit, sort) and database state, the fixed function SHALL produce exactly the same story data structure, sorting order, filtering behavior, and hashtag generation as the original function, preserving all existing functionality except for the specific column access method in the tags query processing.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

The root cause is confirmed: integer indexing on a Row object configured for named access.

**File**: `backend/database.py`

**Function**: `get_top_stories` (line 624)

**Specific Changes**:
1. **Line 682**: Change `aid = row[0]` to `aid = row['article_id']`
   - Use the column name from the SELECT statement
   - Matches the row factory configuration

2. **Line 683**: Change `tag = row[1]` to `tag = row['tag']`
   - Use the column name from the SELECT statement
   - Maintains consistency with named access pattern

**No other changes are required**. The fix is minimal and targeted to only the two lines that cause the crash.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is indeed the integer indexing on dictionary objects returned by the PostgresCursorAdapter.

**Test Plan**: Write tests that call `get_top_stories()` with various parameters and assert that stories with tags are returned successfully. Run these tests on the UNFIXED code to observe the `KeyError: 0` failure.

**Test Cases**:
1. **Basic Stories Retrieval**: Call `get_top_stories()` with default parameters when stories with tags exist in the database (will fail on unfixed code with KeyError: 0)
2. **Limited Results**: Call `get_top_stories(limit=5)` when stories with tags exist (will fail on unfixed code)
3. **Category Sort**: Call `get_top_stories(sort='category')` when stories with tags exist (will fail on unfixed code)
4. **No Stories Edge Case**: Call `get_top_stories()` when no stories exist (may pass on unfixed code because it returns early)

**Expected Counterexamples**:
- `KeyError: 0` raised at line 682 when attempting to access `row[0]`
- The error occurs specifically in the tags query result processing loop
- Confirms that integer indexing is incompatible with the dictionary format returned by PostgresCursorAdapter

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (tags query returns results), the fixed function produces the expected behavior (tags are successfully retrieved and mapped).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := get_top_stories_fixed(input.limit, input.sort)
  ASSERT result is list of stories
  ASSERT each story with tags has tags field populated correctly
  ASSERT each story with tags has hashtags field populated correctly
  ASSERT no KeyError is raised
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (or for all aspects of behavior unrelated to the tags query processing), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT get_top_stories_original(input) = get_top_stories_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different limits, sort orders, database states)
- It catches edge cases that manual unit tests might miss (empty results, single story, many stories)
- It provides strong guarantees that behavior is unchanged for all non-buggy aspects

**Test Plan**: Observe behavior on UNFIXED code first for stories without tags (if possible) or mock the tags query to avoid the crash, then write property-based tests capturing that the story data structure, sorting, and filtering remain unchanged.

**Test Cases**:
1. **Story Data Structure Preservation**: Verify that each story contains all expected fields (id, title, url, source, category, summary, scores, timestamps) with correct values
2. **Sorting Preservation**: Verify that score-based sorting and category-based sorting produce the same order before and after the fix
3. **Limit Preservation**: Verify that limit parameter (including None/"all") produces the same number of results
4. **Hashtag Generation Preservation**: Verify that hashtags are generated from tags using the same `tag_to_hashtag` function

### Unit Tests

- Test `get_top_stories()` with default parameters returns stories with tags
- Test `get_top_stories(limit=5)` returns at most 5 stories with tags
- Test `get_top_stories(sort='category')` returns stories sorted by category
- Test `get_top_stories()` with no stories in database returns empty list
- Test stories with no tags have empty tags and hashtags arrays
- Test stories with multiple tags have all tags populated correctly

### Property-Based Tests

- Generate random limit values (1-100, None) and verify stories are returned with correct tag data
- Generate random sort parameters ('score', 'category') and verify sorting is preserved
- Generate random database states (varying numbers of stories, tags per story) and verify tag mapping is correct
- Test that all story fields remain unchanged across many scenarios

### Integration Tests

- Test full `/api/stories` endpoint call returns 200 status with valid JSON
- Test endpoint with query parameters (`?limit=10&sort=category`) works correctly
- Test that stories displayed in the dashboard UI show tags correctly
- Test that the endpoint handles database connection errors gracefully
