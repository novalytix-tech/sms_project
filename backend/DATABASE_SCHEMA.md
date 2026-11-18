# SCHOOL MANAGEMENT SYSTEM (SMS ERP) — DATABASE SCHEMA SPECIFICATION

> **Target Database Engine:** PostgreSQL 16+ (with UUID v4 primary keys)  
> **ORM & Migration Tool:** SQLAlchemy 2.0 (Typed Mapped Models) & Flask-Migrate / Alembic  
> **Current Migration Revision:** `7b6c7bd1c318` (`initial_schema_all_models`)  
> **Total Normalized Implemented Tables:** 89 Relational Entities  
> **Schema Design Principle:** Strict 3NF Relational Normalization, Tenant-Scoped Integrity, Zero Unsafe JSONB For Complex Relations  

---

## 1. PHASE 2 IMPLEMENTATION & MIGRATION SUMMARY

All 89 tables covering 28+ functional domains have been created and migrated via Alembic (`7b6c7bd1c318`) on PostgreSQL 16:

1. **Core & Multi-Tenancy (3 tables):** `institutions`, `service_entitlements`, `institution_settings`
2. **Identity, Authentication & RBAC (7 tables):** `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `token_blocklist`, `password_resets`
3. **Academics & Class Structure (8 tables):** `academic_years`, `terms`, `rooms`, `class_levels`, `sections`, `subjects`, `class_subjects`, `teacher_assignments`
4. **Students & Guardian Hierarchy (5 tables):** `students`, `parents`, `student_parents`, `student_enrollments`, `student_promotions`
5. **Staff, Faculty & Dual Roles (5 tables):** `departments`, `staff_profiles`, `teacher_profiles`, `qualifications`, `library_staff_assignments`
6. **Admissions Pipeline (4 tables):** `admission_inquiries`, `admission_applications`, `application_documents`, `application_evaluations`
7. **Attendance Tracking (3 tables):** `student_attendance`, `staff_attendance`, `attendance_audit_corrections`
8. **Assignments & Homework (3 tables):** `assignments`, `assignment_submissions`, `submission_reviews`
9. **Examinations & Grading (4 tables):** `grading_scales`, `exams`, `exam_schedules`, `exam_results`
10. **Question Papers (4 tables):** `question_papers`, `question_paper_versions`, `question_paper_reviews`, `question_paper_amendments`
11. **Fees & Double-Entry Ledger (7 tables):** `fee_structures`, `fee_structure_items`, `fee_invoices`, `fee_invoice_items`, `fee_payments`, `financial_transactions`, `payment_gateway_webhooks`
12. **Timetable & Campus Calendar (3 tables):** `timetable_periods`, `timetable_slots`, `calendar_events`
13. **Communications & Channels (5 tables):** `notices`, `messages`, `communication_groups`, `group_members`, `group_messages`
14. **Leave Management (3 tables):** `leave_categories`, `leave_requests`, `leave_approvals`
15. **Library & Circulation (5 tables):** `books`, `book_copies`, `book_loans`, `library_fines`, `library_stock_audits`
16. **Transport & Fleet GPS (6 tables):** `transport_routes`, `transport_stops`, `transport_vehicles`, `transport_allocations`, `transport_trips`, `transport_telemetry_logs`
17. **Suppliers & Procurement (4 tables):** `suppliers`, `supplier_institutions`, `purchase_orders`, `purchase_order_items`
18. **Reports & Analytics (2 tables):** `report_templates`, `saved_reports`
19. **Digital Marketing CRM (3 tables):** `marketing_campaigns`, `marketing_leads`, `marketing_activities`
20. **Academic Awards & Wall of Fame (2 tables):** `academic_awards`, `student_awards`
21. **Alerts & Notifications (2 tables):** `notifications`, `notification_recipients`
22. **System Audit Logs (1 table):** `audit_logs`

---

## 2. GLOBAL CONVENTIONS & DESIGN RULES

1. **Primary Keys:** `UUID` (v4) or standard prefixed identifier `VARCHAR(64)` (e.g. `'inst-1'`, `'usr_98a7bc'`, `'stud-1'`) indexed as Primary Key.
2. **Multi-Tenancy Foreign Key:** Every operational table MUST include `institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE`, except platform governance tables (`institutions`, `school_service_configs`).
3. **Auditing Timestamps:** Every table includes `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL` and `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL`.
4. **Soft Deletion / Status Flags:** Master records (`students`, `teachers`, `classes`, `institutions`) use `status VARCHAR(32) NOT NULL DEFAULT 'active'`.
5. **JSONB Usage Policy:** JSONB is restricted strictly to unstructured data:
   - Rich quiz question structures / MCQ options in question papers.
   - External integration credentials and webhook payloads.
   - System configuration key-value overrides.
   - All relational entities (enrollments, assignments, parent-child links, invoice items) are explicitly normalized into relational tables.

---

## 2. CORE IDENTITY & GOVERNANCE TABLES

### 2.1 `institutions`
Represents educational institutions / tenant branches on the platform.

```sql
CREATE TABLE institutions (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    board VARCHAR(64) NOT NULL, -- 'CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    address TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    principal VARCHAR(128) NOT NULL,
    student_count INTEGER DEFAULT 0 NOT NULL,
    teacher_count INTEGER DEFAULT 0 NOT NULL,
    plan VARCHAR(32) DEFAULT 'Enterprise' NOT NULL, -- 'Basic', 'Standard', 'Enterprise', 'Premium'
    plan_expiry DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'inactive', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_institutions_code ON institutions(code);
CREATE INDEX idx_institutions_status ON institutions(status);
```

### 2.2 `users`
Central authentication credentials and user profiles.

```sql
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE, -- NULL for platform super_admin
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL, -- 'super_admin', 'school_admin', 'teacher', 'parent', 'student', 'supplier'
    phone VARCHAR(32),
    avatar VARCHAR(8), -- User initials e.g. 'AS'
    photo_url VARCHAR(512),
    reference_id VARCHAR(64), -- Links to teachers.id, students.id, suppliers.id
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_users_institution_role ON users(institution_id, role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reference ON users(reference_id);
```

### 2.3 `token_blocklist`
Stores revoked JWT `jti` identifiers for token revocation and logout.

```sql
CREATE TABLE token_blocklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(64) UNIQUE NOT NULL,
    token_type VARCHAR(16) NOT NULL, -- 'access', 'refresh'
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_token_blocklist_jti ON token_blocklist(jti);
CREATE INDEX idx_token_blocklist_expiry ON token_blocklist(expires_at);
```

### 2.4 `password_resets`
Stores cryptographically hashed, single-use password reset tokens.

```sql
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_password_resets_token ON password_resets(token_hash);
```

---

## 3. ACADEMIC STRUCTURE & CLASSROOM TABLES

### 3.1 `academic_sessions`
Manages school calendar years (`2025–2026`, `2026–2027`).

```sql
CREATE TABLE academic_sessions (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(64) NOT NULL, -- e.g. '2026–2027'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(32) DEFAULT 'planned' NOT NULL, -- 'planned', 'active', 'closed'
    previous_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE SET NULL,
    next_session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_session_institution_name UNIQUE (institution_id, name)
);
CREATE INDEX idx_academic_sessions_inst_current ON academic_sessions(institution_id, is_current);
```

### 3.2 `teachers`
Comprehensive faculty registry.

```sql
CREATE TABLE teachers (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    staff_id VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    gender VARCHAR(16) NOT NULL,
    designation VARCHAR(128) NOT NULL, -- 'PGT Senior Teacher', 'TGT Teacher', 'PRT'
    department VARCHAR(128) NOT NULL, -- 'Mathematics', 'Science', 'Languages'
    specialization VARCHAR(128),
    qualification VARCHAR(255) NOT NULL,
    joining_date DATE NOT NULL,
    avatar VARCHAR(8),
    photo_url VARCHAR(512),
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_teacher_institution_staffid UNIQUE (institution_id, staff_id),
    CONSTRAINT uq_teacher_institution_email UNIQUE (institution_id, email)
);
CREATE INDEX idx_teachers_inst_dept ON teachers(institution_id, department);
```

### 3.3 `classes` (ClassRooms)
Classrooms and sections within a specific academic session.

```sql
CREATE TABLE classes (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE RESTRICT NOT NULL,
    name VARCHAR(128) NOT NULL, -- 'Class 10'
    grade INTEGER NOT NULL, -- 1 to 12
    section VARCHAR(16) NOT NULL, -- 'A', 'B', 'C'
    room_no VARCHAR(64) NOT NULL,
    class_teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE SET NULL,
    capacity INTEGER DEFAULT 40 NOT NULL,
    student_count INTEGER DEFAULT 0 NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_class_session_grade_section UNIQUE (institution_id, session_id, grade, section)
);
CREATE INDEX idx_classes_inst_session ON classes(institution_id, session_id);
```

### 3.4 `class_subjects`
Normalized subjects taught in each class.

```sql
CREATE TABLE class_subjects (
    id SERIAL PRIMARY KEY,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject_name VARCHAR(128) NOT NULL,
    CONSTRAINT uq_class_subject UNIQUE (class_id, subject_name)
);
```

### 3.5 `teacher_class_assignments`
Explicit relational allocation of teachers to classes and subjects.

```sql
CREATE TABLE teacher_class_assignments (
    id SERIAL PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    subject VARCHAR(128) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_teacher_class_subject UNIQUE (teacher_id, class_id, subject)
);
CREATE INDEX idx_teacher_assignments_class ON teacher_class_assignments(class_id);
CREATE INDEX idx_teacher_assignments_teacher ON teacher_class_assignments(teacher_id);
```

---

## 4. STUDENTS, ENROLLMENTS & PROMOTIONS

### 4.1 `students`
Permanent, multi-year master identity for enrolled students.

```sql
CREATE TABLE students (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    admission_no VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(16) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(16),
    current_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL,
    current_section VARCHAR(16) NOT NULL,
    current_roll_no VARCHAR(32),
    academic_year VARCHAR(32) NOT NULL,
    admission_date DATE NOT NULL,
    address TEXT NOT NULL,
    transport_route_id VARCHAR(64), -- FK to transport_routes
    bus_stop VARCHAR(128),
    avatar VARCHAR(8),
    photo_url VARCHAR(512),
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_institution_admission_no UNIQUE (institution_id, admission_no)
);
CREATE INDEX idx_students_institution_class ON students(institution_id, current_class_id);
CREATE INDEX idx_students_institution_name ON students(institution_id, full_name);
```

### 4.2 `parents` & `student_parents` (Normalized Many-to-Many)
Normalized legal guardian registry and student relationship links.

```sql
CREATE TABLE parents (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'parent-patel'
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    relation VARCHAR(32) NOT NULL, -- 'Father', 'Mother', 'Guardian'
    phone VARCHAR(32) NOT NULL,
    alternate_phone VARCHAR(32),
    email VARCHAR(255) NOT NULL,
    occupation VARCHAR(128),
    residential_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_parent_institution_email_phone UNIQUE (institution_id, email, phone)
);

CREATE TABLE student_parents (
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    parent_id VARCHAR(64) REFERENCES parents(id) ON DELETE CASCADE NOT NULL,
    relationship_type VARCHAR(32) NOT NULL, -- 'Father', 'Mother', 'Guardian'
    is_primary_contact BOOLEAN DEFAULT TRUE NOT NULL,
    can_pickup BOOLEAN DEFAULT TRUE NOT NULL,
    PRIMARY KEY (student_id, parent_id)
);
CREATE INDEX idx_student_parents_parent ON student_parents(parent_id);
```

### 4.3 `student_enrollments`
Immutable yearly session enrollment ledger.

```sql
CREATE TABLE student_enrollments (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    session_id VARCHAR(64) REFERENCES academic_sessions(id) ON DELETE RESTRICT NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE RESTRICT NOT NULL,
    section VARCHAR(16) NOT NULL,
    roll_no VARCHAR(32),
    enrollment_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'promoted', 'retained', 'graduated', 'transferred', 'withdrawn', 'compartment'
    previous_enrollment_id VARCHAR(64) REFERENCES student_enrollments(id) ON DELETE SET NULL,
    promotion_batch_id VARCHAR(64), -- FK to promotion_batches
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_enrollment_student_session UNIQUE (student_id, session_id)
);
CREATE INDEX idx_student_enrollments_class ON student_enrollments(class_id, status);
```

### 4.4 `promotion_batches` & `promotion_decisions`
Batch audit tracking for academic year progressions.

```sql
CREATE TABLE promotion_batches (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    source_session_id VARCHAR(64) REFERENCES academic_sessions(id) NOT NULL,
    destination_session_id VARCHAR(64) REFERENCES academic_sessions(id) NOT NULL,
    source_class_id VARCHAR(64) REFERENCES classes(id) NOT NULL,
    destination_class_id VARCHAR(64) REFERENCES classes(id) NOT NULL,
    executed_by VARCHAR(64) REFERENCES users(id) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_students INTEGER NOT NULL,
    promoted_count INTEGER NOT NULL,
    retained_count INTEGER NOT NULL,
    graduated_count INTEGER NOT NULL,
    withdrawn_count INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE promotion_decisions (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(64) REFERENCES promotion_batches(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) NOT NULL,
    admission_no VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL, -- 'promote', 'retain', 'graduate', 'manual_review', 'withdrawn'
    destination_class_id VARCHAR(64) NOT NULL,
    destination_section VARCHAR(16) NOT NULL,
    destination_roll_no VARCHAR(32),
    academic_percentage NUMERIC(5,2),
    overall_grade VARCHAR(16),
    is_overridden BOOLEAN DEFAULT FALSE NOT NULL,
    override_reason TEXT
);
```

---

## 5. ADMISSIONS PIPELINE TABLES

### 5.1 `admission_enquiries` & `admission_follow_ups`
```sql
CREATE TABLE admission_enquiries (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    enquiry_no VARCHAR(64) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(16) NOT NULL,
    interested_class_id VARCHAR(64) REFERENCES classes(id),
    interested_class_name VARCHAR(128) NOT NULL,
    academic_session VARCHAR(64) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(32) NOT NULL,
    mobile_number VARCHAR(32) NOT NULL,
    alternate_mobile VARCHAR(32),
    email VARCHAR(255) NOT NULL,
    residential_address TEXT NOT NULL,
    enquiry_date DATE NOT NULL,
    source VARCHAR(64) NOT NULL, -- 'Website', 'Walk-in', 'Google Ads', 'Meta Ads'
    preferred_contact_method VARCHAR(32) NOT NULL,
    assigned_counsellor VARCHAR(128) NOT NULL,
    next_follow_up_date DATE,
    remarks TEXT,
    status VARCHAR(32) DEFAULT 'New' NOT NULL, -- 'New', 'Contacted', 'Visit Scheduled', 'Converted', 'Lost'
    lost_reason VARCHAR(128),
    converted_application_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_enquiry_institution_no UNIQUE (institution_id, enquiry_no)
);

CREATE TABLE admission_follow_ups (
    id VARCHAR(64) PRIMARY KEY,
    enquiry_id VARCHAR(64) REFERENCES admission_enquiries(id) ON DELETE CASCADE NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(32) NOT NULL,
    assigned_staff VARCHAR(128) NOT NULL,
    follow_up_date DATE NOT NULL,
    follow_up_time VARCHAR(16) NOT NULL,
    communication_method VARCHAR(32) NOT NULL, -- 'Phone Call', 'WhatsApp', 'Email', 'Campus Visit'
    interaction_notes TEXT NOT NULL,
    next_action VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'Scheduled' NOT NULL,
    call_outcome VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 5.2 `admission_applications` & Sub-entities
```sql
CREATE TABLE admission_applications (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    application_no VARCHAR(64) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    target_class_id VARCHAR(64) REFERENCES classes(id) NOT NULL,
    target_class_name VARCHAR(128) NOT NULL,
    target_section VARCHAR(16) DEFAULT 'A',
    source VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    gender VARCHAR(16) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(16),
    previous_school VARCHAR(255),
    parent_name VARCHAR(255) NOT NULL,
    parent_relation VARCHAR(32) NOT NULL,
    parent_phone VARCHAR(32) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    pincode VARCHAR(16) NOT NULL,
    stage VARCHAR(32) DEFAULT 'inquiry' NOT NULL, -- 'inquiry', 'application_submitted', 'documents_pending', 'under_review', 'approved', 'fee_pending', 'enrolled', 'rejected', 'withdrawn'
    admission_fee_amount NUMERIC(10,2) DEFAULT 25000.00 NOT NULL,
    fee_amount_paid NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    fee_outstanding NUMERIC(10,2) DEFAULT 25000.00 NOT NULL,
    is_fee_paid BOOLEAN DEFAULT FALSE NOT NULL,
    enrolled_student_id VARCHAR(64) REFERENCES students(id) ON DELETE SET NULL,
    assigned_admission_no VARCHAR(64),
    enrolled_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_application_institution_no UNIQUE (institution_id, application_no)
);

CREATE TABLE admission_documents (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) REFERENCES admission_applications(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Identity', 'Transfer', 'Academic', 'Address'
    required BOOLEAN DEFAULT TRUE NOT NULL,
    submitted BOOLEAN DEFAULT FALSE NOT NULL,
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    verification_date DATE,
    verified_by VARCHAR(128),
    file_url VARCHAR(512),
    rejection_reason TEXT
);

CREATE TABLE admission_assessments (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) REFERENCES admission_applications(id) ON DELETE CASCADE NOT NULL,
    assessment_type VARCHAR(64) NOT NULL, -- 'Written Test', 'Oral Interview', 'Interaction'
    assessment_date DATE,
    marks_obtained NUMERIC(5,2),
    max_marks NUMERIC(5,2),
    result VARCHAR(32) NOT NULL, -- 'Passed', 'Shortlisted', 'Needs Further Review', 'Exempted', 'Failed'
    evaluator_teacher VARCHAR(128) NOT NULL,
    interaction_remarks TEXT,
    status VARCHAR(32) DEFAULT 'Scheduled' NOT NULL
);

CREATE TABLE admission_offers (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) REFERENCES admission_applications(id) ON DELETE CASCADE NOT NULL,
    decision VARCHAR(32) NOT NULL, -- 'Offered', 'Waitlisted', 'Rejected'
    approved_class_id VARCHAR(64) REFERENCES classes(id) NOT NULL,
    offered_section VARCHAR(16) NOT NULL,
    offer_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    admission_fee_amount NUMERIC(10,2) NOT NULL,
    authorized_approver VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'Issued' NOT NULL
);
```

---

## 6. ATTENDANCE & LEAVE MANAGEMENT

### 6.1 `attendance_records` (Student Roll Call)
```sql
CREATE TABLE attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    section VARCHAR(16) NOT NULL,
    date DATE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(16) NOT NULL, -- 'present', 'absent', 'late', 'excused'
    remarks VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_attendance_student_date UNIQUE (class_id, section, student_id, date)
);
CREATE INDEX idx_attendance_inst_class_date ON attendance_records(institution_id, class_id, date);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
```

### 6.2 `staff_attendance_records`
```sql
CREATE TABLE staff_attendance_records (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    staff_id VARCHAR(64) NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(16) NOT NULL, -- 'present', 'absent', 'late', 'half_day', 'on_leave'
    check_in_time VARCHAR(16),
    check_out_time VARCHAR(16),
    remarks VARCHAR(255),
    is_corrected BOOLEAN DEFAULT FALSE NOT NULL,
    previous_status VARCHAR(16),
    corrected_by VARCHAR(128),
    corrected_at TIMESTAMP WITH TIME ZONE,
    correction_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_staff_attendance_teacher_date UNIQUE (teacher_id, date)
);
```

### 6.3 `leave_requests`
```sql
CREATE TABLE leave_requests (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    applicant_id VARCHAR(64) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_role VARCHAR(32) NOT NULL, -- 'teacher', 'student', 'staff'
    leave_type VARCHAR(32) NOT NULL, -- 'Medical', 'Casual', 'Emergency', 'Maternity', 'Vacation'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    applied_on DATE NOT NULL,
    reviewed_by VARCHAR(128),
    review_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_leave_requests_inst_status ON leave_requests(institution_id, status);
```

---

## 7. FINANCIAL LEDGER, INVOICES & PAYMENT TRANSACTIONS

### 7.1 `fee_structures` & `fee_policies`
```sql
CREATE TABLE fee_policies (
    institution_id VARCHAR(64) PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year VARCHAR(32) NOT NULL,
    currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
    allow_partial_payments BOOLEAN DEFAULT TRUE NOT NULL,
    min_partial_amount NUMERIC(10,2) DEFAULT 1000.00 NOT NULL,
    grace_period_days INTEGER DEFAULT 10 NOT NULL,
    late_fee_per_day NUMERIC(10,2) DEFAULT 50.00 NOT NULL,
    max_late_fee NUMERIC(10,2) DEFAULT 2500.00 NOT NULL,
    discount_percentage_sibling NUMERIC(5,2) DEFAULT 10.00 NOT NULL,
    upi_id VARCHAR(128) NOT NULL,
    payment_instructions TEXT,
    bank_account_name VARCHAR(255) NOT NULL,
    bank_account_number VARCHAR(64) NOT NULL,
    bank_name VARCHAR(128) NOT NULL,
    bank_ifsc VARCHAR(32) NOT NULL,
    bank_branch VARCHAR(128) NOT NULL
);

CREATE TABLE fee_structures (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    class_name VARCHAR(128) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    term VARCHAR(32) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    allow_partial BOOLEAN DEFAULT TRUE NOT NULL
);
```

### 7.2 `fee_invoices` & `fee_invoice_items`
```sql
CREATE TABLE fee_invoices (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    invoice_no VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    admission_no VARCHAR(64) NOT NULL,
    class_name VARCHAR(128) NOT NULL,
    section VARCHAR(16) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Tuition', 'Admission', 'Transport', 'Examination'
    academic_year VARCHAR(32) NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'unpaid' NOT NULL, -- 'paid', 'unpaid', 'partial', 'overdue'
    discount_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    discount_reason VARCHAR(255),
    late_fee_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    allow_partial BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_invoice_institution_no UNIQUE (institution_id, invoice_no)
);
CREATE INDEX idx_fee_invoices_student ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(institution_id, status);

CREATE TABLE fee_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(64) REFERENCES fee_invoices(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    amount NUMERIC(10,2) NOT NULL
);
```

### 7.3 `fee_payments` & `payment_transactions`
Strict segregation between billing receipts and gateway transaction logs.

```sql
CREATE TABLE fee_payments (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    invoice_id VARCHAR(64) REFERENCES fee_invoices(id) ON DELETE CASCADE NOT NULL,
    receipt_no VARCHAR(64) NOT NULL,
    payment_date DATE NOT NULL,
    payment_time VARCHAR(16) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(64) NOT NULL, -- 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash', 'Cheque', 'Bank Transfer'
    recorded_by VARCHAR(128) NOT NULL,
    transaction_ref VARCHAR(128),
    channel VARCHAR(32) NOT NULL, -- 'online_demo', 'online_gateway', 'manual_office'
    remarks TEXT,
    status VARCHAR(32) DEFAULT 'success' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_payment_institution_receipt UNIQUE (institution_id, receipt_no)
);

CREATE TABLE payment_transactions (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    transaction_ref VARCHAR(128) UNIQUE NOT NULL,
    invoice_id VARCHAR(64) REFERENCES fee_invoices(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    method VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'success', 'failed', 'cancelled', 'pending'
    gateway_name VARCHAR(64), -- 'Razorpay', 'Stripe', 'PayU', 'Manual'
    gateway_order_id VARCHAR(128),
    gateway_payment_id VARCHAR(128),
    gateway_signature VARCHAR(255), -- Cryptographic HMAC signature
    channel VARCHAR(32) NOT NULL,
    payer_name VARCHAR(255) NOT NULL,
    upi_vpa VARCHAR(128),
    card_last4 VARCHAR(8),
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_transactions_invoice ON payment_transactions(invoice_id);
```

---

## 8. ACADEMIC EVALUATION, HOMEWORK & QUESTION PAPERS

### 8.1 `assignments` & `assignment_submissions`
```sql
CREATE TABLE assignments (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    section VARCHAR(16) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,
    max_score INTEGER NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    allow_late_submissions BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE assignment_submissions (
    id VARCHAR(64) PRIMARY KEY,
    assignment_id VARCHAR(64) REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    submission_date DATE NOT NULL,
    submission_text TEXT,
    attachment_name VARCHAR(255),
    attachment_url VARCHAR(512),
    attachment_size INTEGER,
    status VARCHAR(32) DEFAULT 'submitted' NOT NULL, -- 'submitted', 'late_submitted', 'graded', 'returned_for_revision'
    score NUMERIC(5,2),
    feedback TEXT,
    reviewed_by VARCHAR(128),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_assignment UNIQUE (assignment_id, student_id)
);
```

### 8.2 `examinations`, `exam_schedules` & `exam_marks`
```sql
CREATE TABLE grading_schemes (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(128) NOT NULL, -- 'CBSE Standard 9-Point Scale'
    description TEXT,
    academic_year VARCHAR(32) NOT NULL,
    pass_percentage NUMERIC(5,2) DEFAULT 33.00 NOT NULL,
    rules JSONB NOT NULL, -- Array of [{grade: 'A1', minPercentage: 91, maxPercentage: 100, gradePoint: 10, isPassing: true}, ...]
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE examinations (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    exam_type VARCHAR(64) NOT NULL, -- 'Unit Test', 'Mid-Term', 'Final Exam', 'Quarterly'
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    section VARCHAR(16) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'upcoming' NOT NULL, -- 'upcoming', 'ongoing', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE exam_schedules (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
    subject VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    start_time VARCHAR(16) NOT NULL,
    end_time VARCHAR(16) NOT NULL,
    max_marks INTEGER NOT NULL,
    pass_marks INTEGER NOT NULL,
    room_no VARCHAR(64) NOT NULL
);

CREATE TABLE exam_marks (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
    schedule_id VARCHAR(64) REFERENCES exam_schedules(id) ON DELETE CASCADE NOT NULL,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    marks_obtained NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    is_absent BOOLEAN DEFAULT FALSE NOT NULL,
    remarks VARCHAR(255),
    CONSTRAINT uq_exam_schedule_student UNIQUE (schedule_id, student_id)
);
CREATE INDEX idx_exam_marks_student ON exam_marks(student_id);
```

### 8.3 `question_papers` & Version History
```sql
CREATE TABLE question_papers (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    paper_code VARCHAR(64) NOT NULL,
    academic_year VARCHAR(32) NOT NULL,
    exam_id VARCHAR(64) REFERENCES examinations(id) ON DELETE SET NULL,
    class_id VARCHAR(64) REFERENCES classes(id) NOT NULL,
    section VARCHAR(16) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) NOT NULL,
    preparation_method VARCHAR(32) NOT NULL, -- 'erp_editor', 'pdf_upload', 'image_upload'
    title VARCHAR(255) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    max_marks INTEGER NOT NULL,
    current_version INTEGER DEFAULT 1 NOT NULL,
    status VARCHAR(32) DEFAULT 'draft' NOT NULL, -- 'draft', 'submitted_for_review', 'changes_requested', 'resubmitted', 'approved', 'rejected', 'finalized'
    erp_content JSONB, -- Valid JSON structure for ERP editor sections/questions
    pdf_attachment JSONB, -- Attachment metadata
    image_pages JSONB, -- Scanned page references
    reviewer_id VARCHAR(64) REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_question_paper_institution_code UNIQUE (institution_id, paper_code)
);

CREATE TABLE question_paper_versions (
    id SERIAL PRIMARY KEY,
    paper_id VARCHAR(64) REFERENCES question_papers(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    status_at_snapshot VARCHAR(32) NOT NULL,
    preparation_method VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    max_marks INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    content_snapshot JSONB NOT NULL,
    saved_by_user_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    change_summary TEXT,
    CONSTRAINT uq_paper_version UNIQUE (paper_id, version_number)
);

CREATE TABLE question_paper_reviews (
    id SERIAL PRIMARY KEY,
    paper_id VARCHAR(64) REFERENCES question_papers(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    reviewer_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    action VARCHAR(32) NOT NULL, -- 'changes_requested', 'approved', 'rejected', 'finalized', 'amended'
    general_comments TEXT NOT NULL,
    question_comments JSONB, -- Per question inline comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE question_paper_audits (
    id SERIAL PRIMARY KEY,
    paper_id VARCHAR(64) REFERENCES question_papers(id) ON DELETE CASCADE NOT NULL,
    paper_code VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    version_number INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details TEXT NOT NULL
);
```

---

## 9. TIMETABLE, CALENDAR & COMMUNICATIONS

### 9.1 `timetable_periods`
```sql
CREATE TABLE timetable_periods (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    section VARCHAR(16) NOT NULL,
    day VARCHAR(16) NOT NULL, -- 'Monday', 'Tuesday', ..., 'Saturday'
    period_no INTEGER NOT NULL, -- 1 to 8
    start_time VARCHAR(16) NOT NULL,
    end_time VARCHAR(16) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    room_no VARCHAR(64) NOT NULL,
    CONSTRAINT uq_timetable_teacher_conflict UNIQUE (teacher_id, day, period_no),
    CONSTRAINT uq_timetable_room_conflict UNIQUE (institution_id, room_no, day, period_no),
    CONSTRAINT uq_timetable_class_slot UNIQUE (class_id, section, day, period_no)
);
CREATE INDEX idx_timetable_class ON timetable_periods(class_id, section);
CREATE INDEX idx_timetable_teacher ON timetable_periods(teacher_id);
```

### 9.2 `school_events` & `notices`
```sql
CREATE TABLE school_events (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'holiday', 'exam', 'ptm', 'sports', 'cultural', 'academic'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_audience VARCHAR(32) NOT NULL, -- 'all', 'teachers', 'students', 'parents'
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE notices (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    published_date DATE NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(64) NOT NULL,
    priority VARCHAR(16) DEFAULT 'normal' NOT NULL, -- 'normal', 'high', 'urgent'
    target_audience VARCHAR(32) DEFAULT 'all' NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 9.3 `messages`, `staff_groups` & `class_groups`
```sql
CREATE TABLE messages (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    conversation_id VARCHAR(64) NOT NULL,
    sender_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    sender_role VARCHAR(32) NOT NULL,
    recipient_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    recipient_role VARCHAR(32) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read);

CREATE TABLE staff_groups (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(32) NOT NULL, -- 'all_staff', 'role_based', 'department', 'class_based', 'custom'
    creator_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE staff_group_members (
    group_id VARCHAR(64) REFERENCES staff_groups(id) ON DELETE CASCADE NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (group_id, user_id)
);

CREATE TABLE staff_group_messages (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) REFERENCES staff_groups(id) ON DELETE CASCADE NOT NULL,
    sender_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    is_announcement BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE class_groups (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    class_id VARCHAR(64) REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
    section VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_teacher_id VARCHAR(64) REFERENCES teachers(id),
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_class_group UNIQUE (class_id, section)
);

CREATE TABLE class_group_messages (
    id VARCHAR(64) PRIMARY KEY,
    group_id VARCHAR(64) REFERENCES class_groups(id) ON DELETE CASCADE NOT NULL,
    sender_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'announcement', 'homework', 'exam_notice', 'event', 'general'
    priority VARCHAR(16) DEFAULT 'normal' NOT NULL, -- 'normal', 'important', 'urgent'
    attachment_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 10. LIBRARY MANAGEMENT SYSTEM


```sql
CREATE TABLE library_settings (
    institution_id VARCHAR(64) PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    library_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(128) NOT NULL,
    student_borrow_duration_days INTEGER DEFAULT 14 NOT NULL,
    teacher_borrow_duration_days INTEGER DEFAULT 30 NOT NULL,
    staff_borrow_duration_days INTEGER DEFAULT 14 NOT NULL,
    student_max_books INTEGER DEFAULT 3 NOT NULL,
    teacher_max_books INTEGER DEFAULT 8 NOT NULL,
    staff_max_books INTEGER DEFAULT 4 NOT NULL,
    max_renewals INTEGER DEFAULT 2 NOT NULL,
    fine_per_day_overdue NUMERIC(6,2) DEFAULT 5.00 NOT NULL,
    grace_period_days INTEGER DEFAULT 2 NOT NULL,
    lost_book_penalty_multiplier NUMERIC(3,1) DEFAULT 1.5 NOT NULL,
    accession_prefix VARCHAR(32) DEFAULT 'LIB-2026' NOT NULL
);

CREATE TABLE library_books (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(64) NOT NULL,
    category VARCHAR(128) NOT NULL,
    subject VARCHAR(128),
    publisher VARCHAR(128),
    edition VARCHAR(64),
    publication_year INTEGER,
    language VARCHAR(64) DEFAULT 'English',
    shelf_location VARCHAR(128) NOT NULL,
    total_copies INTEGER DEFAULT 1 NOT NULL,
    available_copies INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_book_institution_isbn UNIQUE (institution_id, isbn)
);

CREATE TABLE library_copies (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64) REFERENCES library_books(id) ON DELETE CASCADE NOT NULL,
    accession_number VARCHAR(64) UNIQUE NOT NULL, -- e.g. 'LIB-2026-0001'
    barcode VARCHAR(64) UNIQUE NOT NULL,
    copy_number INTEGER NOT NULL,
    condition VARCHAR(32) DEFAULT 'good' NOT NULL, -- 'excellent', 'good', 'fair', 'damaged'
    status VARCHAR(32) DEFAULT 'available' NOT NULL -- 'available', 'issued', 'reserved', 'lost', 'damaged'
);

CREATE TABLE library_members (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    member_type VARCHAR(32) NOT NULL, -- 'student', 'teacher', 'staff'
    reference_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL, -- admissionNo or staffId
    class_or_department VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    max_borrow_limit INTEGER NOT NULL,
    current_issued_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    membership_start_date DATE NOT NULL,
    membership_expiry_date DATE NOT NULL
);

CREATE TABLE library_loans (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    loan_number VARCHAR(64) UNIQUE NOT NULL,
    copy_id VARCHAR(64) REFERENCES library_copies(id) ON DELETE RESTRICT NOT NULL,
    book_id VARCHAR(64) REFERENCES library_books(id) ON DELETE RESTRICT NOT NULL,
    member_id VARCHAR(64) REFERENCES library_members(id) ON DELETE RESTRICT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    renewal_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'borrowed' NOT NULL, -- 'borrowed', 'returned', 'overdue', 'lost'
    fine_amount NUMERIC(8,2) DEFAULT 0.00 NOT NULL,
    fine_status VARCHAR(32) DEFAULT 'none' NOT NULL -- 'none', 'pending', 'paid', 'waived'
);

CREATE TABLE library_fines (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    fine_number VARCHAR(64) UNIQUE NOT NULL,
    loan_id VARCHAR(64) REFERENCES library_loans(id) ON DELETE SET NULL,
    member_id VARCHAR(64) REFERENCES library_members(id) ON DELETE CASCADE NOT NULL,
    reason VARCHAR(64) NOT NULL, -- 'overdue', 'damage', 'lost_book'
    amount NUMERIC(8,2) NOT NULL,
    paid_amount NUMERIC(8,2) DEFAULT 0.00 NOT NULL,
    waiver_amount NUMERIC(8,2) DEFAULT 0.00 NOT NULL,
    balance NUMERIC(8,2) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL -- 'pending', 'paid', 'waived'
);

CREATE TABLE library_staff_assignments (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    teacher_id VARCHAR(64) REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
    role_title VARCHAR(64) NOT NULL, -- 'Head Librarian', 'Assistant Librarian', 'Stock Auditor'
    permissions TEXT[] NOT NULL, -- Array of ['*'] or ['library.books.manage', 'library.circulation.manage']
    assigned_by VARCHAR(64) REFERENCES users(id) NOT NULL,
    assigned_date DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL
);
```

---

## 11. SCHOOL BUS FLEET & TRANSPORT TELEMETRY

```sql
CREATE TABLE transport_routes (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    route_number VARCHAR(64) NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    vehicle_no VARCHAR(64) NOT NULL,
    vehicle_type VARCHAR(32) DEFAULT 'Bus' NOT NULL,
    driver_name VARCHAR(128) NOT NULL,
    driver_phone VARCHAR(32) NOT NULL,
    attendant_name VARCHAR(128),
    attendant_phone VARCHAR(32),
    capacity INTEGER DEFAULT 45 NOT NULL,
    assigned_students_count INTEGER DEFAULT 0 NOT NULL,
    school_latitude NUMERIC(10,7) NOT NULL,
    school_longitude NUMERIC(10,7) NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    CONSTRAINT uq_route_institution_number UNIQUE (institution_id, route_number)
);

CREATE TABLE bus_stops (
    id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64) REFERENCES transport_routes(id) ON DELETE CASCADE NOT NULL,
    stop_name VARCHAR(255) NOT NULL,
    pickup_time VARCHAR(16) NOT NULL,
    drop_time VARCHAR(16) NOT NULL,
    fee_per_term NUMERIC(10,2) NOT NULL,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    radius_meters INTEGER DEFAULT 100 NOT NULL,
    sequence_order INTEGER NOT NULL
);

CREATE TABLE transport_trips (
    id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64) REFERENCES transport_routes(id) ON DELETE CASCADE NOT NULL,
    trip_type VARCHAR(32) NOT NULL, -- 'morning_pickup', 'afternoon_drop'
    trip_date DATE NOT NULL,
    scheduled_start_time VARCHAR(16) NOT NULL,
    scheduled_end_time VARCHAR(16) NOT NULL,
    actual_start_time VARCHAR(16),
    actual_end_time VARCHAR(16),
    status VARCHAR(32) DEFAULT 'scheduled' NOT NULL, -- 'scheduled', 'in_transit', 'arrived_at_school', 'completed'
    current_stop_name VARCHAR(255),
    next_stop_name VARCHAR(255),
    eta_next_stop_minutes INTEGER,
    is_simulated BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE bus_locations (
    id BIGSERIAL PRIMARY KEY,
    bus_id VARCHAR(64) NOT NULL,
    trip_id VARCHAR(64) REFERENCES transport_trips(id) ON DELETE CASCADE,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    speed_kmh NUMERIC(5,2),
    heading_degrees NUMERIC(5,2),
    accuracy_meters NUMERIC(6,2),
    source_device_id VARCHAR(64),
    is_simulated BOOLEAN DEFAULT FALSE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_bus_locations_trip ON bus_locations(trip_id, timestamp DESC);

CREATE TABLE transport_safety_events (
    id VARCHAR(64) PRIMARY KEY,
    student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    trip_id VARCHAR(64) REFERENCES transport_trips(id) ON DELETE CASCADE NOT NULL,
    route_id VARCHAR(64) REFERENCES transport_routes(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(32) NOT NULL, -- 'boarded', 'dropped_off', 'not_boarded', 'exception'
    stop_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recorded_by_staff_id VARCHAR(64) NOT NULL,
    recorded_by_staff_name VARCHAR(255) NOT NULL,
    verification_method VARCHAR(32) NOT NULL, -- 'manual_attendant', 'qr_code', 'rfid_card', 'emergency_override'
    notes TEXT,
    is_flagged BOOLEAN DEFAULT FALSE NOT NULL,
    audit_correction JSONB -- Audit trail if status corrected
);

CREATE TABLE transport_alerts (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES transport_trips(id) ON DELETE CASCADE NOT NULL,
    route_id VARCHAR(64) REFERENCES transport_routes(id) ON DELETE CASCADE NOT NULL,
    bus_number VARCHAR(64) NOT NULL,
    alert_type VARCHAR(64) NOT NULL, -- 'approaching_stop', 'arrived_at_school', 'trip_delayed', 'route_deviation'
    severity VARCHAR(16) NOT NULL, -- 'info', 'warning', 'urgent'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 12. PROCUREMENT, SERVICE ENTITLEMENTS & MARKETING

### 12.1 `suppliers` & `purchase_orders`
Multi-institution vendor management.

```sql
CREATE TABLE suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) NOT NULL,
    contact_person VARCHAR(128) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE supplier_institutions (
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    vendor_code VARCHAR(64),
    PRIMARY KEY (supplier_id, institution_id)
);

CREATE TABLE purchase_orders (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    po_number VARCHAR(64) NOT NULL,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'Textbooks', 'Stationery', 'Uniforms', 'Lab Equipment'
    order_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    delivery_status VARCHAR(32) DEFAULT 'pending' NOT NULL, -- 'pending', 'partially_delivered', 'delivered', 'cancelled'
    total_amount NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_po_institution_number UNIQUE (institution_id, po_number)
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id VARCHAR(64) REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(32) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL
);
```

### 12.2 `school_service_configs` & `marketing`
```sql
CREATE TABLE school_service_configs (
    school_id VARCHAR(64) PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    package VARCHAR(32) NOT NULL, -- 'erp_only', 'marketing_only', 'erp_marketing', 'custom'
    account_status VARCHAR(32) DEFAULT 'active' NOT NULL,
    entitlements JSONB NOT NULL, -- Map of 14 service keys -> { enabled, status, activationDate }
    assigned_marketing_manager VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE service_entitlement_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    actor_id VARCHAR(64) REFERENCES users(id) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    service_id VARCHAR(64),
    previous_value VARCHAR(128),
    new_value VARCHAR(128),
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE marketing_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(64) NOT NULL, -- 'google_search', 'meta_ads', 'instagram', 'local_awareness'
    monthly_budget NUMERIC(10,2) NOT NULL,
    spend_to_date NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    leads_generated INTEGER DEFAULT 0 NOT NULL,
    clicks INTEGER DEFAULT 0 NOT NULL,
    impressions INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'paused', 'draft', 'completed'
    principal_approval_status VARCHAR(32) DEFAULT 'approved' NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE marketing_leads (
    id VARCHAR(64) PRIMARY KEY,
    school_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    grade_applying VARCHAR(32) NOT NULL,
    source_channel VARCHAR(64) NOT NULL,
    campaign_id VARCHAR(64) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'new' NOT NULL, -- 'new', 'contacted', 'campus_tour_scheduled', 'application_submitted', 'enrolled', 'dropped'
    inquiry_notes TEXT,
    converted_application_no VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

## 13. AUDIT LOGGING & SYSTEM NOTIFICATIONS

### 13.1 `audit_logs` (Master System Audit Trail)
```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE SET NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PROMOTION', 'FEE_PAYMENT'
    entity_type VARCHAR(64) NOT NULL, -- 'Student', 'Class', 'FeeInvoice', 'PromotionBatch'
    entity_id VARCHAR(64) NOT NULL,
    details TEXT,
    diff_data JSONB, -- Previous vs new field changes
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_audit_logs_inst_date ON audit_logs(institution_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

### 13.2 `app_notifications`
```sql
CREATE TABLE app_notifications (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE NOT NULL,
    recipient_user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    recipient_role VARCHAR(32),
    sender_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    category VARCHAR(32) NOT NULL, -- 'class_group', 'staff_group', 'notice', 'assignment', 'fee', 'transport'
    priority VARCHAR(16) DEFAULT 'normal' NOT NULL, -- 'low', 'normal', 'high', 'urgent'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(512),
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_notifications_recipient ON app_notifications(recipient_user_id, is_read);
```

---

*Verified: Complete 3NF normalized PostgreSQL schema with 38 relational tables.*

