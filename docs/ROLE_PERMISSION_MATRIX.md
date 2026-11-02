# MyAlumni 2.0 — Centralized Role Permission Matrix

This document defines the security boundary and access control specification across all four user roles in MyAlumni 2.0: **Admin**, **Faculty**, **Student**, and **Alumni**.

---

## 1. Role Definitions

| Role | Target Persona | Primary Responsibilities |
|---|---|---|
| **Admin** | Systems Overseer & Institutional IT | Global user management, account status (activation/suspension), role elevation, support ticket helpdesk, curriculum (degrees/years), security audit trail, Firestore health inspection. |
| **Faculty** | Department Chair, Professor, Advisor | Academic moderation desk (approving opportunities and achievements), student-to-alumni graduation promotion, study notes/resource curation, official announcements. |
| **Student** | Enrolled Undergraduate / Postgraduate | Alumni directory exploration, 1-on-1 mentorship inquiries, peer networking, direct messaging, jobs/internship catalog, application tracking, career roadmaps, event participation, support inquiries. |
| **Alumni** | Verified University Graduate | Profile showcase, directory presence, offering 1-on-1 mentorship, posting jobs/internships/referrals, submitting career achievements, class batch networking, event participation. |

---

## 2. Page & Navigation Access Matrix

| Route | Page Title | Allowed Roles | Enforcement Method |
|---|---|---|---|
| `#/` | Welcome / Landing Page | *Public* | Open route |
| `#/login` | User Authentication | *Public* | Open route + 1-Click Demo Bypasses |
| `#/register` | Account Registration | *Public* | Role restricted to student/alumni only |
| `#/forgot-password` | Password Reset Link | *Public* | Firebase Auth client |
| `#/dashboard` | Role-Customized Dashboard | Admin, Faculty, Student, Alumni | Dynamic renderer based on authenticated role |
| `#/directory` | Alumni Directory & Mentorship Network | Admin, Faculty, Student, Alumni | Requires authentication |
| `#/mentorship` | 1-on-1 Mentorship Central | Student, Alumni | Role-guarded router + backend decorators |
| `#/messages` | Direct Human-to-Human Messaging | Admin, Faculty, Student, Alumni | Authenticated + participant boundary checks |
| `#/opportunities` | Jobs, Internships & Referrals | Admin, Faculty, Student, Alumni | Viewable by all; posting restricted to Alumni, Faculty, Admin |
| `#/events` | Events & Reunions | Admin, Faculty, Student, Alumni | Viewable by all; event creation restricted to Alumni, Faculty, Admin |
| `#/achievements` | Alumni Success Stories Showcase | Admin, Faculty, Student, Alumni | Viewable by all; submissions restricted to Alumni & Admin |
| `#/birthdays` | Community Celebrations Corner | Admin, Faculty, Student, Alumni | Strict privacy (birth year hidden; opt-in public toggle) |
| `#/batches` | Cohort Batch Communities | Admin, Faculty, Student, Alumni | Batch post & discussion participation |
| `#/resources` | Academic Notes & Notices | Admin, Faculty, Student, Alumni | Viewable by all; upload & broadcast restricted to Faculty & Admin |
| `#/career-tracker` | Personal Career Growth Tracker | Student | Role-guarded route for student targets & portfolio |
| `#/career-guide` | Deterministic Career Roadmaps | Student, Alumni | Curated industry roadmaps (no external AI calls) |
| `#/faculty/moderation` | Faculty Moderation Desk | Faculty, Admin | Role-guarded queue for opportunity & achievement review |
| `#/faculty/promotion` | Student-to-Alumni Promotion | Faculty, Admin | Role-guarded student graduation promotion tool |
| `#/admin` | Administration & Curriculum | Admin | Admin-only route guard |
| `#/admin/users` | User & Role Management | Admin | Admin-only route guard + backend `@require_role(['admin'])` |
| `#/admin/tickets` | Support Helpdesk & Inquiries | Admin | Admin-only route guard + SMTP email reply dispatch |
| `#/admin/audit-logs` | Immutable Audit Trail | Admin | Admin-only route guard + backend `@require_role(['admin'])` |
| `#/contact-admin` | Contact Helpdesk | Student, Alumni, Faculty | User ticket creation & admin response tracking |
| `#/settings` | Account & Profile Settings | Admin, Faculty, Student, Alumni | Personal profile editing, photo upload, privacy toggles |
| `#/notifications` | Notifications Center | Admin, Faculty, Student, Alumni | In-app alert stream with unread counter |

---

## 3. Action & Control Matrix

