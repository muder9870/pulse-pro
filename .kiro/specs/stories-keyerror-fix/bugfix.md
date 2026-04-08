# Bugfix Requirements Document

## Introduction

The `/api/stories` endpoint crashes with a `KeyError: 0` when attempting to retrieve top stories. The error occurs in the `get_top_stories` function in `backend/database.py` at line 682, where the code attempts to access row data using integer indexing (`row[0]`, `row[1]`). After migrating from SQLite to Postgres, the `PostgresCursorAdapter._process_row()` method converts rows to dictionaries when `row_factory = sqlite3.Row` is set, but dictionaries don't support integer indexing. This prevents users from viewing the stories dashboard.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the `/api/stories` endpoint is called THEN the system crashes with `KeyError: 0` at line 682 in `get_top_stories` function

1.2 WHEN the tags query results are processed using `row[0]` and `row[1]` integer indexing THEN the system raises a KeyError because the PostgresCursorAdapter converts rows to dictionaries which don't support integer indexing

### Expected Behavior (Correct)

2.1 WHEN the `/api/stories` endpoint is called THEN the system SHALL successfully return the list of top stories without crashing

2.2 WHEN the tags query results are processed THEN the system SHALL access row columns using named column access (e.g., `row['article_id']`, `row['tag']`) compatible with `sqlite3.Row` objects

### Unchanged Behavior (Regression Prevention)

3.1 WHEN stories are retrieved with valid limit and sort parameters THEN the system SHALL CONTINUE TO return stories with correct data structure including id, title, url, source, category, summary, scores, and timestamps

3.2 WHEN stories have associated tags THEN the system SHALL CONTINUE TO populate the tags and hashtags fields correctly for each story

3.3 WHEN stories have no tags THEN the system SHALL CONTINUE TO return empty arrays for tags and hashtags fields

3.4 WHEN the limit parameter is None or "all" THEN the system SHALL CONTINUE TO return all stories without applying a limit

3.5 WHEN the sort parameter is "category" THEN the system SHALL CONTINUE TO sort stories by category first, then by score

3.6 WHEN the sort parameter is "score" or any other value THEN the system SHALL CONTINUE TO sort stories by total_score in descending order
