# SCHOOL ERP — COMPREHENSIVE ARCHITECTURAL & WORKFLOW GUIDE

> **Project:** `D:\SMS`  
> **Architecture Audit Date:** October 2026  
> **System Baseline:** React 19, TypeScript, Vite, React Router, React Context, LocalStorage Persistence  
> **Status:** Read-Only Audit & Operational Workflow Map

---

## EXECUTIVE SUMMARY

This document provides a definitive technical reference for the internal architecture, runtime lifecycles, role permissions, state orchestration, data relationships, and production readiness gaps of the School ERP application at `D:\SMS`. 

All findings and diagrams in this directory are grounded directly in the inspected source code.

---

## 1. APPLICATION BOOTSTRAP & INITIALIZATION LIFECYCLE

### 1.1 Entry Point Chain
The application initializes through a clean single-page application (SPA) pipeline:
1. **HTML Shell (`index.html`):** Loads the root DOM element (`<div id="root"></div>`) and requests the TypeScript entry module `/src/main.tsx`.
2. **React Root Mounting (`src/main.tsx`):**
   - Utilizes React 19's `createRoot(document.getElementById('root')!)`.
   - Imports global stylesheets: `index.css` (Warm Crimson and Off-White tokens) and `leaflet/dist/leaflet.css` (Leaflet map tiles and marker styling).
   - Wraps the entire component hierarchy in `<ERPProvider>` (`src/context/ERPContext.tsx`).
   - Renders the primary application wrapper `<App />` (`src/App.tsx`).
3. **Application Shell (`src/App.tsx`):**
   - Injects `<RouterProvider router={router} />` created via React Router's `createBrowserRouter`.
   - Incorporates the global toast notifications system for real-time user feedback.

```
index.html 
   └── src/main.tsx (createRoot)
          └── ERPProvider (src/context/ERPContext.tsx)
                 └── App.tsx
                        └── RouterProvider (src/app/router.tsx)
```

---

## 2. AUTHENTICATION & DEMO SESSION MANAGEMENT

### 2.1 Persona Switcher vs Enterprise Authentication
- **Current Implementation:** A zero-friction, client-side demo authentication model implemented in `src/pages/WorkspaceLoginPage.tsx`.
- **Role Switcher Logic:** The function `handleRoleSelect(role: UserRole)` sets the active `currentUser` in `ERPContext` without server authentication.
- **Configured Demo Personas:**
  | Role | Display Name | Reference ID / Staff ID | Primary Responsibility / Context |
  | :--- | :--- | :--- | :--- |
  | `super_admin` | Dr. Sarah Jenkins | `USER-SA-01` | Institutional governance, multi-branch control, master audits |
  | `school_admin` | Rajesh Sharma | `USER-A-01` | Daily operations, fees, timetable, staff allocation, promotion |
  | `teacher` | Anita Desai | `TCH-001` (Assigned 10-A) | Class Teacher for 10-A, attendance, homework, exams, class group |
  | `student` | Aarav Sharma | `ADM-2026-001` (Class 10-A) | Enrolled student, timetable, homework submission, bus tracking |
  | `parent` | Vikram Sharma | `USER-P-01` (Father of Aarav) | Child attendance, fee invoices, UPI demo pay, bus tracking |
  | `supplier` | Apex Stationery | `USER-SUP-01` | Purchase orders, inventory replenishment, deliveries |

