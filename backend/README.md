# Backend (Flask API)

See the root [README](../README.md) for local setup, [AUDIT](../AUDIT.md) for status, and [DEPLOYMENT](../DEPLOYMENT.md) for Render.

- `app/auth/` — Clerk session verification and the deny-by-default request guard
- `app/api/v1/` — REST endpoints (role + tenant checks on every route)
- `app/models/` — SQLAlchemy models; `migrations/` — Alembic migrations
- `seed.py` — local demo data only (refuses to run in production)
- `tests/` — pytest suite (needs `TEST_DATABASE_URL`)
