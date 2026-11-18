# SCHOOL ERP — ARCHITECTURAL BLUEPRINTS & WORKFLOW MAPS

> **Project Root:** `D:\SMS`  
> **Documentation Directory:** `D:\SMS\docs\architecture\`  
> **Audit Status:** Verified Read-Only Architectural Audit (October 2026)  
> **Stack Profile:** React 19, TypeScript, Vite, React Router, React Context, LocalStorage (`nts_novalytix_school_erp_store_v1`)

---

## OVERVIEW

This directory contains a complete, source-verified visual workflow and architectural specification for the School ERP application. All diagrams and documentation have been constructed by inspecting the actual source code, routing tables, context dispatchers, business services, LocalStorage schema, and automated tests.

---

## MASTER INDEX OF ARCHITECTURAL DIAGRAMS

| File Name | Diagram Type | Core Domain / Scope Represented |
| :--- | :--- | :--- |
| **[`system-architecture.mmd`](./system-architecture.mmd)** | `flowchart TD` | **System Topology & Layering:** React 19 SPA entry points, `ERPContext`, Router, Protected Routes, App Shell, Business Services, LocalStorage persistence, and mock data engine. |
| **[`role-access-map.mmd`](./role-access-map.mmd)** | `flowchart LR` | **Role-Based Access Control (RBAC):** Exhaustive capability matrix mapping Super Admin, School Admin, Teacher, Class Teacher, Student, Parent, and Supplier with permitted vs restricted operations. |
| **[`application-navigation.mmd`](./application-navigation.mmd)** | `flowchart TD` | **Navigation Tree & Route Guards:** Full path tree across all 6 roles, sidebar groupings, `/login` flow, `/` dynamic router dispatch, and access-violation redirects. |
| **[`student-lifecycle.mmd`](./student-lifecycle.mmd)** | `flowchart TD` | **End-to-End Academic Journey:** Inquiry (`APP-2026-XXXX`) $\rightarrow$ Document verification $\rightarrow$ Enrollment (`ADM-2026-XXX`) $\rightarrow$ Class allocation $\rightarrow$ Daily operations $\rightarrow$ Session promotion $\rightarrow$ Graduation/Exit. |
| **[`attendance-workflow.mmd`](./attendance-workflow.mmd)** | `flowchart TD` | **Attendance Recording & Auditing:** Class roster fetching, unmarked vs existing records, leave conflict detection, administrative overrides, duplicate prevention, and parent read-only tracking. |
| **[`homework-workflow.mmd`](./homework-workflow.mmd)** | `flowchart TD` | **Homework & Grading Lifecycle:** Teacher assignment creation, student deadline validation, draft vs final turn-in, teacher scoring/feedback, grade publishing, and resubmissions. |
| **[`fees-and-payments-workflow.mmd`](./fees-and-payments-workflow.mmd)** | `flowchart TD` | **Fee Management & Settlements:** Fee structure configuration, term invoicing, student balance tracking, simulated UPI/Card payment modal, receipt vouchers, and reporting. |
| **[`staff-messaging-workflow.mmd`](./staff-messaging-workflow.mmd)** | `flowchart TD` | **Staff Communication Channels:** Group creation permissions, member selection, high-reach broadcast confirmation ($>20$ recipients), message persistence, and read receipts. |
| **[`transport-gps-workflow.mmd`](./transport-gps-workflow.mmd)** | `flowchart TD` | **Bus Tracking & Student Safety:** Route assignments, Leaflet interactive map, simulated telemetry vs physical GPS, stop ETAs, 450m route deviation geofence, and boarding manifests. |
| **[`data-relationships.mmd`](./data-relationships.mmd)** | `erDiagram` | **Entity Relationship Architecture:** Complete relational schema of all 32 collections in `src/types/index.ts` with explicit primary, foreign, and inferred keys. |
| **[`service-data-flow.mmd`](./service-data-flow.mmd)** | `sequenceDiagram` | **Component Execution Traces:** Step-by-step sequence diagrams tracing 4 key user actions (Student submits homework, Teacher saves attendance, Admin promotes class, Parent tracks bus). |
| **[`production-gap-map.mmd`](./production-gap-map.mmd)** | `flowchart TD` | **Production Readiness & Gap Analysis:** Comparison between currently implemented frontend/LocalStorage features, simulated mocks, and missing enterprise backend infrastructure. |
| **[`project-workflow-guide.md`](./project-workflow-guide.md)** | Markdown Guide | **10-Section Architectural Reference:** Deep technical explanation covering startup, authentication, routing, state management, storage migrations, and primary source files. |

---

## HOW TO VIEW MERMAID DIAGRAMS

The `.mmd` files in this directory are standard GitHub-flavored Mermaid diagrams. You can render them in several ways:

### 1. In Your IDE (VS Code / Antigravity)
- Install the **Markdown Preview Mermaid Support** extension or **Mermaid Chart** extension.
- Open any `.mmd` file to preview the visual diagram directly inside the editor pane.

### 2. Online via Mermaid Live Editor
- Navigate to [https://mermaid.live](https://mermaid.live).
- Copy and paste the raw text from any `.mmd` file into the left pane.
- The interactive vector graphic will render instantly, allowing you to pan, zoom, or export as PNG/SVG.

### 3. Command Line Export (Mermaid CLI)
If you have Node.js installed, you can render any diagram to an image using `@mermaid-js/mermaid-cli`:
```bash
# Example: Render the System Architecture to PNG
npx @mermaid-js/mermaid-cli -i docs/architecture/system-architecture.mmd -o docs/architecture/system-architecture.png
```

---

## VISUAL STYLING & STATUS CONVENTIONS

Across all flowchart diagrams, visual styling follows a consistent status taxonomy:

- **🟢 Green Nodes (`implementedLive` / `implementedStep`):**
  Indicates capabilities that are fully coded, interactive, and active in the application frontend.
- **🔵 Blue Nodes (`localStorageTier`):**
  Indicates components that read or write persistently to the browser's `localStorage` (`nts_novalytix_school_erp_store_v1`).
- **🟠 Amber Nodes (`simulatedTier` / `decisionBranch`):**
  Indicates features that are currently simulated on the frontend (e.g. simulated GPS bus movement along route points, simulated UPI payments, instant demo persona switching).
- **🔴 Red Dashed Nodes (`missingBackendTier` / `rejectedStep`):**
  Indicates required server-side infrastructure (REST API, PostgreSQL database, JWT authentication, push notification gateways) that does not yet exist.
- **🟣 Purple Dashed Nodes (`missingInfraTier`):**
  Indicates external physical hardware or third-party telecom services (AIS-140 GPS trackers, SMS/WhatsApp gateways, live banking webhooks).

