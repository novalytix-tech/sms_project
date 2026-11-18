# Production Audit — SMS

Audit and cleanup done on 2026-11-18, starting from the uploaded zip (git tag `pre-cleanup-baseline`).

## 1. Critical issues found and fixed

| # | Issue (before) | Impact | Fix |
|---|----------------|--------|-----|
| 1 | ~60 backend routes had **no authentication**, including `DELETE /students/<id>`, `POST /finance/invoices/<id>/pay`, `PUT /institutions/current/settings` | Anyone on the internet could read, change or delete school data | Deny-by-default guard on the whole API; only `/health` and the public admission enquiry are open |
| 2 | `GET /sync/store` returned **every school's** students, teachers, invoices… without login; `POST /sync/store` wrote to the DB without login | Full data dump and data injection | Staff-only read, admin-only write, both scoped to the user's own school |
| 3 | Login page shipped **hardcoded demo passwords** (`Principal#2026!` etc.) in the JavaScript bundle — visible via Inspect | Account takeover | Removed. Sign-in is Clerk; verified the production bundle contains none of these strings |
| 4 | Real passwords created with a fixed default `SchoolERP@Demo2026!` for new students; temporary passwords returned to the browser and exported to CSV; credentials sent by SMS/email | Credential leakage | All password code removed. Users get a Clerk invitation and set their own credentials |
| 5 | Tenant chosen from a client header (`X-Institution-Id`) or "first active school" fallback | Cross-school data access | Tenant always comes from the signed-in user; only `super_admin` may pick a school |
| 6 | By-ID routes (invoice, application, leave, paper, loan, section…) never checked the record's school | IDOR across schools | Ownership check on every by-ID lookup (returns 404) |
| 7 | Frontend "auth" was a role switcher stored in localStorage; any user could become admin | No real access control | Removed persona/role switchers and demo banner; roles come from the backend |
| 8 | JWT access token stored in `localStorage`, refresh flow, OTP/password-reset endpoints, a dev-auth mode | XSS token theft, large attack surface | Replaced by Clerk session tokens fetched per request; nothing auth-related in browser storage |
| 9 | Every browser-side data change **pushed the whole demo student list into the real database** | Fake data polluting production DB | Removed the automatic push |
| 10 | Parents with no linked child were shown the first 3 students of the school | Privacy breach | Parents see only verified linked children (frontend and backend) |
| 11 | "Delivered" / "success" responses faked when the backend failed (accounts, credentials) | Admins misled | Errors are reported honestly |
| 12 | Messages API let any user read anyone's messages via `?user_id=` | Privacy breach | Users only see their own conversations; recipients must be in the same school |
| 13 | Default `SECRET_KEY`/`JWT_SECRET_KEY` fallbacks, `CORS *` on Socket.IO, debug server in `wsgi.py` | Insecure defaults | App refuses to start without required env vars; strict CORS; gunicorn in production |
| 14 | Error responses included raw DB errors and Postgres version on `/health` | Information disclosure | Generic messages; health returns only up/down |
| 15 | Payment / application / paper numbers built from the current second → duplicate key errors under load | Failed payments | Unique random suffix |
| 16 | Source maps and `console.*` in production build | Source + data exposure | Disabled / stripped |

## 2. What was removed (dead or unsafe code)

Backend: custom JWT auth (`auth_service`, `dev_auth_service`, `otp_service`, JWT callbacks, token blocklist, password reset tables),
SMS/email credential delivery, Socket.IO handlers (never imported, unauthenticated), RBAC test routes,
"database disconnected" fake-data mode, a second seed script, ad-hoc DB inspection scripts, outdated GCP/local setup docs,
unused packages (Flask-JWT-Extended, argon2, marshmallow, flasgger, Flask-SocketIO, Flask-Caching, redis).

Frontend: demo quick-login with passwords, persona/role switcher, demo banner, forgot/force-password and credential
modals, credential delivery service, backup/restore/reset-demo-data in Settings, JWT/refresh logic,
unused packages (`@xyflow/react`, `date-fns`, `recharts`, `@testing-library/user-event`).

## 3. Module status — what is real vs. still demo

**Real (backend + database, secured):**

- Sign-in, user profile, roles, school (tenant) — Clerk + `/auth/me`
- Account management (create account + Clerk invite, activate/deactivate, resend invite)
- Students: add, edit, bulk CSV import (writes to DB); staff see DB students via `/sync/store`
- Website admission enquiry form (public) and the admin's list of web leads
- **Fees & invoicing (migrated 2026-11-19):** invoices, office payment recording, receipts, payment
  history, fee policy (UPI/bank details) and fee structures all live in the database. Parents see only their
  linked children's invoices, students only their own, teachers none. The browser-side fee demo data and the
  fake "online payment" simulator were removed; parents get the school's payment instructions instead.
  Online payment requires integrating a gateway (e.g. Razorpay) with signed webhooks — not done yet.
- Read-only hydration for staff of classes, teachers, books, notices, transport routes

**Still demo-only — data lives in each browser's localStorage, seeded from `frontend/src/data/seedData.ts`:**

Attendance (students and staff), assignments/homework, examinations, grading and report cards, question papers,
timetable, calendar, notices, messages, staff and class groups, leave, library (books, loans, fines),
transport (trips, GPS, safety events), admissions pipeline (beyond web enquiries), academic awards, digital marketing,
service entitlements, suppliers, institutions management, reports, notifications, promotions.

These screens work for demonstration, but **their data is not shared between users, is lost if the browser is
cleared, and any signed-in user can edit their own copy.** They must not be used for real school records.
For most of them the backend already has matching tables and secured endpoints
(`/attendance`, `/examinations`, `/library`, `/communications`, `/staff/leaves`, `/question-papers`,
`/transport`, `/admissions/applications`, `/finance`, `/academics`), so the remaining work is wiring each page to the API
and then deleting its localStorage code. The temporary bridge for these modules is
`frontend/src/data/legacyReferenceIds.ts`; delete it once the last module is migrated.

Recommended order (highest business risk first): ~~fees/invoices~~ (done) → attendance → examinations & results →
library → notices & messages → leave → timetable → transport → everything else.

## 4. Verification done

- Backend: 70 automated tests pass (12 of them for fees) (auth, forged/expired/foreign-origin tokens, unprovisioned and deactivated users,
  role checks, parent–child access, cross-school isolation, header spoofing, public enquiry, plus the existing module and workflow tests).
- Frontend: type-check clean, 219 unit tests pass (Clerk mocked), production build succeeds.
- Production bundle scanned: no demo passwords, no `sk_` keys, no token storage keys, no source maps, no `console.log`.
- Running locally: `/health` 200; protected routes 401 without a token or with a forged token; no CORS for unknown origins;
  security headers present; database migrations apply cleanly and match the models; RLS enabled on all 87 tables.
- **Not verified end to end:** an actual Clerk sign-in in the browser, because that needs your Clerk application keys.
