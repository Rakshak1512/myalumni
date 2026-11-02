# MyAlumni 2.0 — REST API Documentation

This document describes all API endpoints provided by the Flask backend under base path `/api/v1`.

All protected endpoints require an Authorization header formatted as:
`Authorization: Bearer <FIREBASE_ID_TOKEN>`

---

## 1. Health & Diagnostics

### `GET /api/v1/health`
Basic service availability check.
- **Access**: Public
- **Response 200**:
  ```json
  {
    "success": true,
    "message": "API service is operating normally.",
    "data": {
      "service": "MyAlumni 2.0 Backend API",
      "status": "healthy",
      "version": "2.0.0"
    }
  }
  ```

### `GET /api/v1/health/firebase`
Deep diagnostic check on Firebase Admin SDK credentials and Cloud Firestore reachability.
- **Access**: Public
- **Response 200** (Configured) or **503** (Missing Credentials):
  ```json
  {
    "success": true,
    "message": "Firebase Admin SDK operational.",
    "data": {
      "initialized": true,
      "project_id": "myalumni-portal-demo",
      "credentials_file_exists": true
    }
  }
  ```

---

## 2. Authentication & Profile Sync

### `POST /api/v1/auth/sync-profile`
Syncs or provisions a user's Firestore record after Firebase Auth sign-up. Client-side self-elevation to `admin` or `faculty` is strictly rejected and downgraded.
- **Access**: Authenticated
- **Body**:
  ```json
  {
    "displayName": "Alex Chen",
    "role": "student",
    "profile": {
      "courseName": "B.S. in Computer Science"
    }
  }
  ```
- **Response 200**: Synchronized user record with role profile.

### `GET /api/v1/auth/me`
Retrieves current user identity, role, account status, and role-specific profile document.
- **Access**: Authenticated
- **Response 200**: User object.

### `POST /api/v1/auth/logout`
Logs an audit event for user sign-out.
- **Access**: Authenticated
- **Response 200**: `{"success": true, "message": "Logged out successfully."}`

---

## 3. Alumni Directory & Users

### `GET /api/v1/users/alumni`
Search alumni with multi-field filtering.
- **Access**: Authenticated
- **Query Parameters**:
  - `name`: Filter by alumnus display name
  - `company`: Filter by employer
  - `jobTitle`: Filter by job designation
  - `skills`: Substring match on skills
  - `graduationYear`: Graduation year
  - `isMentoringAvailable`: `true` or `false`
- **Response 200**: Array of alumni profiles with public fields.

### `GET /api/v1/users/{userId}`
Retrieves safe public profile for a specific user. Hides private fields and respects birthday privacy flags.
- **Access**: Authenticated
- **Response 200**: User profile object.

### `PUT /api/v1/users/profile`
Updates current user's permitted profile fields.
- **Access**: Authenticated (Self)
- **Body**: `{"displayName": "...", "bio": "...", "phone": "...", "profile": {...}}`
- **Response 200**: Updated user record.

### `POST /api/v1/users/promote-to-alumni`
Faculty or Admin promotes a student to alumni status upon graduation.
- **Access**: Faculty, Admin
- **Body**:
  ```json
  {
    "studentId": "uid_of_student",
    "graduationYear": 2026,
    "company": "Apex Technologies",
    "jobTitle": "Associate Cloud Engineer"
  }
  ```
- **Response 200**: Updated alumnus profile.

---

## 4. Connections & Mentorship

### `POST /api/v1/connections/request`
Sends a professional connection request.
- **Access**: Authenticated
- **Body**: `{"recipientId": "...", "message": "..."}`
- **Response 201**: Created connection record.

### `GET /api/v1/connections`
Lists current user's sent and received connection requests.
- **Access**: Authenticated

### `PUT /api/v1/connections/{requestId}/status`
Accepts or rejects an incoming connection request.
- **Access**: Authenticated (Recipient only)
- **Body**: `{"status": "accepted"}` or `{"status": "rejected"}`

### `POST /api/v1/mentorship/request`
Student requests 1-on-1 mentorship from an available alumnus.
- **Access**: Student
- **Body**: `{"mentorId": "...", "goals": "...", "message": "..."}`
- **Response 201**: Mentorship record.

### `GET /api/v1/mentorship`
Lists user's active and pending mentorship relationships.
- **Access**: Authenticated

### `PUT /api/v1/mentorship/{requestId}/status`
Updates mentorship status (`accepted`, `rejected`, `completed`).
- **Access**: Mentor (for accept/reject), Either participant (for completed).

### `PUT /api/v1/mentorship/preferences`
Alumni toggles mentorship availability and mentee capacity.
- **Access**: Alumni
- **Body**: `{"isMentoringAvailable": true, "maxMentees": 4}`

---

## 5. Direct Human-to-Human Messaging (No AI)

### `GET /api/v1/chat/conversations`
Lists 1-on-1 conversations for current user.
- **Access**: Authenticated

### `POST /api/v1/chat/conversations`
Initiates or locates a 1-on-1 direct conversation with another verified user.
- **Access**: Authenticated
- **Body**: `{"recipientId": "target_user_uid"}`

