# MyAlumni 2.0 — Smart Alumni & Student Career Networking Portal

**MyAlumni 2.0** is an enterprise-grade full-stack networking platform connecting university students, verified alumni, academic faculty, and administrators.

Built with **Vanilla JavaScript (ES Modules)**, **Vite**, **Python (Flask REST API)**, **Dual-Engine Relational Database (SQLite / Supabase PostgreSQL)**, and **Native JWT + SMTP OTP Authentication**.

---

## 🌟 Key Capabilities

- **Strict Role-Based Access Control (RBAC)**: Exactly 4 discrete roles (**Student**, **Alumni**, **Faculty**, and **Admin**) enforced server-side via Python decorators.
- **Dual-Engine Database Architecture**:
  - **Local Development**: 100% offline relational SQLite (`backend/myalumni.db`).
  - **Cloud & Production**: Cloud Supabase PostgreSQL via connection pooling and auto-schema synchronization.
- **Secure 6-Digit OTP Authentication**:
  - Two-step user registration: accounts are only committed to the database **after** OTP verification.
  - Zero plain text OTPs stored (secure SHA-256 with salt).
  - Test user OTP login flow and self-service password reset.
- **Direct Human-to-Human Messaging**: Authentic, persistent peer communication.
- **Alumni Directory & Mentorship Network**: Search alumni by name, employer, technical skills, graduation year, and mentoring availability. Structured 1-on-1 career mentorship workflow.
- **Jobs, Internships & Private Application Tracker**: Curated opportunities with private status tracking (*Interested, Applied, Interviewing, Offered, Not Selected*).
- **Academic Resources & Notices**: Departmental study archives, previous examination question papers, and prioritized announcements.
- **Birthday Celebrations Corner**: Community greetings with strict privacy guarantees (birth years are never publicized).
- **Alumni Success Showcase**: Moderated promotions, placements, awards, and milestones.
- **Events & Class Reunions**: Webinar schedules, reunion planning, attendee tracking, and capacity management.
- **Class Batch Communities**: Cohort discussion forums and reunion planning.
- **Student Career Growth Tracker**: Milestone targets with automatic percentage progress calculation.
- **Deterministic Rule-Based Career Guide**: Curated technical roadmaps for Software Engineering, Data Science, DevOps, and Cybersecurity.
- **Administrative Governance & Audit Trail**: Immutable logging of privilege escalations, suspensions, and ticket resolution.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6 Modules), Vite, Nexus Glassmorphism UI |
| **Backend** | Python 3.10+, Flask REST API, Flask Blueprints, PyJWT, psycopg |
| **Database** | Relational SQLite (Local) / Supabase PostgreSQL (Production) |
| **Authentication** | Native Signed JWTs + SMTP 6-Digit One-Time Passcodes (OTP) |
| **Deployment** | Vercel Serverless Architecture (`api/index.py` + Vite Static Build) |

---

## 📁 Repository Structure

```text
myalumni/
├── api/
│   ├── index.py                  # Vercel Python serverless function entrypoint
│   └── requirements.txt          # Serverless Python runtime dependencies
├── backend/
│   ├── app/
│   │   ├── auth/                 # JWT utils & RBAC decorators
│   │   ├── repositories/         # Dual-engine data access layers
│   │   ├── routes/               # Modular Flask blueprints (/api/v1/*)
│   │   ├── services/             # OTP staging & SMTP email delivery
│   │   ├── config.py             # Environment configuration
│   │   └── db.py                 # SQLite & Supabase PostgreSQL adapter
│   ├── tests/                    # Pytest test suite (108 tests)
│   ├── requirements.txt          # Python requirements
│   └── run.py                    # Local Flask development runner
├── frontend/
│   ├── src/                      # Vanilla JS components, pages, nexus UI
│   ├── index.html                # Single Page Application root
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Vite configuration
├── docs/                         # Architecture documentation & API references
├── requirements.txt              # Root Python dependencies for Vercel
├── vercel.json                   # Vercel full-stack routing & build config
└── .gitignore                    # Security-first ignore rules (0 secrets)
```

---

## 🚀 Deployment on Vercel

This repository is configured for full-stack deployment on Vercel out of the box using `vercel.json` and `api/index.py`.

### 1. Connect Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New -> Project**.
3. Import your repository: `Rakshak1512/myalumni`.
4. Keep the **Root Directory** as `./`.

### 2. Configure Environment Variables in Vercel
In your Vercel Project Settings $\to$ **Environment Variables**, configure:

| Variable | Value / Description | Example |
|---|---|---|
| `APP_ENV` | `production` | `production` |
| `DB_ENGINE` | `supabase` (or `postgres`) | `supabase` |
| `DATABASE_URL` | Your Supabase PostgreSQL connection string | `postgresql://postgres.[id]:[pass]@[host]:6543/postgres` |
| `FLASK_SECRET_KEY` | Strong random secret key | `your-secure-production-secret-key` |
| `SMTP_HOST` | Outbound mail host | `smtp.gmail.com` |
| `SMTP_PORT` | Outbound mail port | `587` |
| `SMTP_USERNAME` | Outbound mail user | `your-email@gmail.com` |
| `SMTP_PASSWORD` | 16-character App Password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM_EMAIL` | Sender email | `your-email@gmail.com` |
| `SMTP_FROM_NAME` | Sender display name | `MyAlumni` |
| `SMTP_USE_TLS` | `true` | `true` |

### 3. Deploy
Click **Deploy**. Vercel will:
1. Build the Vite frontend to `frontend/dist`.
2. Bundle the Flask backend into an `@vercel/python` serverless function.
3. Automatically route all `/api/*` requests to the Flask API and all other routes to the single-page application.

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your SMTP credentials and local settings
python run.py
```
Backend runs at: `http://127.0.0.1:5000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

### 3. Run Backend Test Suite
```bash
cd backend
pytest
```
All 108 tests run against in-memory SQLite and pass without external dependencies.
