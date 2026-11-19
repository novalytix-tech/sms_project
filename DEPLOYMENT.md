# Deployment — Supabase + Render + Vercel + Clerk

Deploy in this order: Clerk → Supabase → Render (backend) → Vercel (frontend) → back to Clerk/Render for final URLs.

## 0. Before anything: rotate leaked secrets

The original repository contained demo passwords in frontend code and a seed file (e.g. `Principal#2026!`,
`SchoolERP@Demo2026!`). If any of these were ever used on a real system, treat them as public. Password-based
login no longer exists in this code, but change those passwords anywhere else they were reused, and rotate any
database password or API key that was ever committed or shared.

## 1. Clerk

1. Create an application at clerk.com. Use a **production instance** for the live site (requires your domain).
2. **User & authentication → Restrictions → Sign-up mode: Restricted.** Only invited users can join; the backend
   sends invitations when an admin creates an account.
3. Enable email + password (and passkeys/MFA if you want). Email verification must be on (the backend links
   accounts by *verified* email only).
4. Copy **Publishable key** (`pk_live_…`, frontend) and **Secret key** (`sk_live_…`, backend only).
5. After Vercel is deployed, add the frontend domain under **Domains / Allowed origins**.
6. Invitation emails link to `FRONTEND_URL/sign-up`. `FRONTEND_URL` on Render **must be the public Vercel URL**;
   if it is `http://localhost:5173`, invited people get "site can't be reached" on their own phone/computer.

## 2. Supabase (database)

1. Create a project; save the database password in a password manager.
2. **Project Settings → Database → Connection string → Session pooler.** Use that URI (port 5432) with
   `?sslmode=require` appended. Render does not support IPv6, which the "direct" connection needs.
3. Do **not** put the Supabase anon or service_role key in the frontend. This app never talks to Supabase from the browser.
4. Migrations (run by Render on every deploy) create the schema and enable Row Level Security on every table,
   so Supabase's auto-generated Data API exposes nothing.
5. Turn on backups / PITR for production.
6. Do **not** run `seed.py` against production (it refuses when `FLASK_ENV=production`). Create the first school and
   its first admin with SQL in the Supabase SQL editor, then do everything else from the app:

```sql
INSERT INTO institutions (id, code, name, email, board_affiliation, country, currency, status, is_deleted, created_at, updated_at)
VALUES (gen_random_uuid(), 'YOURCODE', 'Your School Name', 'office@yourschool.in', 'CBSE', 'India', 'INR', 'ACTIVE', false, now(), now());

-- roles must exist; run once if the roles table is empty
INSERT INTO roles (id, name, description, is_system_role, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r, r, true, false, now(), now()
FROM unnest(ARRAY['super_admin','school_admin','teacher','student','parent','supplier']) AS r
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, institution_id, username, email, first_name, last_name, is_active, is_verified, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), id, 'admin', 'you@yourschool.in', 'First', 'Last', true, false, false, now(), now()
FROM institutions WHERE code = 'YOURCODE';

INSERT INTO user_roles (id, user_id, role_id, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), u.id, r.id, false, now(), now()
FROM users u, roles r WHERE u.email = 'you@yourschool.in' AND r.name = 'school_admin';
```

Then invite `you@yourschool.in` from the Clerk dashboard (Users → Invite) and sign in.

## 3. Render (backend)

1. New → **Blueprint**, select the repository (uses `render.yaml`), or create a Web Service with root `backend`.
2. Environment variables:

| Variable | Value |
|----------|-------|
| `FLASK_ENV` | `production` |
| `DATABASE_URL` | Supabase session-pooler URI with `?sslmode=require` |
| `CLERK_SECRET_KEY` | `sk_live_…` |
| `CLERK_AUTHORIZED_PARTIES` | `https://your-app.vercel.app` (comma-separate custom domains) |
| `CORS_ALLOWED_ORIGINS` | same as above |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `REDIS_URL` | optional; recommended if you run more than one instance (shared rate limits) |

3. Start command (already in `render.yaml`): runs `flask db upgrade`, then gunicorn. Health check: `/api/v1/health`.
4. The app refuses to start if a required variable is missing, so check the Render logs after the first deploy.

## 4. Vercel (frontend)

1. Import the repository; **Root Directory: `frontend`** (Vite is detected; `vercel.json` adds SPA rewrites and security headers).
2. Environment variables (these are public by design; never add secrets here):

| Variable | Value |
|----------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
| `VITE_API_URL` | `https://<render-service>.onrender.com/api/v1` |
| `VITE_PUBLIC_INSTITUTION_CODE` | your school code (used by the public admission enquiry form) |

3. Deploy, then put the final Vercel URL into Render's `CLERK_AUTHORIZED_PARTIES`, `CORS_ALLOWED_ORIGINS`,
   `FRONTEND_URL`, and into Clerk's allowed origins. Redeploy the backend.

## 5. Go-live checklist

- [ ] `https://<render>/api/v1/health` → `{"status":"healthy"}`
- [ ] `https://<render>/api/v1/students` without login → 401
- [ ] Sign in on the Vercel URL with the invited admin; dashboard loads
- [ ] Create a teacher account → invitation email arrives → teacher can sign in and cannot open Account Management
- [ ] View page source / DevTools Sources: no `.map` files, no keys other than `pk_live_…`
- [ ] Clerk sign-up mode is **Restricted**
- [ ] Supabase backups enabled
- [ ] Demo-only modules (see AUDIT.md §3) are not used for real records until migrated to the API

## Rollback

- Render and Vercel: redeploy the previous successful deploy from their dashboards.
- Database: migrations are additive except `a1c9e0f2b7d4` (drops the old password/JWT tables). Take a Supabase
  backup before the first production deploy; restore it if you need to go back to the old code.
