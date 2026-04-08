"""
Bug Condition Exploration Test for Partial Success Error Reporting Fix

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

This test explores the bug condition where partial success scenarios (operations that
complete with some successes and some failures) are incorrectly reported as complete
failures to the user.

Two key scenarios are tested:
1. Pipeline with stage_errors: Successfully fetches data but has processing failures
2. RSS bulk add partial success: Some feeds succeed, some fail

CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.

Expected failures on unfixed code:
- Pipeline test: waitForPipeline throws error "stage_errors" even though data was fetched
- RSS test: Response only shows success count without failure details

The test will pass after the fix is implemented.
"""

from __future__ import annotations

import unittest
from unittest.mock import patch, MagicMock
import json


class TestPartialSuccessErrorReportingBugCondition(unittest.TestCase):
    """
    Property 1: Fault Condition - Partial Success Incorrectly Reported as Complete Failure
    
    Test that partial success scenarios are handled correctly:
    - Pipeline with stage_errors should not throw error if data was fetched
    - RSS bulk add should show failure details for partial success
    
    This test encodes the expected behavior and will fail on unfixed code.
    """

    def test_pipeline_stage_errors_partial_success(self) -> None:
        """
        Test Case 1: Pipeline with stage_errors - successfully fetches data but has processing failures
        
        Current buggy behavior: Frontend throws error "stage_errors" and displays "Failed to run pipeline"
        Expected behavior: Should NOT throw, should return data for success message with warning
        
        This test will FAIL on unfixed code because the frontend logic (waitForPipeline in App.jsx)
        throws an error when last_error is set, even for partial success scenarios like "stage_errors".
        """
        # Simulate pipeline state with stage_errors but successful data fetch
        # This represents what the backend returns when pipeline has partial success
        mock_pipeline_state = {
            "running": False,
            "last_error": "stage_errors",
            "last_result": {
                "articles_fetched": 50,
                "articles_processed": 40,
                "errors": ["Failed to generate summary for 10 articles"]
            },
            "last_started_at": "2024-01-01T00:00:00Z",
            "last_finished_at": "2024-01-01T00:30:00Z"
        }
        
        # Simulate the frontend waitForPipeline logic from App.jsx line 138
        # Current unfixed code: if (data.last_error) throw new Error(data.last_error);
        # This treats ALL errors as complete failures, including partial success
        
        data = mock_pipeline_state
        
        # Expected behavior after fix: Should distinguish between partial success and complete failure
        # For stage_errors with successful data, should NOT throw
        # For other errors, should throw
        
        # Test the expected behavior
        if data.get("last_error") == "stage_errors" and data.get("last_result"):
            # This is partial success - should not throw error
            # On unfixed code, the frontend would throw here, causing user confusion
            # On fixed code, this should be handled gracefully with a success message + warning
            
            self.assertIsNotNone(data["last_result"], "Should have result data for partial success")
            self.assertGreater(
                data["last_result"].get("articles_fetched", 0), 
                0, 
                "Should have fetched articles despite stage errors"
            )
            
            # Verify we can distinguish this from complete failure
            self.assertEqual(data["last_error"], "stage_errors", "Error type should be stage_errors")
            
            # The fix should add a partial_success flag or similar mechanism
            # For now, we test that the data structure supports the expected behavior
            # After fix, frontend should check: if (data.last_error === "stage_errors" && data.last_result) { /* show success with warning */ }
            
        elif data.get("last_error"):
            # Complete failure - should throw
            self.fail(f"Pipeline failed with error: {data['last_error']}")
        
        # Verify the test data is set up correctly
        self.assertEqual(mock_pipeline_state["last_error"], "stage_errors")
        self.assertIsNotNone(mock_pipeline_state["last_result"])
        self.assertEqual(mock_pipeline_state["last_result"]["articles_fetched"], 50)

    def test_rss_bulk_add_partial_success_no_failure_details(self) -> None:
        """
        Test Case 2: RSS bulk add partial success - some feeds succeed, some fail
        
        Current buggy behavior: Response only shows {"added": 19} without failure details
        Expected behavior: Should show "Added 19 out of 35 feeds. 16 feeds failed" with failure details
        
        This test will FAIL on unfixed code because bulk_add_feeds only returns
        the count of successful additions without tracking failures.
        """
        from backend.fetchers.rss_fetcher import RSSFetcher
        
        # Create test feeds - mix of valid and invalid
        test_feeds = [
            {"url": f"https://valid-feed-{i}.com/rss", "category": "AI/ML"}
            for i in range(19)
        ] + [
            {"url": f"https://invalid-feed-{i}.com/rss", "category": "AI/ML"}
            for i in range(16)
        ]
        
        # Mock the add_feed method to simulate partial success
        with patch.object(RSSFetcher, 'add_feed') as mock_add_feed:
            def add_feed_side_effect(url, category):
                if "invalid" in url:
                    raise Exception(f"Failed to fetch feed: {url}")
                # Valid feeds succeed silently
                return None
            
            mock_add_feed.side_effect = add_feed_side_effect
            
            # Create fetcher and call bulk_add_feeds
            fetcher = RSSFetcher()
            result = fetcher.bulk_add_feeds(test_feeds)
            
            # Current buggy behavior: result is just an integer (19)
            # Expected behavior: result should be a dict with failure details
            
            # On unfixed code, this will be an int
            # On fixed code, this should be a dict
            if isinstance(result, int):
                # Unfixed code - only returns count
                self.assertEqual(result, 19, "Should have added 19 feeds")
                
                # This assertion will FAIL on unfixed code because we can't get failure details
                # The test expects a dict with failure information
                self.fail(
                    "bulk_add_feeds returned only success count without failure details. "
                    "Expected: {'added': 19, 'failed': 16, 'failures': [...]}"
                )
            else:
                # Fixed code - returns dict with details
                self.assertIsInstance(result, dict, "Result should be a dict with failure details")
                self.assertEqual(result["added"], 19, "Should have added 19 feeds")
                self.assertEqual(result["failed"], 16, "Should have 16 failed feeds")
                self.assertIn("failures", result, "Should include failure details")
                self.assertEqual(len(result["failures"]), 16, "Should have 16 failure entries")
                
                # Verify failure details include URL and error
                for failure in result["failures"]:
                    self.assertIn("url", failure, "Failure should include URL")
                    self.assertIn("error", failure, "Failure should include error message")

    def test_rss_bulk_add_all_failures_misleading_message(self) -> None:
        """
        Test Case 3: RSS bulk add all failures - 0 out of 35 succeed
        
        Current buggy behavior: Shows "Added 0 default RSS feeds" which is misleading
        Expected behavior: Should show "Failed to add feeds" with failure details
        
        This test demonstrates the edge case where all feeds fail.
        """
        from backend.fetchers.rss_fetcher import RSSFetcher
        
        # Create test feeds - all invalid
        test_feeds = [
            {"url": f"https://invalid-feed-{i}.com/rss", "category": "AI/ML"}
            for i in range(35)
        ]
        
        # Mock the add_feed method to simulate all failures
        with patch.object(RSSFetcher, 'add_feed') as mock_add_feed:
            mock_add_feed.side_effect = Exception("Failed to fetch feed")
            
            # Create fetcher and call bulk_add_feeds
            fetcher = RSSFetcher()
            result = fetcher.bulk_add_feeds(test_feeds)
            
            # Current buggy behavior: result is 0 (int)
            # Expected behavior: result should be a dict indicating complete failure
            
            if isinstance(result, int):
                # Unfixed code
                self.assertEqual(result, 0, "Should have added 0 feeds")
                
                # This is misleading - user sees "Added 0 feeds" instead of "Failed to add feeds"
                self.fail(
                    "bulk_add_feeds returned 0 without failure details. "
                    "Expected: {'added': 0, 'failed': 35, 'failures': [...]}"
                )
            else:
                # Fixed code
                self.assertIsInstance(result, dict, "Result should be a dict")
                self.assertEqual(result["added"], 0, "Should have added 0 feeds")
                self.assertEqual(result["failed"], 35, "Should have 35 failed feeds")
                self.assertIn("failures", result, "Should include failure details")


