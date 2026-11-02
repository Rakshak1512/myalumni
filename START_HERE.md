# Quick Start Guide — MyAlumni 2.0

Welcome to **MyAlumni 2.0 — Smart Alumni & Student Career Networking Portal**. Follow this guide to start the frontend, backend, and demo accounts in under 5 minutes.

---

## 3-Step Local Quickstart

### Step 1: Install Backend Dependencies
Open a terminal in the project root:

```powershell
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies & Start Vite
Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will start at: `http://localhost:5173`

### Step 3: Start the Flask Backend API
Back in your first terminal (inside `backend/` with virtual environment active):

```powershell
python run.py
```

The REST API will start at: `http://127.0.0.1:5000/api/v1`

---

## Logging In with Demo Accounts

Open your browser to `http://localhost:5173/#/login`.

Click any of the **Quick Fill Demo Accounts** buttons:

| Role | Email | Password | What You Can Explore |
|---|---|---|---|
| **Admin** | `admin.demo@myalumni.test` | `Demo@MyAlumni2026!` | User management, role elevation, audit logs, support tickets |
| **Faculty** | `faculty.demo@myalumni.test` | `Demo@MyAlumni2026!` | Moderation desk, student-to-alumni promotion, academic notes |
| **Student** | `student.demo@myalumni.test` | `Demo@MyAlumni2026!` | Alumni search, 1-on-1 mentorship, application tracker, human chat |
| **Alumni** | `alumni.demo@myalumni.test` | `Demo@MyAlumni2026!` | Mentorship availability switch, job submissions, achievements |

---

## Firebase Connection

To connect your own Cloud Firestore database:
1. Follow the instructions in [`docs/FIREBASE_SETUP.md`](./docs/FIREBASE_SETUP.md).
2. Place your service account JSON file at `backend/firebase-service-account.json`.
3. Run `python scripts/check_firebase.py` to confirm connectivity.
4. Run `python scripts/seed_demo_users.py` and `python scripts/seed_demo_data.py`.

---

## Where to Go Next

- [`commands/COMMANDS.md`](./commands/COMMANDS.md) — Complete copyable terminal commands
- [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) — Backend REST endpoints
- [`docs/FIREBASE_SETUP.md`](./docs/FIREBASE_SETUP.md) — Cloud Firestore setup
- [`docs/SMTP_SETUP.md`](./docs/SMTP_SETUP.md) — Email notifications setup
- [`docs/SECURITY.md`](./docs/SECURITY.md) — Role-based access control & security

