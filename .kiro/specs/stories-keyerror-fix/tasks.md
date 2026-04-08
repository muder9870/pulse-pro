# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Tags Retrieved Successfully
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists (KeyError: 0 at line 682)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - calling get_top_stories() when stories with tags exist in the database
  - Test that get_top_stories() successfully returns stories with tags populated (from Fault Condition in design)
  - The test assertions should verify: result is a list of stories, stories with tags have tags field populated, stories with tags have hashtags field populated, no KeyError is raised
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with KeyError: 0 at line 682 (this is correct - it proves the bug exists)
  - Document counterexamples found: "get_top_stories() raises KeyError: 0 when attempting row[0] access at line 682"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Story Retrieval Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy aspects (may need to mock tags query to avoid crash, or test with database state that has no tags)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Story data structure (id, title, url, source, category, summary, scores, timestamps)
    - Sorting behavior (score-based default, category-based when sort='category')
    - Limit parameter handling (including None/"all" for unlimited results)
    - Stories with no tags return empty arrays for tags and hashtags
    - Hashtag generation from tags using tag_to_hashtag function
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code (with mocked tags query or no-tags database state)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for KeyError in get_top_stories tags query processing

  - [x] 3.1 Implement the fix in backend/database.py
    - Change line 682 from `aid = row[0]` to `aid = row['article_id']`
    - Change line 683 from `tag = row[1]` to `tag = row['tag']`
    - Use named column access to work with dictionary format returned by PostgresCursorAdapter
    - _Bug_Condition: isBugCondition(input) where input.database_type == "postgresql" AND input.adapter._process_row() returns dict AND input.result_access_method == "integer_indexing"_
    - _Expected_Behavior: Tags are successfully retrieved using row['article_id'] and row['tag'], tags_map is populated correctly, stories are returned with tags without KeyError_
    - _Preservation: All story retrieval, sorting, filtering, data structure, and hashtag generation behaviors remain unchanged (see Preservation Requirements in design)_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Tags Retrieved Successfully
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - get_top_stories() returns stories with tags successfully)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Story Retrieval Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in story data structure, sorting, filtering, or hashtag generation)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
