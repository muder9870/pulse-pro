"""
Test for FIX-002: Blog Credential Validation Actually Validates

Verifies that the credential validation endpoint tests actual API connections
instead of always returning valid=true like the old code did.
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


def test_validate_credentials_requires_api_key(client):
    """Test that validation requires an API key."""
    response = client.post(
        '/api/blog/credentials/validate/devto',
        data=json.dumps({}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['valid'] is False
    assert 'API key required' in data['error']


def test_validate_credentials_unknown_platform(client):
    """Test that unknown platforms return an error."""
    response = client.post(
        '/api/blog/credentials/validate/unknown_platform',
        data=json.dumps({'api_key': 'test_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['valid'] is False
    assert 'Unknown platform' in data['error']


@patch('backend.api.routes.blog.requests.get')
def test_validate_devto_credentials_success(mock_get, client):
    """Test successful Dev.to credential validation."""
    # Mock successful API response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_get.return_value = mock_response
    
    response = client.post(
        '/api/blog/credentials/validate/devto',
        data=json.dumps({'api_key': 'valid_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['valid'] is True
    assert 'Dev.to credentials valid' in data['message']
    
    # Verify the API was actually called
    mock_get.assert_called_once()
    call_args = mock_get.call_args
    assert 'dev.to/api/user' in call_args[0][0]


@patch('backend.api.routes.blog.requests.get')
def test_validate_devto_credentials_fail(mock_get, client):
    """Test failed Dev.to credential validation."""
    # Mock failed API response
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Unauthorized"
    mock_get.return_value = mock_response
    
    response = client.post(
        '/api/blog/credentials/validate/devto',
        data=json.dumps({'api_key': 'invalid_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['valid'] is False
    assert '401' in data['error']


@patch('backend.api.routes.blog.requests.get')
def test_validate_medium_credentials_success(mock_get, client):
    """Test successful Medium credential validation."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_get.return_value = mock_response
    
    response = client.post(
        '/api/blog/credentials/validate/medium',
        data=json.dumps({'api_key': 'valid_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['valid'] is True
    assert 'Medium credentials valid' in data['message']
    
    # Verify API was called with Bearer token
    mock_get.assert_called_once()
    call_args = mock_get.call_args
    assert 'api.medium.com' in call_args[0][0]


@patch('backend.api.routes.blog.requests.get')
def test_validate_wordpress_credentials_requires_site_url(mock_get, client):
    """Test that WordPress validation requires site_url and username."""
    response = client.post(
        '/api/blog/credentials/validate/wordpress',
        data=json.dumps({'api_key': 'app_password'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['valid'] is False
    assert 'site_url and username required' in data['error']


@patch('backend.api.routes.blog.requests.get')
def test_validate_wordpress_credentials_success(mock_get, client):
    """Test successful WordPress credential validation."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_get.return_value = mock_response
    
    response = client.post(
        '/api/blog/credentials/validate/wordpress',
        data=json.dumps({
            'api_key': 'app_password',
            'site_url': 'https://myblog.com',
            'username': 'admin'
        }),
        content_type='application/json'
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['valid'] is True
    assert 'WordPress credentials valid' in data['message']


@patch('backend.api.routes.blog.requests.get')
def test_validate_credentials_timeout(mock_get, client):
    """Test handling of API timeout."""
    mock_get.side_effect = __import__('requests').Timeout()
    
    response = client.post(
        '/api/blog/credentials/validate/devto',
        data=json.dumps({'api_key': 'test_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['valid'] is False
    assert 'timed out' in data['error'].lower()


@patch('backend.api.routes.blog.requests.get')
def test_validate_credentials_generic_error(mock_get, client):
    """Test handling of generic exceptions."""
    mock_get.side_effect = Exception("Connection refused")
    
    response = client.post(
        '/api/blog/credentials/validate/devto',
        data=json.dumps({'api_key': 'test_key'}),
        content_type='application/json'
    )
    
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['valid'] is False
    assert 'Validation error' in data['error']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
