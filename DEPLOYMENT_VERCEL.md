# MyAlumni — Two Separate Vercel Projects

This repository must be imported into Vercel twice. Both projects connect to the same GitHub repository, but each project deploys from a different root directory and receives its own URL.

## 1. Create the backend project first

In Vercel:

1. Select **Add New → Project**.
2. Import `Rakshak1512/myalumni`.
3. Set **Project Name** to `myalumni-backend`.
4. Expand **Root Directory** and select `backend`.
5. Use the Flask/Python framework detection. Do not set the root directory to `./`.
6. Confirm Python version `3.12`.
7. Keep the Flask entrypoint defined by `backend/pyproject.toml`: `run:app`.
8. Deploy after setting the backend environment variables below.

The backend project uses `backend/requirements.txt`. Development test dependencies are kept separately in `backend/requirements-dev.txt`.

### Backend Vercel environment variables

Set these under the backend project's **Settings → Environment Variables**. Add real values in the Vercel dashboard; do not commit them.

| Variable | Production value |
|---|---|
| `APP_ENV` | `production` |
| `FLASK_DEBUG` | `0` |
| `FLASK_SECRET_KEY` | A strong, randomly generated secret |
| `DB_ENGINE` | `postgres` |
| `DATABASE_URL` | Existing Supabase PostgreSQL connection string (include SSL mode as required) |
| `BACKEND_URL` | Backend project's deployed origin, e.g. `https://YOUR-BACKEND-PROJECT.vercel.app` |
| `FRONTEND_URL` | Frontend project's production origin, e.g. `https://YOUR-FRONTEND-PROJECT.vercel.app` |
| `ALLOWED_ORIGINS` | Exact frontend origin; add any explicitly needed preview origins as comma-separated origins |
| `SMTP_HOST` | Your SMTP host |
| `SMTP_PORT` | Usually `587` for STARTTLS, depending on provider |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password/app password |
| `SMTP_FROM_EMAIL` | Verified sender address |
| `SMTP_FROM_NAME` | `MyAlumni` |
| `SMTP_USE_TLS` | `true` |
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL` | Supabase project URL (for Storage) |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key — backend only |
| `SUPABASE_PUBLIC_BUCKET` | Existing public bucket name |
| `SUPABASE_PRIVATE_BUCKET` | Existing private bucket name |
| `UPLOAD_MAX_SIZE_MB` | `10` |

Also preserve the existing OTP settings if customized: `OTP_LENGTH`, `OTP_EXPIRY_MINUTES`, and `OTP_MAX_ATTEMPTS`.

Important:
- `DATABASE_URL` is the PostgreSQL database connection. `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are used by the file-storage adapter; do not confuse them.
- Confirm the two Storage buckets exist and that their policies match the app's intended public/private access. Do not create, empty, or replace buckets without reviewing existing files.
- Do not use local filesystem storage on a Vercel serverless deployment. Function-local files are not persistent.
- The `BACKEND_URL` and `FRONTEND_URL` above are placeholders until Vercel assigns the real domains.

### Check backend after deployment

Once deployed, copy the real backend production URL from Vercel and test:

- `https://YOUR-BACKEND-PROJECT.vercel.app/` — basic service status
- `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1/health` — Flask health endpoint
- `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1/health/db` — database connectivity

The API routes remain under `/api/v1`.

## 2. Create the frontend project

1. Return to Vercel **Add New → Project**.
2. Import the same repository `Rakshak1512/myalumni` again. Do not fork or duplicate the GitHub repository.
3. Set **Project Name** to `myalumni-frontend`.
4. Set **Root Directory** to `frontend`.
5. Select/confirm **Vite**.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.
8. Add the frontend environment variables before deployment.

### Frontend Vercel environment variables

| Variable | Value |
|---|---|
| `VITE_APP_NAME` | `MyAlumni` |
| `VITE_API_BASE_URL` | `https://YOUR-BACKEND-PROJECT.vercel.app/api/v1` |

The frontend API client can also accept the backend origin without the suffix and append `/api/v1`, but using the full URL above is clearer.

Vite embeds `VITE_*` variables at build time. After adding or changing `VITE_API_BASE_URL`, redeploy the frontend.

Never add `DATABASE_URL`, SMTP credentials, `FLASK_SECRET_KEY`, or `SUPABASE_SERVICE_KEY` to the frontend project.

## 3. Finish CORS and URL configuration

After both projects have production domains:

1. In the backend Vercel project, set `FRONTEND_URL` to the exact frontend origin, with no trailing slash.
2. Set `ALLOWED_ORIGINS` to that same exact origin. Add only additional trusted frontend preview origins if needed.
3. Set `BACKEND_URL` to the exact backend origin, with no trailing slash.
4. In the frontend Vercel project, set `VITE_API_BASE_URL` to the backend origin followed by `/api/v1`.
5. Redeploy the backend after changing backend environment variables.
6. Redeploy the frontend after changing frontend environment variables.

Example only (replace both names with the real project domains):

```text
Frontend: https://myalumni-frontend.vercel.app
Backend:  https://myalumni-backend.vercel.app

Frontend Vercel variable:
VITE_API_BASE_URL=https://myalumni-backend.vercel.app/api/v1

Backend Vercel variables:
FRONTEND_URL=https://myalumni-frontend.vercel.app
BACKEND_URL=https://myalumni-backend.vercel.app
ALLOWED_ORIGINS=https://myalumni-frontend.vercel.app
```

## 4. Validate application features

After both deployments are successful:

1. Open the backend `/api/v1/health` endpoint.
2. Open the backend `/api/v1/health/db` endpoint.
3. Sign in on the frontend.
4. Check the alumni directory.
5. Check conversations and messages.
6. Test registration and forgot-password email OTP.
7. Test avatar and file uploads/downloads.
8. Check backend Runtime Logs for errors and frontend browser DevTools → Network for failed requests.

If a feature returns HTTP 500, use the backend Runtime Logs for that exact request. A successful build does not prove that SMTP, database queries, permissions, or storage operations work.

## 5. Git and redeployment behavior

Both Vercel projects can be connected to the same `main` branch. A push can trigger a deployment in both projects. In each project, configure the Root Directory as described above. If desired, use project-specific Ignored Build Steps later to avoid building a project when only the other app changes.

Do not deploy from the repository root for either project.
