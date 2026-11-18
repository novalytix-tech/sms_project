# Future: Google Cloud SQL (PostgreSQL) Migration

Written for: whoever later moves this backend from local / Neon PostgreSQL to **Google Cloud SQL for PostgreSQL**.

> **This is a future plan, not a current task.** No GCP instance, billing, or deployment is set up by this document. The app is already architected so that switching databases is a **config change, not a code change**.

---

## 1. Why this is already easy

The backend reads its database target from a single environment variable:

```python
# app/config.py
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") if DATABASE_ENABLED else None
```

Everything else — models, migrations, connection pooling, SSL — is driver-level and PostgreSQL-standard. The same `app/models/` and `migrations/` run unchanged against local PostgreSQL, Neon, or Cloud SQL. The target is set by `DATABASE_URL`:

| Environment | `DATABASE_URL` |
|---|---|
| Local | `postgresql+psycopg2://postgres:PASS@localhost:5432/school_erp` |
| Neon (cloud) | `postgresql+psycopg2://USER:PASS@EP-HOST.neon.tech/neondb?sslmode=require` |
| Cloud SQL (public IP / Auth Proxy) | `postgresql+psycopg2://USER:PASS@127.0.0.1:5432/school_erp?sslmode=require` |
| Cloud SQL (Unix socket on Cloud Run) | `postgresql+psycopg2://USER:PASS@/school_erp?host=/cloudsql/PROJECT:REGION:INSTANCE` |

Always keep the `+psycopg2` driver prefix (SQLAlchemy 2.1 otherwise defaults to the uninstalled `psycopg` v3).

---

## 2. One-time GCP setup (when the time comes)

1. **Create the instance** — Cloud SQL → PostgreSQL 18, chosen region, machine size.
2. **Create a database** named `school_erp` and an application **user** (not the default `postgres`).
3. **Networking** — pick one:
   - **Cloud SQL Auth Proxy** (recommended for dev/CI): run the proxy locally, connect to `127.0.0.1:5432`.
   - **Private IP** (recommended for Cloud Run / GKE in the same VPC).
   - Public IP + authorized networks (simplest, least preferred).
4. **SSL/TLS** — enforce SSL; append `?sslmode=require` to `DATABASE_URL`. For stronger verification use `verify-ca`/`verify-full` with the server CA.

---

## 3. Moving the schema and data

Schema and data move with standard PostgreSQL tooling — no project-specific steps.

**Schema (fresh instance):**
```bash
export FLASK_APP=wsgi.py
# DATABASE_URL pointed at Cloud SQL
python -m flask db upgrade        # builds all tables from migrations
```

**Data (if migrating existing records):**
```bash
# dump from the current source (local or Neon)
pg_dump "postgresql://USER:PASS@SOURCE_HOST/school_erp" -Fc -f school_erp.dump
# restore into Cloud SQL
pg_restore --no-owner --dbname "postgresql://USER:PASS@127.0.0.1:5432/school_erp" school_erp.dump
```
A pre-existing plain-SQL dump is kept at `backend/backups/` and can seed the first load.

---

## 4. Secrets management (do NOT put the prod URL in `.env`)

- Store `DATABASE_URL` and DB credentials in **Google Secret Manager**.
- Inject them as environment variables at deploy time (Cloud Run / GKE), not committed anywhere.
- Rotate the DB password via Secret Manager; the app picks it up on redeploy.

---

## 5. Connection pooling

`app/config.py` already defines pool options suited to a managed DB:
`pool_pre_ping=True`, `pool_recycle=300`, `pool_size=10`, `max_overflow=20`.

- With **Cloud Run** (many short-lived instances), keep `pool_size` small and rely on Cloud SQL's connection limits; consider the Cloud SQL Auth Proxy sidecar.
- With a long-running VM/GKE pod, the current pool sizes are reasonable.

---

## 6. Production config checklist

- `FLASK_ENV=production` (uses `ProductionConfig`: secure cookies, strict SameSite).
- Strong, unique `SECRET_KEY` and `JWT_SECRET_KEY` (≥ 32 bytes) from Secret Manager — the dev defaults trigger a short-key warning and must not ship.
- `DATABASE_ENABLED=true`, `DEV_AUTH_ENABLED=false` (dev auth is refused in production by `_validate_runtime_modes`).
- A real WSGI server (gunicorn/uvicorn workers) — not the Flask dev server.
- `sslmode=require` (or stricter) on `DATABASE_URL`.

---

## 7. What does NOT change

- SQLAlchemy models (`app/models/`)
- Alembic migrations (`migrations/`)
- The schema reference ([`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md))
- Application/business logic and API routes
- The `psycopg2` driver

Target architecture:

```
LOCAL / DEV:   Local PostgreSQL  ─► Flask backend ─► React frontend
FUTURE PROD:   Cloud SQL (PG)    ─► Flask backend ─► React frontend
```

Only `DATABASE_URL` (and secrets handling) differs between them.
