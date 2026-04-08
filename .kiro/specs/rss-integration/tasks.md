# Implementation Plan: RSS Integration

## Overview

This implementation plan converts the RSS integration design into discrete coding tasks. The approach leverages existing components (RSS fetcher and frontend UI) by adding the missing API endpoints and pipeline integration. Each task builds incrementally toward a complete RSS integration system that replaces Inoreader dependency.

## Tasks

- [x] 1. Implement RSS API endpoints in backend
  - [x] 1.1 Add GET /api/rss/feeds endpoint for listing feeds with statistics
    - ✅ Implemented endpoint in `backend/main.py`
    - ✅ Calls `RSSFetcher.get_feed_stats()` method
    - ✅ Returns JSON array of feed objects with health metrics
    - _Requirements: 1.2, 7.1_

  - [x] 1.2 Add POST /api/rss/feeds endpoint for adding new feeds
    - ✅ Implemented endpoint to accept URL and category
    - ✅ Calls `RSSFetcher.add_feed()` method with validation
    - ✅ Returns feed object with generated ID
    - _Requirements: 1.1, 7.2_

  - [x] 1.3 Write property test for RSS feed validation
    - **Property 1: RSS Feed Validation** ✅ **VALIDATED**
    - **Validates: Requirements 1.1, 2.2, 6.2**

  - [x] 1.4 Add DELETE /api/rss/feeds/{id} endpoint for removing feeds
    - ✅ Implemented endpoint to delete feed by ID
    - ✅ Remove feed from database with cascade to feed items
    - ✅ Returns success/error status
    - _Requirements: 1.3, 7.3_

  - [x] 1.5 Add PATCH /api/rss/feeds/{id} endpoint for updating feed settings
    - ✅ Implemented endpoint to toggle active status
    - ✅ Update feed active flag in database
    - ✅ Returns updated feed object
    - _Requirements: 1.4, 7.4_

  - [x] 1.6 Write property test for feed lifecycle management
    - **Property 3: Feed Lifecycle Management** ✅ **VALIDATED**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 2. Implement bulk RSS operations endpoints
  - [ ] 2.1 Add POST /api/rss/fetch-all endpoint for manual feed fetching
    - Implement endpoint to trigger `RSSFetcher.fetch_all_feeds()`
    - Return summary of fetched items per feed
    - Handle errors gracefully and continue with other feeds
    - _Requirements: 5.1, 7.5_

  - [ ] 2.2 Add POST /api/rss/add-defaults endpoint for default feeds
    - Implement endpoint to call `RSSFetcher.add_default_feeds()`
    - Return number of successfully added feeds
    - Avoid duplicating existing feeds
    - _Requirements: 6.1, 6.4, 6.5, 7.6_

  - [ ] 2.3 Add POST /api/rss/import-opml endpoint for OPML import
    - Implement endpoint to accept OPML content
    - Call `RSSFetcher.import_opml()` method
    - Return number of successfully imported feeds
    - _Requirements: 2.1, 2.3, 2.5, 7.7_

  - [ ]* 2.4 Write property test for OPML import completeness
    - **Property 4: OPML Import Completeness**
    - **Validates: Requirements 2.1, 2.5**

  - [ ]* 2.5 Write property test for error handling resilience
    - **Property 5: Error Handling Resilience**
    - **Validates: Requirements 2.4, 3.4, 5.5**

- [ ] 3. Checkpoint - Test API endpoints functionality
  - Ensure all RSS API endpoints are working correctly
  - Test with RSS Manager frontend component
  - Verify error handling and validation
  - Ask the user if questions arise

- [ ] 4. Integrate RSS fetcher into main pipeline
  - [ ] 4.1 Replace Inoreader fetcher in main_pipeline.py
    - Remove Inoreader fetcher section from `run_daily_pipeline()`
    - Add RSS fetcher integration using `RSSFetcher.fetch_all_feeds()`
    - Maintain same logging and error handling patterns
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ] 4.2 Ensure RSS content flows through existing processing stages
    - Verify RSS articles are stored in raw_articles table
    - Confirm RSS content goes through cleaner, deduplicator, analyzer
    - Test that RSS articles get scored and processed normally
    - _Requirements: 5.2, 8.3, 8.4_

  - [ ]* 4.3 Write property test for pipeline integration consistency
    - **Property 10: Pipeline Integration Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [ ]* 4.4 Write property test for content quality and integrity
    - **Property 11: Content Quality and Integrity**
    - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 5. Implement RSS content processing and monitoring
  - [ ] 5.1 Enhance content deduplication for RSS articles
    - Ensure RSS articles are checked for duplicates using URL and title
    - Verify duplicate articles are marked and skipped
    - Test deduplication across all content sources
    - _Requirements: 3.1, 8.1, 8.2_

  - [ ] 5.2 Implement comprehensive health monitoring
    - Ensure feed statistics are updated on successful/failed fetches
    - Verify error counts and timestamps are maintained
    - Test health status indicators work correctly
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.3 Write property test for content deduplication
    - **Property 7: Content Deduplication**
    - **Validates: Requirements 3.1, 8.1, 8.2**

  - [ ]* 5.4 Write property test for health monitoring accuracy
    - **Property 9: Health Monitoring Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 6. Implement content extraction and categorization
  - [ ] 6.1 Verify RSS content parsing extracts all required fields
    - Test that title, URL, content, publication date are extracted
    - Ensure source attribution is preserved correctly
    - Verify automatic categorization works for RSS content
    - _Requirements: 3.2, 3.3, 1.5_

  - [ ]* 6.2 Write property test for complete data extraction
    - **Property 8: Complete Data Extraction**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 6.3 Write property test for accurate operation reporting
    - **Property 6: Accurate Operation Reporting**
    - **Validates: Requirements 2.3, 5.3, 6.3**

- [ ] 7. Add RSS Manager to frontend navigation
  - [ ] 7.1 Integrate RSS Manager component into main navigation
    - Add RSS Manager link to main dashboard navigation
    - Ensure RSS Manager component is accessible from menu
    - Test that all RSS Manager functionality works through UI
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 7.2 Write integration tests for RSS Manager UI
    - Test frontend-backend communication through RSS Manager
    - Verify all API endpoints work correctly with UI
    - Test OPML import functionality through interface

- [ ] 8. Final integration testing and validation
  - [ ] 8.1 Test complete RSS workflow end-to-end
    - Test adding feeds, importing OPML, fetching content
    - Verify content flows through entire pipeline
    - Test that RSS content appears in dashboard
    - _Requirements: All requirements_

  - [ ]* 8.2 Write property test for default feed management
    - **Property 12: Default Feed Management**
    - **Validates: Requirements 6.1, 6.4, 6.5**

  - [ ]* 8.3 Write property test for complete feed information retrieval
    - **Property 2: Complete Feed Information Retrieval**
    - **Validates: Requirements 1.2**

- [ ] 9. Final checkpoint - Complete system validation
  - Ensure all tests pass and RSS integration works end-to-end
  - Verify Inoreader dependency is completely replaced
  - Test with user's 38 RSS sources via OPML import
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties
- Integration tests ensure components work together correctly
- The RSS fetcher and RSS Manager components already exist and are comprehensive
- Focus is on connecting existing components through API endpoints and pipeline integration