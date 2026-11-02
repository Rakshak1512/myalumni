import pytest
from unittest.mock import patch, MagicMock


def test_health_endpoint(client):
    """Verifies that API health check endpoint returns 200 and healthy status."""
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['data']['status'] == 'healthy'


def test_unauthenticated_request_rejected(client):
    """Verifies that protected routes reject requests missing Authorization header."""
    response = client.get('/api/v1/auth/me')
    assert response.status_code == 401
    data = response.get_json()
    assert data['success'] is False
    assert data['error']['code'] == 'UNAUTHORIZED'


def test_malformed_token_rejected(client):
    """Verifies that requests with invalid token format are rejected with 401."""
    response = client.get('/api/v1/auth/me', headers={"Authorization": "InvalidTokenString"})
    assert response.status_code == 401


@patch('app.auth.decorators.verify_firebase_id_token')
@patch('app.auth.decorators.get_firestore_client')
def test_student_cannot_access_admin_route(mock_db, mock_verify, client):
    """Security Boundary: Verifies that a Student role is forbidden from accessing Admin stats."""
    mock_verify.return_value = {"uid": "student_123", "email": "student@test.com"}
    
    # Mock user document returning role='student'
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "uid": "student_123",
        "email": "student@test.com",
        "role": "student",
        "accountStatus": "active"
    }
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

    response = client.get('/api/v1/admin/stats', headers={"Authorization": "Bearer valid_token"})
    assert response.status_code == 403
    data = response.get_json()
    assert data['success'] is False
    assert data['error']['code'] == 'FORBIDDEN'


@patch('app.auth.decorators.verify_firebase_id_token')
@patch('app.auth.decorators.get_firestore_client')
def test_suspended_user_is_blocked(mock_db, mock_verify, client):
    """Security Boundary: Verifies that a suspended account is denied access."""
    mock_verify.return_value = {"uid": "suspended_123", "email": "bad@test.com"}
    
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        "uid": "suspended_123",
        "role": "student",
        "accountStatus": "suspended"
    }
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

    response = client.get('/api/v1/opportunities', headers={"Authorization": "Bearer valid_token"})
    assert response.status_code == 403
    assert response.get_json()['error']['code'] == 'ACCOUNT_SUSPENDED'


@patch('app.auth.decorators.verify_firebase_id_token')
@patch('app.auth.decorators.get_firestore_client')
def test_client_cannot_self_assign_admin_on_sync(mock_db, mock_verify, client):
    """Security: Client sending role='admin' in sync-profile must be downgraded to student."""
    mock_verify.return_value = {"uid": "new_attacker_uid", "email": "attacker@test.com"}
    
    # Simulate user doesn't exist yet
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

    with patch('app.routes.auth_routes.user_repo.get_by_id', return_value=None):
        with patch('app.routes.auth_routes.user_repo.create') as mock_create:
            mock_create.return_value = {"id": "new_attacker_uid", "role": "student"}
            with patch('app.routes.auth_routes.user_repo.get_user_with_profile') as mock_get:
                mock_get.return_value = {"id": "new_attacker_uid", "role": "student"}
                
                response = client.post(
                    '/api/v1/auth/sync-profile',
                    headers={"Authorization": "Bearer valid_token"},
                    json={"role": "admin", "displayName": "Attacker"}
                )
                assert response.status_code == 200
                # Inspect argument passed to user_repo.create
                call_args = mock_create.call_args[0][0]
                assert call_args['role'] == 'student'