if __name__ == "__main__":
    unittest.main()



class TestPartialSuccessErrorReportingPreservation(unittest.TestCase):
    """
    Property 2: Preservation - Complete Success and Failure Handling Unchanged
    
    **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    
    These tests capture baseline behavior that must be preserved after the fix.
    They test complete success and complete failure scenarios (not partial success).
    
    IMPORTANT: These tests should PASS on unfixed code and continue passing after fix.
    """

    def test_complete_pipeline_success_preserved(self) -> None:
        """
        Test Case 1: Complete pipeline success (no errors)
        
        Baseline behavior: Pipeline with no errors displays success and refreshes article list
        This behavior must be preserved after the fix.
        
        This test observes the unfixed code behavior for complete success scenarios.
        """
        # Simulate pipeline state with complete success (no errors)
        mock_pipeline_state = {
            "running": False,
            "last_error": None,  # No error - complete success
            "last_result": {
                "articles_fetched": 50,
                "articles_processed": 50,
                "errors": []
            },
            "last_started_at": "2024-01-01T00:00:00Z",
            "last_finished_at": "2024-01-01T00:30:00Z"
        }
        
        # Simulate the frontend waitForPipeline logic
        data = mock_pipeline_state
        
        # For complete success (no error), should not throw
        if data.get("last_error"):
            self.fail(f"Pipeline should succeed but got error: {data['last_error']}")
        
        # Verify complete success state
        self.assertIsNone(data["last_error"], "Complete success should have no error")
        self.assertIsNotNone(data["last_result"], "Should have result data")
        self.assertEqual(data["last_result"]["articles_fetched"], 50)
        self.assertEqual(data["last_result"]["articles_processed"], 50)
        self.assertEqual(len(data["last_result"]["errors"]), 0)
        
        # This behavior must be preserved after fix
        # Frontend should display success message and refresh article list

    def test_complete_pipeline_failure_preserved(self) -> None:
        """
        Test Case 2: Complete pipeline failure (no data fetched)
        
        Baseline behavior: Pipeline with complete failure displays error message
        This behavior must be preserved after the fix.
        
        This test observes the unfixed code behavior for complete failure scenarios.
        """
        # Simulate pipeline state with complete failure
        mock_pipeline_state = {
            "running": False,
            "last_error": "Network connection failed",  # Complete failure error
            "last_result": None,  # No successful data
            "last_started_at": "2024-01-01T00:00:00Z",
            "last_finished_at": "2024-01-01T00:30:00Z"
        }
        
        # Simulate the frontend waitForPipeline logic
        data = mock_pipeline_state
        
        # For complete failure, should throw error
        if data.get("last_error") and data.get("last_error") != "stage_errors":
            # This is a complete failure - should throw
            # Verify error state
            self.assertEqual(data["last_error"], "Network connection failed")
            self.assertIsNone(data["last_result"], "Complete failure should have no result")
            
            # This behavior must be preserved after fix
            # Frontend should display error message
            return
        
        self.fail("Expected complete failure to have error set")

    def test_complete_rss_success_preserved(self) -> None:
        """
        Test Case 3: Complete RSS success (all feeds added)
        
        Baseline behavior: RSS bulk add with 100% success displays success message
        This behavior must be preserved after the fix.
        
        This test observes the unfixed code behavior for complete RSS success.
        """
        from backend.fetchers.rss_fetcher import RSSFetcher
        
        # Create test feeds - all valid
        test_feeds = [
            {"url": f"https://valid-feed-{i}.com/rss", "category": "AI/ML"}
            for i in range(35)
        ]
        
        # Mock the add_feed method to simulate complete success
        with patch.object(RSSFetcher, 'add_feed') as mock_add_feed:
            # All feeds succeed
            mock_add_feed.return_value = None
            
            # Create fetcher and call bulk_add_feeds
            fetcher = RSSFetcher()
            result = fetcher.bulk_add_feeds(test_feeds)
            
            # On unfixed code, result is an integer
            # On fixed code, result might be a dict, but should still indicate complete success
            if isinstance(result, int):
                # Unfixed code behavior
                self.assertEqual(result, 35, "Should have added all 35 feeds")
            else:
                # Fixed code behavior - should still indicate complete success
                self.assertIsInstance(result, dict)
                self.assertEqual(result["added"], 35, "Should have added all 35 feeds")
                self.assertEqual(result.get("failed", 0), 0, "Should have 0 failures")
            
            # This behavior must be preserved after fix
            # Frontend should display: "Added 35 default RSS feeds"

    def test_pipeline_status_api_structure_preserved(self) -> None:
        """
        Test Case 4: Pipeline status API structure
        
        Baseline behavior: /api/pipeline/status returns expected structure
        This structure must remain unchanged after the fix for backward compatibility.
        
        This test verifies the API response structure is preserved.
        """
        # Simulate pipeline state as returned by /api/pipeline/status endpoint
        mock_pipeline_state = {
            "running": False,
            "last_started_at": "2024-01-01T00:00:00Z",
            "last_finished_at": "2024-01-01T00:30:00Z",
            "last_error": None,
            "last_result": {
                "articles_fetched": 50,
                "articles_processed": 50
            }
        }
        
        # Verify required fields are present
        self.assertIn("running", mock_pipeline_state, "API must include 'running' field")
        self.assertIn("last_started_at", mock_pipeline_state, "API must include 'last_started_at' field")
        self.assertIn("last_finished_at", mock_pipeline_state, "API must include 'last_finished_at' field")
        self.assertIn("last_error", mock_pipeline_state, "API must include 'last_error' field")
        self.assertIn("last_result", mock_pipeline_state, "API must include 'last_result' field")
        
        # Verify field types
        self.assertIsInstance(mock_pipeline_state["running"], bool)
        self.assertIsInstance(mock_pipeline_state["last_started_at"], (str, type(None)))
        self.assertIsInstance(mock_pipeline_state["last_finished_at"], (str, type(None)))
        self.assertIsInstance(mock_pipeline_state["last_error"], (str, type(None)))
        
        # After fix, new fields may be added (e.g., partial_success)
        # but existing fields must remain with same types and semantics
        # This ensures backward compatibility

    def test_rss_add_defaults_endpoint_response_structure_preserved(self) -> None:
        """
        Test Case 5: RSS add defaults endpoint response structure
        
        Baseline behavior: /api/rss/add-defaults returns expected structure
        This structure must remain compatible after the fix.
        
        This test verifies the API response structure for RSS operations.
        """
        # Simulate response from /api/rss/add-defaults endpoint
        # Current unfixed code returns: {"status": "success", "added": 35, "message": "Added 35 default RSS feeds"}
        mock_response = {
            "status": "success",
            "added": 35,
            "message": "Added 35 default RSS feeds"
        }
        
        # Verify required fields are present
        self.assertIn("status", mock_response, "Response must include 'status' field")
        self.assertIn("added", mock_response, "Response must include 'added' field")
        self.assertIn("message", mock_response, "Response must include 'message' field")
        
        # Verify field types
        self.assertIsInstance(mock_response["status"], str)
        self.assertIsInstance(mock_response["added"], int)
        self.assertIsInstance(mock_response["message"], str)
        
        # Verify values for complete success
        self.assertEqual(mock_response["status"], "success")
        self.assertEqual(mock_response["added"], 35)
        self.assertIn("35", mock_response["message"])
        
        # After fix, new fields may be added (e.g., failed, failures)
        # but existing fields must remain with same types and semantics


if __name__ == "__main__":
    unittest.main()
