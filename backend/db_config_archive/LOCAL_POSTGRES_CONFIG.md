# Archived local PostgreSQL configuration (inactive)

Recorded on 2026-11-03 when the backend was disconnected from the local database.
Nothing in the application reads this file. The password is deliberately not stored here.

| Setting | Previous value |
|---|---|
| Driver | `psycopg2` (`psycopg2-binary` in requirements.txt) |
| Host / port | `localhost:5433` (PostgreSQL 18) |
| Database | `school_erp` (dev), `school_erp_test` (tests) |
| User | `postgres` |
| Password | *redacted, held by the project owner* |
| Previous source | `backend/.env` `DATABASE_URL` / `TEST_DATABASE_URL`, plus hardcoded fallbacks in `app/config.py` (both removed) |
| Engine options | `pool_pre_ping=True`, `pool_recycle=300`, `pool_size=10`, `max_overflow=20` (still in `app/config.py`) |

Preserved and still usable for the Cloud SQL migration:

- Models: `backend/app/models/`
- Alembic: `backend/migrations/` (single revision `7b6c7bd1c318_initial_schema_all_models`)
- Data dump: `backend/backups/school_erp_pre_cleanup_20261103_142304.sql` (plain SQL from `pg_dump`)
- Seed scripts: `backend/seed.py`, `backend/seed_fresh_30_students.py`

To reconnect to this local instance temporarily, set in `backend/.env`:

```
DATABASE_ENABLED=true
DATABASE_URL=postgresql+psycopg2://postgres:<password>@localhost:5433/school_erp
```
