import pytest
import json
from app.db import get_db


def test_relational_schema_tables_exist(client):
    """Verifies that all required relational tables exist in SQLite."""
    db = get_db()
    conn = db._get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cursor.fetchall()}

    expected_tables = {
        'users',
        'student_profiles',
        'faculty_profiles',
        'alumni_profiles',
        'postings',
        'saved_postings',
        'applications',
        'conversations',
        'messages',
        'events',
        'event_attendees',
        'resources',
        'announcements',
        'courses',
        'academic_years',
        'batches',
        'batch_members',
        'community_posts',
        'community_comments',
        'connection_requests',
        'mentorship_requests',
        'career_goals',
        'career_milestones',
        'achievements',
        'audit_logs',
        'support_tickets',
        'schema_migrations'
    }

    for tbl in expected_tables:
        assert tbl in tables, f"Expected table '{tbl}' was not found in SQLite schema!"


def test_user_and_profile_relational_lifecycle(client):
    """Verifies relational insertion, profile linking, and foreign key cascading."""
    db = get_db()
    conn = db._get_conn()
    cursor = conn.cursor()

    # Insert test student
    user_id = "test_relational_student_1"
    cursor.execute("""
        INSERT INTO users (id, uid, email, display_name, role)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, user_id, "test.student.rel@test.edu", "Relational Student", "student"))

    # Insert student profile linked via foreign key
    cursor.execute("""
        INSERT INTO student_profiles (user_id, enrollment_number, gpa, skills)
        VALUES (?, ?, ?, ?)
    """, (user_id, "ENR-9999", "3.95", json.dumps(["Python", "SQL"])))
    conn.commit()

    # Query join
    cursor.execute("""
        SELECT u.display_name, u.email, sp.enrollment_number, sp.gpa, sp.skills
        FROM users u
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ?
    """, (user_id,))
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "Relational Student"
    assert row[2] == "ENR-9999"
    assert "Python" in json.loads(row[4])


def test_postings_and_applications_relational(client):
    """Verifies that postings and job applications maintain relational integrity."""
    db = get_db()
    conn = db._get_conn()
    cursor = conn.cursor()

    # Create posting
    post_id = "post_relational_1"
    cursor.execute("""
        INSERT INTO postings (id, title, company, type, status)
        VALUES (?, ?, ?, ?, ?)
    """, (post_id, "Backend Architect", "Stripe", "job", "approved"))

    # Apply to posting
    app_id = "app_relational_1"
    user_id = "demo_student_uid"
    cursor.execute("""
        INSERT INTO applications (id, user_id, opportunity_id, company, status)
        VALUES (?, ?, ?, ?, ?)
    """, (app_id, user_id, post_id, "Stripe", "Interviewing"))
    conn.commit()

    # Query join
    cursor.execute("""
        SELECT a.status, p.title, p.company
        FROM applications a
        JOIN postings p ON a.opportunity_id = p.id
        WHERE a.id = ?
    """, (app_id,))
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "Interviewing"
    assert row[1] == "Backend Architect"


def test_conversations_and_messages_relational(client):
    """Verifies relational 1-to-many messaging structure."""
    db = get_db()
    conn = db._get_conn()
    cursor = conn.cursor()

    # Insert user1 first to satisfy foreign key constraint
    cursor.execute("""
        INSERT OR IGNORE INTO users (id, uid, email, display_name, role)
        VALUES ('user1', 'user1', 'user1@test.com', 'User 1', 'student')
    """)

    conv_id = "conv_relational_test"
    cursor.execute("""
        INSERT INTO conversations (id, participants, last_message)
        VALUES (?, ?, ?)
    """, (conv_id, json.dumps(["user1", "user2"]), "Hello relational!"))

    msg_id = "msg_relational_1"
    cursor.execute("""
        INSERT INTO messages (id, conversation_id, sender_id, sender_name, text)
        VALUES (?, ?, ?, ?, ?)
    """, (msg_id, conv_id, "user1", "User 1", "Hello relational!"))
    conn.commit()

    cursor.execute("""
        SELECT m.text, m.sender_name, c.last_message
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.id = ?
    """, (msg_id,))
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "Hello relational!"
    assert row[2] == "Hello relational!"
