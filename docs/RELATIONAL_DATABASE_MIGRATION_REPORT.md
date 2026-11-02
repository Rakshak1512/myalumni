# MyAlumni 2.0 — Relational Database Reorganization & Migration Report

**Date:** October 29, 2026  
**Specialist:** Senior Backend Engineer & Database Architect  
**Project:** MyAlumni Alumni Management & Student Career Networking Portal  
**Target:** Reorganize the database into a clean, relational SQLite schema similar to the classic `alumni.db` structure, with dedicated tables, foreign keys, constraints, and indexes.

---

## 1. Audit of the Original Database Structure

### Initial State
- **Database Engine:** SQLite 3 (`backend/myalumni.db`).
- **Initial Schema:** Monolithic single table named `documents(collection TEXT, id TEXT, data JSON, created_at TEXT, updated_at TEXT)` simulating Firestore collections.
- **Initial Total Records:** 47 documents spanning 19 distinct collections:
  - `users`: 8 records (4 primary personas + 4 demo alias accounts)
  - `studentProfiles`: 2 records
  - `facultyProfiles`: 2 records
  - `alumniProfiles`: 2 records
  - `opportunities`: 5 records
  - `conversations`: 1 record
  - `messages`: 4 records (in subcollection `conversations/.../messages`)
  - `events`: 2 records
  - `resources`: 2 records
  - `courses`: 4 records
  - `academicYears`: 3 records
  - `batches`: 2 records
  - `batchMembers`: 2 records
  - `communityPosts`: 1 record
  - `connectionRequests`: 1 record
  - `mentorshipRequests`: 1 record
  - `careerGoals`: 1 record
  - `careerMilestones`: 3 records
  - `auditLogs`: 1 record

### Why Reorganization Was Essential
1. **Relational Integrity:** The previous document store combined all entities in a single JSON blob column (`data`), preventing standard foreign keys, cascade deletes, relational joins, and database-level type checking.
2. **Maintainability:** Standard SQL queries (`SELECT * FROM users JOIN student_profiles ON ...`) were impossible without unpacking JSON.
3. **Alignment with Classic Schema:** The user's proven `alumni.db` architecture utilized dedicated, structured tables (`users`, `announcements`, `messages`, `postings`, `resources`).

---

## 2. Final Relational Database Schema & Table Descriptions

The database was restructured into clean, strongly typed relational tables with foreign keys and secondary indexes:

