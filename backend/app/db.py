import os
import re
import json
import uuid
import sqlite3
import datetime
import threading
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Iterator

from app.config import Config

logger = logging.getLogger('myalumni.db')

# Thread-local storage for sqlite connections
_local = threading.local()


class Query:
    ASCENDING = 'ASCENDING'
    DESCENDING = 'DESCENDING'


# Canonical mapping from collection/interface names to relational SQLite tables
COLLECTION_TABLE_MAP = {
    'users': 'users',
    'studentProfiles': 'student_profiles',
    'student_profiles': 'student_profiles',
    'facultyProfiles': 'faculty_profiles',
    'faculty_profiles': 'faculty_profiles',
    'alumniProfiles': 'alumni_profiles',
    'alumni_profiles': 'alumni_profiles',
    'opportunities': 'postings',
    'postings': 'postings',
    'savedOpportunities': 'saved_postings',
    'saved_postings': 'saved_postings',
    'applications': 'applications',
    'conversations': 'conversations',
    'messages': 'messages',
    'events': 'events',
    'eventAttendees': 'event_attendees',
    'event_attendees': 'event_attendees',
    'eventRegistrations': 'event_attendees',
    'event_registrations': 'event_attendees',
    'resources': 'resources',
    'announcements': 'announcements',
    'courses': 'courses',
    'academicYears': 'academic_years',
    'academic_years': 'academic_years',
    'batches': 'batches',
    'batchMembers': 'batch_members',
    'batch_members': 'batch_members',
    'communityPosts': 'community_posts',
    'community_posts': 'community_posts',
    'communityComments': 'community_comments',
    'community_comments': 'community_comments',
    'connectionRequests': 'connection_requests',
    'connection_requests': 'connection_requests',
    'mentorshipRequests': 'mentorship_requests',
    'mentorship_requests': 'mentorship_requests',
    'careerGoals': 'career_goals',
    'career_goals': 'career_goals',
    'careerMilestones': 'career_milestones',
    'career_milestones': 'career_milestones',
    'projects': 'resources',
    'certifications': 'resources',
    'achievements': 'achievements',
    'auditLogs': 'audit_logs',
    'audit_logs': 'audit_logs',
    'supportTickets': 'support_tickets',
    'support_tickets': 'support_tickets',
    'adminRequests': 'support_tickets',
    'admin_requests': 'support_tickets',
    'reports': 'reports',
    'notifications': 'notifications',
    'birthdayGreetings': 'birthday_greetings',
    'birthday_greetings': 'birthday_greetings',
    'batchPostLikes': 'batch_post_likes',
    'batch_post_likes': 'batch_post_likes',
    'batchEvents': 'batch_events',
    'batch_events': 'batch_events',
    'batchEventRsvps': 'batch_event_rsvps',
    'batch_event_rsvps': 'batch_event_rsvps',
    'batchAnnouncements': 'batch_announcements',
    'batch_announcements': 'batch_announcements',
    'batchPolls': 'batch_polls',
    'batch_polls': 'batch_polls',
    'batchPollOptions': 'batch_poll_options',
    'batch_poll_options': 'batch_poll_options',
    'batchPollVotes': 'batch_poll_votes',
    'batch_poll_votes': 'batch_poll_votes',
    'batchMemories': 'batch_memories',
    'batch_memories': 'batch_memories',
    'batchMemoryLikes': 'batch_memory_likes',
    'batch_memory_likes': 'batch_memory_likes',
    'batchMemoryComments': 'batch_memory_comments',
    'batch_memory_comments': 'batch_memory_comments',
    'batchMemoryReports': 'batch_memory_reports',
    'batch_memory_reports': 'batch_memory_reports',
}

# Tables where primary key is 'user_id' instead of 'id'
PROFILE_TABLES = {'student_profiles', 'faculty_profiles', 'alumni_profiles'}

# JSON columns that should be serialized when storing and deserialized when reading
JSON_COLUMNS = {
    'skills', 'career_interests', 'research_areas', 'birthday',
    'skills_required', 'participants', 'participant_names', 'participant_roles',
    'read_by', 'details', 'target_courses', 'target_batches'
}


def _camel_to_snake(name: str) -> str:
    s = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s).lower()


