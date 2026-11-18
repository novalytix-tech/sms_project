# Local PostgreSQL Setup (Windows 11)

Written for: developers running this School ERP backend against a **local PostgreSQL 18** instance on Windows.

This backend is **Flask + SQLAlchemy 2.1 + Alembic (Flask-Migrate) + psycopg2**. The schema is defined by the SQLAlchemy models in `app/models/` and the Alembic migrations in `migrations/`. The canonical schema reference is [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — do not hand-edit tables; change models + generate a migration instead.

> The project can run against either a local PostgreSQL or a cloud PostgreSQL (e.g. Neon). Everything is driven by one env var, `DATABASE_URL`. Nothing in the code is hard-wired to a host.

---

## 0. Prerequisites — verify the PostgreSQL install first

PostgreSQL 18 is expected at `C:\Program Files\PostgreSQL\18`.

**Known issue on this machine (2026-11-16):** the install was found **incomplete** — the `lib\` directory (server DLLs such as `dict_snowball`) was missing, so `initdb` and the server could not start. If you hit
`FATAL: could not access file "dict_snowball"`, the install is broken and must be reinstalled.

### Reinstall / repair (needs Administrator)

Open **PowerShell as Administrator** and run:

```powershell
winget install -e --id PostgreSQL.PostgreSQL.18
```

In the EDB installer:
- **Password** for the `postgres` superuser — choose one and remember it.
- **Port** — `5432` (default) or `5433`. This project's original config used `5433`; either is fine, just match it in `.env`.
- **Locale** — default.

This installs a complete server **and** registers a Windows service that auto-starts (`postgresql-x64-18`) with an initialized data cluster — so you do **not** need to run `initdb` yourself.

Verify:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
Get-Service postgresql*          # should show Running
```

---

## 1. Create the application database

Use the bundled `psql` (adjust port if you chose 5433). It will prompt for the `postgres` password.

```powershell
$env:PGPASSWORD = "<your postgres password>"
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -p 5432 -U postgres school_erp
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -p 5432 -U postgres school_erp_test   # optional, for tests
Remove-Item Env:\PGPASSWORD
```

`school_erp` is the database name the project has always used (see `db_config_archive/LOCAL_POSTGRES_CONFIG.md`). Keep it.

---

## 2. Configure `backend/.env`

Set these (keep `.env` out of git — it already is):

```
DATABASE_ENABLED=true
DEV_AUTH_ENABLED=false
DATABASE_URL=postgresql+psycopg2://postgres:<your password>@localhost:5432/school_erp
# TEST_DATABASE_URL=postgresql+psycopg2://postgres:<your password>@localhost:5432/school_erp_test
```

Notes:
- The `+psycopg2` is **required** — SQLAlchemy 2.1 otherwise defaults to the `psycopg` (v3) driver, which is not installed, and you get `ModuleNotFoundError: No module named 'psycopg'`.
- Never hard-code the password anywhere but `.env`.

---

## 3. Install Python dependencies (one time)

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## 4. Run migrations (creates the schema — non-destructive)

```powershell
cd backend
$env:FLASK_APP = "wsgi.py"
.\.venv\Scripts\python.exe -m flask db upgrade
```

This applies every Alembic revision in `migrations/versions/` and builds all ~90 tables exactly as the models define them. It never drops existing data.

If you later change a model, generate a new migration and review it before applying:
```powershell
.\.venv\Scripts\python.exe -m flask db migrate -m "describe the change"
.\.venv\Scripts\python.exe -m flask db upgrade
```
Then update [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) to match.

---

## 5. Seed demo data (optional)

```powershell
cd backend
.\.venv\Scripts\python.exe seed.py
```

Creates roles, one institution, principal/superadmin/teachers, and 30 students. Seed logins:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@sms.edu.in` | `SuperAdmin#2026!` |
| Principal | `principal@stxaviers.edu.in` | `Principal#2026!` |
| Teacher | `ananya.sharma@stxaviers.edu.in` | `Teacher#Ananya26!` |

---

## 6. Start the backend & verify the connection

```powershell
cd backend
.\.venv\Scripts\python.exe wsgi.py
```

Health check (new terminal):
```powershell
curl http://localhost:5000/api/v1/system/health
```
Expect `database.status: connected` and `engine: PostgreSQL`.

Quick data check:
```powershell
curl http://localhost:5000/api/v1/admissions/inquiries   # 200 + JSON
```

Data persists across backend restarts because it lives in PostgreSQL, not in memory.

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `could not access file "dict_snowball"` | Broken PG install (missing `lib\`). Reinstall — see section 0. |
| `No module named 'psycopg'` | `DATABASE_URL` missing `+psycopg2`. Use `postgresql+psycopg2://…`. |
| `could not translate host name` | Only happens with a **cloud** host + flaky DNS. Not applicable to `localhost`. |
| `password authentication failed for user "postgres"` | Wrong password in `.env`, or `pg_hba.conf` not allowing scram. Re-check the password you set at install. |
| `could not connect to server: Connection refused` | PostgreSQL service not running. `Get-Service postgresql*` → `Start-Service postgresql-x64-18`. |
| `database "school_erp" does not exist` | Run the `createdb` step in section 1. |
| `503 DATABASE_UNAVAILABLE` from the API | `DATABASE_ENABLED` is not `true` in `.env`, or the backend was started before `.env` was saved — restart it. |

---

## 8. Switching between local and cloud

Only `DATABASE_URL` changes. To go back to the cloud (Neon) instance, point `DATABASE_URL` at the cloud connection string (keep `+psycopg2`). See [`GCP_POSTGRES_MIGRATION.md`](GCP_POSTGRES_MIGRATION.md) for the future managed-Postgres path. No code changes are needed.
