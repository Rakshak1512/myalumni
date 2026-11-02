# MyAlumni 2.0 — Quick Start & Setup Guide (SQLite Architecture)

This guide provides end-to-end instructions for configuring, running, and verifying the **MyAlumni 2.0** application using its local, fast, self-contained **SQLite database** and native **JWT authentication**.

---

## 1. Prerequisites

- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**
- Zero external database services or cloud accounts required (SQLite database is embedded in Python).

---

## 2. Pre-Seeded Test User Accounts

The database comes pre-seeded with test accounts across all 4 discrete roles. You can sign in using email & password or using the 1-click demo buttons on the login page.

| Role | Email Address | Password | Persona & Permissions |
|---|---|---|---|
| **🛡️ Admin** | `admin@myalumni.edu` | `Password123!` | System Overseer, user management, audit trails, and support tickets |
| **🎓 Faculty** | `faculty@myalumni.edu` | `Password123!` | Department Chair, student promotions, and opportunity/event moderation |
| **👨‍🎓 Student** | `student@myalumni.edu` | `Password123!` | Job applications, career milestone tracking, mentorship requests, and batch chats |
| **💼 Alumni** | `alumni@myalumni.edu` | `Password123!` | Opportunity publishing, event organization, student mentorship, and network directory |

---

## 3. Environment Configuration

### Frontend (`frontend/.env`)
```env
VITE_APP_NAME=MyAlumni
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

### Backend (`backend/.env`)
```env
APP_ENV=development
FLASK_DEBUG=0
FLASK_SECRET_KEY=dev_myalumni_secret_key_8f7b2c9d1e4a6f0b3c8e

BACKEND_HOST=127.0.0.1
BACKEND_PORT=5000

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://127.0.0.1:5000

SQLITE_DB_PATH=./myalumni.db
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://*.trycloudflare.com
UPLOAD_MAX_SIZE_MB=10
```

---

## 4. Running the Application

### Start Backend API Server
```powershell
cd backend
pip install -r requirements.txt
python run.py
```
Backend API will be running on `http://127.0.0.1:5000`.

### Start Frontend Application
```powershell
cd frontend
npm install
npm run dev
```
Frontend will be running on `http://localhost:5173`.

### (Optional) Manually Re-seed Database
```powershell
cd backend
python app/seed.py
```

---

## 5. Verification & Automated Tests

### Backend Unit & RBAC Tests (Pytest):
```powershell
cd backend
pytest -v
```

### Frontend Production Build (Vite):
```powershell
cd frontend
npm run build
```
