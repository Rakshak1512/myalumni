import pytest
from app import create_app
from app.db import get_db

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_direct_messaging_flow(client):
    headers_a = {'Authorization': 'Bearer demo-token-student'}
    headers_b = {'Authorization': 'Bearer demo-token-alumni'}
    headers_c = {'Authorization': 'Bearer demo-token-faculty'}

    # 1. Start or get conversation between User A (student) and User B (alumni)
    res = client.post('/api/v1/chat/conversations', json={'recipientId': 'demo_alumni_uid'}, headers=headers_a)
    assert res.status_code == 200
    conv_id = res.json['data']['id']
    assert conv_id is not None

    # 2. User A sends message to User B
    msg_res = client.post(f'/api/v1/chat/conversations/{conv_id}/messages', json={'text': 'Hello Elena! How are you?'}, headers=headers_a)
    assert msg_res.status_code in (200, 201)
    msg_id = msg_res.json['data']['id']
    assert msg_res.json['data']['text'] == 'Hello Elena! How are you?'
    assert msg_res.json['data']['senderId'] == 'demo_student_uid'

    # 3. User B receives the message
    b_res = client.get(f'/api/v1/chat/conversations/{conv_id}/messages', headers=headers_b)
    assert b_res.status_code == 200
    messages = b_res.json['data']
    assert any(m['id'] == msg_id and m['text'] == 'Hello Elena! How are you?' for m in messages)

    # 4. User B replies to User A
    reply_res = client.post(f'/api/v1/chat/conversations/{conv_id}/messages', json={'text': 'Hi Alex! All good here.'}, headers=headers_b)
    assert reply_res.status_code in (200, 201)
    reply_id = reply_res.json['data']['id']

    # 5. User A receives reply
    a_res = client.get(f'/api/v1/chat/conversations/{conv_id}/messages', headers=headers_a)
    assert a_res.status_code == 200
    assert any(m['id'] == reply_id for m in a_res.json['data'])

    # 6. Unauthorized User C is blocked from accessing the conversation
    c_res = client.get(f'/api/v1/chat/conversations/{conv_id}/messages', headers=headers_c)
    assert c_res.status_code == 403

    # 7. Empty message is rejected
    empty_res = client.post(f'/api/v1/chat/conversations/{conv_id}/messages', json={'text': '   '}, headers=headers_a)
    assert empty_res.status_code == 400

def test_events_registration_and_attendees_flow(client):
    headers_student = {'Authorization': 'Bearer demo-token-student'}
    headers_alumni = {'Authorization': 'Bearer demo-token-alumni'}

    # 1. List upcoming events
    res = client.get('/api/v1/events', headers=headers_student)
    assert res.status_code == 200
    events = res.json['data']
    assert len(events) >= 2
    test_event = events[0]
    event_id = test_event['id']

    # Ensure clean state by cancelling if already registered
    client.delete(f'/api/v1/events/{event_id}/register', headers=headers_student)

    # 2. Register User for event
    reg_res = client.post(f'/api/v1/events/{event_id}/register', headers=headers_student)
    assert reg_res.status_code == 201
    assert reg_res.json['data']['eventId'] == event_id
    assert reg_res.json['data']['userId'] == 'demo_student_uid'

    # 3. Duplicate registration is prevented
    dup_res = client.post(f'/api/v1/events/{event_id}/register', headers=headers_student)
    assert dup_res.status_code == 400
    assert 'already registered' in dup_res.json['error']['message'].lower()

    # 4. User appears in My Registrations
    my_regs = client.get('/api/v1/events/my-registrations', headers=headers_student)
    assert my_regs.status_code == 200
    assert any(e['id'] == event_id for e in my_regs.json['data'])

    # 5. User appears in Attendees list
    att_res = client.get(f'/api/v1/events/{event_id}/attendees', headers=headers_student)
    assert att_res.status_code == 200
    attendees = att_res.json['data']
    assert any(a['userId'] == 'demo_student_uid' for a in attendees)

    # 6. Registrations are isolated (User B does not see User A's registration in their My Registrations)
    b_regs = client.get('/api/v1/events/my-registrations', headers=headers_alumni)
    assert b_regs.status_code == 200
    assert not any(e['id'] == event_id for e in b_regs.json['data'])

    # 7. Cancel registration
    cancel_res = client.delete(f'/api/v1/events/{event_id}/register', headers=headers_student)
    assert cancel_res.status_code == 200

    # 8. Verify cancelled from My Registrations
    my_regs_after = client.get('/api/v1/events/my-registrations', headers=headers_student)
    assert my_regs_after.status_code == 200
    assert not any(e['id'] == event_id for e in my_regs_after.json['data'])

    # 9. Non-existent event returns 404
    bad_res = client.post('/api/v1/events/non_existent_event_id/register', headers=headers_student)
    assert bad_res.status_code in (400, 404)
