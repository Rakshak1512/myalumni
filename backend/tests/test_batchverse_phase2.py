"""
Comprehensive 20-Test Suite for BATCHVERSE Phase 2: Reunions, Events, Announcements & Polls
Tests all Phase 2 features across all four roles (Admin, Faculty, Student, Alumni).
"""
import pytest
from app.db import get_db


def get_token(client, role_or_email):
    resp = client.post('/api/v1/auth/demo-login', json={'role': role_or_email})
    assert resp.status_code == 200, f"Demo login failed: {resp.get_json()}"
    data = resp.get_json()['data']
    return data['token'], data['user']['uid']


# 1. Event creation by verified batch member
def test_01_event_creation_by_batch_member(client):
    token, uid = get_token(client, 'student')
    payload = {
        'title': 'Class of 2026 Tech & Career Mixer',
        'description': 'Networking session discussing upcoming tech internships and project collaborations.',
        'date': '2026-11-15',
        'startTime': '17:00',
        'venue': 'Engineering Building Atrium',
        'eventType': 'meetup'
    }
    resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json=payload
    )
    assert resp.status_code == 201, f"Create event failed: {resp.get_json()}"
    event = resp.get_json()['data']
    assert event['title'] == payload['title']
    assert event['batchId'] == 'batch_cs_2026'
    assert event['creatorId'] == uid
    assert event['status'] == 'upcoming'
    assert event['goingCount'] == 0


# 2. Event creation rejected for unverified/non-member
def test_02_event_creation_rejected_for_non_member(client):
    token, uid = get_token(client, 'student')
    # Student belongs to batch_cs_2026, not batch_cs_2021
    payload = {
        'title': 'Unverified Meetup Attempt',
        'description': 'This should be blocked by backend authorization.',
        'date': '2026-12-01',
        'venue': 'Campus Lawn',
        'eventType': 'social'
    }
    resp = client.post(
        '/api/v1/batches/batch_cs_2021/events',
        headers={'Authorization': f'Bearer {token}'},
        json=payload
    )
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.get_json()}"


# 3. Event editing by creator
def test_03_event_editing_by_creator(client):
    token, uid = get_token(client, 'student')
    # Create event
    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Original Event Title',
            'description': 'Original description of the event.',
            'date': '2026-11-20',
            'venue': 'Room 101',
            'eventType': 'reunion'
        }
    )
    assert create_resp.status_code == 201
    event_id = create_resp.get_json()['data']['id']

    # Update event
    update_resp = client.put(
        f'/api/v1/batches/events/{event_id}',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Updated Event Title',
            'description': 'Updated description with expanded details.',
            'date': '2026-11-22',
            'venue': 'Main Auditorium'
        }
    )
    assert update_resp.status_code == 200
    updated = update_resp.get_json()['data']
    assert updated['title'] == 'Updated Event Title'
    assert updated['venue'] == 'Main Auditorium'


# 4. Event editing forbidden for unauthorized user
def test_04_event_editing_forbidden_for_other_user(client):
    student_token, _ = get_token(client, 'student')
    alumni_token, _ = get_token(client, 'alumni')

    # Student creates event
    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {student_token}'},
        json={
            'title': 'Student Hackathon Discussion',
            'description': 'Planning our annual hackathon.',
            'date': '2026-11-25',
            'venue': 'Virtual Meet',
            'eventType': 'webinar'
        }
    )
    assert create_resp.status_code == 201
    event_id = create_resp.get_json()['data']['id']

    # Alumni attempts to edit student's event
    edit_resp = client.put(
        f'/api/v1/batches/events/{event_id}',
        headers={'Authorization': f'Bearer {alumni_token}'},
        json={'title': 'Malicious Title Override'}
    )
    assert edit_resp.status_code == 403


