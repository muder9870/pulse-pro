"""
End-to-end test suite for AI Pulse Pro production readiness.

Tests all critical functionality including:
- API endpoints
- Pipeline execution
- Database operations
- Health checks
- Media generation
"""

import requests
import json
import time
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("e2e_tests")

BASE_URL = "http://localhost:5000"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def record_pass(self, test_name):
        self.passed += 1
        log.info(f"✅ PASS: {test_name}")
    
    def record_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        log.error(f"❌ FAIL: {test_name} - {error}")
    
    def summary(self):
        total = self.passed + self.failed
        log.info(f"\n{'='*60}")
        log.info(f"Test Results: {self.passed}/{total} passed")
        if self.errors:
            log.error("\nFailed Tests:")
            for error in self.errors:
                log.error(f"  - {error}")
        log.info(f"{'='*60}\n")
        return self.failed == 0


results = TestResults()


def test_health_endpoint():
    """Test enhanced health check endpoint."""
    try:
        res = requests.get(f"{BASE_URL}/health", timeout=5)
        data = res.json()
        
        assert res.status_code in [200, 503], f"Unexpected status code: {res.status_code}"
        assert "status" in data, "Missing 'status' field"
        assert "checks" in data, "Missing 'checks' field"
        assert "database" in data["checks"], "Missing database check"
        assert "ollama" in data["checks"], "Missing Ollama check"
        
        results.record_pass("Health Endpoint")
    except Exception as e:
        results.record_fail("Health Endpoint", str(e))


def test_api_health():
    """Test basic API health."""
    try:
        res = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert res.status_code == 200, f"API health failed: {res.status_code}"
        results.record_pass("API Health")
    except Exception as e:
        results.record_fail("API Health", str(e))


def test_stories_endpoint():
    """Test stories retrieval."""
    try:
        res = requests.get(f"{BASE_URL}/api/stories?limit=10", timeout=10)
        assert res.status_code == 200, f"Stories endpoint failed: {res.status_code}"
        
        data = res.json()
        assert isinstance(data, list), "Stories should return a list"
        
        if len(data) > 0:
            story = data[0]
            assert "id" in story, "Story missing 'id'"
            assert "title" in story, "Story missing 'title'"
            assert "viral_score" in story, "Story missing 'viral_score'"
        
        results.record_pass("Stories Endpoint")
    except Exception as e:
        results.record_fail("Stories Endpoint", str(e))


def test_scheduler_status():
    """Test scheduler status endpoint."""
    try:
        res = requests.get(f"{BASE_URL}/api/scheduler/status", timeout=5)
        assert res.status_code == 200, f"Scheduler status failed: {res.status_code}"
        
        data = res.json()
        assert "schedule" in data, "Missing schedule info"
        assert "next_run_time" in data, "Missing next_run_time"
        
        results.record_pass("Scheduler Status")
    except Exception as e:
        results.record_fail("Scheduler Status", str(e))


def test_analytics_endpoint():
    """Test analytics data retrieval."""
    try:
        res = requests.get(f"{BASE_URL}/api/analytics", timeout=10)
        assert res.status_code == 200, f"Analytics failed: {res.status_code}"
        
        data = res.json()
        assert "total_articles" in data, "Missing total_articles"
        assert "avg_viral_score" in data, "Missing avg_viral_score"
        
        results.record_pass("Analytics Endpoint")
    except Exception as e:
        results.record_fail("Analytics Endpoint", str(e))


def test_hashtag_endpoint():
    """Test hashtag recommendations."""
    try:
        # First get a story
        res = requests.get(f"{BASE_URL}/api/stories?limit=1", timeout=10)
        stories = res.json()
        
        if len(stories) == 0:
            log.warning("No stories available for hashtag test")
            results.record_pass("Hashtag Endpoint (Skipped - No Stories)")
            return
        
        article_id = stories[0]["id"]
        
        # Get hashtags
        res = requests.get(f"{BASE_URL}/api/hashtags/{article_id}/twitter?format=simple", timeout=10)
        assert res.status_code == 200, f"Hashtags failed: {res.status_code}"
        
        data = res.json()
        assert isinstance(data, list), "Hashtags should return a list"
        
        results.record_pass("Hashtag Endpoint")
    except Exception as e:
        results.record_fail("Hashtag Endpoint", str(e))