| Component / Feature | Action | Student | Alumni | Faculty | Admin | Backend Endpoint & Method |
|---|---|:---:|:---:|:---:|:---:|---|
| **Opportunities** | View approved opportunities | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/opportunities` |
| | Post new opportunity | ❌ | ✅ | ✅ | ✅ | `POST /api/v1/opportunities` |
| | Review / Approve / Reject | ❌ | ❌ | ✅ | ✅ | `PUT /api/v1/opportunities/<id>/review` |
| | Save / Bookmark opportunity | ✅ | ✅ | ✅ | ✅ | `POST /api/v1/opportunities/<id>/save` |
| | Track application progress | ✅ | ✅ | ✅ | ✅ | `POST /api/v1/opportunities/<id>/apply` |
| **Messaging** | Start conversation | ✅ | ✅ | ✅ | ✅ | `POST /api/v1/chat/conversations` |
| | View conversation list | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/chat/conversations` |
| | View message history | ⚠️ Participant | ⚠️ Participant | ⚠️ Participant | ⚠️ Participant | `GET /api/v1/chat/conversations/<id>/messages` |
| | Send message | ⚠️ Participant | ⚠️ Participant | ⚠️ Participant | ⚠️ Participant | `POST /api/v1/chat/conversations/<id>/messages` |
| **Events** | View published events | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/events` |
| | Register for event | ✅ | ✅ | ✅ | ✅ | `POST /api/v1/events/<id>/register` |
| | Create event | ❌ | ✅ | ✅ | ✅ | `POST /api/v1/events` |
| | Review / Approve event | ❌ | ❌ | ✅ | ✅ | `PUT /api/v1/events/<id>/review` |
| **Achievements** | View approved showcase | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/achievements` |
| | Submit achievement | ❌ | ✅ | ❌ | ✅ | `POST /api/v1/achievements` |
| | Review / Approve achievement | ❌ | ❌ | ✅ | ✅ | `PUT /api/v1/achievements/<id>/review` |
| **Promotion** | View eligible students | ❌ | ❌ | ✅ | ✅ | `GET /api/v1/users/students` |
| | Promote student to alumni | ❌ | ❌ | ✅ | ✅ | `POST /api/v1/users/promote-to-alumni` |
| **Governance** | List all registered users | ❌ | ❌ | ❌ | ✅ | `GET /api/v1/admin/users` |
| | Elevate / Demote user role | ❌ | ❌ | ❌ | ✅ | `PUT /api/v1/admin/users/<id>/role` |
| | Suspend / Activate user | ❌ | ❌ | ❌ | ✅ | `PUT /api/v1/admin/users/<id>/status` |
| | Manage degrees & courses | ❌ | ❌ | ❌ | ✅ | `POST, DELETE /api/v1/admin/courses` |
| | Manage academic cohort years| ❌ | ❌ | ❌ | ✅ | `POST, DELETE /api/v1/admin/academic-years` |
| | Reply to support tickets | ❌ | ❌ | ❌ | ✅ | `PUT /api/v1/admin/tickets/<id>/respond` |
| | View immutable audit logs | ❌ | ❌ | ❌ | ✅ | `GET /api/v1/admin/audit-logs` |
| **Profile** | Edit bio, phone, skills | ✅ (Self) | ✅ (Self) | ✅ (Self) | ✅ (Self) | `PUT /api/v1/users/profile` |
| | Upload / Change avatar | ✅ (Self) | ✅ (Self) | ✅ (Self) | ✅ (Self) | `POST /api/v1/users/avatar` |
| | Toggle mentor availability | ❌ | ✅ | ❌ | ❌ | `PUT /api/v1/mentorship/preferences` |
| | Toggle birthday visibility | ❌ | ✅ | ❌ | ❌ | `PUT /api/v1/users/profile` |

---

## 4. Key Security Enforcement Highlights

1. **Defense in Depth**: Every privilege boundary is enforced at **three levels**:
   - **Frontend UI rendering**: Unauthorized buttons, forms, and tabs are not rendered in the DOM.
   - **Frontend SPA Router**: Hash changes to unauthorized routes redirect to the dedicated `#/unauthorized` page shell.
   - **Backend Flask API Decorators**: `@require_role` decorators reject unauthorized calls with HTTP `403 FORBIDDEN` and structured JSON error responses.
2. **Preventing Self-Elevation**: The profile update endpoint (`PUT /api/v1/users/profile`) and registration profile sync (`POST /api/v1/auth/sync-profile`) explicitly strip out role modification attempts, preventing students or alumni from modifying their own `role` or account status.
3. **Data Privacy**: The `/chat/conversations/<id>/messages` endpoint validates that `g.current_user['uid'] in conversation['participants']`, ensuring zero data leakage between unrelated users.