# 5. Event RSVP lifecycle and duplicate prevention
def test_05_event_rsvp_lifecycle(client):
    token, uid = get_token(client, 'student')

    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'RSVP Test Event',
            'description': 'Testing going, interested, and not_going status changes.',
            'date': '2026-12-10',
            'venue': 'Conference Hall',
            'eventType': 'social'
        }
    )
    assert create_resp.status_code == 201
    event_id = create_resp.get_json()['data']['id']

    # 1. RSVP Going
    rsvp1 = client.post(
        f'/api/v1/batches/events/{event_id}/rsvp',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'going'}
    )
    assert rsvp1.status_code == 200
    assert rsvp1.get_json()['data']['goingCount'] == 1
    assert rsvp1.get_json()['data']['interestedCount'] == 0

    # 2. Duplicate RSVP Going should be idempotent
    rsvp_dup = client.post(
        f'/api/v1/batches/events/{event_id}/rsvp',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'going'}
    )
    assert rsvp_dup.status_code == 200
    assert rsvp_dup.get_json()['data']['goingCount'] == 1

    # 3. Change RSVP to Interested
    rsvp2 = client.post(
        f'/api/v1/batches/events/{event_id}/rsvp',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'interested'}
    )
    assert rsvp2.status_code == 200
    assert rsvp2.get_json()['data']['goingCount'] == 0
    assert rsvp2.get_json()['data']['interestedCount'] == 1

    # 4. Change RSVP to Not Going
    rsvp3 = client.post(
        f'/api/v1/batches/events/{event_id}/rsvp',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'not_going'}
    )
    assert rsvp3.status_code == 200
    assert rsvp3.get_json()['data']['interestedCount'] == 0
    assert rsvp3.get_json()['data']['notGoingCount'] == 1


# 6. Event attendees list
def test_06_event_attendees_list(client):
    token, uid = get_token(client, 'student')

    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Attendee Test Event',
            'description': 'Testing attendee roster retrieval.',
            'date': '2026-12-15',
            'venue': 'Seminar Hall',
            'eventType': 'meetup'
        }
    )
    event_id = create_resp.get_json()['data']['id']

    # RSVP going
    client.post(
        f'/api/v1/batches/events/{event_id}/rsvp',
        headers={'Authorization': f'Bearer {token}'},
        json={'status': 'going'}
    )

    # Fetch attendees
    resp = client.get(
        f'/api/v1/batches/events/{event_id}/attendees',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    attendees = resp.get_json()['data']
    assert len(attendees) >= 1
    assert any(a['userId'] == uid and a['status'] == 'going' for a in attendees)


# 7. Event cancellation and deletion
def test_07_event_cancellation_and_deletion(client):
    token, uid = get_token(client, 'student')

    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/events',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'title': 'Event to Cancel and Delete',
            'description': 'Testing cancellation and deletion workflow.',
            'date': '2026-12-20',
            'venue': 'Auditorium B',
            'eventType': 'reunion'
        }
    )
    event_id = create_resp.get_json()['data']['id']

    # Cancel
    cancel_resp = client.put(
        f'/api/v1/batches/events/{event_id}/cancel',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.get_json()['data']['status'] == 'cancelled'

    # Delete
    del_resp = client.delete(
        f'/api/v1/batches/events/{event_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert del_resp.status_code == 200
    assert del_resp.get_json()['data']['deleted'] is True

    # Confirm 404 on get
    get_resp = client.get(
        f'/api/v1/batches/events/{event_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert get_resp.status_code == 404


# 8. Announcement publishing by admin and faculty
def test_08_announcement_publishing_by_admin_and_faculty(client):
    admin_token, _ = get_token(client, 'admin')
    faculty_token, _ = get_token(client, 'faculty')

    # Admin posts announcement
    admin_ann = client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Official University Convocation Notice',
            'content': 'All graduating seniors must submit their regalia sizing forms by Friday.',
            'priority': 'high',
            'isPinned': True
        }
    )
    assert admin_ann.status_code == 201
    assert admin_ann.get_json()['data']['isPinned'] is True

    # Faculty posts announcement
    fac_ann = client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {faculty_token}'},
        json={
            'title': 'Faculty Advisor Office Hours for Final Projects',
            'content': 'Office hours are available every Tuesday from 2 PM to 5 PM in Room 304.',
            'priority': 'normal'
        }
    )
    assert fac_ann.status_code == 201
    assert fac_ann.get_json()['data']['priority'] == 'normal'


# 9. Announcement publishing forbidden for regular student
def test_09_announcement_publishing_forbidden_for_regular_student(client):
    student_token, _ = get_token(client, 'student')

    resp = client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {student_token}'},
        json={
            'title': 'Unauthorized Student Broadcast',
            'content': 'Students should not be able to publish batch announcements.'
        }
    )
    assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"


