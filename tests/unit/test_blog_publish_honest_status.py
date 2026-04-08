"""
Test for FIX-001: Blog Publishing Returns Honest Status

Verifies that the blog publish endpoint returns 501 (Not Implemented)
instead of lying about successful publishing when the feature is not ready.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import create_app


@pytest.fixture
def app():
    """Create Flask test app."""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


def test_blog_publish_returns_501_not_implemented(client):
    """
    Test that blog publish endpoint returns 501 (Not Implemented).
    
    This ensures the endpoint is honest about its status instead of
    returning a fake success (200) and misleading the user into thinking
    the post was published.
    """
    # Arrange: prepare request payload
    payload = {
        "blog_post_id": 1,
        "platform": "dev.to",
        "published": True
    }
    
    # Act: call the publish endpoint
    response = client.post(
        '/api/blog/publish',
        data=json.dumps(payload),
        content_type='application/json'
    )
    
    # Assert: verify 501 status
    assert response.status_code == 501, f"Expected 501, got {response.status_code}"
    
    # Assert: verify response structure
    data = json.loads(response.data)
    assert data['status'] == 'not_implemented'
    assert 'error' in data
    assert 'will be implemented in next phase' in data['error']
    assert data['error'] is not None and len(data['error']) > 0


def test_blog_publish_response_structure(client):
    """
    Test that the 501 response has all required fields for proper error handling.
    """
    response = client.post(
        '/api/blog/publish',
        data=json.dumps({"blog_post_id": 1}),
        content_type='application/json'
    )
    
    data = json.loads(response.data)
    
    # Verify required fields
    assert 'status' in data
    assert 'error' in data
    assert 'docs' in data
    
    # Verify no fake success indicators
    assert data.get('status') != 'success'
    assert 'queued' not in data.get('info', '').lower()


def test_blog_publish_not_200_success(client):
    """
    Regression test: ensure blog publish never returns 200 (success) when not implemented.
    
    This prevents the "fake success" lie that destroys user trust.
    """
    response = client.post(
        '/api/blog/publish',
        data=json.dumps({"blog_post_id": 1, "platform": "medium"}),
        content_type='application/json'
    )
    
    # Explicitly verify it's NOT 200
    assert response.status_code != 200
    # And it IS 501
    assert response.status_code == 501


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