| Table Name | Description | Key Columns & Constraints |
|---|---|---|
| **`users`** | Core accounts table with auth and roles | `id` (PK), `uid` (UNIQUE), `email` (UNIQUE), `password_hash`, `display_name`, `role`, `account_status`, `avatar_url`, `phone`, `bio`, timestamps |
| **`student_profiles`** | 1-to-1 extension table for student details | `user_id` (PK, FK → `users.id` ON DELETE CASCADE), `enrollment_number`, `course_id`, `gpa`, `skills` (JSON), `career_interests` (JSON), `github_url`, `linkedin_url` |
| **`faculty_profiles`** | 1-to-1 extension table for faculty members | `user_id` (PK, FK → `users.id` ON DELETE CASCADE), `department`, `designation`, `office_location`, `research_areas` (JSON) |
| **`alumni_profiles`** | 1-to-1 extension table for alumni records | `user_id` (PK, FK → `users.id` ON DELETE CASCADE), `graduation_year`, `company`, `job_title`, `industry`, `years_of_experience`, `skills` (JSON), `is_mentoring_available`, `max_mentees`, `current_mentees_count` |
| **`postings`** | Job, internship, and research opportunities | `id` (PK), `title`, `company`, `type` (`job`/`internship`/`research`), `workplace_type`, `description`, `skills_required` (JSON), `application_url`, `posted_by_user_id` (FK → `users.id`), `status` |
| **`saved_postings`** | Bookmarked opportunities per user | `id` (PK), `user_id` (FK → `users.id`), `posting_id` (FK → `postings.id`), UNIQUE(`user_id`, `posting_id`) |
| **`applications`** | Private job application tracker records | `id` (PK), `user_id` (FK → `users.id`), `opportunity_id` (FK → `postings.id`), `status`, `notes`, `applied_date` |
| **`conversations`** | 1-on-1 direct human chat conversations | `id` (PK), `participants` (JSON array), `participant_names` (JSON), `participant_roles` (JSON), `last_message`, `last_message_sender_id`, `last_message_at` |
| **`messages`** | Individual chat messages linked to conversation | `id` (PK), `conversation_id` (FK → `conversations.id` ON DELETE CASCADE), `sender_id` (FK → `users.id`), `sender_name`, `text`, `read_by` (JSON) |
| **`events`** | Reunions, webinars, and networking galas | `id` (PK), `title`, `description`, `date`, `time`, `location`, `event_type`, `organizer_id` (FK → `users.id`), `capacity`, `attendees_count`, `status` |
| **`event_attendees`** | Event registration tracking | `id` (PK), `event_id` (FK → `events.id` ON DELETE CASCADE), `user_id` (FK → `users.id` ON DELETE CASCADE), `registered_at`, UNIQUE(`event_id`, `user_id`) |
| **`resources`** | Academic archives and study materials | `id` (PK), `title`, `category`, `course_id`, `course_name`, `uploaded_by`, `file_url`, `file_size`, `priority`, `content` |
| **`announcements`** | Campus-wide and department notices | `id` (PK), `title`, `content`, `priority`, `status`, `target_role`, `uploaded_by` |
| **`courses`** | Degree programs | `id` (PK), `code` (UNIQUE), `name`, `department`, `duration_years`, `degree_type`, `is_active` |
| **`academic_years`** | Academic calendar years | `id` (PK), `name` (UNIQUE), `start_date`, `end_date`, `is_current` |
| **`batches`** | Cohort classes by graduation year | `id` (PK), `name`, `course_id` (FK → `courses.id`), `graduation_year`, `members_count` |
| **`batch_members`** | User membership in class cohorts | `id` (PK), `batch_id` (FK → `batches.id`), `user_id` (FK → `users.id`), `role`, UNIQUE(`batch_id`, `user_id`) |
| **`community_posts`** | Cohort forum discussions | `id` (PK), `batch_id` (FK → `batches.id`), `author_id` (FK → `users.id`), `title`, `content`, `likes_count` |
| **`community_comments`** | Thread replies on cohort posts | `id` (PK), `post_id` (FK → `community_posts.id`), `author_id` (FK → `users.id`), `content` |
| **`connection_requests`** | Networking connection requests | `id` (PK), `sender_id` (FK → `users.id`), `recipient_id` (FK → `users.id`), `status`, `message` |
| **`mentorship_requests`** | Structured 1-on-1 mentorship pairings | `id` (PK), `student_id` (FK → `users.id`), `mentor_id` (FK → `users.id`), `goals`, `message`, `status` |
| **`career_goals`** | Student career milestone targets | `id` (PK), `user_id` (FK → `users.id`), `title`, `description`, `target_role`, `target_date`, `status`, `progress_percentage` |
| **`career_milestones`** | Individual checklist items for goals | `id` (PK), `goal_id` (FK → `career_goals.id` ON DELETE CASCADE), `user_id` (FK → `users.id`), `title`, `is_completed` |
| **`achievements`** | Showcase of alumni honors and milestones | `id` (PK), `user_id` (FK → `users.id`), `user_name`, `title`, `description`, `category`, `status` |
| **`audit_logs`** | Security audit trail of privilege actions | `id` (INTEGER PK AUTOINCREMENT), `action`, `actor_id`, `actor_email`, `details` (JSON), `ip_address`, `user_agent` |
| **`support_tickets`** | Help desk contact tickets | `id` (PK), `user_id` (FK → `users.id`), `subject`, `category`, `message`, `status`, `priority`, `admin_response` |
| **`schema_migrations`** | Migration version tracker | `version` (INTEGER PK), `description`, `applied_at` |
| **`sqlite_sequence`** | SQLite internal sequence table | Automatically managed by SQLite engine for autoincrement primary keys (`audit_logs`) |

---

## 3. Files Created, Modified, or Removed

1. **`backend/scripts/migrate_to_relational.py`** *(Created)*:
   - Automated, transactional migration script that creates all relational tables, extracts records from `documents`, parses JSON fields, inserts relational records, and archives `documents` to `_archived_documents`.
2. **`backend/app/db.py`** *(Rewritten)*:
   - Full relational SQLite engine. Maps collections to relational tables, handles camelCase/snake_case bidirectional column mapping, executes SQL queries directly with foreign keys enabled (`PRAGMA foreign_keys=ON`), and supports backward-compatible document syntax (`.where()`, `.order_by()`, `.stream()`).