def _snake_to_camel(name: str) -> str:
    components = name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def _format_row_dict(table_name: str, row: sqlite3.Row) -> Dict[str, Any]:
    """Converts a SQLite row into a dict supporting both snake_case and camelCase keys."""
    d = {}
    col_names = row.keys()
    for col in col_names:
        val = row[col]
        # Deserialize JSON columns if needed
        if col in JSON_COLUMNS and isinstance(val, str):
            try:
                val = json.loads(val)
            except Exception:
                pass

        snake_k = col
        camel_k = _snake_to_camel(col)
        d[snake_k] = val
        d[camel_k] = val

    # Ensure 'id' exists
    if 'id' in d:
        d['id'] = str(d['id'])
    elif table_name in PROFILE_TABLES and 'user_id' in d:
        d['id'] = str(d['user_id'])
        d['userId'] = str(d['user_id'])

    # Bridge aliases for events
    if table_name == 'events':
        if 'date' in d and ('start_date' not in d or not d['start_date']):
            d['start_date'] = d['date']
            d['startDate'] = d['date']
        elif 'start_date' in d and ('date' not in d or not d['date']):
            d['date'] = d['start_date']
        if 'location' in d and ('venue_or_url' not in d or not d['venue_or_url']):
            d['venue_or_url'] = d['location']
            d['venueOrUrl'] = d['location']
        elif 'venue_or_url' in d and ('location' not in d or not d['location']):
            d['location'] = d['venue_or_url']
        if 'attendees_count' in d and ('registered_count' not in d or d['registered_count'] is None):
            d['registered_count'] = d['attendees_count']
            d['registeredCount'] = d['attendees_count']
        elif 'registered_count' in d and ('attendees_count' not in d or d['attendees_count'] is None):
            d['attendees_count'] = d['registered_count']
            d['attendeesCount'] = d['registered_count']

    # Bridge aliases for event_attendees
    if table_name == 'event_attendees':
        if 'user_id' in d and 'userId' not in d:
            d['userId'] = d['user_id']
        if 'event_id' in d and 'eventId' not in d:
            d['eventId'] = d['event_id']
        if 'registered_at' in d and 'registeredAt' not in d:
            d['registeredAt'] = d['registered_at']

    # Bridge aliases for saved_postings
    if table_name == 'saved_postings':
        if 'posting_id' in d:
            d['opportunity_id'] = d['posting_id']
            d['opportunityId'] = d['posting_id']

    # Bridge aliases for achievements
    if table_name == 'achievements':
        cert_url = d.get('proof_url') or d.get('supporting_url') or d.get('proofUrl') or d.get('supportingUrl')
        d['proof_url'] = cert_url
        d['proofUrl'] = cert_url
        d['supporting_url'] = cert_url
        d['supportingUrl'] = cert_url
        cert_fn = d.get('proof_filename') or d.get('proofFilename')
        d['proof_filename'] = cert_fn
        d['proofFilename'] = cert_fn
        cert_sz = d.get('file_size') or d.get('fileSize')
        d['file_size'] = cert_sz
        d['fileSize'] = cert_sz

    # Bridge aliases for support_tickets
    if table_name == 'support_tickets':
        if 'user_id' in d and 'requesterId' not in d:
            d['requesterId'] = d['user_id']
        if 'user_name' in d and 'requesterName' not in d:
            d['requesterName'] = d['user_name']
        if 'user_email' in d and 'requesterEmail' not in d:
            d['requesterEmail'] = d['user_email']
        if 'user_role' in d and 'requesterRole' not in d:
            d['requesterRole'] = d['user_role']
        if 'message' in d and 'description' not in d:
            d['description'] = d['message']
        if 'description' in d and 'message' not in d:
            d['message'] = d['description']
        if 'admin_response' in d and 'adminResponse' not in d:
            d['adminResponse'] = d['admin_response']
        if 'responded_by' in d and 'respondedBy' not in d:
            d['respondedBy'] = d['responded_by']
        if 'attachment_url' in d and 'attachmentUrl' not in d:
            d['attachmentUrl'] = d['attachment_url']
        if 'attachment_filename' in d and 'attachmentFilename' not in d:
            d['attachmentFilename'] = d['attachment_filename']
        if 'resolved_at' in d and 'resolvedAt' not in d:
            d['resolvedAt'] = d['resolved_at']
            d['respondedAt'] = d['resolved_at']

    # Bridge aliases for birthday_greetings
    if table_name == 'birthday_greetings':
        if 'sender_id' in d and 'senderId' not in d:
            d['senderId'] = d['sender_id']
            d['senderUserId'] = d['sender_id']
        if 'recipient_id' in d and 'recipientId' not in d:
            d['recipientId'] = d['recipient_id']
            d['recipientUserId'] = d['recipient_id']
        if 'text' in d and 'greetingText' not in d:
            d['greetingText'] = d['text']
            d['message'] = d['text']
        if 'is_read' in d:
            d['isRead'] = bool(d['is_read'])
        elif 'isRead' in d:
            d['is_read'] = 1 if d['isRead'] else 0

    # Bridge aliases for profile tables
    if table_name in PROFILE_TABLES:
        if 'date_of_birth' in d:
            d['dateOfBirth'] = d['date_of_birth']
            d['dob'] = d['date_of_birth']
        if 'birthday_visibility' in d:
            d['birthdayVisibility'] = d['birthday_visibility']

    return d


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
    date_of_birth TEXT,
    birthday_visibility TEXT DEFAULT 'visible',
    birthday_updated_at TIMESTAMP,
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
    date_of_birth TEXT,
    birthday_visibility TEXT DEFAULT 'visible',
    birthday_updated_at TIMESTAMP,
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
    attachment_url TEXT,
    attachment_filename TEXT,
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
    date TEXT,
    time TEXT,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    venue_or_url TEXT,
    event_type TEXT DEFAULT 'reunion',
    organizer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    organizer_name TEXT,
    organizer_role TEXT,
    location_type TEXT DEFAULT 'in_person',
    capacity INTEGER DEFAULT 100,
    attendees_count INTEGER DEFAULT 0,
    registered_count INTEGER DEFAULT 0,
    registration_deadline TEXT,
    target_courses TEXT,
    target_batches TEXT,
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
    user_email TEXT,
    user_role TEXT,
    status TEXT DEFAULT 'confirmed',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_event_attendees_evt ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_usr ON event_attendees(user_id);

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
    department TEXT,
    graduation_year INTEGER,
    description TEXT,
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
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    post_type TEXT DEFAULT 'general',
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
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
    author_role TEXT,
    author_avatar TEXT,
    parent_comment_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);

-- Batch Post Likes
CREATE TABLE IF NOT EXISTS batch_post_likes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_post_likes_post ON batch_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_batch_post_likes_user ON batch_post_likes(user_id);

