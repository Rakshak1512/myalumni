import pytest
import io
from unittest.mock import patch, MagicMock


def test_list_opportunities_approved(client):
    """Verifies that approved opportunities are returned to authenticated users."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "s1", "email": "s@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "s1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            with patch('app.routes.opportunity_routes.opp_repo.list_approved') as mock_list:
                mock_list.return_value = [
                    {"id": "opp1", "title": "Software Engineer", "company": "Apex", "status": "approved"}
                ]
                response = client.get('/api/v1/opportunities', headers={"Authorization": "Bearer valid_token"})
                assert response.status_code == 200
                data = response.get_json()
                assert data['success'] is True
                assert len(data['data']) == 1
                assert data['data'][0]['title'] == "Software Engineer"


def test_student_cannot_access_pending_opportunities(client):
    """Verifies that students cannot access the pending opportunity moderation queue."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "s1", "email": "s@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "s1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            response = client.get('/api/v1/opportunities/pending', headers={"Authorization": "Bearer valid_token"})
            assert response.status_code == 403


def test_faculty_can_access_pending_opportunities(client):
    """Verifies that faculty can access the pending opportunity moderation queue."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "f1", "email": "f@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "f1", "role": "faculty", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            with patch('app.routes.opportunity_routes.opp_repo.list_pending', return_value=[]):
                response = client.get('/api/v1/opportunities/pending', headers={"Authorization": "Bearer valid_token"})
                assert response.status_code == 200


def test_messaging_participant_privacy(client):
    """Security Boundary: Non-participants cannot read conversation messages."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "intruder_uid", "email": "intruder@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "intruder_uid", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            with patch('app.routes.chat_routes.chat_repo.get_by_id') as mock_conv:
                # Conversation only between user_a and user_b
                mock_conv.return_value = {
                    "id": "conv_123",
                    "participants": ["user_a", "user_b"]
                }
                response = client.get('/api/v1/chat/conversations/conv_123/messages', headers={"Authorization": "Bearer valid_token"})
                assert response.status_code == 403
                assert response.get_json()['error']['code'] == 'FORBIDDEN'


def test_faculty_can_list_students_for_promotion(client):
    """Verifies that faculty can list students via GET /users/students."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "f1", "email": "faculty@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "f1", "role": "faculty", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            with patch('app.routes.users_routes.user_repo.list_by_role') as mock_list:
                mock_list.return_value = [
                    {"id": "s1", "displayName": "Alex Chen", "role": "student"}
                ]
                response = client.get('/api/v1/users/students', headers={"Authorization": "Bearer valid_token"})
                assert response.status_code == 200
                data = response.get_json()
                assert len(data['data']) == 1
                assert data['data'][0]['displayName'] == "Alex Chen"


def test_student_forbidden_from_listing_students(client):
    """Verifies that ordinary students cannot access the promotion student roster."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "s1", "email": "student@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "s1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            response = client.get('/api/v1/users/students', headers={"Authorization": "Bearer valid_token"})
            assert response.status_code == 403


def test_avatar_upload_rejects_disallowed_extension(client):
    """Security Boundary: Disallowed file extensions (e.g. .exe, .sh) are rejected with 400."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "u1", "email": "u@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "u1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            data = {
                'avatar': (io.BytesIO(b'malicious content'), 'test.exe')
            }
            response = client.post(
                '/api/v1/users/avatar',
                headers={"Authorization": "Bearer valid_token"},
                data=data,
                content_type='multipart/form-data'
            )
            assert response.status_code == 400
            assert "Invalid file extension" in response.get_json()['error']['message']


def test_avatar_upload_success_local_fallback(client, tmp_path):
    """Verifies avatar upload validates valid image and updates profile URL."""
    with patch('app.auth.decorators.verify_firebase_id_token', return_value={"uid": "u1", "email": "u@test.com"}):
        with patch('app.auth.decorators.get_firestore_client') as mock_db:
            mock_doc = MagicMock()
            mock_doc.exists = True
            mock_doc.to_dict.return_value = {"uid": "u1", "role": "student", "accountStatus": "active"}
            mock_db.return_value.collection.return_value.document.return_value.get.return_value = mock_doc

            with patch('app.routes.users_routes.user_repo.update') as mock_update:
                mock_update.return_value = True
                data = {
                    'avatar': (io.BytesIO(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...fake_png'), 'avatar.png')
                }
                response = client.post(
                    '/api/v1/users/avatar',
                    headers={"Authorization": "Bearer valid_token"},
                    data=data,
                    content_type='multipart/form-data'
                )
                assert response.status_code == 200
                res_data = response.get_json()
                assert res_data['success'] is True
                assert 'avatarUrl' in res_data['data']
                assert 'avatar.png' in res_data['data']['avatarUrl']


def test_support_ticket_submission_and_resolution(client):
    """Verifies that support tickets are created, listed, and resolved without constraint failures."""
    # 1. Login as demo student
    s_login = client.post('/api/v1/auth/demo-login', json={'role': 'student'}).get_json()['data']
    student_token = s_login['token']

    # 2. Student submits ticket
    ticket_payload = {
        "subject": "Curriculum Verification Needed",
        "category": "academic",
        "description": "Please verify my graduating credits."
    }
    res = client.post('/api/v1/admin/tickets', json=ticket_payload, headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 201
    ticket_data = res.get_json()['data']
    ticket_id = ticket_data['id']
    assert ticket_id is not None
    assert ticket_data['subject'] == "Curriculum Verification Needed"

    # 3. Student lists my-tickets
    my_res = client.get('/api/v1/admin/my-tickets', headers={"Authorization": f"Bearer {student_token}"})
    assert my_res.status_code == 200
    assert any(t['id'] == ticket_id for t in my_res.get_json()['data'])

    # 4. Login as admin and respond to ticket
    a_login = client.post('/api/v1/auth/demo-login', json={'role': 'admin'}).get_json()['data']
    admin_token = a_login['token']

    resp_payload = {
        "response": "Curriculum credits officially verified.",
        "status": "resolved"
    }
    resp_res = client.put(f'/api/v1/admin/tickets/{ticket_id}/respond', json=resp_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_res.status_code == 200
    updated_ticket = resp_res.get_json()['data']
    assert updated_ticket['status'] == "resolved"


def test_abuse_report_submission_and_listing(client):
    """Verifies that abuse reports write to the reports table and are retrievable by admins."""
    # 1. Login as alumni
    u_login = client.post('/api/v1/auth/demo-login', json={'role': 'alumni'}).get_json()['data']
    user_token = u_login['token']

    report_payload = {
        "reportedUserId": "demo_student_uid",
        "targetType": "message",
        "targetId": "msg_999",
        "reason": "Harassment and spam",
        "details": "Sent repeated unsolicited spam."
    }
    res = client.post('/api/v1/admin/reports', json=report_payload, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 201
    report_id = res.get_json()['data']['id']
    assert report_id is not None

    # 2. Login as admin and verify listing
    a_login = client.post('/api/v1/auth/demo-login', json={'role': 'admin'}).get_json()['data']
    admin_token = a_login['token']

    list_res = client.get('/api/v1/admin/reports', headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    reports = list_res.get_json()['data']
    assert any(r['id'] == report_id for r in reports)