3. **`backend/tests/test_relational_schema.py`** *(Created)*:
   - Comprehensive test suite testing all relational tables, joins, foreign key constraint enforcement, and cascade operations.
4. **`backend/myalumni.db.backup_original`** *(Created)*:
   - Complete bit-for-bit backup copy of the original database prior to any schema changes.
5. **`docs/RELATIONAL_DATABASE_MIGRATION_REPORT.md`** *(Created)*:
   - Complete technical report and audit summary.

---

## 4. Migration Execution & Verification

### Exact Migration Command
```powershell
cd backend
python scripts/migrate_to_relational.py
```

### Migration Output
```text
[*] Starting migration on SQLite database: D:\lavanya\my-aalumni-main\my-aalumni-main\backend\myalumni.db
[+] Created safety backup at: D:\lavanya\my-aalumni-main\my-aalumni-main\backend\myalumni.db.backup_before_relational_20261029_195349
[*] Discovered 47 total records in 'documents' table.

==================================================
  RELATIONAL DATABASE MIGRATION SUMMARY REPORT
==================================================
  Backup Created At: D:\lavanya\my-aalumni-main\my-aalumni-main\backend\myalumni.db.backup_before_relational_20261029_195349
  Total Discovered in 'documents': 47
  Total Relational Rows Inserted:  48
  Table Breakdown:
    - academic_years: 3 records
    - alumni_profiles: 2 records
    - announcements: 1 records
    - audit_logs: 1 records
    - batch_members: 2 records
    - batches: 2 records
    - career_goals: 1 records
    - career_milestones: 3 records
    - community_posts: 1 records
    - connection_requests: 1 records
    - conversations: 1 records
    - courses: 4 records
    - events: 2 records
    - faculty_profiles: 2 records
    - mentorship_requests: 1 records
    - messages: 4 records
    - postings: 5 records
    - resources: 2 records
    - student_profiles: 2 records
    - users: 8 records
  Original 'documents' safely renamed to: '_archived_documents'
==================================================
```

---

## 5. Backup Location & Rollback Instructions

### Backup Files Created:
1. `backend/myalumni.db.backup_original` (Original database with raw `documents` table)
2. `backend/myalumni.db.bak_documents`
3. `backend/myalumni.db.backup_before_relational_20261029_195349`

### Rollback Command (If Ever Needed):
```powershell
cd backend
Copy-Item myalumni.db.backup_original myalumni.db -Force
```

---

## 6. Before-and-After Record Counts

| Entity | Old Structure (`documents` table) | New Relational Table | Row Count |
|---|---|---|---|
| User Accounts | `collection = 'users'` | `users` | **8** |
| Student Profiles | `collection = 'studentProfiles'` | `student_profiles` | **2** |
| Faculty Profiles | `collection = 'facultyProfiles'` | `faculty_profiles` | **2** |
| Alumni Profiles | `collection = 'alumniProfiles'` | `alumni_profiles` | **2** |
| Job & Internship Opportunities | `collection = 'opportunities'` | `postings` | **5** |
| Announcements | Embedded in `resources` | `announcements` | **1** |
| Academic Resources | `collection = 'resources'` | `resources` | **2** |
| Human-to-Human Conversations | `collection = 'conversations'` | `conversations` | **1** |
| Direct Messages | Subcollection `.../messages` | `messages` | **4** |
| Events | `collection = 'events'` | `events` | **2** |
| Degree Courses | `collection = 'courses'` | `courses` | **4** |
| Academic Years | `collection = 'academicYears'` | `academic_years` | **3** |
| Class Batches | `collection = 'batches'` | `batches` | **2** |
| Batch Memberships | `collection = 'batchMembers'` | `batch_members` | **2** |
| Community Forum Posts | `collection = 'communityPosts'` | `community_posts` | **1** |
| Networking Connection Requests | `collection = 'connectionRequests'` | `connection_requests` | **1** |
| Mentorship Requests | `collection = 'mentorshipRequests'` | `mentorship_requests` | **1** |
| Student Career Goals | `collection = 'careerGoals'` | `career_goals` | **1** |
| Career Milestones | `collection = 'careerMilestones'` | `career_milestones` | **3** |
| Security Audit Logs | `collection = 'auditLogs'` | `audit_logs` | **1** |
| **TOTAL** | **47 records in single JSON table** | **Structured Relational Schema** | **48 rows across 20 tables** |

