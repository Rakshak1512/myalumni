"""
Unit & Integration Tests for Universal File Upload System and Supabase Cloud Storage Driver.
Verifies local vs. cloud storage switching, binary magic bytes validation,
private access control, signed URL generation, external URL compatibility, and deletion.
"""

import io
import pytest
from unittest.mock import MagicMock
from app.config import Config
from app.services.storage_service import StorageService, SupabaseStorageDriver
from app.db import get_db


def test_01_local_storage_upload_and_download(client, auth_headers):
    """Verifies standard local file upload, database metadata persistence, and download."""
    Config.STORAGE_PROVIDER = 'local'
    headers = auth_headers(role="student", uid="demo_student_uid")
    upload_headers = {"Authorization": headers["Authorization"]}

    # Create dummy PDF file
    dummy_pdf = io.BytesIO(b"%PDF-1.4 sample pdf content for university syllabus test")
    data = {
        'file': (dummy_pdf, 'syllabus.pdf'),
        'category': 'resources',
        'is_private': 'false'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 201
    payload = resp.get_json()['data']
    assert payload['originalFilename'] == 'syllabus.pdf'
    assert payload['category'] == 'resources'
    assert payload['storageProvider'] == 'local'
    file_id = payload['id']

    # Verify download
    dl_resp = client.get(f"/api/v1/files/download/{file_id}", headers=upload_headers)
    assert dl_resp.status_code == 200
    assert b"%PDF-1.4" in dl_resp.data

    # Verify clean deletion
    del_resp = client.delete(f"/api/v1/uploads/{file_id}", headers=upload_headers)
    assert del_resp.status_code == 200

    # Ensure 404 after deletion
    dl_after = client.get(f"/api/v1/files/download/{file_id}", headers=upload_headers)
    assert dl_after.status_code == 404


def test_02_supabase_driver_unconfigured_error(client, auth_headers, monkeypatch):
    """Verifies that selecting supabase when credentials are missing raises a clear descriptive error."""
    monkeypatch.setattr(Config, 'STORAGE_PROVIDER', 'supabase')
    monkeypatch.setattr(Config, 'SUPABASE_URL', '')
    monkeypatch.setattr(Config, 'SUPABASE_SERVICE_KEY', '')
    StorageService._supabase_driver = None

    headers = auth_headers(role="student", uid="demo_student_uid")
    upload_headers = {"Authorization": headers["Authorization"]}

    dummy_pdf = io.BytesIO(b"%PDF-1.4 syllabus content")
    data = {
        'file': (dummy_pdf, 'syllabus.pdf'),
        'category': 'resources'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 400
    err_data = resp.get_json()
    err_msg = err_data.get('error', {}).get('message', '')
    assert "SUPABASE_URL or SUPABASE_SERVICE_KEY" in err_msg


def test_03_supabase_public_upload_and_cdn_redirect(client, auth_headers, monkeypatch):
    """Verifies public upload to Supabase: saves to public bucket and serves via CDN redirect."""
    monkeypatch.setattr(Config, 'STORAGE_PROVIDER', 'supabase')
    monkeypatch.setattr(Config, 'SUPABASE_URL', 'https://mocktest.supabase.co')
    monkeypatch.setattr(Config, 'SUPABASE_SERVICE_KEY', 'mock_service_key_12345')
    monkeypatch.setattr(Config, 'SUPABASE_PUBLIC_BUCKET', 'myalumni-public')
    StorageService._supabase_driver = None

    # Mock requests.post to simulate Supabase Storage upload success
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {"Key": "myalumni-public/events/poster.png", "Id": "mock_id"}

    def mock_post(url, *args, **kwargs):
        return mock_post_resp

    monkeypatch.setattr('app.services.storage_service.requests.post', mock_post)

    headers = auth_headers(role="faculty", uid="demo_faculty_uid")
    upload_headers = {"Authorization": headers["Authorization"]}

    # Create dummy PNG file with magic bytes
    png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' + b'mock_png_data'
    data = {
        'file': (io.BytesIO(png_bytes), 'event_poster.png'),
        'category': 'events',
        'is_private': 'false'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 201
    payload = resp.get_json()['data']
    assert payload['storageProvider'] == 'supabase'
    assert payload['bucketName'] == 'myalumni-public'
    assert 'https://mocktest.supabase.co/storage/v1/object/public/myalumni-public/events/' in payload['fileUrl']
    file_id = payload['id']

    # Access public file via download gateway -> should redirect to public CDN URL
    dl_resp = client.get(f"/api/v1/files/download/{file_id}")
    assert dl_resp.status_code == 302
    assert "https://mocktest.supabase.co/storage/v1/object/public/myalumni-public/events/" in dl_resp.headers['Location']


def test_04_supabase_private_upload_and_signed_url_redirect(client, auth_headers, monkeypatch):
    """Verifies private upload (e.g. resume) to Supabase: saves to private bucket and generates signed URL."""
    monkeypatch.setattr(Config, 'STORAGE_PROVIDER', 'supabase')
    monkeypatch.setattr(Config, 'SUPABASE_URL', 'https://mocktest.supabase.co')
    monkeypatch.setattr(Config, 'SUPABASE_SERVICE_KEY', 'mock_service_key_12345')
    monkeypatch.setattr(Config, 'SUPABASE_PRIVATE_BUCKET', 'myalumni-private')
    StorageService._supabase_driver = None

    # Mock upload request and signed URL request
    def mock_post(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if '/sign/' in url:
            resp.json.return_value = {
                "signedURL": "/storage/v1/object/sign/myalumni-private/resumes/mock_signed_file.pdf?token=secret123"
            }
        else:
            resp.json.return_value = {"Key": "myalumni-private/resumes/mock_file.pdf"}
        return resp

    monkeypatch.setattr('app.services.storage_service.requests.post', mock_post)

    uploader_headers = auth_headers(role="student", uid="demo_student_uid")
    upload_headers = {"Authorization": uploader_headers["Authorization"]}

    pdf_bytes = b"%PDF-1.4 Alex Chen Private Curriculum Vitae Content"
    data = {
        'file': (io.BytesIO(pdf_bytes), 'alex_cv.pdf'),
        'category': 'resumes',
        'is_private': 'true'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 201
    payload = resp.get_json()['data']
    assert payload['storageProvider'] == 'supabase'
    assert payload['bucketName'] == 'myalumni-private'
    assert payload['isPrivate'] is True
    file_id = payload['id']

    # 1. Unauthenticated download attempt -> must fail with 401
    unauth_resp = client.get(f"/api/v1/files/download/{file_id}")
    assert unauth_resp.status_code == 401

    # 2. Unauthorized student download attempt -> must fail with 403
    other_student_headers = auth_headers(role="student", uid="other_student_999")
    unauth_resp2 = client.get(f"/api/v1/files/download/{file_id}", headers={"Authorization": other_student_headers["Authorization"]})
    assert unauth_resp2.status_code == 403

    # 3. Authorized uploader download attempt -> must redirect (302) to signed URL
    auth_resp = client.get(f"/api/v1/files/download/{file_id}", headers=upload_headers)
    assert auth_resp.status_code == 302
    assert "mock_signed_file.pdf?token=secret123" in auth_resp.headers['Location']

    # 4. Privileged Admin download attempt -> must also succeed with 302
    admin_headers = auth_headers(role="admin", uid="demo_admin_uid")
    admin_resp = client.get(f"/api/v1/files/download/{file_id}", headers={"Authorization": admin_headers["Authorization"]})
    assert admin_resp.status_code == 302


def test_05_supabase_delete_removes_cloud_object_and_db_row(client, auth_headers, monkeypatch):
    """Verifies deleting a Supabase file calls delete endpoint and removes database record."""
    monkeypatch.setattr(Config, 'STORAGE_PROVIDER', 'supabase')
    monkeypatch.setattr(Config, 'SUPABASE_URL', 'https://mocktest.supabase.co')
    monkeypatch.setattr(Config, 'SUPABASE_SERVICE_KEY', 'mock_service_key_12345')
    StorageService._supabase_driver = None

    deleted_paths = []

    def mock_delete(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        json_data = kwargs.get('json', {})
        deleted_paths.extend(json_data.get('prefixes', []))
        return resp

    def mock_post(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = {"Key": "myalumni-public/memories/mock.png"}
        return resp

    monkeypatch.setattr('app.services.storage_service.requests.post', mock_post)
    monkeypatch.setattr('app.services.storage_service.requests.delete', mock_delete)

    headers = auth_headers(role="alumni", uid="demo_alumni_uid")
    upload_headers = {"Authorization": headers["Authorization"]}

    png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' + b'memory_photo'
    data = {
        'file': (io.BytesIO(png_bytes), 'campus_reunion.png'),
        'category': 'memories'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 201
    file_id = resp.get_json()['data']['id']

    # Delete
    del_resp = client.delete(f"/api/v1/uploads/{file_id}", headers=upload_headers)
    assert del_resp.status_code == 200
    assert len(deleted_paths) == 1
    assert "memories/" in deleted_paths[0]

    # Verify database record deleted
    assert StorageService.get_file(file_id) is None


def test_06_external_url_registration(client, auth_headers):
    """Verifies registering external links (Google Drive, GitHub, etc.) preserves backward compatibility."""
    Config.STORAGE_PROVIDER = 'local'
    headers = auth_headers(role="faculty", uid="demo_faculty_uid")

    payload = {
        'external_url': 'https://drive.google.com/file/d/12345sample/view',
        'title': 'Operating Systems Lecture Notes',
        'category': 'resources'
    }

    resp = client.post('/api/v1/uploads', json=payload, headers=headers)
    assert resp.status_code == 201
    data = resp.get_json()['data']
    assert data['isExternalUrl'] is True
    assert data['fileUrl'] == payload['external_url']
    assert data['storageProvider'] == 'external'


def test_07_dangerous_executable_rejection(client, auth_headers):
    """Verifies that malicious or executable files (.exe, .sh, .php) are rejected unconditionally."""
    Config.STORAGE_PROVIDER = 'local'
    headers = auth_headers(role="student", uid="demo_student_uid")
    upload_headers = {"Authorization": headers["Authorization"]}

    # Create dummy exe with MZ header
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00fake_windows_binary"
    data = {
        'file': (io.BytesIO(exe_bytes), 'malware.exe'),
        'category': 'resources'
    }

    resp = client.post('/api/v1/uploads', data=data, content_type='multipart/form-data', headers=upload_headers)
    assert resp.status_code == 400
    err_msg = resp.get_json().get('error', {}).get('message', '')
    assert "strictly prohibited" in err_msg