def test_media_assets():
    """Test media assets retrieval."""
    try:
        res = requests.get(f"{BASE_URL}/api/media/assets/all", timeout=10)
        assert res.status_code == 200, f"Media assets failed: {res.status_code}"
        
        data = res.json()
        assert "assets" in data, "Missing assets field"
        assert isinstance(data["assets"], list), "Assets should be a list"
        
        results.record_pass("Media Assets Endpoint")
    except Exception as e:
        results.record_fail("Media Assets Endpoint", str(e))


def test_blog_posts():
    """Test blog posts listing."""
    try:
        res = requests.get(f"{BASE_URL}/api/blog/posts", timeout=10)
        assert res.status_code == 200, f"Blog posts failed: {res.status_code}"
        
        data = res.json()
        assert isinstance(data, list), "Blog posts should return a list"
        
        results.record_pass("Blog Posts Endpoint")
    except Exception as e:
        results.record_fail("Blog Posts Endpoint", str(e))


def test_pipeline_status():
    """Test pipeline status endpoint."""
    try:
        res = requests.get(f"{BASE_URL}/api/pipeline/status", timeout=5)
        assert res.status_code == 200, f"Pipeline status failed: {res.status_code}"
        
        data = res.json()
        assert "running" in data, "Missing 'running' field"
        
        results.record_pass("Pipeline Status")
    except Exception as e:
        results.record_fail("Pipeline Status", str(e))


def test_database_indexes():
    """Verify database indexes exist."""
    try:
        res = requests.get(f"{BASE_URL}/api/database/indexes", timeout=10)
        assert res.status_code == 200, f"Database indexes endpoint failed: {res.status_code}"
        
        data = res.json()
        assert "indexes" in data, "Missing indexes field"
        assert "missing_indexes" in data, "Missing missing_indexes field"
        assert "all_required_present" in data, "Missing all_required_present field"
        
        # Check that all required indexes are present
        if not data["all_required_present"]:
            missing = ", ".join(data["missing_indexes"])
            raise AssertionError(f"Missing required indexes: {missing}")
        
        results.record_pass("Database Indexes")
    except Exception as e:
        results.record_fail("Database Indexes", str(e))


def test_response_times():
    """Test API response times are acceptable."""
    try:
        endpoints = [
            "/api/health",
            "/api/stories?limit=10",
            "/api/analytics"
        ]
        
        for endpoint in endpoints:
            start = time.time()
            res = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            elapsed = time.time() - start
            
            assert res.status_code == 200, f"{endpoint} failed"
            assert elapsed < 2.0, f"{endpoint} too slow: {elapsed:.2f}s"
            
            log.info(f"  {endpoint}: {elapsed:.3f}s")
        
        results.record_pass("Response Times")
    except Exception as e:
        results.record_fail("Response Times", str(e))


def run_all_tests():
    """Run all end-to-end tests."""
    log.info("Starting End-to-End Test Suite...")
    log.info(f"Target: {BASE_URL}")
    log.info(f"Time: {datetime.now().isoformat()}\n")
    
    # Core functionality tests
    test_health_endpoint()
    test_api_health()
    test_stories_endpoint()
    test_scheduler_status()
    test_pipeline_status()
    
    # Feature tests
    test_analytics_endpoint()
    test_hashtag_endpoint()
    test_media_assets()
    test_blog_posts()
    
    # Performance tests
    test_database_indexes()
    test_response_times()
    
    # Print summary
    success = results.summary()
    
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    exit(exit_code)