-- Batch Events
CREATE TABLE IF NOT EXISTS batch_events (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_name TEXT,
    creator_role TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    venue TEXT NOT NULL,
    event_type TEXT DEFAULT 'reunion',
    cover_image TEXT,
    status TEXT DEFAULT 'upcoming',
    going_count INTEGER DEFAULT 0,
    interested_count INTEGER DEFAULT 0,
    not_going_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_events_batch ON batch_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_events_date ON batch_events(date);

-- Batch Event RSVPs
CREATE TABLE IF NOT EXISTS batch_event_rsvps (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES batch_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    user_avatar TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_event_rsvps_evt ON batch_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_batch_event_rsvps_usr ON batch_event_rsvps(user_id);

-- Batch Announcements
CREATE TABLE IF NOT EXISTS batch_announcements (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT,
    author_role TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    is_pinned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_announcements_batch ON batch_announcements(batch_id);

-- Batch Polls
CREATE TABLE IF NOT EXISTS batch_polls (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_name TEXT,
    creator_role TEXT,
    question TEXT NOT NULL,
    start_date TEXT,
    closing_date TEXT,
    status TEXT DEFAULT 'active',
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_polls_batch ON batch_polls(batch_id);

-- Batch Poll Options
CREATE TABLE IF NOT EXISTS batch_poll_options (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES batch_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_order INTEGER DEFAULT 0,
    votes_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_batch_poll_options_poll ON batch_poll_options(poll_id);

-- Batch Poll Votes
CREATE TABLE IF NOT EXISTS batch_poll_votes (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL REFERENCES batch_polls(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL REFERENCES batch_poll_options(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_poll_votes_poll ON batch_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_batch_poll_votes_usr ON batch_poll_votes(user_id);

-- Batch Memories
CREATE TABLE IF NOT EXISTS batch_memories (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploader_name TEXT,
    uploader_role TEXT,
    uploader_avatar TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    description TEXT,
    event_id TEXT REFERENCES batch_events(id) ON DELETE SET NULL,
    academic_year TEXT,
    graduation_year INTEGER,
    taken_at TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memories_batch ON batch_memories(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_memories_event ON batch_memories(event_id);
CREATE INDEX IF NOT EXISTS idx_batch_memories_uploader ON batch_memories(uploader_id);
CREATE INDEX IF NOT EXISTS idx_batch_memories_year ON batch_memories(graduation_year, academic_year);

-- Batch Memory Likes
CREATE TABLE IF NOT EXISTS batch_memory_likes (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(memory_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_likes_mem ON batch_memory_likes(memory_id);
CREATE INDEX IF NOT EXISTS idx_batch_memory_likes_usr ON batch_memory_likes(user_id);

-- Batch Memory Comments
CREATE TABLE IF NOT EXISTS batch_memory_comments (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_comments_mem ON batch_memory_comments(memory_id);

-- Batch Memory Reports
CREATE TABLE IF NOT EXISTS batch_memory_reports (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL REFERENCES batch_memories(id) ON DELETE CASCADE,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_name TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    moderated_by TEXT,
    moderated_at TEXT,
    moderation_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_memory_reports_status ON batch_memory_reports(status, memory_id);

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
    supporting_url TEXT,
    proof_filename TEXT,
    file_size INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    review_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_achievements_status ON achievements(status);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

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
    user_role TEXT DEFAULT 'student',
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    admin_response TEXT,
    responded_by TEXT,
    resolved_at TIMESTAMP,
    attachment_url TEXT,
    attachment_filename TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Abuse & Content Reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Birthday Greetings
CREATE TABLE IF NOT EXISTS birthday_greetings (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    sender_name TEXT,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name TEXT,
    text TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_greetings_recipient ON birthday_greetings(recipient_id);
CREATE INDEX IF NOT EXISTS idx_greetings_created ON birthday_greetings(created_at);

CREATE TABLE IF NOT EXISTS file_attachments (
    id TEXT PRIMARY KEY,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    category TEXT NOT NULL,
    uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploader_role TEXT,
    related_module TEXT,
    related_id TEXT,
    access_policy TEXT NOT NULL DEFAULT 'public',
    is_external_url INTEGER NOT NULL DEFAULT 0,
    storage_provider TEXT NOT NULL DEFAULT 'local',
    bucket_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploader ON file_attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_module_rel ON file_attachments(related_module, related_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(category);

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
CREATE VIEW IF NOT EXISTS birthdayGreetings AS SELECT * FROM birthday_greetings;
CREATE VIEW IF NOT EXISTS academicYears AS SELECT * FROM academic_years;
CREATE VIEW IF NOT EXISTS eventRegistrations AS SELECT * FROM event_attendees;
CREATE VIEW IF NOT EXISTS eventAttendees AS SELECT * FROM event_attendees;
"""


class SQLiteDocumentSnapshot:
    def __init__(self, doc_id: str, exists: bool, data: Optional[Dict[str, Any]] = None, reference=None):
        self.id = doc_id
        self.exists = exists
        self._data = data or {}
        self.reference = reference

    def to_dict(self) -> Dict[str, Any]:
        return dict(self._data) if self.exists else {}


class SQLiteDocumentReference:
    def __init__(self, db: 'SQLiteDatabase', collection_name: str, doc_id: str):
        self._db = db
        self.collection_name = collection_name
        self.id = doc_id

    def collection(self, subcollection_name: str) -> 'SQLiteCollection':
        full_subcoll = f"{self.collection_name}/{self.id}/{subcollection_name}"
        return SQLiteCollection(self._db, full_subcoll)

    def get(self) -> SQLiteDocumentSnapshot:
        return self._db._get_document(self.collection_name, self.id, reference=self)

    def set(self, data: Dict[str, Any], merge: bool = False) -> None:
        self._db._set_document(self.collection_name, self.id, data, merge=merge)

    def update(self, data: Dict[str, Any]) -> None:
        self._db._update_document(self.collection_name, self.id, data)

    def delete(self) -> None:
        self._db._delete_document(self.collection_name, self.id)


class SQLiteQuery:
    def __init__(self, db: 'SQLiteDatabase', collection_name: str, filters=None, orderings=None, limit_val=None):
        self._db = db
        self.collection_name = collection_name
        self._filters: List[Tuple[str, str, Any]] = list(filters or [])
        self._orderings: List[Tuple[str, str]] = list(orderings or [])
        self._limit: Optional[int] = limit_val

    def where(self, field: str, op: str, val: Any) -> 'SQLiteQuery':
        new_filters = list(self._filters)
        new_filters.append((field, op, val))
        return SQLiteQuery(self._db, self.collection_name, new_filters, self._orderings, self._limit)

    def order_by(self, field: str, direction: str = Query.ASCENDING) -> 'SQLiteQuery':
        new_orderings = list(self._orderings)
        new_orderings.append((field, direction))
        return SQLiteQuery(self._db, self.collection_name, self._filters, new_orderings, self._limit)

    def limit(self, count: int) -> 'SQLiteQuery':
        return SQLiteQuery(self._db, self.collection_name, self._filters, self._orderings, count)

    def stream(self) -> Iterator[SQLiteDocumentSnapshot]:
        return self._db._execute_query(self.collection_name, self._filters, self._orderings, self._limit)


class SQLiteCollection:
    def __init__(self, db: 'SQLiteDatabase', collection_name: str):
        self._db = db
        self.collection_name = collection_name

    def document(self, doc_id: Optional[str] = None) -> SQLiteDocumentReference:
        if not doc_id:
            doc_id = str(uuid.uuid4()).replace('-', '')[:20]
        return SQLiteDocumentReference(self._db, self.collection_name, doc_id)

    def add(self, data: Dict[str, Any]) -> Tuple[Any, SQLiteDocumentReference]:
        doc_id = str(uuid.uuid4()).replace('-', '')[:20]
        doc_ref = SQLiteDocumentReference(self._db, self.collection_name, doc_id)
        doc_ref.set(data)
        return None, doc_ref

    def where(self, field: str, op: str, val: Any) -> SQLiteQuery:
        q = SQLiteQuery(self._db, self.collection_name)
        return q.where(field, op, val)

    def order_by(self, field: str, direction: str = Query.ASCENDING) -> SQLiteQuery:
        q = SQLiteQuery(self._db, self.collection_name)
        return q.order_by(field, direction)

    def limit(self, count: int) -> SQLiteQuery:
        q = SQLiteQuery(self._db, self.collection_name)
        return q.limit(count)

    def stream(self) -> Iterator[SQLiteDocumentSnapshot]:
        q = SQLiteQuery(self._db, self.collection_name)
        return q.stream()


class SQLiteDatabase:
    """Thread-safe relational SQLite database engine with structured tables."""

    def __init__(self, db_path: Optional[str] = None):
        backend_dir = Path(__file__).resolve().parent.parent
        if not db_path:
            db_path = os.getenv('SQLITE_DB_PATH', '')
        
        if db_path == ':memory:':
            self.db_path = ':memory:'
        elif db_path:
            p = Path(db_path)
            if not p.is_absolute():
                self.db_path = str((backend_dir / p).resolve())
            else:
                self.db_path = str(p.resolve())
        else:
            self.db_path = str((backend_dir / 'myalumni.db').resolve())
        self._init_schema()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(_local, 'conn') or _local.conn is None:
            conn = sqlite3.connect(self.db_path, check_same_thread=False, timeout=30.0)
            conn.row_factory = sqlite3.Row
            # Enable WAL mode for high concurrency
            try:
                conn.execute("PRAGMA journal_mode=WAL;")
                conn.execute("PRAGMA synchronous=NORMAL;")
                conn.execute("PRAGMA foreign_keys=ON;")
            except Exception:
                pass
            _local.conn = conn
        return _local.conn

    def _init_schema(self):
        if self.db_path != ':memory:':
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = self._get_conn()
        with conn:
            conn.executescript(SCHEMA_SQL)
            # Safely ensure backward-compatible columns exist on file_attachments
            try:
                cur = conn.cursor()
                cur.execute("PRAGMA table_info(file_attachments)")
                existing_cols = [r['name'] for r in cur.fetchall()]
                if existing_cols:
                    if 'storage_provider' not in existing_cols:
                        conn.execute("ALTER TABLE file_attachments ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'local'")
                    if 'bucket_name' not in existing_cols:
                        conn.execute("ALTER TABLE file_attachments ADD COLUMN bucket_name TEXT")

                cur.execute("PRAGMA table_info(support_tickets)")
                existing_ticket_cols = [r['name'] for r in cur.fetchall()]
                if existing_ticket_cols:
                    if 'user_role' not in existing_ticket_cols:
                        conn.execute("ALTER TABLE support_tickets ADD COLUMN user_role TEXT DEFAULT 'student'")
                    if 'responded_by' not in existing_ticket_cols:
                        conn.execute("ALTER TABLE support_tickets ADD COLUMN responded_by TEXT")
                    if 'attachment_url' not in existing_ticket_cols:
                        conn.execute("ALTER TABLE support_tickets ADD COLUMN attachment_url TEXT")
                    if 'attachment_filename' not in existing_ticket_cols:
                        conn.execute("ALTER TABLE support_tickets ADD COLUMN attachment_filename TEXT")

                cur.execute("PRAGMA table_info(postings)")
                existing_postings_cols = [r['name'] for r in cur.fetchall()]
                if existing_postings_cols:
                    if 'attachment_url' not in existing_postings_cols:
                        conn.execute("ALTER TABLE postings ADD COLUMN attachment_url TEXT")
                    if 'attachment_filename' not in existing_postings_cols:
                        conn.execute("ALTER TABLE postings ADD COLUMN attachment_filename TEXT")

                cur.execute("PRAGMA table_info(applications)")
                existing_apps_cols = [r['name'] for r in cur.fetchall()]
                if existing_apps_cols:
                    if 'resume_url' not in existing_apps_cols:
                        conn.execute("ALTER TABLE applications ADD COLUMN resume_url TEXT")
                    if 'resume_filename' not in existing_apps_cols:
                        conn.execute("ALTER TABLE applications ADD COLUMN resume_filename TEXT")

                cur.execute("PRAGMA table_info(achievements)")
                existing_ach_cols = [r['name'] for r in cur.fetchall()]
                if existing_ach_cols:
                    if 'supporting_url' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN supporting_url TEXT")
                    if 'proof_filename' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN proof_filename TEXT")
                    if 'file_size' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN file_size INTEGER")
                    if 'review_notes' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN review_notes TEXT")
                    if 'reviewed_by' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN reviewed_by TEXT")
                    if 'reviewed_at' not in existing_ach_cols:
                        conn.execute("ALTER TABLE achievements ADD COLUMN reviewed_at TIMESTAMP")
            except Exception as e:
                logger.warning(f"Schema migration column check note: {e}")
        logger.info(f"Relational SQLite schema verified at {self.db_path}")

    def _resolve_table(self, collection_name: str) -> Tuple[str, Optional[str]]:
        """Resolves collection name or subcollection path to (table_name, parent_filter_val)."""
        if '/' in collection_name:
            parts = collection_name.split('/')
            # e.g. conversations/<conv_id>/messages
            if len(parts) == 3 and parts[2] == 'messages':
                return 'messages', parts[1]

        tbl = COLLECTION_TABLE_MAP.get(collection_name, collection_name)
        return tbl, None

    def _get_table_columns(self, table_name: str) -> List[str]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        return [r['name'] for r in cursor.fetchall()]

    def collection(self, collection_name: str) -> SQLiteCollection:
        return SQLiteCollection(self, collection_name)

    def table(self, table_name: str) -> SQLiteCollection:
        return SQLiteCollection(self, table_name)

    def _get_document(self, collection_name: str, doc_id: str, reference=None) -> SQLiteDocumentSnapshot:
        table_name, parent_id = self._resolve_table(collection_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'
        
        conn = self._get_conn()
        cursor = conn.cursor()
        query = f"SELECT * FROM {table_name} WHERE {id_col} = ?"
        params = [doc_id]
        if parent_id and table_name == 'messages':
            query += " AND conversation_id = ?"
            params.append(parent_id)

        try:
            cursor.execute(query, params)
            row = cursor.fetchone()
        except sqlite3.OperationalError:
            # If table not yet found, return non-existent
            return SQLiteDocumentSnapshot(doc_id, False, {}, reference=reference)

        if not row:
            ref = reference or SQLiteDocumentReference(self, collection_name, doc_id)
            return SQLiteDocumentSnapshot(doc_id, False, {}, reference=ref)

        data = _format_row_dict(table_name, row)
        ref = reference or SQLiteDocumentReference(self, collection_name, doc_id)
        return SQLiteDocumentSnapshot(doc_id, True, data, reference=ref)

    def _set_document(self, collection_name: str, doc_id: str, data: Dict[str, Any], merge: bool = False) -> None:
        table_name, parent_id = self._resolve_table(collection_name)
        columns = self._get_table_columns(table_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'

        # If merge requested, load existing
        final_data = {}
        if merge:
            existing = self._get_document(collection_name, doc_id)
            if existing.exists:
                final_data = existing.to_dict()
        
        # Populate incoming data and synchronize both camelCase and snake_case keys
        for k, v in data.items():
            final_data[k] = v
            final_data[_camel_to_snake(k)] = v
            final_data[_snake_to_camel(k)] = v
            if table_name == 'support_tickets':
                if k in ('adminResponse', 'admin_response'):
                    final_data['admin_response'] = v
                    final_data['adminResponse'] = v
                elif k in ('description', 'message'):
                    final_data['message'] = v
                    final_data['description'] = v
                elif k in ('requesterId', 'requester_id', 'userId', 'user_id'):
                    final_data['user_id'] = v
                    final_data['requesterId'] = v
                elif k in ('requesterName', 'requester_name', 'userName', 'user_name'):
                    final_data['user_name'] = v
                    final_data['requesterName'] = v
                elif k in ('requesterEmail', 'requester_email', 'userEmail', 'user_email'):
                    final_data['user_email'] = v
                    final_data['requesterEmail'] = v
                elif k in ('requesterRole', 'requester_role', 'userRole', 'user_role'):
                    final_data['user_role'] = v
                    final_data['requesterRole'] = v
                elif k in ('respondedBy', 'responded_by'):
                    final_data['responded_by'] = v
                    final_data['respondedBy'] = v
                elif k in ('attachmentUrl', 'attachment_url'):
                    final_data['attachment_url'] = v
                    final_data['attachmentUrl'] = v
                elif k in ('attachmentFilename', 'attachment_filename'):
                    final_data['attachment_filename'] = v
                    final_data['attachmentFilename'] = v
                elif k in ('respondedAt', 'responded_at', 'resolvedAt', 'resolved_at'):
                    final_data['resolved_at'] = v
                    final_data['resolvedAt'] = v

        # Set IDs and timestamps
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if id_col == 'id' and 'id' not in final_data:
            final_data['id'] = doc_id
        if id_col == 'user_id' and 'userId' not in final_data and 'user_id' not in final_data:
            final_data['user_id'] = doc_id
        if parent_id and table_name == 'messages' and 'conversation_id' not in final_data:
            final_data['conversation_id'] = parent_id

        if 'created_at' not in final_data and 'createdAt' not in final_data:
            final_data['created_at'] = now_iso
        final_data['updated_at'] = now_iso

        # Build column values mapping
        row_values = {}
        for col in columns:
            camel = _snake_to_camel(col)
            val = final_data.get(col) if col in final_data else final_data.get(camel)
            if val is None and table_name == 'saved_postings' and col == 'posting_id':
                val = final_data.get('opportunityId') or final_data.get('opportunity_id') or final_data.get('postingId') or final_data.get('posting_id')
            elif val is None and table_name == 'achievements':
                if col in ('proof_url', 'supporting_url'):
                    val = final_data.get('proof_url') or final_data.get('proofUrl') or final_data.get('supporting_url') or final_data.get('supportingUrl')
                elif col in ('proof_filename', 'proofFilename'):
                    val = final_data.get('proof_filename') or final_data.get('proofFilename')
                elif col in ('review_notes', 'reviewNotes'):
                    val = final_data.get('review_notes') or final_data.get('reviewNotes')
                elif col in ('reviewed_by', 'reviewedBy'):
                    val = final_data.get('reviewed_by') or final_data.get('reviewedBy')
                elif col in ('reviewed_at', 'reviewedAt'):
                    val = final_data.get('reviewed_at') or final_data.get('reviewedAt')
            if val is None and table_name == 'events':
                if col == 'date':
                    val = final_data.get('startDate') or final_data.get('start_date')
                elif col == 'start_date':
                    val = final_data.get('date')
                elif col == 'location':
                    val = final_data.get('venueOrUrl') or final_data.get('venue_or_url')
                elif col == 'venue_or_url':
                    val = final_data.get('location')
                elif col in ('attendees_count', 'registered_count'):
                    val = final_data.get('registeredCount') or final_data.get('registered_count') or final_data.get('attendeesCount') or 0
            elif val is None and table_name == 'support_tickets':
                if col == 'user_id':
                    val = final_data.get('requesterId') or final_data.get('requester_id') or final_data.get('userId')
                elif col == 'user_name':
                    val = final_data.get('requesterName') or final_data.get('requester_name') or final_data.get('userName')
                elif col == 'user_email':
                    val = final_data.get('requesterEmail') or final_data.get('requester_email') or final_data.get('userEmail')
                elif col == 'message':
                    val = final_data.get('description') or final_data.get('message')
                elif col == 'priority':
                    val = final_data.get('priority') or 'medium'
                elif col == 'category':
                    val = final_data.get('category') or 'general'
                elif col == 'status':
                    val = final_data.get('status') or 'open'
                elif col == 'admin_response':
                    val = final_data.get('adminResponse') or final_data.get('admin_response')
                elif col == 'resolved_at':
                    val = final_data.get('respondedAt') or final_data.get('responded_at') or final_data.get('resolvedAt') or final_data.get('resolved_at')
            elif val is None and table_name == 'birthday_greetings':
                if col == 'sender_id':
                    val = final_data.get('senderId') or final_data.get('sender_id') or final_data.get('senderUserId') or final_data.get('sender_user_id')
                elif col == 'recipient_id':
                    val = final_data.get('recipientId') or final_data.get('recipient_id') or final_data.get('recipientUserId') or final_data.get('recipient_user_id')
                elif col == 'text':
                    val = final_data.get('greetingText') or final_data.get('greeting_text') or final_data.get('text') or final_data.get('message')
                elif col == 'is_read':
                    val = 1 if (final_data.get('isRead') or final_data.get('is_read')) else 0
            elif val is None and table_name in PROFILE_TABLES:
                if col == 'date_of_birth':
                    val = final_data.get('dateOfBirth') or final_data.get('dob') or final_data.get('date_of_birth')
                elif col == 'birthday_visibility':
                    val = final_data.get('birthdayVisibility') or final_data.get('birthday_visibility') or 'visible'
            if col in JSON_COLUMNS and (isinstance(val, (list, dict))):
                val = json.dumps(val)
            elif isinstance(val, (datetime.datetime, datetime.date)):
                val = val.isoformat()
            elif isinstance(val, bool):
                val = 1 if val else 0
            elif isinstance(val, (list, dict)):
                val = json.dumps(val)
            row_values[col] = val

        conn = self._get_conn()

        # Check if id_col in SQLite schema is INTEGER
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        id_col_is_int = False
        for col_info in cursor.fetchall():
            if col_info['name'] == id_col and 'INT' in (col_info['type'] or '').upper():
                id_col_is_int = True
                break

        is_int_id = False
        if id_col_is_int:
            try:
                int_id = int(doc_id)
                if -9223372036854775808 <= int_id <= 9223372036854775807:
                    row_values[id_col] = int_id
                    is_int_id = True
            except (ValueError, TypeError, OverflowError):
                pass

        if id_col_is_int and not is_int_id:
            row_values.pop(id_col, None)
            cols = list(row_values.keys())
            placeholders = ', '.join(['?'] * len(cols))
            sql = f"INSERT INTO {table_name} ({', '.join(cols)}) VALUES ({placeholders})"
            with conn:
                conn.execute(sql, [row_values[c] for c in cols])
            return

        if not is_int_id:
            row_values[id_col] = str(doc_id)

        cols = list(row_values.keys())
        placeholders = ', '.join(['?'] * len(cols))
        updates = ', '.join([f"{c} = excluded.{c}" for c in cols if c != id_col])

        sql = f"""
            INSERT INTO {table_name} ({', '.join(cols)})
            VALUES ({placeholders})
            ON CONFLICT({id_col}) DO UPDATE SET
                {updates}
        """

        with conn:
            conn.execute(sql, [row_values[c] for c in cols])

    def _update_document(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> None:
        self._set_document(collection_name, doc_id, data, merge=True)

    def _delete_document(self, collection_name: str, doc_id: str) -> None:
        table_name, _ = self._resolve_table(collection_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'
        conn = self._get_conn()
        with conn:
            conn.execute(f"DELETE FROM {table_name} WHERE {id_col} = ?", (doc_id,))

    def _execute_query(self, collection_name: str, filters, orderings, limit_val) -> Iterator[SQLiteDocumentSnapshot]:
        table_name, parent_id = self._resolve_table(collection_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'

        sql = f"SELECT * FROM {table_name} WHERE 1=1"
        params = []

        if parent_id and table_name == 'messages':
            sql += " AND conversation_id = ?"
            params.append(parent_id)

        # Filters that can be handled directly in SQL
        python_filters = []
        for field, op, val in filters:
            snake_field = _camel_to_snake(field)
            if table_name == 'support_tickets':
                if snake_field in ('requester_id', 'requesterId'):
                    snake_field = 'user_id'
                elif snake_field in ('requester_name', 'requesterName'):
                    snake_field = 'user_name'
                elif snake_field in ('requester_email', 'requesterEmail'):
                    snake_field = 'user_email'
                elif snake_field == 'description':
                    snake_field = 'message'
                elif snake_field in ('admin_response', 'adminResponse'):
                    snake_field = 'admin_response'
                elif snake_field in ('resolved_at', 'resolvedAt', 'responded_at', 'respondedAt'):
                    snake_field = 'resolved_at'
            elif table_name == 'birthday_greetings':
                if snake_field in ('recipient_id', 'recipientId', 'recipient_user_id', 'recipientUserId'):
                    snake_field = 'recipient_id'
                elif snake_field in ('sender_id', 'senderId', 'sender_user_id', 'senderUserId'):
                    snake_field = 'sender_id'
                elif snake_field in ('is_read', 'isRead'):
                    snake_field = 'is_read'
            elif table_name == 'saved_postings':
                if snake_field in ('opportunity_id', 'opportunityId'):
                    snake_field = 'posting_id'
            if op in ('==', '!=', '>', '>=', '<', '<=') and snake_field not in JSON_COLUMNS:
                sql_op = '=' if op == '==' else op
                if isinstance(val, bool):
                    val = 1 if val else 0
                sql += f" AND {snake_field} {sql_op} ?"
                params.append(val)
            elif op == 'in' and isinstance(val, (list, tuple)) and snake_field not in JSON_COLUMNS:
                if not val:
                    sql += " AND 1=0"
                else:
                    placeholders = ', '.join(['?'] * len(val))
                    sql += f" AND {snake_field} IN ({placeholders})"
                    params.extend(val)
            else:
                # Array contains or JSON fields handled in Python
                python_filters.append((field, op, val))

        # Orderings
        if orderings:
            order_clauses = []
            for f, d in orderings:
                direction = "DESC" if d == Query.DESCENDING else "ASC"
                snake_f = _camel_to_snake(f)
                if table_name == 'support_tickets':
                    if snake_f in ('requester_id', 'requesterId'):
                        snake_f = 'user_id'
                    elif snake_f == 'description':
                        snake_f = 'message'
                elif table_name == 'birthday_greetings':
                    if snake_f in ('created_at', 'createdAt'):
                        snake_f = 'created_at'
                order_clauses.append(f"{snake_f} {direction}")
            sql += f" ORDER BY {', '.join(order_clauses)}"

        if limit_val is not None and not python_filters:
            sql += f" LIMIT {int(limit_val)}"

        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        except sqlite3.OperationalError as e:
            logger.warning(f"Query fallback on {table_name}: {e}")
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()

        matched = []
        for r in rows:
            data = _format_row_dict(table_name, r)
            doc_id = data.get(id_col) or data.get('id')

            # Apply remaining Python filters (e.g. array_contains)
            passes = True
            for field, op, val in python_filters:
                item_val = data.get(field) if field in data else data.get(_camel_to_snake(field))
                if op == 'array_contains':
                    arr = item_val if isinstance(item_val, list) else []
                    if val not in arr:
                        passes = False
                        break
                elif op == 'array_contains_any':
                    arr = item_val if isinstance(item_val, list) else []
                    if not any(x in arr for x in val):
                        passes = False
                        break
                elif op == '==':
                    if item_val != val:
                        passes = False
                        break
                elif op == 'in':
                    if item_val not in val:
                        passes = False
                        break

            if passes:
                ref = SQLiteDocumentReference(self, collection_name, doc_id)
                matched.append(SQLiteDocumentSnapshot(doc_id, True, data, reference=ref))

        if limit_val is not None and len(matched) > limit_val:
            matched = matched[:limit_val]

        for snap in matched:
            yield snap

    # Direct SQL methods
    def query(self, sql: str, params: Optional[Tuple] = None) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        return [dict(row) for row in cursor.fetchall()]

    def execute(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self._get_conn()
        with conn:
            cursor = conn.cursor()
            cursor.execute(sql, params or ())
            return cursor.rowcount

    def get_one(self, sql: str, params: Optional[Tuple] = None) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(sql, params or ())
        row = cursor.fetchone()
        return dict(row) if row else None


class PostgresDatabase:
    """Thread-safe Supabase PostgreSQL database adapter with parameter translation and connection pooling."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.db_path = "Supabase PostgreSQL"
        self._local = threading.local()
        self._init_schema()

    def _get_conn(self):
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError:
            raise ImportError("psycopg is required for Supabase PostgreSQL. Install via: pip install 'psycopg[binary]'")

        if not hasattr(self._local, 'conn') or self._local.conn is None or self._local.conn.closed:
            self._local.conn = psycopg.connect(self.database_url, autocommit=True, row_factory=dict_row)
        return self._local.conn

    def _init_schema(self):
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) as total FROM information_schema.tables WHERE table_schema = 'public';")
            count = cur.fetchone()['total']
            logger.info(f"Connected to Supabase PostgreSQL ({count} relations verified)")

    def _translate_sql(self, sql: str) -> str:
        # Convert SQLite ? placeholders to PostgreSQL %s
        return sql.replace('?', '%s')

    def _resolve_table(self, collection_name: str) -> Tuple[str, Optional[str]]:
        if '/' in collection_name:
            parts = collection_name.split('/')
            if len(parts) == 3 and parts[2] == 'messages':
                return 'messages', parts[1]
        return COLLECTION_TABLE_MAP.get(collection_name, collection_name), None

    def _get_table_columns(self, table_name: str) -> List[str]:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            return [r['column_name'] for r in cur.fetchall()]

    def collection(self, collection_name: str) -> SQLiteCollection:
        return SQLiteCollection(self, collection_name)

    def table(self, table_name: str) -> SQLiteCollection:
        return SQLiteCollection(self, table_name)

    def _get_document(self, collection_name: str, doc_id: str, reference=None) -> SQLiteDocumentSnapshot:
        table_name, parent_id = self._resolve_table(collection_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'

        conn = self._get_conn()
        with conn.cursor() as cur:
            query = f'SELECT * FROM "{table_name}" WHERE {id_col} = %s'
            params = [doc_id]
            if parent_id and table_name == 'messages':
                query += " AND conversation_id = %s"
                params.append(parent_id)

            try:
                cur.execute(query, params)
                row = cur.fetchone()
            except Exception as e:
                logger.warning(f"Postgres _get_document exception for {table_name}: {e}")
                return SQLiteDocumentSnapshot(doc_id, False, {}, reference=reference)

            if not row:
                ref = reference or SQLiteDocumentReference(self, collection_name, doc_id)
                return SQLiteDocumentSnapshot(doc_id, False, {}, reference=ref)

            data = _format_row_dict(table_name, row)
            ref = reference or SQLiteDocumentReference(self, collection_name, doc_id)
            return SQLiteDocumentSnapshot(doc_id, True, data, reference=ref)

    def _set_document(self, collection_name: str, doc_id: str, data: Dict[str, Any], merge: bool = False) -> None:
        table_name, parent_id = self._resolve_table(collection_name)
        columns = self._get_table_columns(table_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'

        final_data = {}
        if merge:
            existing = self._get_document(collection_name, doc_id)
            if existing.exists:
                final_data = existing.to_dict()

        for k, v in data.items():
            final_data[k] = v
            final_data[_camel_to_snake(k)] = v
            final_data[_snake_to_camel(k)] = v

        row_values = {}
        for col in columns:
            camel_key = _snake_to_camel(col)
            if col in final_data:
                val = final_data[col]
            elif camel_key in final_data:
                val = final_data[camel_key]
            else:
                continue

            if col in SERIALIZED_FIELDS and (isinstance(val, (dict, list)) or val is not None):
                val = json.dumps(val)
            row_values[col] = val

        if parent_id and table_name == 'messages':
            row_values['conversation_id'] = parent_id

        row_values[id_col] = str(doc_id)
        cols = list(row_values.keys())
        placeholders = ', '.join(['%s'] * len(cols))
        updates = ', '.join([f'"{c}" = EXCLUDED."{c}"' for c in cols if c != id_col])

        if updates:
            sql = f"""
                INSERT INTO "{table_name}" ({', '.join([f'"{c}"' for c in cols])})
                VALUES ({placeholders})
                ON CONFLICT ({id_col}) DO UPDATE SET {updates};
            """
        else:
            sql = f"""
                INSERT INTO "{table_name}" ({', '.join([f'"{c}"' for c in cols])})
                VALUES ({placeholders})
                ON CONFLICT ({id_col}) DO NOTHING;
            """

        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(sql, [row_values[c] for c in cols])

    def _update_document(self, collection_name: str, doc_id: str, data: Dict[str, Any]) -> None:
        self._set_document(collection_name, doc_id, data, merge=True)

    def _delete_document(self, collection_name: str, doc_id: str) -> None:
        table_name, _ = self._resolve_table(collection_name)
        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(f'DELETE FROM "{table_name}" WHERE {id_col} = %s', (doc_id,))

    def _execute_query(self, collection_name: str, filters, orderings, limit_val) -> Iterator[SQLiteDocumentSnapshot]:
        table_name, parent_id = self._resolve_table(collection_name)
        sql = f'SELECT * FROM "{table_name}" WHERE 1=1'
        params = []

        if parent_id and table_name == 'messages':
            sql += " AND conversation_id = %s"
            params.append(parent_id)

        python_filters = []
        for field, op, val in filters:
            snake_field = _camel_to_snake(field)
            if op == '==':
                sql += f' AND "{snake_field}" = %s'
                params.append(val)
            elif op == '!=':
                sql += f' AND "{snake_field}" != %s'
                params.append(val)
            elif op == '>=':
                sql += f' AND "{snake_field}" >= %s'
                params.append(val)
            elif op == '<=':
                sql += f' AND "{snake_field}" <= %s'
                params.append(val)
            elif op == '>':
                sql += f' AND "{snake_field}" > %s'
                params.append(val)
            elif op == '<':
                sql += f' AND "{snake_field}" < %s'
                params.append(val)
            else:
                python_filters.append((field, op, val))

        if orderings:
            order_clauses = []
            for field, direction in orderings:
                snake_field = _camel_to_snake(field)
                d = 'ASC' if direction == Query.ASCENDING else 'DESC'
                order_clauses.append(f'"{snake_field}" {d}')
            sql += f" ORDER BY {', '.join(order_clauses)}"

        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        id_col = 'user_id' if table_name in PROFILE_TABLES else 'id'
        matched = []
        for row in rows:
            data = _format_row_dict(table_name, row)
            doc_id = str(row.get(id_col, ''))
            passes = True
            for field, op, val in python_filters:
                v = data.get(field, data.get(_camel_to_snake(field)))
                if op == 'array_contains':
                    if not isinstance(v, list) or val not in v:
                        passes = False
                        break
            if passes:
                ref = SQLiteDocumentReference(self, collection_name, doc_id)
                matched.append(SQLiteDocumentSnapshot(doc_id, True, data, reference=ref))

        if limit_val is not None and len(matched) > limit_val:
            matched = matched[:limit_val]

        for snap in matched:
            yield snap

    def query(self, sql: str, params: Optional[Tuple] = None) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(self._translate_sql(sql), params or ())
            return [dict(row) for row in cur.fetchall()]

    def execute(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(self._translate_sql(sql), params or ())
            return cur.rowcount

    def get_one(self, sql: str, params: Optional[Tuple] = None) -> Optional[Dict[str, Any]]:
        conn = self._get_conn()
        with conn.cursor() as cur:
            cur.execute(self._translate_sql(sql), params or ())
            row = cur.fetchone()
            return dict(row) if row else None


# Singleton instance
_db_instance: Any = None


def get_db(db_path: Optional[str] = None):
    global _db_instance
    from app.config import Config
    engine = getattr(Config, 'DB_ENGINE', 'sqlite').lower()

    if engine in ('supabase', 'postgres', 'postgresql') and getattr(Config, 'DATABASE_URL', ''):
        if _db_instance is None or not isinstance(_db_instance, PostgresDatabase):
            _db_instance = PostgresDatabase(Config.DATABASE_URL)
        return _db_instance

    if _db_instance is None or not isinstance(_db_instance, SQLiteDatabase) or db_path is not None:
        _db_instance = SQLiteDatabase(db_path)
    return _db_instance


# Backward compatibility alias
def get_firestore_client():
    return get_db()


def get_database_status() -> Dict[str, Any]:
    db = get_db()
    user_row = db.get_one("SELECT count(*) as total FROM users")
    posting_row = db.get_one("SELECT count(*) as total FROM postings")
    resource_row = db.get_one("SELECT count(*) as total FROM resources")
    message_row = db.get_one("SELECT count(*) as total FROM messages")

    user_count = user_row['total'] if user_row else 0
    posting_count = posting_row['total'] if posting_row else 0
    resource_count = resource_row['total'] if resource_row else 0
    message_count = message_row['total'] if message_row else 0

    engine_label = "Supabase PostgreSQL" if isinstance(db, PostgresDatabase) else "SQLite Relational"

    return {
        "engine": engine_label,
        "status": "connected",
        "database_file": getattr(db, 'db_path', 'cloud'),
        "tables": {
            "users": user_count,
            "postings": posting_count,
            "resources": resource_count,
            "messages": message_count
        },
        "total_documents": user_count + posting_count + resource_count + message_count
    }