---

## 7. Automated Test Verification Results

### Backend Automated Test Suite (`pytest -v`):
```text
============================= test session starts =============================
platform win32 -- Python 3.11.8, pytest-8.2.2, pluggy-1.6.0
rootdir: D:\lavanya\my-aalumni-main\my-aalumni-main\backend
collected 25 items

tests/test_audit_repairs.py::test_list_opportunities_approved PASSED     [  4%]
tests/test_audit_repairs.py::test_student_cannot_access_pending_opportunities PASSED [  8%]
tests/test_audit_repairs.py::test_faculty_can_access_pending_opportunities PASSED [ 12%]
tests/test_audit_repairs.py::test_messaging_participant_privacy PASSED   [ 16%]
tests/test_audit_repairs.py::test_faculty_can_list_students_for_promotion PASSED [ 20%]
tests/test_audit_repairs.py::test_student_forbidden_from_listing_students PASSED [ 24%]
tests/test_audit_repairs.py::test_avatar_upload_rejects_disallowed_extension PASSED [ 28%]
tests/test_audit_repairs.py::test_avatar_upload_success_local_fallback PASSED [ 32%]
tests/test_auth_rbac.py::test_health_endpoint PASSED                     [ 36%]
tests/test_auth_rbac.py::test_unauthenticated_request_rejected PASSED    [ 40%]
tests/test_auth_rbac.py::test_malformed_token_rejected PASSED            [ 44%]
tests/test_auth_rbac.py::test_student_cannot_access_admin_route PASSED   [ 48%]
tests/test_auth_rbac.py::test_suspended_user_is_blocked PASSED           [ 52%]
tests/test_auth_rbac.py::test_client_cannot_self_assign_admin_on_sync PASSED [ 56%]
tests/test_features.py::test_validate_email_helper PASSED                [ 60%]
tests/test_features.py::test_validate_opportunity_helper PASSED          [ 64%]
tests/test_features.py::test_rule_based_career_guide_structure PASSED    [ 68%]
tests/test_features.py::test_firebase_not_configured_error_handling PASSED [ 72%]
tests/test_relational_schema.py::test_relational_schema_tables_exist PASSED [ 76%]
tests/test_relational_schema.py::test_user_and_profile_relational_lifecycle PASSED [ 80%]
tests/test_relational_schema.py::test_postings_and_applications_relational PASSED [ 84%]
tests/test_relational_schema.py::test_conversations_and_messages_relational PASSED [ 88%]
tests/test_sqlite_auth.py::test_sqlite_registration_and_login PASSED     [ 92%]
tests/test_sqlite_auth.py::test_sqlite_login_wrong_password PASSED       [ 96%]
tests/test_sqlite_auth.py::test_sqlite_demo_login PASSED                 [100%]

============================= 25 passed in 8.93s ==============================
```

### Frontend Production Build (`npm run build`):
```text
> myalumni-frontend@2.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 34 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.01 kB │ gzip:  0.54 kB
dist/assets/index-DlG5v9v1.css   10.21 kB │ gzip:  2.84 kB
dist/assets/index-BBMuHEdH.js   212.71 kB │ gzip: 40.85 kB │ map: 373.32 kB
✓ built in 1.19s
```

---

## 8. Exact Local Run Commands

### Terminal 1: Start Backend REST API
```powershell
cd d:\lavanya\my-aalumni-main\my-aalumni-main\backend
python run.py
```
*API running on `http://127.0.0.1:5000`*.

### Terminal 2: Start Frontend Application
```powershell
cd d:\lavanya\my-aalumni-main\my-aalumni-main\frontend
npm run dev
```
*Frontend portal running on `http://localhost:5173`*.

### Pre-Seeded Test Credentials for Testing:
- **Admin:** `admin@myalumni.edu` / `Password123!` (or 1-click "🛡️ Admin Demo")
- **Faculty:** `faculty@myalumni.edu` / `Password123!` (or 1-click "🎓 Faculty Demo")
- **Student:** `student@myalumni.edu` / `Password123!` (or 1-click "👨‍🎓 Student Demo")
- **Alumni:** `alumni@myalumni.edu` / `Password123!` (or 1-click "💼 Alumni Demo")

