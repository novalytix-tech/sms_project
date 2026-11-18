# School ERP — Complete School Management System (SMS)

> **Developed by NTS Novalytix**  
> A centralized, modern, responsive enterprise School ERP frontend architecture engineered for school administrators, teachers, parents, students, and suppliers.

---

## 1. Product Identity & Branding

- **Product Name:** School ERP
- **Product Subtitle:** School Management System
- **Developer Attribution:** Developed by **NTS Novalytix**
- **Default School Identity:** St. Xavier's International Academy (CBSE Affiliation: `CBSE/AFF/2026/89410`)
- **Branding Locations:** Login screen, main sidebar, sidebar footer, application footer, topbar, and software information page.
- **Independence of Identity:** The client school profile (name, logo, board, address, principal) is completely customizable within **School Settings**, while the **NTS Novalytix** software developer attribution remains an application-level branding element.

---

## 2. Technology Stack & Constraints

- **Core Framework:** React 19 + TypeScript + Vite
- **Routing:** React Router v7 (`createBrowserRouter`)
- **Styling Architecture:** Pure standard CSS and CSS Custom Properties (Variables)
  - 🚫 **Strictly NO Tailwind CSS**
  - 🚫 **NO Bootstrap, Material UI, Ant Design, or prebuilt component frameworks**
  - High-performance, maintainable modular CSS written by hand
- **Icons:** Lucide React
- **Analytics & Visualizations:** Recharts (responsive line charts, bar charts, donut distribution charts)
- **Data Formatting:** Indian Rupee Currency representation (`formatCurrencyINR` with Lakhs/Crores grouping: e.g. `₹ 12,50,000`) and standard school date formatters (`dd/MM/yyyy`).
- **Data Persistence:** Reactive `localStorage` adapter (`ERPStorage`) with JSON schema validation, corrupted store auto-recovery, and instant cross-component updates.

---

## 3. Demo Login Accounts & 6 User Roles

The application provides an instant **Role Switcher Banner** at the top of the interface, as well as an interactive **Demo Login Portal** with one-click persona cards:

| # | Role | Demo Persona Name | Demo Login Email | Default Password | Key Workspace Focus |
|---|------|-------------------|------------------|------------------|---------------------|
| 1 | **Super Admin** | Vikramaditya Rao | `superadmin@novalytix.com` | `admin123` | Multi-school governance, institution directory, aggregate capacity, subscription tiers |
| 2 | **School Admin** | Dr. Arvind Swaminathan (Principal) | `principal@stxaviers.edu.in` | `admin123` | Institutional dashboard, students, teachers, classes, fees, exam approvals, calendar |
| 3 | **Teacher** | Mrs. Ananya Sharma (PGT Maths) | `ananya.sharma@stxaviers.edu.in` | `teacher123` | Assigned classes (10-A, 10-B, 9-A), timetable periods, daily attendance, grading, leaves |
| 4 | **Parent** | Mr. Vikram Patel | `vikram.patel@gmail.com` | `parent123` | **Multi-child switcher** (Aarav in 10-A, Diya in 8-A), attendance %, fee invoices, receipts, bus stop |
| 5 | **Student** | Aarav Patel | `aarav.patel@student.stxaviers.edu.in` | `student123` | Schedule, attendance rate, homework turn-ins, exam report card, library loans, personal to-do tasks |
| 6 | **Supplier** | Apex Educational Supplies | `orders@apexsupplies.in` | `supplier123` | School purchase orders, line items, scheduled delivery dates, fulfillment status updates |

---

## 4. Implemented Modules & Features

### Core Management
1. **Student Directory & Student 360° Profile:**
   - Search by name, roll number, admission number, guardian phone.
   - Filter by class, section, status.
   - New student admission form with 4-step logical sections and duplicate admission number validation.
   - Student 360° comprehensive modal displaying attendance %, fee balance, examination scores, and transport details.
   - Activate / deactivate student toggle, delete action, and CSV export.

2. **Teacher & Staff Management:**
   - Directory with department filtering, staff ID, qualification, and contact details.
   - Registration and edit modal with staff ID uniqueness checks.
   - Departmental allocation overview and assigned subject/class schedules.

