"""
Comprehensive 20-Test Suite for BATCHVERSE — Phase 1: Where Classmates Stay Connected
Tests all 20 requirements specified in Prompt Section 13 using isolated test operations.
"""
import pytest
from app.db import get_db


def get_token(client, role_or_email):
    resp = client.post('/api/v1/auth/demo-login', json={'role': role_or_email})
    assert resp.status_code == 200, f"Demo login failed: {resp.get_json()}"
    data = resp.get_json()['data']
    return data['token'], data['user']['uid']


# 1. Student gets the correct batch
def test_01_student_gets_correct_batch(client):
    token, uid = get_token(client, 'student')
    resp = client.get('/api/v1/batches', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    batches = resp.get_json()['data']
    
    # Check student is matched to 2026 CS batch
    batch_2026 = next((b for b in batches if b['id'] == 'batch_cs_2026'), None)
    assert batch_2026 is not None
    assert batch_2026['isEligible'] is True
    assert batch_2026['graduationYear'] == 2026


# 2. Alumni gets the correct batch
def test_02_alumni_gets_correct_batch(client):
    token, uid = get_token(client, 'alumni')
    resp = client.get('/api/v1/batches', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    batches = resp.get_json()['data']

    # Check alumni is matched to 2021 CS batch
    batch_2021 = next((b for b in batches if b['id'] == 'batch_cs_2021'), None)
    assert batch_2021 is not None
    assert batch_2021['isEligible'] is True
    assert batch_2021['graduationYear'] == 2021


# 3. User cannot join an unrelated batch (arbitrary joining blocked)
def test_03_user_cannot_join_unrelated_batch(client):
    token, uid = get_token(client, 'student')
    # Student (Class of 2026) attempts to join Alumni Class of 2021
    resp = client.post('/api/v1/batches/batch_cs_2021/join', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 403
    err = resp.get_json()
    err_msg = err.get('error', {}).get('message', '')
    assert "Eligibility verification failed" in err_msg or "not match" in err_msg


# 4. Duplicate membership is prevented
def test_04_duplicate_membership_prevented(client):
    token, uid = get_token(client, 'student')
    # Student is already in batch_cs_2026
    resp = client.post('/api/v1/batches/batch_cs_2026/join', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    data = resp.get_json()['data']
    assert data.get('alreadyMember') is True or "already a verified member" in data.get('message', '')


# 5. Members directory loads correct records
def test_05_members_directory_loads_correct_records(client):
    token, uid = get_token(client, 'student')
    resp = client.get('/api/v1/batches/batch_cs_2026/members', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    members = resp.get_json()['data']
    assert len(members) > 0
    # Must not leak passwords or sensitive fields
    first = members[0]
    assert 'displayName' in first
    assert 'role' in first
    assert 'password_hash' not in first
    assert 'password' not in first


# 6. Member search works
def test_06_member_search_works(client):
    token, uid = get_token(client, 'student')
    resp = client.get('/api/v1/batches/batch_cs_2026/members?search=Alex', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    members = resp.get_json()['data']
    assert all('alex' in m['displayName'].lower() for m in members)


# 7. Member filters work (role filter)
def test_07_member_filters_work(client):
    token, uid = get_token(client, 'alumni')
    resp = client.get('/api/v1/batches/batch_cs_2021/members?role=alumni', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    members = resp.get_json()['data']
    for m in members:
        assert m['role'] == 'alumni'


# 8. Create a discussion
def test_08_create_discussion(client):
    token, uid = get_token(client, 'student')
    resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Test Senior Capstone Showcase 2026',
        'content': 'Looking for teammates for the cloud architecture track.',
        'postType': 'activities'
    }, headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 201
    post = resp.get_json()['data']
    assert post['title'] == 'Test Senior Capstone Showcase 2026'
    assert post['postType'] == 'activities'
    assert post['authorId'] == uid


# 9. Edit own discussion
def test_09_edit_own_discussion(client):
    token, uid = get_token(client, 'student')
    # Create post first
    create_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Original Discussion Title',
        'content': 'Original message content.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = create_resp.get_json()['data']['id']

    # Edit post
    edit_resp = client.put(f'/api/v1/batches/posts/{post_id}', json={
        'title': 'Updated Discussion Title by Author',
        'content': 'Updated message body content.',
        'postType': 'memories'
    }, headers={'Authorization': f'Bearer {token}'})
    assert edit_resp.status_code == 200
    updated = edit_resp.get_json()['data']
    assert updated['title'] == 'Updated Discussion Title by Author'
    assert updated['postType'] == 'memories'


# 10. Delete own discussion
def test_10_delete_own_discussion(client):
    token, uid = get_token(client, 'student')
    create_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'To be deleted post',
        'content': 'This post will be deleted by author.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = create_resp.get_json()['data']['id']

    del_resp = client.delete(f'/api/v1/batches/posts/{post_id}', headers={'Authorization': f'Bearer {token}'})
    assert del_resp.status_code == 200

    # Verify not found
    get_resp = client.get(f'/api/v1/batches/posts/{post_id}', headers={'Authorization': f'Bearer {token}'})
    assert get_resp.status_code == 404


# 11. Like and unlike a post (toggle)
def test_11_like_and_unlike_post(client):
    token, uid = get_token(client, 'student')
    # Create post
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Post for like toggle testing',
        'content': 'Message content for testing reactions.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = p_resp.get_json()['data']['id']

    # Like
    like_resp = client.post(f'/api/v1/batches/posts/{post_id}/like', headers={'Authorization': f'Bearer {token}'})
    assert like_resp.status_code == 200
    assert like_resp.get_json()['data']['liked'] is True

    # Unlike
    unlike_resp = client.post(f'/api/v1/batches/posts/{post_id}/like', headers={'Authorization': f'Bearer {token}'})
    assert unlike_resp.status_code == 200
    assert unlike_resp.get_json()['data']['liked'] is False


# 12. Duplicate likes are prevented
def test_12_duplicate_likes_prevented(client):
    token, uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Post for duplicate like verification',
        'content': 'Checking reaction count integrity.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = p_resp.get_json()['data']['id']

    # Like once
    r1 = client.post(f'/api/v1/batches/posts/{post_id}/like', headers={'Authorization': f'Bearer {token}'})
    count_after_first = r1.get_json()['data']['likesCount']
    assert count_after_first == 1

    # Like second time -> toggles off cleanly
    r2 = client.post(f'/api/v1/batches/posts/{post_id}/like', headers={'Authorization': f'Bearer {token}'})
    assert r2.get_json()['data']['likesCount'] == 0


# 13. Add a comment
def test_13_add_comment(client):
    token, uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Discussion for comment test',
        'content': 'Testing comments thread.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = p_resp.get_json()['data']['id']

    c_resp = client.post(f'/api/v1/batches/posts/{post_id}/comments', json={
        'content': 'This is a verified classmate comment.'
    }, headers={'Authorization': f'Bearer {token}'})
    assert c_resp.status_code == 201
    comment = c_resp.get_json()['data']
    assert comment['content'] == 'This is a verified classmate comment.'
    assert comment['authorId'] == uid


# 14. Edit own comment
def test_14_edit_own_comment(client):
    token, uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Post for comment edit',
        'content': 'Parent post.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = p_resp.get_json()['data']['id']

    c_resp = client.post(f'/api/v1/batches/posts/{post_id}/comments', json={
        'content': 'Initial comment content.'
    }, headers={'Authorization': f'Bearer {token}'})
    comment_id = c_resp.get_json()['data']['id']

    edit_resp = client.put(f'/api/v1/batches/comments/{comment_id}', json={
        'content': 'Updated comment content by author.'
    }, headers={'Authorization': f'Bearer {token}'})
    assert edit_resp.status_code == 200
    assert edit_resp.get_json()['data']['content'] == 'Updated comment content by author.'


# 15. Delete own comment
def test_15_delete_own_comment(client):
    token, uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Post for comment deletion',
        'content': 'Parent post.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {token}'})
    post_id = p_resp.get_json()['data']['id']

    c_resp = client.post(f'/api/v1/batches/posts/{post_id}/comments', json={
        'content': 'Comment to be removed.'
    }, headers={'Authorization': f'Bearer {token}'})
    comment_id = c_resp.get_json()['data']['id']

    del_resp = client.delete(f'/api/v1/batches/comments/{comment_id}', headers={'Authorization': f'Bearer {token}'})
    assert del_resp.status_code == 200


# 16. Unauthorized users cannot access restricted communities
def test_16_unauthorized_users_cannot_access_restricted_communities(client):
    # Student is in batch_cs_2026, but NOT in batch_cs_2021
    token, uid = get_token(client, 'student')
    resp = client.get('/api/v1/batches/batch_cs_2021/posts', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 403


# 17. Users cannot edit another person's posts
def test_17_users_cannot_edit_another_person_posts(client):
    # Student creates a post in batch_cs_2026
    s_token, s_uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Student authored post',
        'content': 'Protected content.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {s_token}'})
    post_id = p_resp.get_json()['data']['id']

    # Alumni tries to edit Student's post
    a_token, a_uid = get_token(client, 'alumni')
    edit_resp = client.put(f'/api/v1/batches/posts/{post_id}', json={
        'title': 'Malicious Edit Attempt',
        'content': 'Hijacked content.'
    }, headers={'Authorization': f'Bearer {a_token}'})
    assert edit_resp.status_code == 403


# 18. Admin moderation works (delete post and view reported posts)
def test_18_admin_moderation_works(client):
    s_token, s_uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Spam test post',
        'content': 'Inappropriate post content.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {s_token}'})
    post_id = p_resp.get_json()['data']['id']

    # Student reports the post
    rep_resp = client.post(f'/api/v1/batches/posts/{post_id}/report', json={
        'reason': 'Spam or Promotion',
        'details': 'Automated promotional text.'
    }, headers={'Authorization': f'Bearer {s_token}'})
    assert rep_resp.status_code == 200

    # Admin lists reported posts
    adm_token, adm_uid = get_token(client, 'admin')
    rep_list = client.get('/api/v1/batches/reported-posts', headers={'Authorization': f'Bearer {adm_token}'})
    assert rep_list.status_code == 200
    reports = rep_list.get_json()['data']
    assert any(r['post_id'] == post_id for r in reports)

    # Admin deletes the post
    del_resp = client.delete(f'/api/v1/batches/posts/{post_id}', headers={'Authorization': f'Bearer {adm_token}'})
    assert del_resp.status_code == 200


# 19. Notifications are generated correctly
def test_19_notifications_generated_correctly(client):
    # Student creates a post in batch_cs_2026
    s_token, s_uid = get_token(client, 'student')
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Post for notification testing',
        'content': 'Leave a comment here.',
        'postType': 'general'
    }, headers={'Authorization': f'Bearer {s_token}'})
    post_id = p_resp.get_json()['data']['id']

    # Admin comments on student's post
    adm_token, adm_uid = get_token(client, 'admin')
    comm_resp = client.post(f'/api/v1/batches/posts/{post_id}/comments', json={
        'content': 'Great topic, best wishes from administration!'
    }, headers={'Authorization': f'Bearer {adm_token}'})
    assert comm_resp.status_code == 201

    # Verify student received an in-app notification
    notif_resp = client.get('/api/v1/notifications', headers={'Authorization': f'Bearer {s_token}'})
    assert notif_resp.status_code == 200
    notifs = notif_resp.get_json()['data']
    comment_notif = next((n for n in notifs if n.get('type') == 'batch_comment' and post_id in (n.get('link') or '')), None)
    assert comment_notif is not None
    assert "New Comment" in comment_notif['title']


# 20. All records persist after refreshing / reloading database
def test_20_records_persist_after_refresh(client):
    token, uid = get_token(client, 'student')
    # Create a persistent post
    p_resp = client.post('/api/v1/batches/batch_cs_2026/posts', json={
        'title': 'Persistent BatchVerse Discussion',
        'content': 'This post must persist across database reloads.',
        'postType': 'career'
    }, headers={'Authorization': f'Bearer {token}'})
    assert p_resp.status_code == 201
    post_id = p_resp.get_json()['data']['id']

    # Query directly via SQLite
    db = get_db()
    row = db.get_one("SELECT * FROM community_posts WHERE id = ?", [post_id])
    assert row is not None
    assert row['title'] == 'Persistent BatchVerse Discussion'
    assert row['post_type'] == 'career'
    assert row['author_id'] == uid