# 10. Announcement pin toggle
def test_10_announcement_pin_toggle(client):
    admin_token, _ = get_token(client, 'admin')

    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Notice to Toggle Pin',
            'content': 'Testing pinning and unpinning mechanism.',
            'isPinned': False
        }
    )
    ann_id = create_resp.get_json()['data']['id']
    assert create_resp.get_json()['data']['isPinned'] is False

    # Toggle to Pinned
    pin_resp = client.post(
        f'/api/v1/batches/announcements/{ann_id}/pin',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert pin_resp.status_code == 200
    assert pin_resp.get_json()['data']['isPinned'] is True

    # Toggle to Unpinned
    unpin_resp = client.post(
        f'/api/v1/batches/announcements/{ann_id}/pin',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert unpin_resp.status_code == 200
    assert unpin_resp.get_json()['data']['isPinned'] is False


# 11. Announcement update and deletion
def test_11_announcement_update_and_deletion(client):
    admin_token, _ = get_token(client, 'admin')

    create_resp = client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Announcement to Update & Delete',
            'content': 'Initial announcement content before update.',
            'priority': 'normal'
        }
    )
    ann_id = create_resp.get_json()['data']['id']

    # Update
    update_resp = client.put(
        f'/api/v1/batches/announcements/{ann_id}',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Updated Announcement Title',
            'content': 'Updated content with revised guidelines.',
            'priority': 'urgent'
        }
    )
    assert update_resp.status_code == 200
    assert update_resp.get_json()['data']['priority'] == 'urgent'

    # Delete
    del_resp = client.delete(
        f'/api/v1/batches/announcements/{ann_id}',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    assert del_resp.status_code == 200
    assert del_resp.get_json()['data']['deleted'] is True


# 12. Announcement notification dispatch
def test_12_announcement_notification_dispatch(client):
    admin_token, _ = get_token(client, 'admin')
    student_token, student_uid = get_token(client, 'student')

    # Admin posts announcement to batch_cs_2026 where student is member
    client.post(
        '/api/v1/batches/batch_cs_2026/announcements',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Critical Grade Deadline Notification',
            'content': 'Grades for senior capstone are published today.',
            'priority': 'urgent'
        }
    )

    # Student checks notifications
    notifs_resp = client.get(
        '/api/v1/notifications',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert notifs_resp.status_code == 200
    notifs = notifs_resp.get_json()['data']
    assert any('Critical Grade Deadline' in (n.get('title') or '') for n in notifs)


# 13. Poll creation with minimum 2 options
def test_13_poll_creation_with_options(client):
    token, uid = get_token(client, 'student')

    # Valid poll
    resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'question': 'Which framework should we use for our batch showcase?',
            'options': ['React & Vite', 'Vue.js', 'Next.js'],
            'closingDate': '2026-12-31'
        }
    )
    assert resp.status_code == 201
    poll = resp.get_json()['data']
    assert len(poll['options']) == 3
    assert poll['status'] == 'active'
    assert poll['totalVotes'] == 0

    # Invalid poll with only 1 option
    bad_resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'question': 'What is your favorite color?',
            'options': ['Only Blue']
        }
    )
    assert bad_resp.status_code == 400


# 14. Poll voting and vote changing without duplicate counting
def test_14_poll_voting_and_duplicate_prevention(client):
    token, uid = get_token(client, 'student')

    poll_resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'question': 'Where should our graduation party take place?',
            'options': ['Beach Resort', 'Mountain Cabin', 'Downtown Ballroom']
        }
    )
    assert poll_resp.status_code == 201
    poll = poll_resp.get_json()['data']
    poll_id = poll['id']
    opt1_id = poll['options'][0]['id']
    opt2_id = poll['options'][1]['id']

    # Vote option 1
    vote1 = client.post(
        f'/api/v1/batches/polls/{poll_id}/vote',
        headers={'Authorization': f'Bearer {token}'},
        json={'optionId': opt1_id}
    )
    assert vote1.status_code == 200
    p1 = vote1.get_json()['data']
    assert p1['totalVotes'] == 1
    assert p1['options'][0]['votesCount'] == 1
    assert p1['options'][1]['votesCount'] == 0

    # Change vote to option 2
    vote2 = client.post(
        f'/api/v1/batches/polls/{poll_id}/vote',
        headers={'Authorization': f'Bearer {token}'},
        json={'optionId': opt2_id}
    )
    assert vote2.status_code == 200
    p2 = vote2.get_json()['data']
    # Total votes should STILL be 1, not 2
    assert p2['totalVotes'] == 1
    assert p2['options'][0]['votesCount'] == 0
    assert p2['options'][1]['votesCount'] == 1

    # Re-voting for same option 2 should be a no-op
    vote_dup = client.post(
        f'/api/v1/batches/polls/{poll_id}/vote',
        headers={'Authorization': f'Bearer {token}'},
        json={'optionId': opt2_id}
    )
    assert vote_dup.status_code == 200
    assert vote_dup.get_json()['data']['totalVotes'] == 1


