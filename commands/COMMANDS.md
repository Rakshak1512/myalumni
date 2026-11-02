# MyAlumni 2.0 — Terminal Commands Manual

Run these exact commands in your terminal to install dependencies, run the backend and frontend, and seed the SQLite database.

---

## 🔑 Pre-Seeded Test User Credentials

All test users are pre-seeded in the local SQLite database (`backend/myalumni.db`).

| Role | Email Address | Password | 1-Click Instant Demo |
|---|---|---|---|
| **🛡️ Admin** | `admin@myalumni.edu` (or `admin.demo@myalumni.test`) | `Password123!` | Click "🛡️ Admin Demo" on Login page |
| **🎓 Faculty** | `faculty@myalumni.edu` (or `faculty.demo@myalumni.test`) | `Password123!` | Click "🎓 Faculty Demo" on Login page |
| **👨‍🎓 Student** | `student@myalumni.edu` (or `student.demo@myalumni.test`) | `Password123!` | Click "👨‍🎓 Student Demo" on Login page |
| **💼 Alumni** | `alumni@myalumni.edu` (or `alumni.demo@myalumni.test`) | `Password123!` | Click "💼 Alumni Demo" on Login page |

---

## 1. Install Dependencies

### Install Backend Requirements (Python):
```powershell
cd backend
pip install -r requirements.txt
```

### Install Frontend Requirements (Node.js):
```powershell
cd frontend
npm install
```

---

## 2. Seed SQLite Database with Test Users & Sample Data

*(The database auto-seeds on first backend run, but you can also re-seed it anytime manually):*

```powershell
cd backend
python app/seed.py
```

---

## 3. Run Backend Only

Start the Flask REST API on `http://127.0.0.1:5000`:

```powershell
cd backend
python run.py
```

---

## 4. Run Frontend Only

Start the Vite development server on `http://localhost:5173`:

```powershell
cd frontend
npm run dev
```

---

## 5. Run Backend & Frontend Together (PowerShell)

Launch both servers simultaneously in two dedicated terminal windows:

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; python run.py"; Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"
```

---

## 6. Run Automated Tests

### Run Backend Pytest Suite:
```powershell
cd backend
pytest -v
```

### Build Frontend for Production:
```powershell
cd frontend
npm run build
```

---

## 7. Cloudflare Tunnel (Optional Remote Access)

To expose your local application to the internet via Cloudflare Tunnel:

### Expose Frontend:
```powershell
cloudflared tunnel --url http://localhost:5173
```

### Expose Backend API:
```powershell
cloudflared tunnel --url http://127.0.0.1:5000
```
