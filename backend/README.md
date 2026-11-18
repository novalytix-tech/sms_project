# School Management System ERP — Backend Service

Enterprise Python Flask backend for the School Management System (SMS ERP), backed by PostgreSQL with SQLAlchemy 2.0, Alembic migrations, Flask-JWT-Extended, and Argon2id password security.

---

## 1. Technology Stack

- **Runtime & Language:** Python 3.12+
- **Web Framework:** Flask 3.x (Application Factory Pattern)
- **Database:** PostgreSQL 16+
- **ORM:** SQLAlchemy 2.0 (Typed Mapped Models)
- **Migrations:** Flask-Migrate / Alembic
- **Authentication:** Flask-JWT-Extended (15-min Access Tokens, 7-day Refresh Tokens, Token Rotation, Token Blocklist)
- **Password Security:** Argon2id (`argon2-cffi`)
- **Real-Time Gateway:** Flask-SocketIO (WebSockets)
- **Rate Limiting:** Flask-Limiter
- **Testing:** Pytest & Pytest-Flask

---

## 2. Directory Layout

```
backend/
├── app/
│   ├── __init__.py           # Application Factory: create_app(config_name)
│   ├── config.py             # Development, Testing, Production configurations
│   ├── extensions.py         # Extension singletons (db, migrate, jwt, cors, limiter, etc.)
│   ├── api/                  # Blueprint controllers & API routers
│   ├── models/               # 89 Modular SQLAlchemy 2.0 Domain Models
│   │   ├── base.py           # BaseModel & TenantModel (UUID, timestamps, soft deletion)
│   │   ├── institution.py    # Institutions, Service Entitlements, Settings
│   │   ├── user.py           # Users, Roles, Permissions, UserRole, TokenBlocklist
│   │   ├── academic.py       # AcademicYears, Terms, Rooms, ClassLevels, Sections, Subjects
│   │   ├── student.py        # Students, Parents, StudentParent, Enrollments, Promotions
│   │   ├── staff.py          # StaffProfile, TeacherProfile, Qualifications, Dual-Role Library
│   │   ├── admission.py      # Inquiries, Applications, Documents, Evaluations
│   │   ├── attendance.py     # StudentAttendance, StaffAttendance, AuditCorrections
│   │   ├── assignment.py     # Assignments, Submissions, SubmissionReviews
│   │   ├── examination.py    # Exams, ExamSchedules, ExamResults, GradingScales
│   │   ├── question_paper.py # QuestionPapers, Immutable Versions, Moderation Reviews
│   │   ├── finance.py        # FeeStructures, Invoices, Payments, Ledger Transactions
│   │   ├── timetable.py      # Periods, Anti-Conflict TimetableSlots, CalendarEvents
│   │   ├── communication.py  # Notices, Messages, CommunicationGroups
│   │   ├── leave.py          # LeaveCategories, LeaveRequests, LeaveApprovals
│   │   ├── library.py        # Books, BookCopies, BookLoans, Fines, StockAudits
│   │   ├── transport.py      # Routes, Stops, Vehicles, Allocations, TelemetryLogs
│   │   ├── supplier.py       # Suppliers, Multi-Institution Contracts, PurchaseOrders
│   │   ├── report.py         # ReportTemplates, SavedReports
│   │   ├── marketing.py      # Campaigns, Leads CRM, MarketingActivities
│   │   ├── award.py          # AcademicAwards, StudentAwards
│   │   ├── notification.py   # Notifications, NotificationRecipients
│   │   └── audit.py          # AuditLogs (System-wide immutable change log)
│   └── utils/                # Error handlers, pagination, security decorators
├── migrations/               # Alembic version control scripts
├── tests/                    # Automated Pytest Suite (40 Passing Tests)
│   ├── conftest.py           # Database transaction fixtures & seed initialization
│   ├── test_health.py        # Health & PostgreSQL connectivity checks
│   ├── test_models.py        # Domain model instantiation & relationships
│   ├── test_constraints.py   # Critical business constraint validations
│   ├── test_auth.py          # Production JWT authentication & password reset tests
│   ├── test_rbac.py          # Role-based access control & tenant boundary tests
│   └── test_seed.py          # Seed idempotency & Argon2 verification
├── seed.py                   # Development database idempotent seeder
├── wsgi.py                   # WSGI server entry point
├── API_DOCUMENTATION.md      # Detailed REST API endpoint specification
└── requirements.txt          # Pinned Python package dependencies
```

---

## 3. Quick Start & Setup

### 3.1 Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 3.2 Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` and `TEST_DATABASE_URL` point to active PostgreSQL instances.

### 3.3 Apply Database Migrations
```bash
$env:FLASK_APP="wsgi.py"
flask db upgrade
```

### 3.4 Seed Development Data
```bash
python seed.py
```
This populates:
- Demonstration institution: **St. Xavier's Senior Secondary School** (`STXAV-DELHI`)
- 14 active service entitlements
- Canonical roles: `super_admin`, `school_admin`, `teacher`, `student`, `parent`, `supplier`
- Faculty profiles (including teacher + librarian dual-role assignment)
- Academic hierarchy (Academic Year 2026-2027, Class 10-A, Mathematics, Room 204)
- Student & Parent records with verified guardian linkage and active enrollment
- Rotated secure password for all seed accounts: `SchoolERP@Demo2026!` (hashed using Argon2id)

---

## 4. Running Automated Tests

```bash
python -m pytest tests -v
```

All 40 unit, security, and constraint tests execute against the isolated `sms_erp_test` database with zero side effects on production data.

---

## 5. Critical Database Constraints Enforced

1. **Student Enrollment**: `uq_student_academic_year` prevents duplicate active enrollments in the same academic session.
2. **Attendance**: `uq_student_attendance_date` prevents duplicate attendance records for the same student on the same date.
3. **Timetable Collision Protection**:
   - `uq_teacher_timetable_slot`: Prevents double-booking a teacher across multiple rooms/sections in the same period.
   - `uq_room_timetable_slot`: Prevents double-booking a physical room.
   - `uq_section_timetable_slot`: Prevents a class section from being scheduled in multiple subjects simultaneously.
4. **Financial Invoicing**: `chk_invoice_paid_not_exceed_total` and non-negative checks ensure collected payments cannot exceed the invoice balance without approved adjustments.
5. **Library Circulation**: `uq_active_copy_loan` partial unique index ensures an individual physical book copy cannot be issued to two borrowers simultaneously.
6. **Multi-Tenant Scoping**: All admission numbers, employee IDs, vehicle registrations, and class codes have tenant-scoped unique constraints (`institution_id`, `code`).
7. **Question Paper Immutability**: Historical question paper versions are immutable and versioned (`uq_paper_version_number`).

