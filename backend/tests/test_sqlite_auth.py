import pytest


def test_sqlite_registration_and_login(client):
    """Verifies that a user can register via OTP, receive a JWT token, and subsequently log in using SQLite."""
    from unittest.mock import patch
    from app.services.otp_service import _REGISTRATION_STORE, _hash_otp

    # 1. Register new student (Stage 1: OTP dispatched)
    reg_payload = {
        "email": "jane.doe@university.edu",
        "password": "SecurePassword123!",
        "displayName": "Jane Doe",
        "role": "student",
        "profile": {
            "courseName": "B.S. in Computer Science",
            "academicYearName": "2025-2026"
        }
    }
    with patch('app.services.email_service.EmailService.send_otp_email', return_value=(True, None)):
        reg_res = client.post('/api/v1/auth/register', json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.get_json()
    assert reg_data['success'] is True
    assert reg_data['data']['requiresOtp'] is True

    # 2. Stage 2: Verify OTP and activate account
    # Directly set known hash in test staging store
    _REGISTRATION_STORE["jane.doe@university.edu"]["otp_hash"] = _hash_otp("jane.doe@university.edu", "123456")

    verify_res = client.post('/api/v1/auth/verify-registration', json={
        "email": "jane.doe@university.edu",
        "otp": "123456"
    })
    assert verify_res.status_code == 201
    verify_data = verify_res.get_json()
    assert verify_data['success'] is True
    assert 'token' in verify_data['data']
    assert verify_data['data']['role'] == 'student'
    assert verify_data['data']['user']['email'] == 'jane.doe@university.edu'

    # 3. Duplicate registration rejected
    dup_res = client.post('/api/v1/auth/register', json=reg_payload)
    assert dup_res.status_code == 409
    assert dup_res.get_json()['error']['code'] == 'EMAIL_ALREADY_EXISTS'

    # 4. Successful Login
    login_payload = {
        "email": "jane.doe@university.edu",
        "password": "SecurePassword123!"
    }
    login_res = client.post('/api/v1/auth/login', json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert login_data['success'] is True
    token = login_data['data']['token']

    # 5. Access protected endpoint with token
    me_res = client.get('/api/v1/auth/me', headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data['data']['email'] == 'jane.doe@university.edu'
    assert me_data['data']['displayName'] == 'Jane Doe'


def test_sqlite_login_wrong_password(client):
    """Verifies that invalid passwords return HTTP 401."""
    # Register user first
    client.post('/api/v1/auth/register', json={
        "email": "wrongpwd@test.edu",
        "password": "CorrectPassword123!",
        "displayName": "Test User",
        "role": "alumni"
    })

    # Attempt login with wrong password
    res = client.post('/api/v1/auth/login', json={
        "email": "wrongpwd@test.edu",
        "password": "IncorrectPassword!"
    })
    assert res.status_code == 401
    assert res.get_json()['error']['code'] == 'INVALID_CREDENTIALS'


def test_sqlite_demo_login(client):
    """Verifies instant demo logins for all 4 roles."""
    for role in ('admin', 'faculty', 'student', 'alumni'):
        res = client.post('/api/v1/auth/demo-login', json={"role": role})
        assert res.status_code == 200
        data = res.get_json()['data']
        assert data['role'] == role
        assert data['token'] == f"demo-token-{role}"
        assert 'user' in data

