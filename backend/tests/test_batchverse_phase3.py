"""
Comprehensive 20-Test Suite for BATCHVERSE Phase 3: Memories Gallery & Community Memories
Tests all Phase 3 features across all four roles (Admin, Faculty, Student, Alumni).
"""
import io
import pytest
from PIL import Image
from app.db import get_db


def get_token(client, role_or_email):
    resp = client.post('/api/v1/auth/demo-login', json={'role': role_or_email})
    assert resp.status_code == 200, f"Demo login failed: {resp.get_json()}"
    data = resp.get_json()['data']
    return data['token'], data['user']['uid']


def create_test_image_bytes(format="JPEG", color="blue", size=(300, 300)):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf


def ensure_test_memory(client, token, batch_id='batch_cs_2026', caption='Test batch photo'):
    img_bytes = create_test_image_bytes(format="JPEG", color="blue")
    data = {
        'files[]': [(img_bytes, 'test.jpg', 'image/jpeg')],
        'caption': caption,
        'description': 'A beautiful campus memory.',
        'graduationYear': '2026',
        'takenAt': '2026-05-15'
    }
    resp = client.post(
        f'/api/v1/batches/{batch_id}/memories',
        headers={'Authorization': f'Bearer {token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert resp.status_code == 201
    return resp.get_json()['data'][0]


# 1. Upload memory as verified batch member
def test_01_upload_memory_as_verified_member(client):
    token, uid = get_token(client, 'student')
    img_bytes = create_test_image_bytes(format="JPEG", color="purple")
    
    data = {
        'files[]': [(img_bytes, 'convocation.jpg', 'image/jpeg')],
        'caption': 'Graduation day at the campus courtyard!',
        'description': 'Unforgettable moments with friends and mentors.',
        'graduationYear': '2026',
        'takenAt': '2026-05-20'
    }

    resp = client.post(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert resp.status_code == 201, f"Upload memory failed: {resp.get_json()}"
    res_data = resp.get_json()
    assert res_data['success'] is True
    memories = res_data['data']
    assert len(memories) >= 1
    mem = memories[0]
    assert mem['batchId'] == 'batch_cs_2026'
    assert mem['uploaderId'] == uid
    assert mem['caption'] == 'Graduation day at the campus courtyard!'
    assert mem['thumbnailUrl'] is not None


# 2. Upload memory rejected for unverified/non-member
def test_02_upload_memory_rejected_for_non_member(client):
    token, uid = get_token(client, 'student')
    img_bytes = create_test_image_bytes(format="JPEG", color="red")
    
    # Student belongs to batch_cs_2026, attempting upload to alumni batch_cs_2021
    data = {
        'files[]': [(img_bytes, 'intruder.jpg', 'image/jpeg')],
        'caption': 'Unauthorized photo'
    }

    resp = client.post(
        '/api/v1/batches/batch_cs_2021/memories',
        headers={'Authorization': f'Bearer {token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert resp.status_code == 403, f"Expected 403, got: {resp.status_code}"


# 3. Upload memory with valid event association
def test_03_upload_memory_with_event_association(client):
    token, uid = get_token(client, 'student')
    
    # Create an event first in batch_cs_2026
    ev_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Senior Farewell Dinner',
            'description': 'End of semester celebration banquet with friends',
            'date': '2026-05-18',
            'venue': 'Grand Hall'
        }
    )
    assert ev_resp.status_code == 201
    event_id = ev_resp.get_json()['data']['id']

    # Upload memory tagged with event
    img_bytes = create_test_image_bytes(format="PNG", color="green")
    data = {
        'files[]': [(img_bytes, 'farewell_dinner.png', 'image/png')],
        'caption': 'Toasts and speeches at the farewell dinner',
        'eventId': event_id
    }

    resp = client.post(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert resp.status_code == 201
    mem = resp.get_json()['data'][0]
    assert mem['eventId'] == event_id
    assert mem['eventTitle'] == 'Senior Farewell Dinner'


# 4. Upload memory rejected for cross-batch event association
def test_04_upload_memory_rejected_for_cross_batch_event(client):
    alumni_token, _ = get_token(client, 'alumni')
    student_token, _ = get_token(client, 'student')

    # Alumni creates an event in batch_cs_2021
    ev_resp = client.post(
        '/api/v1/batches/batch_cs_2021/events',
        headers={'Authorization': f'Bearer {alumni_token}'},
        json={
            'title': '5-Year Reunion Gala',
            'description': 'Celebrating 5 years since our graduation milestone.',
            'date': '2026-07-20',
            'venue': 'Alumni Hall'
        }
    )
    assert ev_resp.status_code == 201
    alumni_event_id = ev_resp.get_json()['data']['id']

    # Student attempts to tag a memory in batch_cs_2026 with alumni's event_id
    img_bytes = create_test_image_bytes(format="JPEG", color="yellow")
    data = {
        'files[]': [(img_bytes, 'cross_event.jpg', 'image/jpeg')],
        'caption': 'Trying to tag wrong event',
        'eventId': alumni_event_id
    }

    resp = client.post(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {student_token}'},
        data=data,
        content_type='multipart/form-data'
    )
    assert resp.status_code == 400
    assert 'does not belong to this batch' in resp.get_json()['error']['message']


# 5. List batch memories for members
def test_05_list_batch_memories(client):
    token, _ = get_token(client, 'student')
    ensure_test_memory(client, token)

    resp = client.get(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    res_data = resp.get_json()
    assert res_data['success'] is True
    assert isinstance(res_data['data'], list)
    assert len(res_data['data']) >= 1


# 6. List batch memories filtered by event
def test_06_list_batch_memories_filtered_by_event(client):
    token, _ = get_token(client, 'student')
    
    # Create event and memory
    ev_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Graduation Afterparty',
            'description': 'Celebration gathering at the university center.',
            'date': '2026-05-20',
            'venue': 'Center Hall'
        }
    )
    event_id = ev_resp.get_json()['data']['id']

    img_bytes = create_test_image_bytes(format="JPEG", color="orange")
    client.post(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {token}'},
        data={
            'files[]': [(img_bytes, 'party.jpg', 'image/jpeg')],
            'caption': 'Party celebration',
            'eventId': event_id
        },
        content_type='multipart/form-data'
    )

    resp = client.get(
        f'/api/v1/batches/batch_cs_2026/memories?eventId={event_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    filtered = resp.get_json()['data']
    assert len(filtered) >= 1
    for m in filtered:
        assert m['eventId'] == event_id


# 7. List batch memories filtered by year
def test_07_list_batch_memories_filtered_by_year(client):
    token, _ = get_token(client, 'student')
    ensure_test_memory(client, token, caption='Class of 2026 memory')

    resp = client.get(
        '/api/v1/batches/batch_cs_2026/memories?year=2026',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    filtered = resp.get_json()['data']
    assert len(filtered) >= 1
    for m in filtered:
        assert m.get('graduationYear') == 2026 or (m.get('takenAt') and '2026' in m.get('takenAt'))


# 8. Get batch memory by ID
def test_08_get_batch_memory_by_id(client):
    token, _ = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Detailed retrieval test photo')
    
    resp = client.get(
        f'/api/v1/batches/memories/{mem["id"]}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    retrieved = resp.get_json()['data']
    assert retrieved['id'] == mem['id']
    assert retrieved['caption'] == 'Detailed retrieval test photo'
    assert 'uploaderName' in retrieved


# 9. Update memory caption by owner
def test_09_update_memory_caption_by_owner(client):
    token, uid = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Original caption before edit')

    resp = client.put(
        f'/api/v1/batches/memories/{mem["id"]}',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'caption': 'Updated: Best day of senior year!',
            'description': 'Added new nostalgic description.'
        }
    )
    assert resp.status_code == 200
    updated = resp.get_json()['data']
    assert updated['caption'] == 'Updated: Best day of senior year!'
    assert updated['description'] == 'Added new nostalgic description.'


# 10. Update memory caption forbidden for non-owner non-admin
def test_10_update_memory_caption_forbidden_for_other_user(client):
    student_token, _ = get_token(client, 'student')
    faculty_token, _ = get_token(client, 'faculty')
    mem = ensure_test_memory(client, student_token, caption='Student exclusive photo')

    resp = client.put(
        f'/api/v1/batches/memories/{mem["id"]}',
        headers={'Authorization': f'Bearer {faculty_token}'},
        json={'caption': 'Unauthorized modification attempt'}
    )
    assert resp.status_code == 403


# 11. Like and unlike memory toggle
def test_11_like_and_unlike_memory_toggle(client):
    token, _ = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Reaction photo')
    mem_id = mem['id']

    # Toggle like 1: Like
    resp1 = client.post(
        f'/api/v1/batches/memories/{mem_id}/like',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp1.status_code == 200
    data1 = resp1.get_json()['data']
    assert data1['liked'] is True
    assert data1['likesCount'] == 1

    # Toggle like 2: Unlike
    resp2 = client.post(
        f'/api/v1/batches/memories/{mem_id}/like',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp2.status_code == 200
    data2 = resp2.get_json()['data']
    assert data2['liked'] is False
    assert data2['likesCount'] == 0


# 12. Like memory duplicate prevention in SQLite
def test_12_like_memory_duplicate_prevention(client):
    token, uid = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Duplicate prevention photo')
    mem_id = mem['id']

    # Like the memory
    client.post(
        f'/api/v1/batches/memories/{mem_id}/like',
        headers={'Authorization': f'Bearer {token}'}
    )

    # Inspect db directly: verify exactly 1 entry exists for (mem_id, uid)
    db = get_db()
    row = db.get_one(
        "SELECT COUNT(*) as cnt FROM batch_memory_likes WHERE memory_id = ? AND user_id = ?",
        [mem_id, uid]
    )
    assert row['cnt'] == 1


# 13. Create memory comment
def test_13_create_memory_comment(client):
    token, uid = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Commentable photo')
    mem_id = mem['id']

    resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/comments',
        headers={'Authorization': f'Bearer {token}'},
        json={'content': 'What an amazing photo! Miss you all.'}
    )
    assert resp.status_code == 201
    comment = resp.get_json()['data']
    assert comment['memoryId'] == mem_id
    assert comment['userId'] == uid
    assert comment['content'] == 'What an amazing photo! Miss you all.'

    # Verify comments list
    c_list = client.get(
        f'/api/v1/batches/memories/{mem_id}/comments',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert c_list.status_code == 200
    assert len(c_list.get_json()['data']) >= 1


# 14. Delete own memory comment
def test_14_delete_own_memory_comment(client):
    token, _ = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Deletable comment photo')
    mem_id = mem['id']

    c_resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/comments',
        headers={'Authorization': f'Bearer {token}'},
        json={'content': 'Temporary comment to delete'}
    )
    comment_id = c_resp.get_json()['data']['id']

    del_resp = client.delete(
        f'/api/v1/batches/memories/comments/{comment_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert del_resp.status_code == 200
    assert del_resp.get_json()['success'] is True


# 15. Delete memory comment forbidden for non-author non-admin
def test_15_delete_memory_comment_forbidden_for_other_user(client):
    student_token, _ = get_token(client, 'student')
    faculty_token, _ = get_token(client, 'faculty')
    mem = ensure_test_memory(client, student_token, caption='Moderated comment photo')
    mem_id = mem['id']

    c_resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/comments',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'content': 'Student comment that faculty cannot delete'}
    )
    comment_id = c_resp.get_json()['data']['id']

    del_resp = client.delete(
        f'/api/v1/batches/memories/comments/{comment_id}',
        headers={'Authorization': f'Bearer {faculty_token}'}
    )
    assert del_resp.status_code == 403


# 16. Report memory submission
def test_16_report_memory_submission(client):
    token, uid = get_token(client, 'student')
    mem = ensure_test_memory(client, token, caption='Flagged photo')
    mem_id = mem['id']

    resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/report',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'reason': 'Inappropriate Content',
            'details': 'Photo quality test flag for moderation queue.'
        }
    )
    assert resp.status_code == 201
    rep = resp.get_json()['data']
    assert rep['memoryId'] == mem_id
    assert rep['reporterId'] == uid
    assert rep['reason'] == 'Inappropriate Content'
    assert rep['status'] == 'pending'


# 17. Memory reports access forbidden for students
def test_17_memory_reports_access_forbidden_for_students(client):
    token, _ = get_token(client, 'student')
    resp = client.get(
        '/api/v1/batches/memories/reports',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 403


# 18. Admin moderate memory report - dismiss
def test_18_admin_moderate_memory_report_dismiss(client):
    student_token, _ = get_token(client, 'student')
    admin_token, _ = get_token(client, 'admin')
    mem = ensure_test_memory(client, student_token, caption='Safe photo to dismiss')
    mem_id = mem['id']

    rep_resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/report',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'reason': 'Spam or Advertising', 'details': 'Looks like promotional material.'}
    )
    report_id = rep_resp.get_json()['data']['id']

    # Admin moderates report by dismissing
    mod_resp = client.put(
        f'/api/v1/batches/memories/reports/{report_id}/moderate',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'action': 'dismiss', 'note': 'False flag. Photo is safe and approved.'}
    )
    assert mod_resp.status_code == 200
    mod = mod_resp.get_json()['data']
    assert mod['status'] == 'dismissed'
    assert 'False flag' in mod['moderationNote']


# 19. Admin moderate memory report - remove photo
def test_19_admin_moderate_memory_report_remove(client):
    student_token, _ = get_token(client, 'student')
    admin_token, _ = get_token(client, 'admin')

    # Upload a memory specifically to test removal
    mem = ensure_test_memory(client, student_token, caption='Flagged memory to remove')
    mem_id = mem['id']

    # Report it
    rep_resp = client.post(
        f'/api/v1/batches/memories/{mem_id}/report',
        headers={'Authorization': f'Bearer {student_token}'},
        json={'reason': 'Harassment or Hate Speech', 'details': 'Needs removal.'}
    )
    report_id = rep_resp.get_json()['data']['id']

    # Admin removes the photo
    mod_resp = client.put(
        f'/api/v1/batches/memories/reports/{report_id}/moderate',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'action': 'remove', 'note': 'Violates community guidelines.'}
    )
    assert mod_resp.status_code == 200
    assert mod_resp.get_json()['data']['status'] == 'removed'

    # Verify memory is no longer retrievable
    get_resp = client.get(
        f'/api/v1/batches/memories/{mem_id}',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert get_resp.status_code == 404


# 20. Memory timeline and albums aggregation
def test_20_memory_timeline_and_albums_aggregation(client):
    token, _ = get_token(client, 'student')
    
    # Create an event first in batch_cs_2026
    ev_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Campus Spring Carnival',
            'description': 'Annual student and alumni carnival event.',
            'date': '2026-04-12',
            'venue': 'Quad'
        }
    )
    event_id = ev_resp.get_json()['data']['id']

    # Upload tagged memory
    img_bytes = create_test_image_bytes(format="JPEG", color="teal")
    client.post(
        '/api/v1/batches/batch_cs_2026/memories',
        headers={'Authorization': f'Bearer {token}'},
        data={
            'files[]': [(img_bytes, 'carnival.jpg', 'image/jpeg')],
            'caption': 'Carnival rides',
            'eventId': event_id,
            'graduationYear': '2026'
        },
        content_type='multipart/form-data'
    )

    # Albums aggregation
    alb_resp = client.get(
        '/api/v1/batches/batch_cs_2026/albums',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert alb_resp.status_code == 200
    albums = alb_resp.get_json()['data']
    assert isinstance(albums, list)
    assert len(albums) >= 1
    for a in albums:
        assert 'photosCount' in a
        assert a['photosCount'] >= 0

    # Timeline aggregation
    time_resp = client.get(
        '/api/v1/batches/batch_cs_2026/memories/timeline',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert time_resp.status_code == 200
    timeline = time_resp.get_json()['data']
    assert isinstance(timeline, list)
    assert len(timeline) >= 1
    for t in timeline:
        assert 'year' in t
        assert 'count' in t
        assert 'memories' in t
