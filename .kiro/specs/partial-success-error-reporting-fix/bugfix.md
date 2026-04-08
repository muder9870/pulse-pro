# Bugfix Requirements Document

## Introduction

This document addresses a critical user experience bug where partial success scenarios (operations that complete with some successes and some failures) are incorrectly reported as complete failures to the user. This affects two key operations:

1. **Pipeline Operations**: When the pipeline successfully fetches data but encounters stage errors, the frontend displays "Failed to run pipeline" even though data was successfully populated in the database.

2. **RSS Feed Operations**: When bulk adding RSS feeds, if some feeds succeed (e.g., 19 out of 35), the frontend shows "Failed to add feeds" instead of indicating partial success.

The bug causes user confusion as they see failure messages despite successful data operations, requiring page refreshes to see the actual results.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the pipeline completes with stage errors (some stages succeed, some fail) THEN the backend sets `pipeline_state["last_error"] = "stage_errors"` and the frontend throws an error displaying "Failed to run pipeline" even though data was successfully fetched and stored

1.2 WHEN the pipeline completes with stage errors THEN the user must refresh the page to see the data that was actually populated in the database

1.3 WHEN bulk adding RSS feeds where some feeds succeed (e.g., 19 out of 35) THEN the backend returns 200 OK with `{"added": 19}` but the frontend provides no indication of which feeds failed or why

1.4 WHEN bulk adding RSS feeds with partial success THEN the user sees no clear feedback about the partial success (19 added, 16 failed) and no details about which specific feeds failed

### Expected Behavior (Correct)

2.1 WHEN the pipeline completes with stage errors but successfully fetches data THEN the system SHALL display a success message indicating data was fetched with a warning about stage errors, without throwing an error

2.2 WHEN the pipeline completes with stage errors THEN the system SHALL automatically refresh the article list so users can see the newly fetched data without manual page refresh

2.3 WHEN bulk adding RSS feeds with partial success (e.g., 19 out of 35 succeed) THEN the system SHALL display a message showing "Added 19 out of 35 feeds" with details about which feeds failed and why

2.4 WHEN bulk adding RSS feeds with partial success THEN the system SHALL provide actionable feedback allowing users to identify and retry failed feeds

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the pipeline completes successfully with no errors THEN the system SHALL CONTINUE TO display a success message and refresh the article list

3.2 WHEN the pipeline fails completely (no data fetched) THEN the system SHALL CONTINUE TO display an error message indicating complete failure

3.3 WHEN bulk adding RSS feeds where all feeds succeed THEN the system SHALL CONTINUE TO display a success message with the count of added feeds

3.4 WHEN bulk adding RSS feeds where all feeds fail THEN the system SHALL CONTINUE TO display an error message indicating complete failure

3.5 WHEN checking pipeline status via `/api/pipeline/status` THEN the system SHALL CONTINUE TO return the current pipeline state including running status, last_error, and last_result fields
