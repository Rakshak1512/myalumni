import os
import sys
import json
import sqlite3
import shutil
import datetime
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


SCHEMA_SQL = """
-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    account_status TEXT NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    is_provisioned INTEGER NOT NULL DEFAULT 1,
    email_verified INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status);

-- Student Profiles
CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enrollment_number TEXT,
    course_id TEXT,
    course_name TEXT,
    academic_year_id TEXT,
    academic_year_name TEXT,
    batch_id TEXT,
    gpa TEXT,
    skills TEXT,
    career_interests TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Faculty Profiles
CREATE TABLE IF NOT EXISTS faculty_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department TEXT,
    designation TEXT,
    office_location TEXT,
    research_areas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alumni Profiles
CREATE TABLE IF NOT EXISTS alumni_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    graduation_year INTEGER,
    course_id TEXT,
    course_name TEXT,
    company TEXT,
    job_title TEXT,
    industry TEXT,
    years_of_experience INTEGER DEFAULT 0,
    location TEXT,
    skills TEXT,
    is_mentoring_available INTEGER DEFAULT 0,
    max_mentees INTEGER DEFAULT 2,
    current_mentees_count INTEGER DEFAULT 0,
    batch_id TEXT,
    birthday TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alumni_company ON alumni_profiles(company);
CREATE INDEX IF NOT EXISTS idx_alumni_grad_year ON alumni_profiles(graduation_year);
CREATE INDEX IF NOT EXISTS idx_alumni_mentor ON alumni_profiles(is_mentoring_available);

-- Postings / Opportunities
CREATE TABLE IF NOT EXISTS postings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'job',
    location TEXT,
    workplace_type TEXT DEFAULT 'onsite',
    experience_level TEXT,
    description TEXT,
    skills_required TEXT,
    application_url TEXT,
    posted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    posted_by_user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_postings_status ON postings(status);
CREATE INDEX IF NOT EXISTS idx_postings_type ON postings(type);
CREATE INDEX IF NOT EXISTS idx_postings_author ON postings(posted_by_user_id);

-- Saved Postings
CREATE TABLE IF NOT EXISTS saved_postings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    posting_id TEXT NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, posting_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_postings_user ON saved_postings(user_id);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
    opportunity_title TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'Applied',
    notes TEXT,
    applied_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, opportunity_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    participants TEXT NOT NULL,
    participant_names TEXT,
    participant_roles TEXT,
    last_message TEXT,
    last_message_sender_id TEXT,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    read_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT,
    location TEXT,
    event_type TEXT DEFAULT 'reunion',
    organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    organizer_name TEXT,
    capacity INTEGER DEFAULT 100,
    attendees_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Event Attendees
CREATE TABLE IF NOT EXISTS event_attendees (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'study_materials',
    course_id TEXT,
    course_name TEXT,
    target_course_id TEXT,
    uploaded_by TEXT,
    file_url TEXT,
    file_size TEXT,
    priority TEXT DEFAULT 'normal',
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'published',
    target_role TEXT DEFAULT 'all',
    uploaded_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department TEXT,
    duration_years INTEGER DEFAULT 4,
    degree_type TEXT DEFAULT 'Undergraduate',
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batches
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    course_id TEXT,
    course_name TEXT,
    graduation_year INTEGER,
    members_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Batch Members
CREATE TABLE IF NOT EXISTS batch_members (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, user_id)
);

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT,
    author_role TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_community_posts_batch ON community_posts(batch_id);

-- Community Comments
CREATE TABLE IF NOT EXISTS community_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);

-- Connection Requests
CREATE TABLE IF NOT EXISTS connection_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT,
    sender_role TEXT,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name TEXT,
    recipient_role TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mentorship Requests
CREATE TABLE IF NOT EXISTS mentorship_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT,
    mentor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_name TEXT,
    goals TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Career Goals
CREATE TABLE IF NOT EXISTS career_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_role TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress',
    progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Career Milestones
CREATE TABLE IF NOT EXISTS career_milestones (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Career',
    proof_url TEXT,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor_id TEXT,
    actor_email TEXT,
    actor_role TEXT,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    status TEXT DEFAULT 'SUCCESS',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    admin_response TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compatibility Views
CREATE VIEW IF NOT EXISTS opportunities AS SELECT * FROM postings;
CREATE VIEW IF NOT EXISTS savedOpportunities AS SELECT * FROM saved_postings;
CREATE VIEW IF NOT EXISTS studentProfiles AS SELECT * FROM student_profiles;
CREATE VIEW IF NOT EXISTS facultyProfiles AS SELECT * FROM faculty_profiles;
CREATE VIEW IF NOT EXISTS alumniProfiles AS SELECT * FROM alumni_profiles;
CREATE VIEW IF NOT EXISTS connectionRequests AS SELECT * FROM connection_requests;
CREATE VIEW IF NOT EXISTS mentorshipRequests AS SELECT * FROM mentorship_requests;
CREATE VIEW IF NOT EXISTS batchMembers AS SELECT * FROM batch_members;
CREATE VIEW IF NOT EXISTS communityPosts AS SELECT * FROM community_posts;
CREATE VIEW IF NOT EXISTS communityComments AS SELECT * FROM community_comments;
CREATE VIEW IF NOT EXISTS careerGoals AS SELECT * FROM career_goals;
CREATE VIEW IF NOT EXISTS careerMilestones AS SELECT * FROM career_milestones;
CREATE VIEW IF NOT EXISTS supportTickets AS SELECT * FROM support_tickets;
CREATE VIEW IF NOT EXISTS auditLogs AS SELECT * FROM audit_logs;
CREATE VIEW IF NOT EXISTS academicYears AS SELECT * FROM academic_years;
"""


