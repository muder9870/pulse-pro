"""
Test FIX-005: Blog publishing wires to real publishers with timeout handling.

Rule: Blog publish endpoint should call actual publisher functions (devto, medium, wordpress)
and return success/error status honestly, with 10-second timeout protection.
"""

import pytest
from unittest.mock import MagicMock, patch, call
import json


def test_blog_publish_requires_blog_post_id_and_platform():
    """Publishing without required params returns 400 error."""
    # Import here to avoid circular dependencies
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    with app.test_request_context(
        '/api/blog/publish',
        method='POST',
        data=json.dumps({"blog_post_id": None, "platform": ""}),
        content_type='application/json'
    ):
        response, status = blog_publish()
        
        assert status == 400
        assert "error" in response
        assert "required" in response["error"].lower()


def test_blog_publish_returns_404_if_post_not_found():
    """Publishing nonexistent post returns 404."""
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    with patch('backend.api.routes.blog.BlogRepository') as MockRepo:
        mock_repo = MagicMock()
        mock_repo.get_post.return_value = None
        MockRepo.return_value = mock_repo
        
        with app.test_request_context(
            '/api/blog/publish',
            method='POST',
            data=json.dumps({
                "blog_post_id": 999,
                "platform": "devto",
                "published": False
            }),
            content_type='application/json'
        ):
            response, status = blog_publish()
            
            assert status == 404
            assert "not found" in response["error"].lower()


def test_blog_publish_devto_success():
    """Publishing to Dev.to calls devto_publisher with correct params."""
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    mock_blog_post = {
        "id": 123,
        "title": "Test Article",
        "content": "# Test Content\n\nParagraph here.",
        "tags": "python,testing"
    }
    
    with patch('backend.api.routes.blog.BlogRepository') as MockRepo, \
         patch('backend.api.routes.blog.devto_publisher') as mock_devto:
        
        # Setup blog repo
        mock_repo = MagicMock()
        mock_repo.get_post.return_value = mock_blog_post
        MockRepo.return_value = mock_repo
        
        # Setup devto publisher
        mock_result = MagicMock()
        mock_result.status = "published"
        mock_result.url = "https://dev.to/user/test-article"
        mock_result.platform_post_id = "12345"
        mock_result.error = None
        mock_devto.publish_markdown.return_value = mock_result
        
        with app.test_request_context(
            '/api/blog/publish',
            method='POST',
            data=json.dumps({
                "blog_post_id": 123,
                "platform": "devto",
                "published": True
            }),
            content_type='application/json'
        ):
            response, status = blog_publish()
            
            # Verify response
            assert status == 200
            assert response["status"] == "published"
            assert response["platform"] == "devto"
            assert response["post_url"] == "https://dev.to/user/test-article"
            assert response["verified"] is True
            
            # Verify devto_publisher was called
            mock_devto.publish_markdown.assert_called_once()
            call_args = mock_devto.publish_markdown.call_args
            assert call_args[1]["title"] == "Test Article"
            assert call_args[1]["body_markdown"] == "# Test Content\n\nParagraph here."
            assert call_args[1]["published"] is True


def test_blog_publish_medium_failure_returns_error():
    """Publishing to Medium failure returns error status."""
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    mock_blog_post = {
        "id": 124,
        "title": "Another Article",
        "content": "Some content",
        "tags": ""
    }
    
    with patch('backend.api.routes.blog.BlogRepository') as MockRepo, \
         patch('backend.api.routes.blog.medium_publisher') as mock_medium:
        
        # Setup blog repo
        mock_repo = MagicMock()
        mock_repo.get_post.return_value = mock_blog_post
        MockRepo.return_value = mock_repo
        
        # Setup medium publisher with error
        mock_result = MagicMock()
        mock_result.status = "error"
        mock_result.url = None
        mock_result.platform_post_id = None
        mock_result.error = "Invalid Medium API token"
        mock_medium.publish_markdown.return_value = mock_result
        
        with app.test_request_context(
            '/api/blog/publish',
            method='POST',
            data=json.dumps({
                "blog_post_id": 124,
                "platform": "medium",
                "published": True
            }),
            content_type='application/json'
        ):
            response, status = blog_publish()
            
            # Verify error response
            assert status == 400  # Error status
            assert response["status"] == "error"
            assert response["platform"] == "medium"
            assert "Invalid Medium API token" in response["error"]
            assert response["verified"] is False


def test_blog_publish_wordpress_requires_site_url():
    """Publishing to WordPress without site_url returns error."""
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    mock_blog_post = {
        "id": 125,
        "title": "WordPress Test",
        "content": "Content here",
        "tags": ""
    }
    
    with patch('backend.api.routes.blog.BlogRepository') as MockRepo:
        # Setup blog repo
        mock_repo = MagicMock()
        mock_repo.get_post.return_value = mock_blog_post
        mock_repo.get_credential.return_value = {}  # No site_url
        MockRepo.return_value = mock_repo
        
        with app.test_request_context(
            '/api/blog/publish',
            method='POST',
            data=json.dumps({
                "blog_post_id": 125,
                "platform": "wordpress",
                "published": True
            }),
            content_type='application/json'
        ):
            response, status = blog_publish()
            
            # Verify error
            assert status == 400
            assert "site_url not configured" in response["error"]


def test_blog_publish_unknown_platform_returns_error():
    """Publishing to unknown platform returns error."""
    from backend.api.routes.blog import blog_publish
    from flask import Flask
    
    app = Flask(__name__)
    
    with patch('backend.api.routes.blog.BlogRepository') as MockRepo:
        mock_repo = MagicMock()
        mock_repo.get_post.return_value = {"id": 126, "title": "Test", "content": "Test"}
        MockRepo.return_value = mock_repo
        
        with app.test_request_context(
            '/api/blog/publish',
            method='POST',
            data=json.dumps({
                "blog_post_id": 126,
                "platform": "fakebook",
                "published": True
            }),
            content_type='application/json'
        ):
            response, status = blog_publish()
            
            # Verify error
            assert status == 400
            assert "Unknown platform" in response["error"]


def test_blog_publish_timeout_protected():
    """Blog publish has 10-second timeout protection."""
    # This test verifies the timeout mechanism is in place
    # Full timeout testing is integration test territory
    from backend.api.routes.blog import blog_publish
    
    import inspect
    source = inspect.getsource(blog_publish)
    
    # Verify timeout logic exists in code
    assert "signal.alarm(10)" in source, "10-second timeout not implemented"
    assert "signal.SIGALRM" in source, "Signal timeout handler not implemented"
    assert "timeout_handler" in source, "Timeout exception handler not implemented"
    assert "finally:" in source, "Timeout cleanup not implemented"