### `GET /api/v1/chat/conversations/{conversationId}/messages`
Retrieves message history. Verifies caller is an authorized participant.
- **Access**: Participants only

### `POST /api/v1/chat/conversations/{conversationId}/messages`
Sends a human-to-human direct message.
- **Access**: Participants only
- **Body**: `{"text": "Hello Elena, thanks for accepting my mentorship request!"}`
- **Response 201**: Stored message record.

---

## 6. Opportunities & Applications

### `GET /api/v1/opportunities`
Lists approved jobs, internships, and referral opportunities.
- **Access**: Authenticated

### `POST /api/v1/opportunities`
Submits a job/internship. Alumni posts enter moderation; Faculty/Admin posts are auto-approved.
- **Access**: Alumni, Faculty, Admin
- **Body**:
  ```json
  {
    "title": "Cloud Infrastructure Engineer",
    "company": "Apex Technologies",
    "type": "job",
    "location": "Seattle / Remote",
    "isRemote": true,
    "description": "...",
    "applicationUrl": "https://apex.com/careers"
  }
  ```

### `PUT /api/v1/opportunities/{oppId}/review`
Approves or rejects a submitted opportunity.
- **Access**: Faculty, Admin
- **Body**: `{"status": "approved", "reviewNotes": "Verified."}`

### `POST /api/v1/opportunities/{oppId}/save`
Toggles saving/bookmarking an opportunity.
- **Access**: Authenticated

### `GET /api/v1/opportunities/applications`
Lists student's private career application tracking entries.
- **Access**: Authenticated

### `POST /api/v1/opportunities/{oppId}/apply`
Updates application tracker (`interested`, `applied`, `interviewing`, `offered`, `not_selected`).
- **Access**: Authenticated

---

## 7. Events & Reunions

### `GET /api/v1/events`
Lists approved upcoming events.
- **Access**: Authenticated

### `POST /api/v1/events`
Creates an event.
- **Access**: Authenticated

### `POST /api/v1/events/{eventId}/register`
Registers the caller for an event with capacity and deadline checks.
- **Access**: Authenticated

### `DELETE /api/v1/events/{eventId}/register`
Cancels registration.
- **Access**: Authenticated

### `GET /api/v1/events/{eventId}/attendees`
Roster of attendees.
- **Access**: Organizer, Faculty, Admin

---

## 8. Alumni Achievements

### `GET /api/v1/achievements`
Community feed of approved achievements.
- **Access**: Authenticated

### `POST /api/v1/achievements`
Alumni submit promotions, honors, or milestones for moderation.
- **Access**: Alumni

### `PUT /api/v1/achievements/{id}/review`
Approves or rejects an achievement submission.
- **Access**: Faculty, Admin

---

## 9. Birthday Corner

### `GET /api/v1/birthdays`
Lists today's and upcoming birthdays of alumni whose privacy settings allow it (strictly excludes birth years).
- **Access**: Authenticated

### `POST /api/v1/birthdays/greet`
Sends a celebratory birthday greeting.
- **Access**: Authenticated
- **Body**: `{"recipientId": "...", "greetingText": "..."}`

---

## 10. Batch Communities

### `GET /api/v1/batches`
Lists available cohort batch communities.
- **Access**: Authenticated

### `POST /api/v1/batches/{id}/join`
Enrolls user into batch community.
- **Access**: Authenticated

### `GET /api/v1/batches/{id}/posts` & `POST /api/v1/batches/{id}/posts`
Lists and creates discussion posts in the batch.
- **Access**: Authenticated

---

## 11. Career Growth Tracker & Guide

### `GET /api/v1/career/guide`
Deterministic, rule-based career preparation guide and roadmaps (No AI API).
- **Access**: Authenticated

### `GET /api/v1/career/goals` & `POST /api/v1/career/goals`
Manages measurable career target goals.
- **Access**: Authenticated

### `POST /api/v1/career/goals/{goalId}/milestones`
Adds milestone to a goal.
- **Access**: Authenticated

### `PUT /api/v1/career/milestones/{milestoneId}/toggle`
Toggles milestone completion; automatically recalculates goal percentage.
- **Access**: Authenticated

---

## 12. Support & Administration

### `POST /api/v1/admin/tickets`
Submits a Contact Admin support ticket.
- **Access**: Authenticated

### `GET /api/v1/admin/my-tickets`
Lists caller's submitted tickets and administrative responses.
- **Access**: Authenticated

### `PUT /api/v1/admin/tickets/{id}/respond`
Admin responds to ticket. Automatically dispatches notification email via SMTP.
- **Access**: Admin

### `GET /api/v1/admin/users`
Lists all users for administrative role updates.
- **Access**: Admin

### `PUT /api/v1/admin/users/{id}/role`
Updates user role (`student`, `alumni`, `faculty`, `admin`).
- **Access**: Admin

### `GET /api/v1/admin/audit-logs`
Inspects immutable security audit log trail.
- **Access**: Admin