def _to_json_if_needed(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    return val


def migrate_database(db_path: str = None) -> dict:
    if not db_path:
        db_path = str(backend_dir / 'myalumni.db')

    db_path = str(Path(db_path).resolve())
    print(f"[*] Starting migration on SQLite database: {db_path}")

    # 1. Verify source database exists
    if not Path(db_path).exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")

    # 2. Create timestamped backup
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.backup_before_relational_{ts}"
    shutil.copy2(db_path, backup_path)
    print(f"[+] Created safety backup at: {backup_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 3. Check if documents table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
    if not cursor.fetchone():
        print("[!] Note: 'documents' table does not exist. Initializing relational schema directly.")
        cursor.executescript(SCHEMA_SQL)
        conn.commit()
        conn.close()
        return {"status": "initialized", "backup": backup_path, "migrated": {}}

    # 4. Fetch all documents
    cursor.execute("SELECT collection, id, data, created_at, updated_at FROM documents")
    all_docs = cursor.fetchall()
    total_discovered = len(all_docs)
    print(f"[*] Discovered {total_discovered} total records in 'documents' table.")

    # 5. Create relational schema
    cursor.executescript(SCHEMA_SQL)

    # 6. Migrate records collection by collection
    migrated_counts = {}

    for row in all_docs:
        coll = row['collection']
        doc_id = row['id']
        try:
            d = json.loads(row['data'])
        except Exception:
            d = {}

        created_at = d.get('createdAt') or row['created_at']
        updated_at = d.get('updatedAt') or row['updated_at']

        if coll == 'users':
            cursor.execute("""
                INSERT OR REPLACE INTO users (
                    id, uid, email, password_hash, display_name, role, account_status,
                    avatar_url, bio, phone, is_provisioned, email_verified, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('uid') or doc_id,
                d.get('email', '').strip().lower(),
                d.get('passwordHash'),
                d.get('displayName') or 'User',
                d.get('role', 'student'),
                d.get('accountStatus', 'active'),
                d.get('avatarUrl', ''),
                d.get('bio', ''),
                d.get('phone', ''),
                1 if d.get('isProvisioned', True) else 0,
                1 if d.get('emailVerified', True) else 0,
                created_at,
                updated_at
            ))
            migrated_counts['users'] = migrated_counts.get('users', 0) + 1

        elif coll == 'studentProfiles':
            cursor.execute("""
                INSERT OR REPLACE INTO student_profiles (
                    user_id, enrollment_number, course_id, course_name, academic_year_id,
                    academic_year_name, batch_id, gpa, skills, career_interests, github_url,
                    linkedin_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                d.get('userId') or doc_id,
                d.get('enrollmentNumber', ''),
                d.get('courseId', ''),
                d.get('courseName', ''),
                d.get('academicYearId', ''),
                d.get('academicYearName', ''),
                d.get('batchId', ''),
                str(d.get('gpa', '')),
                _to_json_if_needed(d.get('skills', [])),
                _to_json_if_needed(d.get('careerInterests', [])),
                d.get('githubUrl', ''),
                d.get('linkedinUrl', ''),
                created_at,
                updated_at
            ))
            migrated_counts['student_profiles'] = migrated_counts.get('student_profiles', 0) + 1

        elif coll == 'facultyProfiles':
            cursor.execute("""
                INSERT OR REPLACE INTO faculty_profiles (
                    user_id, department, designation, office_location, research_areas, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                d.get('userId') or doc_id,
                d.get('department', ''),
                d.get('designation', ''),
                d.get('officeLocation', ''),
                _to_json_if_needed(d.get('researchAreas', [])),
                created_at,
                updated_at
            ))
            migrated_counts['faculty_profiles'] = migrated_counts.get('faculty_profiles', 0) + 1

        elif coll == 'alumniProfiles':
            cursor.execute("""
                INSERT OR REPLACE INTO alumni_profiles (
                    user_id, graduation_year, course_id, course_name, company, job_title, industry,
                    years_of_experience, location, skills, is_mentoring_available, max_mentees,
                    current_mentees_count, batch_id, birthday, linkedin_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                d.get('userId') or doc_id,
                int(d.get('graduationYear')) if d.get('graduationYear') else None,
                d.get('courseId', ''),
                d.get('courseName', ''),
                d.get('company', ''),
                d.get('jobTitle', ''),
                d.get('industry', ''),
                int(d.get('yearsOfExperience') or 0),
                d.get('location', ''),
                _to_json_if_needed(d.get('skills', [])),
                1 if d.get('isMentoringAvailable') else 0,
                int(d.get('maxMentees') or 2),
                int(d.get('currentMenteesCount') or 0),
                d.get('batchId', ''),
                _to_json_if_needed(d.get('birthday')),
                d.get('linkedinUrl', ''),
                created_at,
                updated_at
            ))
            migrated_counts['alumni_profiles'] = migrated_counts.get('alumni_profiles', 0) + 1

        elif coll in ('opportunities', 'postings'):
            cursor.execute("""
                INSERT OR REPLACE INTO postings (
                    id, title, company, type, location, workplace_type, experience_level,
                    description, skills_required, application_url, posted_by_user_id,
                    posted_by_user_name, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('title', ''),
                d.get('company', ''),
                d.get('type', 'job'),
                d.get('location', ''),
                d.get('workplaceType', 'onsite'),
                d.get('experienceLevel', ''),
                d.get('description', ''),
                _to_json_if_needed(d.get('skillsRequired', [])),
                d.get('applicationUrl', ''),
                d.get('postedByUserId', ''),
                d.get('postedByUserName', ''),
                d.get('status', 'pending'),
                created_at,
                updated_at
            ))
            migrated_counts['postings'] = migrated_counts.get('postings', 0) + 1

        elif coll in ('savedOpportunities', 'saved_postings'):
            cursor.execute("""
                INSERT OR REPLACE INTO saved_postings (id, user_id, posting_id, created_at)
                VALUES (?, ?, ?, ?)
            """, (
                doc_id,
                d.get('userId'),
                d.get('opportunityId') or d.get('postingId'),
                created_at
            ))
            migrated_counts['saved_postings'] = migrated_counts.get('saved_postings', 0) + 1

        elif coll == 'applications':
            cursor.execute("""
                INSERT OR REPLACE INTO applications (
                    id, user_id, opportunity_id, opportunity_title, company, status, notes, applied_date, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('userId'),
                d.get('opportunityId'),
                d.get('opportunityTitle', ''),
                d.get('company', ''),
                d.get('status', 'Applied'),
                d.get('notes', ''),
                d.get('appliedDate', ''),
                created_at,
                updated_at
            ))
            migrated_counts['applications'] = migrated_counts.get('applications', 0) + 1

        elif coll == 'conversations':
            cursor.execute("""
                INSERT OR REPLACE INTO conversations (
                    id, participants, participant_names, participant_roles, last_message,
                    last_message_sender_id, last_message_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                _to_json_if_needed(d.get('participants', [])),
                _to_json_if_needed(d.get('participantNames', {})),
                _to_json_if_needed(d.get('participantRoles', {})),
                d.get('lastMessage', ''),
                d.get('lastMessageSenderId', ''),
                d.get('lastMessageAt', created_at),
                created_at,
                updated_at
            ))
            migrated_counts['conversations'] = migrated_counts.get('conversations', 0) + 1

        elif 'messages' in coll:
            # Matches conversations/<id>/messages
            conv_id = d.get('conversationId')
            if not conv_id and '/' in coll:
                parts = coll.split('/')
                conv_id = parts[1]
            cursor.execute("""
                INSERT OR REPLACE INTO messages (
                    id, conversation_id, sender_id, sender_name, text, read_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                conv_id,
                d.get('senderId', ''),
                d.get('senderName', ''),
                d.get('text', ''),
                _to_json_if_needed(d.get('readBy', [])),
                created_at,
                updated_at
            ))
            migrated_counts['messages'] = migrated_counts.get('messages', 0) + 1

        elif coll == 'events':
            cursor.execute("""
                INSERT OR REPLACE INTO events (
                    id, title, description, date, time, location, event_type, organizer_id,
                    organizer_name, capacity, attendees_count, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('title', ''),
                d.get('description', ''),
                d.get('date', ''),
                d.get('time', ''),
                d.get('location', ''),
                d.get('eventType', 'reunion'),
                d.get('organizerId', ''),
                d.get('organizerName', ''),
                int(d.get('capacity') or 100),
                int(d.get('attendeesCount') or 0),
                d.get('status', 'approved'),
                created_at,
                updated_at
            ))
            migrated_counts['events'] = migrated_counts.get('events', 0) + 1

        elif coll == 'resources':
            cursor.execute("""
                INSERT OR REPLACE INTO resources (
                    id, title, category, course_id, course_name, target_course_id, uploaded_by,
                    file_url, file_size, priority, content, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('title', ''),
                d.get('category', 'study_materials'),
                d.get('courseId', ''),
                d.get('courseName', ''),
                d.get('targetCourseId', ''),
                d.get('uploadedBy', ''),
                d.get('fileUrl', ''),
                d.get('fileSize', ''),
                d.get('priority', 'normal'),
                d.get('content', ''),
                created_at,
                updated_at
            ))
            migrated_counts['resources'] = migrated_counts.get('resources', 0) + 1

            # If announcement category, also mirror to announcements table
            if d.get('category') == 'announcement':
                cursor.execute("""
                    INSERT OR REPLACE INTO announcements (
                        id, title, content, priority, status, target_role, uploaded_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    doc_id,
                    d.get('title', ''),
                    d.get('content', ''),
                    d.get('priority', 'normal'),
                    'published',
                    'all',
                    d.get('uploadedBy', ''),
                    created_at,
                    updated_at
                ))
                migrated_counts['announcements'] = migrated_counts.get('announcements', 0) + 1

        elif coll == 'announcements':
            cursor.execute("""
                INSERT OR REPLACE INTO announcements (
                    id, title, content, priority, status, target_role, uploaded_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('title', ''),
                d.get('content', ''),
                d.get('priority', 'normal'),
                d.get('status', 'published'),
                d.get('targetRole', 'all'),
                d.get('uploadedBy', ''),
                created_at,
                updated_at
            ))
            migrated_counts['announcements'] = migrated_counts.get('announcements', 0) + 1

        elif coll == 'courses':
            cursor.execute("""
                INSERT OR REPLACE INTO courses (
                    id, code, name, department, duration_years, degree_type, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('code', doc_id),
                d.get('name', ''),
                d.get('department', ''),
                int(d.get('durationYears') or 4),
                d.get('degreeType', 'Undergraduate'),
                1 if d.get('isActive', True) else 0,
                created_at,
                updated_at
            ))
            migrated_counts['courses'] = migrated_counts.get('courses', 0) + 1

        elif coll == 'academicYears':
            cursor.execute("""
                INSERT OR REPLACE INTO academic_years (
                    id, name, start_date, end_date, is_current, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('name', doc_id),
                d.get('startDate', ''),
                d.get('endDate', ''),
                1 if d.get('isCurrent') else 0,
                created_at,
                updated_at
            ))
            migrated_counts['academic_years'] = migrated_counts.get('academic_years', 0) + 1

        elif coll == 'batches':
            cursor.execute("""
                INSERT OR REPLACE INTO batches (
                    id, name, course_id, course_name, graduation_year, members_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('name', ''),
                d.get('courseId', ''),
                d.get('courseName', ''),
                int(d.get('graduationYear')) if d.get('graduationYear') else None,
                int(d.get('membersCount') or 0),
                created_at,
                updated_at
            ))
            migrated_counts['batches'] = migrated_counts.get('batches', 0) + 1

        elif coll == 'batchMembers':
            cursor.execute("""
                INSERT OR REPLACE INTO batch_members (
                    id, batch_id, user_id, user_name, role, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('batchId', ''),
                d.get('userId', ''),
                d.get('userName', ''),
                d.get('role', 'member'),
                created_at,
                updated_at
            ))
            migrated_counts['batch_members'] = migrated_counts.get('batch_members', 0) + 1

        elif coll == 'communityPosts':
            cursor.execute("""
                INSERT OR REPLACE INTO community_posts (
                    id, batch_id, author_id, author_name, author_role, title, content, likes_count, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('batchId', ''),
                d.get('authorId', ''),
                d.get('authorName', ''),
                d.get('authorRole', ''),
                d.get('title', ''),
                d.get('content', ''),
                int(d.get('likesCount') or 0),
                created_at,
                updated_at
            ))
            migrated_counts['community_posts'] = migrated_counts.get('community_posts', 0) + 1

        elif coll == 'communityComments':
            cursor.execute("""
                INSERT OR REPLACE INTO community_comments (
                    id, post_id, author_id, author_name, content, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('postId', ''),
                d.get('authorId', ''),
                d.get('authorName', ''),
                d.get('content', ''),
                created_at,
                updated_at
            ))
            migrated_counts['community_comments'] = migrated_counts.get('community_comments', 0) + 1

        elif coll == 'connectionRequests':
            cursor.execute("""
                INSERT OR REPLACE INTO connection_requests (
                    id, sender_id, sender_name, sender_role, recipient_id, recipient_name,
                    recipient_role, status, message, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('senderId', ''),
                d.get('senderName', ''),
                d.get('senderRole', ''),
                d.get('recipientId', ''),
                d.get('recipientName', ''),
                d.get('recipientRole', ''),
                d.get('status', 'pending'),
                d.get('message', ''),
                created_at,
                updated_at
            ))
            migrated_counts['connection_requests'] = migrated_counts.get('connection_requests', 0) + 1

        elif coll == 'mentorshipRequests':
            cursor.execute("""
                INSERT OR REPLACE INTO mentorship_requests (
                    id, student_id, student_name, mentor_id, mentor_name, goals, message, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('studentId', ''),
                d.get('studentName', ''),
                d.get('mentorId', ''),
                d.get('mentorName', ''),
                d.get('goals', ''),
                d.get('message', ''),
                d.get('status', 'pending'),
                created_at,
                updated_at
            ))
            migrated_counts['mentorship_requests'] = migrated_counts.get('mentorship_requests', 0) + 1

        elif coll == 'careerGoals':
            cursor.execute("""
                INSERT OR REPLACE INTO career_goals (
                    id, user_id, title, description, target_role, target_date, status, progress_percentage, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('userId', ''),
                d.get('title', ''),
                d.get('description', ''),
                d.get('targetRole', ''),
                d.get('targetDate', ''),
                d.get('status', 'in_progress'),
                int(d.get('progressPercentage') or 0),
                created_at,
                updated_at
            ))
            migrated_counts['career_goals'] = migrated_counts.get('career_goals', 0) + 1

        elif coll == 'careerMilestones':
            cursor.execute("""
                INSERT OR REPLACE INTO career_milestones (
                    id, goal_id, user_id, title, is_completed, completed_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('goalId', ''),
                d.get('userId', ''),
                d.get('title', ''),
                1 if d.get('isCompleted') else 0,
                d.get('completedAt'),
                created_at,
                updated_at
            ))
            migrated_counts['career_milestones'] = migrated_counts.get('career_milestones', 0) + 1

        elif coll == 'achievements':
            cursor.execute("""
                INSERT OR REPLACE INTO achievements (
                    id, user_id, user_name, user_role, title, description, category, proof_url, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('userId', ''),
                d.get('userName', ''),
                d.get('userRole', ''),
                d.get('title', ''),
                d.get('description', ''),
                d.get('category', 'Career'),
                d.get('proofUrl', ''),
                d.get('status', 'approved'),
                created_at,
                updated_at
            ))
            migrated_counts['achievements'] = migrated_counts.get('achievements', 0) + 1

        elif coll == 'auditLogs':
            cursor.execute("""
                INSERT INTO audit_logs (
                    action, actor_id, actor_email, actor_role, target_type, target_id, details, status, ip_address, user_agent, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                d.get('action', 'LOG'),
                d.get('actorId', ''),
                d.get('actorEmail', ''),
                d.get('actorRole', ''),
                d.get('targetType', ''),
                d.get('targetId', ''),
                _to_json_if_needed(d.get('details', {})),
                d.get('status', 'SUCCESS'),
                d.get('ipAddress', ''),
                d.get('userAgent', ''),
                created_at
            ))
            migrated_counts['audit_logs'] = migrated_counts.get('audit_logs', 0) + 1

        elif coll == 'supportTickets':
            cursor.execute("""
                INSERT OR REPLACE INTO support_tickets (
                    id, user_id, user_name, user_email, subject, category, message, status, priority,
                    admin_response, resolved_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                d.get('userId', ''),
                d.get('userName', ''),
                d.get('userEmail', ''),
                d.get('subject', ''),
                d.get('category', 'general'),
                d.get('message', ''),
                d.get('status', 'open'),
                d.get('priority', 'medium'),
                d.get('adminResponse', ''),
                d.get('resolvedAt'),
                created_at,
                updated_at
            ))
            migrated_counts['support_tickets'] = migrated_counts.get('support_tickets', 0) + 1

    # Record migration in schema_migrations
    cursor.execute("""
        INSERT OR REPLACE INTO schema_migrations (version, description)
        VALUES (1, 'Complete relational database schema migration from documents store')
    """)

    # Archive the old documents table safely instead of deleting it
    cursor.execute("ALTER TABLE documents RENAME TO _archived_documents")

    conn.commit()
    conn.close()

    total_migrated = sum(migrated_counts.values())
    print("\n==================================================")
    print("  RELATIONAL DATABASE MIGRATION SUMMARY REPORT")
    print("==================================================")
    print(f"  Backup Created At: {backup_path}")
    print(f"  Total Discovered in 'documents': {total_discovered}")
    print(f"  Total Relational Rows Inserted:  {total_migrated}")
    print("  Table Breakdown:")
    for tbl, count in sorted(migrated_counts.items()):
        print(f"    - {tbl}: {count} records")
    print("  Original 'documents' safely renamed to: '_archived_documents'")
    print("==================================================\n")

    return {
        "status": "success",
        "backup": backup_path,
        "discovered": total_discovered,
        "migrated_counts": migrated_counts,
        "total_migrated": total_migrated
    }


if __name__ == '__main__':
    migrate_database()