3. **Classes, Sections & Subjects:**
   - Class cards with room allocation, student count, class teacher assignment, and subjects taught.
   - Duplicate prevention within the same academic session.

4. **Daily Attendance Register:**
   - Select class, section, and date.
   - Live roster roll call: `Present`, `Absent`, `Late`, `Excused`.
   - "Mark All Present" one-click action.
   - Real-time calculation of presence percentage and absence counts.
   - Duplicate prevention per student per date.
   - CSV export of daily class roster.

5. **Homework & Assignments:**
   - Class-specific assignment creation with due dates, maximum scores, and instructions.
   - Student submission simulation with solution notes.
   - Teacher evaluation interface to award scores and constructive feedback.

6. **Examinations, Schedules & Gradebook:**
   - Creation of examinations (Mid-Term, Unit Test, Final Exam).
   - Timetable paper scheduling with start/end times, max marks, passing marks, and room numbers.
   - Batch marks entry matrix with validation (`0 <= marks <= maxMarks`) and absent flags.
   - Automatic CBSE letter grade calculation (A1, A2, B1, B2, C1, C2, D).
   - Printable student report card preview with school branding and signature lines.

7. **Fees & Accounts Ledger:**
   - Categorized fee invoices (Tuition, Transport, Examination, Admission).
   - Real-time calculation of billed amount, collected revenue, and outstanding dues.
   - Manual payment recording supporting partial installments (validated against balance due).
   - Official printable fee receipt with Indian Rupee formatting (`₹`), invoice reference, payment mode, and receipt number.
   - CSV export of accounts ledger.

8. **Timetable Management:**
   - Weekly grid layout (Monday through Saturday, Periods 1 to 6).
   - Period allocation with intelligent clash warnings (checks teacher availability and classroom occupancy).

9. **School Calendar & Events:**
   - Monthly calendar items categorized into holidays, examinations, PTM meetings, sports meets, and academic activities.
   - Target audience tagging (`all`, `teachers`, `students`, `parents`).

10. **Notices & Circulars:**
    - Priority classification (`normal`, `high`, `urgent`).
    - Audience filtering.
    - Read/unread indicators and dismissal actions.

11. **Internal Messaging:**
    - Two-pane communication center with direct reply threads.
    - Role-based recipient selection (Principal, Teacher, Parent, Supplier).

12. **Leave Management:**
    - Medical, casual, emergency, and vacation leave request forms.
    - Administrative approval/rejection pipeline with review remarks.

13. **Library Management:**
    - Book catalog with shelf locations, stock count, and available copies.
    - Issue book modal (updates available copies; prevents checkout when stock is 0).
    - Return copy workflow and loan history logging.

14. **Transport Management:**
    - Bus routes, vehicles, driver contact numbers, stop schedules, and term fees.

15. **Institutional Reports & Exports:**
    - Filterable audit views for Student Directory, Fee Realization, Outstanding Dues, Library Catalog, and Transport Roster.
    - One-click CSV export and print-ready layouts.

16. **Super Admin Multi-School Governance:**
    - Multi-institution directory, code registration, student/teacher aggregate headcounts, subscription plan tiers, and status toggles.

17. **Supplier Portal:**
    - Purchase orders list, expected delivery dates, line items breakdown, and fulfillment tracking (`pending`, `partially_delivered`, `delivered`).

18. **School Settings & Demo Storage:**
    - Editable school name, affiliation, board, academic year, contact info, and logo upload preview.
    - Instant JSON Backup download and file restore with schema verification.
    - Factory demo data reset.

---

## 5. Project Folder Structure