# 15. Poll voting rejected for non-member
def test_15_poll_voting_rejected_for_non_member(client):
    student_token, _ = get_token(client, 'student')
    alumni_token, _ = get_token(client, 'alumni')

    # Student creates poll in batch_cs_2026
    poll_resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {student_token}'},
        json={
            'question': 'Internal Student Only Poll Question',
            'options': ['Option A', 'Option B']
        }
    )
    poll_id = poll_resp.get_json()['data']['id']
    opt_id = poll_resp.get_json()['data']['options'][0]['id']

    # Alumni (who is NOT in batch_cs_2026) tries to vote
    vote_resp = client.post(
        f'/api/v1/batches/polls/{poll_id}/vote',
        headers={'Authorization': f'Bearer {alumni_token}'},
        json={'optionId': opt_id}
    )
    assert vote_resp.status_code == 403


# 16. Poll closing and voting blocked on closed poll
def test_16_poll_closing_and_voting_blocked(client):
    token, uid = get_token(client, 'student')

    poll_resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'question': 'Poll to Close and Verify Voting Blocked',
            'options': ['Option 1', 'Option 2']
        }
    )
    poll_id = poll_resp.get_json()['data']['id']
    opt_id = poll_resp.get_json()['data']['options'][0]['id']

    # Close poll
    close_resp = client.put(
        f'/api/v1/batches/polls/{poll_id}/close',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert close_resp.status_code == 200
    assert close_resp.get_json()['data']['status'] == 'closed'

    # Attempting to vote on closed poll returns error
    vote_resp = client.post(
        f'/api/v1/batches/polls/{poll_id}/vote',
        headers={'Authorization': f'Bearer {token}'},
        json={'optionId': opt_id}
    )
    assert vote_resp.status_code == 400
    assert "closed" in vote_resp.get_json()['error']['message'].lower()


# 17. Poll deletion cascades properly
def test_17_poll_deletion(client):
    token, uid = get_token(client, 'student')

    poll_resp = client.post(
        '/api/v1/batches/batch_cs_2026/polls',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'question': 'Poll to be Permanently Deleted',
            'options': ['Alpha', 'Beta']
        }
    )
    poll_id = poll_resp.get_json()['data']['id']

    # Delete poll
    del_resp = client.delete(
        f'/api/v1/batches/polls/{poll_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert del_resp.status_code == 200
    assert del_resp.get_json()['data']['deleted'] is True

    # Confirm 404
    get_resp = client.get(
        f'/api/v1/batches/polls/{poll_id}',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert get_resp.status_code == 404


# 18. Batch events status filtering
def test_18_batch_events_status_filter(client):
    token, uid = get_token(client, 'student')

    # Get events filtered by upcoming
    resp = client.get(
        '/api/v1/batches/batch_cs_2026/events?status=upcoming',
        headers={'Authorization': f'Bearer {token}'}
    )
    assert resp.status_code == 200
    events = resp.get_json()['data']
    assert all(e['status'] == 'upcoming' for e in events)


# 19. Batch isolation security between cohorts
def test_19_batch_isolation_security(client):
    student_token, _ = get_token(client, 'student')

    # Student cannot read announcements from batch_cs_2021
    resp = client.get(
        '/api/v1/batches/batch_cs_2021/announcements',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp.status_code == 403

    # Student cannot read polls from batch_cs_2021
    resp_polls = client.get(
        '/api/v1/batches/batch_cs_2021/polls',
        headers={'Authorization': f'Bearer {student_token}'}
    )
    assert resp_polls.status_code == 403


# 20. Verification that all 4 demo accounts remain intact and functional
def test_20_demo_accounts_preserved(client):
    db = get_db()
    for role, email in [
        ('admin', 'admin@myalumni.edu'),
        ('faculty', 'faculty@myalumni.edu'),
        ('student', 'student@myalumni.edu'),
        ('alumni', 'alumni@myalumni.edu'),
    ]:
        token, uid = get_token(client, role)
        assert token is not None
        user = db.get_one("SELECT * FROM users WHERE email = ?", [email])
        assert user is not None
        assert user['role'] == role

