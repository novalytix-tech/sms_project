# School Management System (SMS ERP)

Full-stack School Management System ERP: a **React 19 + TypeScript + Vite** frontend and a **Python Flask** REST backend with SQLAlchemy models and Alembic migrations for PostgreSQL.

> **Current state: database disconnected.** The backend runs with `DATABASE_ENABLED=false`. It makes no database connection, endpoints that need the database return `503 DATABASE_UNAVAILABLE`, and login uses the development auth mode described below. Models, migrations and the data dump are kept for the planned move to Google Cloud SQL for PostgreSQL. See [docs/DB_DISCONNECTION_AND_GCP_READINESS.md](docs/DB_DISCONNECTION_AND_GCP_READINESS.md).

---

## 1. Architecture

```
React (Vite, :5173) ──/api proxy──► Flask REST API (:5000) ──► [database disabled]
   localStorage data store                │                        (future: Cloud SQL)
                                          └─ dev auth: dev_auth_accounts.json (Argon2id)
```

```
School-Management-Services/
├── frontend/                         # React 19 + TypeScript + React Router 7 + Vite
│   ├── src/
│   │   ├── components/               # Domain and shared UI components
│   │   ├── context/                  # ERPContext state provider & role switcher
│   │   ├── pages/                    # ERP domain pages & role dashboards
│   │   ├── services/
│   │   │   ├── api/httpClient.ts     # HTTP client with Bearer JWT & refresh
│   │   │   ├── storage.ts            # localStorage store with backend sync calls
│   │   │   └── *Service.ts           # Client domain services
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts                # Proxies /api to http://127.0.0.1:5000
│
├── backend/                          # Python 3.12 Flask REST API
│   ├── app/
│   │   ├── api/v1/                   # 71 route/method pairs across 16 blueprints
│   │   ├── models/                   # SQLAlchemy 2.0 models (preserved)
│   │   ├── services/                 # auth_service (DB), dev_auth_service (no DB), email
│   │   ├── utils/                    # Argon2id, RBAC decorators, tenant resolution, errors
│   │   ├── extensions.py             # Guarded SQLAlchemy, Migrate, JWT, CORS, Limiter, SocketIO
│   │   └── config.py                 # Environment-driven configuration
│   ├── migrations/                   # Alembic (revision 7b6c7bd1c318, preserved)
│   ├── backups/                      # pg_dump of the former local database (git-ignored)
│   ├── db_config_archive/            # Inactive record of the old local DB settings
│   ├── scripts/create_dev_auth_accounts.py
│   ├── dev_auth_accounts.example.json
│   ├── tests/
│   ├── seed.py                       # Database seeder (needs a database)
│   ├── wsgi.py
│   └── requirements.txt
│
└── docs/
    ├── DB_DISCONNECTION_AND_GCP_READINESS.md
    └── archive/                      # Earlier audit/QA reports (historical, describe the old local DB)
```

---

## 2. Configuration (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_ENABLED` | `false` | `false`: no engine, no connection, DB endpoints return 503. `true`: requires `DATABASE_URL`. |
| `DATABASE_URL` | none | SQLAlchemy URL, used only when `DATABASE_ENABLED=true`. There is no built-in fallback. |
| `TEST_DATABASE_URL` | none | URL for the `testing` config when `DATABASE_ENABLED=true`. |
| `DEV_AUTH_ENABLED` | `false` | Database-free login from `dev_auth_accounts.json`. Ignored when the DB is enabled; startup fails if set with `FLASK_ENV=production`. |
| `DEV_AUTH_ACCOUNTS_FILE` | `backend/dev_auth_accounts.json` | Path to the dev accounts file. |

See `backend/.env.example` for a full template, including Cloud SQL URL formats.

---

## 3. How to run

### Backend (Flask, port 5000)
```bash
cd backend
pip install -r requirements.txt
python scripts/create_dev_auth_accounts.py   # first time only: set dev login passwords
python wsgi.py
curl http://localhost:5000/api/v1/health     # database.status = "disabled"
```

### Frontend (Vite, port 5173)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` to Flask.

### Both together
Run the two commands above in two terminals. On Windows PowerShell, from the project root:
```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','cd backend; python wsgi.py'
Start-Process powershell -ArgumentList '-NoExit','-Command','cd frontend; npm run dev'
```

---

## 4. Logging in while the database is disconnected

1. `backend/.env` must contain `DATABASE_ENABLED=false` and `DEV_AUTH_ENABLED=true`.
2. Create `backend/dev_auth_accounts.json` with `python scripts/create_dev_auth_accounts.py`. It prompts for a password for each account and stores only Argon2id hashes. The file is git-ignored.
3. On the login page, click a role card and sign in with that account's email and the password you set. The role cards pre-fill the demo passwords; if you used those same passwords when creating the file, you can submit directly.

Dev accounts: `superadmin@sms.edu.in` (super_admin), `principal@stxaviers.edu.in` (school_admin), `ananya.sharma@stxaviers.edu.in` (teacher), `vikram.patel@gmail.com` (parent), `aarav.sharma@student.stxaviers.edu.in` (student), `orders@apexsupplies.in` (supplier).

What works in dev auth mode: login, refresh-token rotation with reuse detection, logout, logout-all, `GET /auth/me`, and role/permission checks on JWT claims. What returns 503: profile update, change/forgot/reset password, and every endpoint that reads or writes ERP data. Revocations are held in memory and reset when the server restarts.

---

## 5. Tests

```bash
cd backend && python -m pytest tests -q -rs
cd frontend && npm run test && npm run build && npm run lint
```

With the database disabled, `tests/test_database_disconnected.py` runs and the database-backed suites are skipped with the reason `BLOCKED BY DATABASE DISCONNECTION`. To run them, set `DATABASE_ENABLED=true` and `TEST_DATABASE_URL` to a disposable test database.