```
d:/SMS/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   └── router.tsx
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   ├── variables.css
│   │   ├── global.css
│   │   ├── layout.css
│   │   └── components.css
│   ├── data/
│   │   └── seedData.ts
│   ├── services/
│   │   ├── storage.ts
│   │   ├── studentService.ts
│   │   ├── teacherService.ts
│   │   ├── classService.ts
│   │   ├── attendanceService.ts
│   │   ├── assignmentService.ts
│   │   ├── examService.ts
│   │   ├── feeService.ts
│   │   ├── timetableService.ts
│   │   ├── calendarService.ts
│   │   ├── noticeService.ts
│   │   ├── messageService.ts
│   │   ├── leaveService.ts
│   │   ├── libraryService.ts
│   │   ├── transportService.ts
│   │   ├── supplierService.ts
│   │   ├── institutionService.ts
│   │   ├── settingsService.ts
│   │   └── reminderService.ts
│   ├── context/
│   │   └── ERPContext.tsx
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── export.ts
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ToastContainer.tsx
│   │   └── layout/
│   │       ├── DemoRoleBanner.tsx
│   │       ├── Footer.tsx
│   │       ├── Sidebar.tsx
│   │       └── Topbar.tsx
│   ├── layouts/
│   │   └── AppLayout.tsx
│   └── pages/
│       ├── auth/
│       │   └── LoginPage.tsx
│       ├── dashboards/
│       │   ├── DashboardRouter.tsx
│       │   ├── SchoolAdminDashboard.tsx
│       │   ├── SuperAdminDashboard.tsx
│       │   ├── TeacherDashboard.tsx
│       │   ├── ParentDashboard.tsx
│       │   ├── StudentDashboard.tsx
│       │   └── SupplierDashboard.tsx
│       ├── students/
│       │   └── StudentsPage.tsx
│       ├── teachers/
│       │   └── TeachersPage.tsx
│       ├── classes/
│       │   └── ClassesPage.tsx
│       ├── attendance/
│       │   └── AttendancePage.tsx
│       ├── assignments/
│       │   └── AssignmentsPage.tsx
│       ├── examinations/
│       │   └── ExaminationsPage.tsx
│       ├── fees/
│       │   └── FeesPage.tsx
│       ├── timetable/
│       │   └── TimetablePage.tsx
│       ├── calendar/
│       │   └── CalendarPage.tsx
│       ├── notices/
│       │   └── NoticesPage.tsx
│       ├── messages/
│       │   └── MessagesPage.tsx
│       ├── leave/
│       │   └── LeavePage.tsx
│       ├── library/
│       │   └── LibraryPage.tsx
│       ├── transport/
│       │   └── TransportPage.tsx
│       ├── reports/
│       │   └── ReportsPage.tsx
│       ├── institutions/
│       │   └── InstitutionsPage.tsx
│       ├── suppliers/
│       │   └── SuppliersPage.tsx
│       ├── settings/
│       │   └── SettingsPage.tsx
│       ├── about/
│       │   └── AboutPage.tsx
│       └── NotFound.tsx
```

---

## 6. How to Install & Run the Application

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to explore the School ERP.

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 7. Frontend Limitations & Future Backend Integration Points

The application has been strictly architected so that in the future phase, real REST or GraphQL APIs can replace the mock service adapters without restructuring frontend views:

1. **Authentication:** Currently implemented as a safe demo persona flow with instant role switching. In Phase 2, this will connect to OAuth 2.0 / JWT session tokens.
2. **Persistence:** Currently persisted in client-side `localStorage`. In Phase 2, `src/services/*` calls will issue `fetch`/`axios` requests to backend microservices and an SQL/PostgreSQL database.
3. **File Uploads:** Student assignment submissions and logo uploads simulate in-memory base64 preview; in Phase 2, files will upload to S3 / Google Cloud Storage buckets.
4. **Third-Party Integrations:** Payment gateway APIs (Razorpay / Stripe / UPI), SMS/WhatsApp dispatch gateways (Twilio / Gupshup), and GPS bus tracking will be mounted on the backend.

---

## 8. Quality Verification & Testing Summary

- **TypeScript Compilation:** `tsc -b` passed with 0 errors.
- **Production Build:** `vite build` completed successfully in ~880ms.
- **Tailwind CSS Audit:** Verified 0 dependencies and 0 references to Tailwind CSS across the entire repository.
- **Navigation & Routing:** All 20 application routes and 6 dashboard views verified.
- **Interactivity:** Form validations, modal dialogs, status badges, CSV export, JSON backup & restore verified.

---

*School ERP | Complete School Management System | Developed by **NTS Novalytix***
