# MyAlumni 2.0 — Security & Privacy Architecture

MyAlumni 2.0 incorporates enterprise security practices across all tiers: client, REST API, authentication, and database.

---

## 1. Authentication & Token Verification

1. **Client Identity**: Handled by Firebase Authentication. Users log in with email and password, generating cryptographically signed Firebase ID tokens.
2. **Backend Token Validation**: Every protected API route uses the `@require_auth` decorator in `app/auth/decorators.py`. The Flask backend decodes the token using the official `firebase_admin.auth.verify_id_token` method.
3. **Revocation & Expiration**: Tokens are short-lived (1 hour) and refreshed automatically by the frontend client.

---

## 2. Server-Side Role-Based Access Control (RBAC)

The portal enforces exactly 4 roles:
- **Student**: Access to directory, mentorship requests, private application tracking, resources, career tracker.
- **Alumni**: Access to mentoring availability, job/referral submission, achievements showcase.
- **Faculty**: Department moderation of jobs and achievements, resource curation, student-to-alumni promotion.
- **Admin**: Full system overseer, user role elevation, account suspension, audit logs, curriculum management.

### Security Guarantees:
- **No Client Self-Elevation**: The profile sync endpoint (`/auth/sync-profile`) rejects any attempt by a client to assign itself `admin` or `faculty`. Roles are strictly assigned by trusted backend code or administrative users.
- **Access Enforcement**: Enforced on Flask endpoints using `@require_role(...)`. Frontend navigation visibility is merely a UX convenience; backend rejection is absolute.

---

## 3. Privacy & Data Protection

1. **Birthday Privacy**: Birthdays are visible only if the user explicitly opts in (`birthday.isPublic == true`). Even when public, **birth years are strictly stripped** from all community responses to protect personal identifiable information (PII).
2. **Direct Human-to-Human Messaging**:
   - Only authorized participants can access conversation histories or post messages.
   - Access is checked on every read and write request on the backend.
   - Absolutely no AI chatbot listening or LLM ingestion.
3. **Private Career Tracking**: Student application tracking notes and job statuses are strictly private to the student account.

---

## 4. Immutable Audit Trail

Sensitive actions are automatically recorded in Cloud Firestore's `auditLogs` collection via `app/utils/audit.py`:
- User role elevations and account suspensions
- Opportunity and achievement approvals / rejections
- Moderation actions
- User profile updates and logouts
- Includes timestamp, actor UID, actor email, actor role, target ID, client IP, and User-Agent.

---

## 5. Environment & Secret Separation

- The frontend `.env` contains **only** `VITE_APP_NAME` and `VITE_API_BASE_URL`.
- No Firebase service account keys, private keys, or SMTP passwords ever touch client-side bundles.
- Service account JSON files are excluded by `.gitignore`.

