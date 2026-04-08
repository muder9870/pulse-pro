# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Category Score Returns Zero for Articles with Valid Score Components
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to articles with at least one non-null score component (viral_score, tech_score, or relevance_score)
  - Test that get_top_stories returns category_score=0 for articles where isBugCondition(article) is true (article has non-null score components but priority_score=0.0)
  - The test assertions should verify that category_score equals the average of non-null score components (from Expected Behavior Properties in design)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Article with viral_score=80, tech_score=75, relevance_score=70 returns category_score=0 instead of 75")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Category-Score Fields Remain Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for all article fields except category_score
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that all non-category_score fields (title, url, source, summary, tags, hashtags, viral_score, tech_score, relevance_score, priority, created_at, fetched_at) return identical values
  - Test that articles with null score components continue to default category_score to 0
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for incorrect category_score calculation in get_top_stories

  - [x] 3.1 Implement the fix in backend/database.py
    - Modify get_top_stories function (starting at line 188)
    - Replace direct mapping "category_score": article.priority_score with composite score calculation
    - Collect non-null scores from viral_score, tech_score, and relevance_score
    - Calculate category_score as average of non-null scores, or default to 0.0 if all are null
    - Update dictionary assignment at line 219 to use calculated category_score value
    - _Bug_Condition: isBugCondition(article) where (article.viral_score IS NOT NULL OR article.tech_score IS NOT NULL OR article.relevance_score IS NOT NULL) AND article.priority_score == 0.0 AND category_score_returned == article.priority_score_
    - _Expected_Behavior: category_score = average of non-null score components (viral_score, tech_score, relevance_score), resulting in value between 0-100_
    - _Preservation: All non-category_score fields (title, url, source, summary, tags, hashtags, individual score components, timestamps, priority fields) must return identical values; articles with all null scores must continue to default category_score to 0_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Category Score Calculated from Score Components
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify category_score is calculated as average of non-null score components
    - Verify category_score values are between 0-100
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Category-Score Fields Unchanged After Fix
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all non-category_score fields return identical values
    - Confirm articles with all null scores still default to category_score=0
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