### 2.2 Session State & Identity Persistence
- `currentUser` is retained in React state inside `ERPContext.tsx`.
- Helper `loginWithReference(role, referenceId)` allows switching personas dynamically to inspect contextual behavior (e.g. testing whether parent Vikram Sharma can only view child Aarav's school bus).

---

## 3. ROUTE EVALUATION & ACCESS CONTROL GUARDS

### 3.1 Routing Architecture (`src/app/router.tsx`)
The routing configuration organizes paths into distinct functional categories:
1. **Public Routes:** `/login` (`src/pages/WorkspaceLoginPage.tsx`).
2. **Dynamic Entry Router:** `/` renders `<DashboardRouter />` (`src/components/routing/DashboardRouter.tsx`).
3. **Protected Layout Shell (`src/layouts/AppLayout.tsx`):**
   - Renders the persistent navigation sidebar (`Sidebar.tsx`), header/topbar, and the routed `<Outlet />`.
4. **Role-Enforced Routes:** Wrapped inside `<ProtectedRoute allowedRoles={[...]} />` (`src/components/routing/ProtectedRoute.tsx`).

### 3.2 Dynamic Redirection & Guard Mechanism
- **Dashboard Dispatching:**
  When a user lands on `/`, `DashboardRouter.tsx` inspects `currentUser.role`:
  - `super_admin` $\rightarrow$ `/super-admin`
  - `school_admin` $\rightarrow$ `/admin`
  - `teacher` $\rightarrow$ `/teacher`
  - `student` $\rightarrow$ `/student`
  - `parent` $\rightarrow$ `/parent`
  - `supplier` $\rightarrow$ `/supplier`
- **Access Violation Handling:**
  If a student or parent attempts to navigate directly to `/classes` or `/admissions`, `ProtectedRoute.tsx`:
  1. Detects unauthorized role: `!allowedRoles.includes(currentUser.role)`.
  2. Emits an error toast: `"Access Restricted"`.
  3. Re-routes the user safely back to `/` (which redirects them to their legitimate dashboard).

---

## 4. TYPICAL COMPONENT DATA READ/WRITE LIFECYCLE

Every feature page in the application follows a predictable, unidirectional React lifecycle:

```
[Page Component Mounts]
        │
        ▼
Reads initial collections from ERPContext via useERP()
        │
        ▼
Runs local filtering/sorting (React useState & useMemo)
        │
        ▼
User interacts (e.g. clicks "Submit", "Save", "Promote")
        │
        ▼
Calls dedicated business service (e.g. classManagementService.ts)
        │
        ▼
Service validates data & updates ERPContext dispatchers
        │
        ▼
ERPContext triggers ERPStorage.save({ ...updates })
        │
        ▼
Synchronous write to LocalStorage ('nts_novalytix_school_erp_store_v1')
        │
        ▼
UI re-renders with fresh data & displays feedback Toast
```

---

## 5. LOCALSTORAGE PERSISTENCE & MIGRATION ENGINE

### 5.1 Storage Architecture (`src/services/storage.ts`)
- **Single Storage Key:** `nts_novalytix_school_erp_store_v1`.
- All ERP data resides in a single, unified JSON object conforming to the `ERPDataStore` interface (`src/types/index.ts`).

### 5.2 Auto-Migration & Backfill Engine
Whenever `ERPStorage.get()` is invoked:
1. It attempts to read and parse the JSON string from `localStorage`.
2. If absent or invalid, it initializes the database with comprehensive seed data (`initialDataStore` in `src/services/mockData.ts`).
3. **Safe Schema Backfills:** The storage layer inspects whether newer collections exist in the parsed object. If any are undefined, it backfills them safely without overwriting user data:
   - `admissions: parsed.admissions || initialDataStore.admissions`
   - `academicSessions: parsed.academicSessions || initialDataStore.academicSessions`
   - `studentEnrollments: parsed.studentEnrollments || initialDataStore.studentEnrollments`
   - `promotionBatches: parsed.promotionBatches || []`
   - `importBatches: parsed.importBatches || []`
   - `classGroups: parsed.classGroups || initialDataStore.classGroups`
   - `classGroupMessages: parsed.classGroupMessages || initialDataStore.classGroupMessages`
   - `transportTrips: parsed.transportTrips || initialDataStore.transportTrips`
   - `transportLocations: parsed.transportLocations || []`
   - `transportSafetyEvents: parsed.transportSafetyEvents || []`
   - `transportAlerts: parsed.transportAlerts || []`

---

## 6. INTER-MODULE DATA ORCHESTRATION

The ERP's business domains are tightly coupled through consistent entity identifiers:

```
             ┌─────────────────────────┐
             │  ADMISSIONS & INQUIRY   │
             │   (APP-2026-XXXX)       │
             └────────────┬────────────┘
                          │ enrollStudent()
                          ▼
             ┌─────────────────────────┐
             │   PERMANENT STUDENT     │
             │   (ADM-2026-XXX)        │
             └──────┬───────────┬──────┘
                    │           │
     assigned to    │           │ enrolled via
                    ▼           ▼
┌────────────────────────┐ ┌─────────────────────────┐
│       CLASS ROOM       │ │   STUDENT ENROLLMENT    │
│ (Grade, Section, Room) │ │  (Session, Roll Number) │
└──────┬───────────┬─────┘ └─────────────────────────┘
       │           │
       │           ├───────────────────────┐
       ▼           ▼                       ▼
┌─────────────┐ ┌───────────────┐ ┌─────────────────┐
│ ATTENDANCE  │ │  ASSIGNMENTS  │ │   EXAMINATIONS  │
│ (Daily Log) │ │  & HOMEWORK   │ │   & REPORT CARD │
└─────────────┘ └───────────────┘ └────────┬────────┘
                                           │
                                           │ promotion criteria
                                           ▼
                                  ┌─────────────────┐
                                  │ ACADEMIC YEAR   │
                                  │   PROMOTION     │
                                  └─────────────────┘
```

1. **Admissions $\rightarrow$ Enrollment:** When an admission is approved in `admissionService.ts`, calling `enrollStudent()` generates a permanent admission number (`ADM-2026-XXX`), creates a `Student` record, an initial `StudentEnrollment` record, and updates the class capacity.
2. **Classes $\rightarrow$ Academics:** Attendance, homework assignments, and examinations are indexed by `classId` and `section`.
3. **Academics $\rightarrow$ Academic Promotion:** `promotionService.ts` evaluates exam scores, student attendance rates ($>75\%$), and fee clearance to compute promotion eligibility.
4. **Transport $\rightarrow$ Parent Portal:** `transportService.ts` inspects whether a student has an assigned `transportRouteId`. If opted in, live route telemetry and stop proximity are projected on Leaflet maps.

---

## 7. REFRESH & LOGOUT BEHAVIOR

- **Browser Refresh ($F5$ / Ctrl+R):**
  Because all operational records are stored in `localStorage`, refreshing the browser does not lose modified classes, added students, marked attendance, or submitted homework. The state rehydrates cleanly via `ERPStorage.get()`.
- **User Logout:**
  Triggering `logout()` clears `currentUser` from context state and redirects the browser to `/login`. LocalStorage remains untouched so that administrators or teachers can log back in without data loss.

---

## 8. PRODUCTION READINESS & BACKEND REQUIREMENTS

To transition this single-browser prototype into a live, multi-user school management platform, the following infrastructure must be implemented:

1. **Centralized REST/GraphQL API Server:**
   A backend service (Node.js/Express, NestJS, Go, or Python FastAPI) to replace in-memory service functions and mediate database transactions.
2. **Relational Database with Spatial Indexing (PostgreSQL + PostGIS):**
   - Complete ACID transactions for academic promotions, fee payments, and admissions.
   - PostGIS geometry columns (`ST_Point`, `ST_Distance`) for geofencing school bus routes, calculating stop proximities, and detecting route deviations.
3. **Cryptographic Authentication & Session Authority:**
   - Password hashing with `bcrypt` / `argon2`.
   - JWT tokens with short expiry and HTTP-only refresh tokens.
   - Server-enforced role permissions (preventing client-side tampering).
4. **Real-Time Telemetry Pipeline (WebSockets / MQTT):**
   - High-throughput WebSocket server to stream GPS coordinates to parents and administrators at 1–5 second intervals without polling.
5. **Physical GPS Hardware Ingestion Engine:**
   - Standardized AIS-140 / Teltonika / OBD-II protocol parsers with IMEI verification, replay-attack prevention, and GPS timestamp sanitization.
6. **Cloud Blob Storage (AWS S3 / Google Cloud Storage):**
   - Secure storage for assignment file attachments, admission certificates, and student ID card photos.
7. **Telecom SMS & WhatsApp Notification Gateway:**
   - Integration with Twilio, AWS SNS, or Gupshup for instant parent alerts regarding bus arrivals, emergency delays, or student absences.
8. **Real Payment Gateway Integration:**
   - Razorpay, Stripe, or PayU webhook processing with cryptographic HMAC validation for student tuition fee settlement.

---

## 9. KNOWN LIMITATIONS & CODEBASE ANOMALIES

1. **Single-Device Isolation:** Data entered on one teacher's laptop is saved in their browser's `localStorage` and will not synchronize with the admin's device.
2. **5MB LocalStorage Ceiling:** Base64-encoded file attachments in homework or admissions can rapidly consume the browser's 5MB quota.
3. **Simulated GPS:** The bus tracking feature uses `simulateStepAlongRoute()` in `transportService.ts` to advance vehicle coordinates along a static array of route coordinates.
4. **Simulated Payments:** The payment modal allows immediate mock authorization without interacting with banking APIs.
5. **Lack of Cascading Deletes:** Deleting a class does not automatically clean up associated historical attendance or assignment records in other collections.

---

## 10. PRIMARY SOURCE CODE DIRECTORY REFERENCE

| Major Workflow Domain | Primary UI Components | Business Services & Logic | Storage Collections Involved |
| :--- | :--- | :--- | :--- |
| **Authentication & Routing** | `src/pages/WorkspaceLoginPage.tsx`<br/>`src/components/routing/ProtectedRoute.tsx`<br/>`src/components/routing/DashboardRouter.tsx` | `src/context/ERPContext.tsx`<br/>`src/app/router.tsx` | In-memory session state |
| **Class & Session Management** | `src/pages/ClassManagementPage.tsx`<br/>`src/components/class/ClassPromotionModal.tsx`<br/>`src/components/class/BulkStudentImportModal.tsx` | `src/services/classManagementService.ts`<br/>`src/services/promotionService.ts` | `classes`<br/>`academicSessions`<br/>`studentEnrollments`<br/>`promotionBatches` |
| **Student Admissions** | `src/pages/AdmissionsPage.tsx`<br/>`src/components/admissions/NewInquiryModal.tsx` | `src/services/admissionService.ts` | `admissions`<br/>`students`<br/>`studentEnrollments` |
| **Student Attendance** | `src/pages/AttendancePage.tsx`<br/>`src/components/attendance/AttendanceStatsCard.tsx` | `src/services/attendanceService.ts` | `attendance`<br/>`students`<br/>`classes` |
| **Homework & Submissions** | `src/pages/HomeworkPage.tsx`<br/>`src/components/homework/SubmitHomeworkModal.tsx`<br/>`src/components/homework/AssignmentCard.tsx` | `src/services/assignmentService.ts` | `assignments`<br/>`students` |
| **Examinations & Grading** | `src/pages/ExaminationsPage.tsx`<br/>`src/pages/ReportCardsPage.tsx` | `src/services/examService.ts` | `examinations`<br/>`examMarks`<br/>`gradingSchemes` |
| **Fees & Transactions** | `src/pages/FeesPage.tsx`<br/>`src/components/fees/PaymentReceiptModal.tsx` | `src/services/feeService.ts` | `feeInvoices`<br/>`paymentTransactions`<br/>`feeStructures` |
| **School Bus GPS & Safety** | `src/pages/TransportPage.tsx`<br/>`src/components/transport/TransportMap.tsx`<br/>`src/components/transport/StudentCheckinModal.tsx` | `src/services/transportService.ts` | `transportRoutes`<br/>`transportTrips`<br/>`transportLocations`<br/>`transportSafetyEvents`<br/>`transportAlerts` |
| **Staff & Class Messaging** | `src/pages/StaffMessagesPage.tsx`<br/>`src/components/class/ClassGroupAnnouncementCard.tsx` | `src/services/staffMessagingService.ts`<br/>`src/services/classGroupService.ts` | `staffGroups`<br/>`staffGroupMessages`<br/>`classGroups`<br/>`classGroupMessages` |
| **Storage & Seed Engine** | N/A (Headless) | `src/services/storage.ts`<br/>`src/services/mockData.ts` | `nts_novalytix_school_erp_store_v1` (All 32 collections) |

