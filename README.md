# School Management System (SMS)

| Layer    | Tech                                | Local                    | Production |
|----------|-------------------------------------|--------------------------|------------|
| Frontend | React 19 + Vite + TypeScript        | http://localhost:5173    | Vercel     |
| Backend  | Flask 3 + SQLAlchemy + Alembic      | http://localhost:5000    | Render     |
| Database | PostgreSQL                          | Docker / local Postgres  | Supabase   |
| Auth     | Clerk (no passwords stored by us)   | Clerk development instance | Clerk production instance |

- [AUDIT.md](AUDIT.md): what is production-ready, what is still demo-only, and what was removed.
- [DEPLOYMENT.md](DEPLOYMENT.md): step-by-step Supabase, Render, Vercel and Clerk setup.

## How authentication works

1. A school admin creates an account in **Account Management** (name, email, role).
2. The backend stores the account and asks Clerk to email that person an invitation.
3. The person sets their own password/passkey (and MFA if enabled) with Clerk.
4. On their first sign-in, the backend links the Clerk user to the school account by
   verified email. Roles and school (tenant) always come from **our** database.
5. Every API call carries a short-lived Clerk session token, which the backend verifies.
   All routes require it except `GET /api/v1/health` and `POST /api/v1/admissions/inquiries`.

## Giving people access (many users)

- **User Accounts & Auth → Bulk Invite (CSV)**: download the template, fill one row per person
  (`first_name, last_name, email, role, phone, admission_number, child_admission_numbers, relationship`),
  upload. Everyone gets an invitation email and sets their own password.
- **Parents**: put their children's admission numbers (separated by `;`). Parents only ever see linked
  children; links can be changed later with the **Children** button on the parent's row.
- **Students**: optional (usually only senior classes). Give the admission number so the login attaches to
  the existing student record.
- Nobody's password is known to the school. "Forgot password" on the sign-in page is handled by Clerk.

## Run locally

Prerequisites: Python 3.12, Node 20+, PostgreSQL (Docker or a local install), and a free
Clerk account with an application created (Clerk dashboard → API keys).

### 1. Database

```bash
docker compose up -d
```

(Without Docker, create a database `sms` on any local Postgres and point `DATABASE_URL` at it.)

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

Edit `backend/.env`: set `CLERK_SECRET_KEY` and set `SEED_ADMIN_EMAIL` to the email you will
sign in to Clerk with (that email becomes the seeded principal / school_admin).

```bash
flask --app wsgi db upgrade
python seed.py
python wsgi.py
```

### 3. Frontend

```bash
cd frontend
npm ci
copy .env.example .env.local    # macOS/Linux: cp .env.example .env.local
```

Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local`, then:

```bash
npm run dev
```

Open http://localhost:5173 and sign in with the `SEED_ADMIN_EMAIL` address.

### 4. Tests

```bash
cd backend && set TEST_DATABASE_URL=postgresql://sms:sms_local_dev@127.0.0.1:5434/sms_test && pytest -q
cd frontend && npm test
```

`TEST_DATABASE_URL` must point at a disposable database: the tests drop and recreate all tables.
