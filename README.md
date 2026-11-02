# MyAlumni 2.0 — Alumni & Student Career Networking Portal

MyAlumni is a full-stack portal for students, alumni, faculty, and administrators. It uses a Vite-based frontend, a Flask REST API, and supports local SQLite development with Supabase PostgreSQL for production.

## Repository layout

```text
myalumni/
├── frontend/                 # Vite frontend — Vercel Project 1
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json           # SPA fallback
├── backend/                  # Flask API — Vercel Project 2
│   ├── app/
│   │   ├── auth/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── config.py
│   │   └── db.py
│   ├── tests/
│   ├── run.py
│   ├── pyproject.toml        # Vercel Flask entrypoint: run:app
│   ├── requirements.txt      # Production dependencies
│   └── requirements-dev.txt  # Test/development dependencies
├── docs/
├── START_HERE.md
└── .gitignore
```

## Technology

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript ES modules, Vite, HTML and CSS |
| Backend | Python 3.12, Flask, Flask Blueprints, PyJWT |
| Production database | Supabase PostgreSQL |
| Local development database | SQLite |
| Email verification | SMTP with six-digit OTP |
| Production file storage | Supabase Storage |

## Deploy as TWO separate Vercel projects

This repository is a monorepo. Import the **same GitHub repository twice**, creating two independent Vercel projects with separate domains and deployments:

- Frontend project: `frontend/`
- Backend project: `backend/`

Do not use the old root-level Services configuration. The root directory setting in each Vercel project is important. Full step-by-step instructions and environment variable names are in [DEPLOYMENT_VERCEL.md](./DEPLOYMENT_VERCEL.md).

### Project 1 — Frontend

| Setting | Value |
|---|---|
| Git repository | `Rakshak1512/myalumni` |
| Root Directory | `frontend` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Production environment variable | `VITE_API_BASE_URL=https://YOUR-BACKEND-PROJECT.vercel.app/api/v1` |

The frontend reads `VITE_API_BASE_URL` at build time. Redeploy the frontend after changing it.

### Project 2 — Backend

| Setting | Value |
|---|---|
| Git repository | `Rakshak1512/myalumni` |
| Root Directory | `backend` |
| Framework | Flask (auto-detect) |
| Python version | `3.12` |
| Flask entrypoint | `run:app` in `backend/pyproject.toml` |
| Requirements | `backend/requirements.txt` |

Set production database, SMTP, CORS, and storage environment variables in the backend Vercel project only. Never put backend secrets in frontend variables.

Useful backend checks after deployment:

- Root status: `https://YOUR-BACKEND-PROJECT.vercel.app/`
- API health: `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1/health`
- Database health: `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1/health/db`

## Local development

Use two terminals.

### 1. Backend

PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
python run.py
```

The Flask API runs at `http://127.0.0.1:5000`. Its API prefix is `/api/v1`.

### 2. Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Vite runs at `http://localhost:5173`. Local API requests default to `http://127.0.0.1:5000/api/v1`.

### 3. Backend tests

From the backend directory with the virtual environment active:

```powershell
pytest
```

## Important production notes

- Set `APP_ENV=production`, `DB_ENGINE=postgres`, and `DATABASE_URL` in the backend Vercel project.
- Set `FRONTEND_URL` and `ALLOWED_ORIGINS` to the exact frontend production origin.
- Set `BACKEND_URL` to the backend project's deployed origin. This is used when the backend creates absolute file URLs.
- Use `STORAGE_PROVIDER=supabase` with backend-only Supabase Storage credentials for production uploads. Serverless local disk is not persistent.
- Set SMTP host, port, username, password, sender address, and TLS variables in the backend Vercel project.
- Use a strong `FLASK_SECRET_KEY`; never use the development placeholder.
- Do not commit `.env`, database files, credentials, or private keys.
- Do not run destructive database resets or migrations against the existing Supabase database.

## Existing features

The application includes role-based access, registration/login, email OTP, password reset, alumni directory, mentorship, direct messaging, opportunities, events, achievements, birthdays, batches, resources, uploads, notifications, and administration. Deployment changes should preserve these features and existing database records.
