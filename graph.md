# Maaya World HRMS — Codebase Graph

_Last updated: 2026-11-13 · Maintained by: Antigravity coding agent_

## Overview

**Maaya World HRMS** (formerly PulseHRMS) is an enterprise-grade full-stack Human Resource & Payroll Management platform tailored for multi-venue workforce operations (Hyderabad, Visakhapatnam, and Bhubaneswar). The frontend is a modern, high-density React 19 application with TypeScript, Tailwind CSS v4, Vite 8, Redux Toolkit, and TanStack Query, adhering to a strict "clean web design" standard (flat hierarchies, no emojis, Lucide SVG icons). The backend is a Spring Boot 3.5.6 (Java 17) REST API connected to PostgreSQL 16 via Spring Data JPA/Hibernate, with transactional email delivery powered by Zoho ZeptoMail.

### How to Run Locally

- **One-click startup (Windows)**: `start.bat` (starts WSL PostgreSQL, launches Spring Boot on port `8083`, launches Vite on port `5173`, and opens the browser).
- **Manual commands**:
  - Frontend: `npm run dev` (runs Vite dev server on `http://localhost:5173`)
  - Backend: `npm run backend` or `cd backend && mvnw.cmd spring-boot:run` (runs Spring Boot on `http://localhost:8083`)
  - Stop services: `stop.bat` (kills processes on ports `8083` and `5173`)

---

## Directory Structure

```
d:\Hrms/
├── AGENTS.md                          — Project rules, design constraints, and UI guidelines
├── BACKEND_INTEGRATION.md             — Architecture notes, REST specifications, and migration guide
├── README.md                          — Project overview, credentials, 20-screen map, and feature matrix
├── package.json                       — Frontend dependencies (React 19, Tailwind v4, Redux Toolkit, Vite 8)
├── vite.config.ts                     — Vite setup, `@` alias pointing to `/src`, proxy `/api` -> `http://localhost:8083`
├── start.bat / stop.bat               — Orchestration scripts to start/stop full-stack environment
│
├── backend/                           — Spring Boot Java application
│   ├── pom.xml                        — Maven POM (Spring Boot 3.5.6, Java 17, Data JPA, PostgreSQL, Lombok)
│   ├── mvnw / mvnw.cmd                — Maven wrappers
│   └── src/main/
│       ├── java/com/example/
│       │   ├── controller/            — Spring REST Controllers (Auth, Center, Employee, Attendance, Leave, OnDuty, Payroll, Settings)
│       │   ├── demo/                  — Main class (EmployeeApplication) & seed data (DataInitializer)
│       │   ├── entity/                — JPA Hibernate Entities (Employee, AttendanceRecord, LeaveRequest, OnDutyRequest, Payslip, AuditLog, Location, etc.)
│       │   ├── repository/            — Spring Data JPA Repositories
│       │   ├── security/              — AuthFilter (Bearer RBAC), AuthTokenService (HMAC-SHA256), PasswordHasher (PBKDF2), PortalUrlResolver
│       │   └── service/               — Business logic (EmployeeServiceImpl, AuthService, CenterService, AuditService, PayrollCalculator, ZeptoMailService)
│       └── resources/
│           └── application.properties — DB URL (PostgreSQL 5432/hrms_db), port 8083, env-backed ZeptoMail & auth secrets
│
└── src/                               — React TypeScript Single Page Application
    ├── main.tsx                       — React 19 entry point
    ├── App.tsx                        — App router, role routing, error boundary, QueryClient & Redux Provider
    ├── index.css                      — Global Tailwind CSS styles and reset
    ├── assets/                        — Logos, brand vectors, and media
    ├── components/
    │   ├── attendance/                — Biometric webcam/geofence modal & 1-month paginated history modal (BiometricAttendanceModal.tsx, EmployeeAttendanceHistoryModal.tsx)
    │   ├── common/                    — Shared UI: Button, Input, PasswordInput, Textarea, Modal, DataTable, PageHeader, OperationsDashboard, StatTile, etc.
    │   ├── employee/                  — Mobile employee primitives (`MobilePrimitives.tsx`)
    │   ├── layout/                    — Shells: AppLayout (Desktop Admin/Manager), EmployeeMobileLayout (Mobile-First Shell), AuthLayout, Sidebar, Header
    │   └── payroll/                   — Modular payroll review modals & printable payslip components
    ├── features/
    │   ├── admin/                     — Admin screens: Dashboard, EmployeeManagement, Attendance, Leaves, Payroll, Reports (`reports/`), Settings (`settings/`)
    │   ├── auth/                      — Auth screens: Login, ForgotPassword, ResetPassword
    │   ├── employee/                  — Employee screens: Dashboard (integrated attendance check-in & monthly history), MyLeaves, MySalary, Profile
    │   └── manager/                   — Manager screens: Dashboard, TeamAttendance, TeamLeaves
    ├── hooks/                         — Custom React hooks (`useOperationsFilters`, `useCenters`, etc.)
    ├── services/
    │   └── api.ts                     — Centralized API service layer calling `/api` endpoints
    ├── store/                         — Redux Toolkit store setup
    │   └── slices/                    — authSlice (session & roles), uiSlice (toasts & mobile/sidebar toggles)
    ├── types/                         — Domain TypeScript interfaces and types
    └── utils/                         — Helpers: access, dutyTypes, faceBiometrics, formatters (INR, dates), geolocation (Haversine formula), operations, payroll, reportingManager, salaryCalculator, shiftUtils, status
```

---

## Apps, Services & Architecture Boundaries

1. **Frontend Client (`/src`)**:
   - Single Page Application built with React 19, TypeScript, and Vite.
   - Dual layout architecture:
     - `AppLayout`: High-density desktop workspace for **Admin** and **Manager** personas with collapsible sidebar and global command palette (`Ctrl+K`).
     - `EmployeeMobileLayout`: Dedicated mobile-first layout with bottom navigation bar (Home, Attendance, Leave, Payslips, Profile), pull-up sheets, and card feeds.
2. **Backend Server (`/backend`)**:
   - Spring Boot REST API running on `http://localhost:8083`.
   - Reverse-proxied by Vite through `/api` during development so frontend requests are seamlessly forwarded without CORS issues.
3. **Database (PostgreSQL 16)**:
   - Hosted locally or via WSL on port 5432 (`hrms_db`).
   - Managed by Hibernate DDL auto (`update`).
4. **Third-Party Email Gateway (Zoho ZeptoMail)**:
   - REST API `https://api.zeptomail.in/v1.1/email`.
   - Used for sending HTML welcome emails with employee credentials and password reset recovery codes.

---

## Data Models & Schema

### 1. `Employee` (`com.example.entity.Employee` / `src/types/index.ts`)
- **Primary Key**: `id` (`Long` / `string`)
- **Key Fields**: `employeeCode` (e.g., `MW-1001`), `firstName`, `lastName`, `email` (unique), `phone`, `jobTitle` / `designation`, `department`, `location` (Hyderabad, Vizag, Bhubaneswar), `shift` (`MORNING`, `EVENING`), `monthlySalary`, `ctcAnnual`, `dateOfJoining`, `employmentType` (`FULL_TIME`, `PART_TIME`), `role` (`ADMIN`, `MANAGER`, `EMPLOYEE`), `status` (`ACTIVE`, `PROBATION`, `TERMINATED`).
- **Statutory & Banking Details**: `accountNumber`, `ifscCode`, `bankName`, `panNumber`, `uanNumber`.
- **Emergency Contact**: `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelationship`.
- **Security**: `password` (write-only PBKDF2 hash), `temporaryPassword` (transient onboarding-only), `mustChangePassword`, `enrolledFacePhoto`, `enrolledFaceBiometrics`.

### 2. `AttendanceRecord` (`com.example.entity.AttendanceRecord` / `src/types/index.ts`)
- **Fields**: `id`, `employeeId`, `employeeName`, `departmentName`, `location`, `shift`, `date` (`YYYY-MM-DD`), `checkIn` (`HH:mm:ss`), `checkOut` (`HH:mm:ss`), `status` (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `LATE`), `workHours` (double), `regularizationStatus` (`NONE`, `PENDING`, `APPROVED`, `REJECTED`), `regularizationReason`, `notes`.

### 3. `LeaveRequest` (`com.example.entity.LeaveRequest` / `src/types/index.ts`)
- **Fields**: `id`, `employeeId`, `employeeName`, `departmentName`, `location`, `leaveType` (`CASUAL_LEAVE`, `SICK_LEAVE`, `EARNED_LEAVE`, `COMP_OFF`), `startDate`, `endDate`, `days` (Double), `reason`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `appliedOn`, `reviewedBy`, `reviewedOn`, `reviewerComments`.

### 4. `LeaveBalance` (`com.example.entity.LeaveBalance` / `src/types/index.ts`)
- **Fields**: `id`, `employeeId`, `casualTotal` (12), `casualUsed`, `sickTotal` (10), `sickUsed`, `earnedTotal` (18), `earnedUsed`, `compOffTotal` (2), `compOffUsed`.

### 5. `PayrollRun` & `Payslip` (`com.example.entity.PayrollRun`, `Payslip` / `src/types/index.ts`)
- **PayrollRun**: `id`, `month`, `year`, `totalEmployees`, `totalGrossPay`, `totalDeductions`, `totalNetPay`, `status` (`DRAFT`, `APPROVED`, `DISBURSED`), `processedAt`, `disbursedAt`, `disbursedBy`.
- **Payslip**: `id`, `payrollRunId`, `employeeId`, `employeeCode`, `employeeName`, `designation`, `department`, `location`, `panNumber`, `uanNumber`, `bankAccount`, `bankName`, `month`, `year`, `grossPay`, `basicPay`, `hra`, `specialAllowance`, `conveyance`, `medicalAllowance`, `epfEmployee`, `epfEmployer`, `professionalTax`, `tds`, `healthInsurance`, `totalDeductions`, `netTakeHome`, `status` (`PAID`).

### 6. `Department`, `CompanySettings`, `Holiday`, `AuditLog`
- Organizational configuration, gazetted holidays, and audit tracking.

---

## APIs & Endpoints

| Method | Path | Purpose | Controller |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with email/password; returns token and user profile | `AuthController` |
| `POST` | `/api/auth/change-password` | Update user password and clear `mustChangePassword` flag | `AuthController` |
| `POST` | `/api/auth/forgot-password` | Generate 6-digit OTP and send recovery email via ZeptoMail | `AuthController` |
| `POST` | `/api/auth/reset-password` | Validate OTP token and set new password | `AuthController` |
| `GET` | `/api/employees` | List all staff members | `EmployeeController` |
| `GET` | `/api/employees/{id}` | Get employee profile by database ID | `EmployeeController` |
| `GET` | `/api/employees/code/{code}` | Get employee by code (e.g., `MW-1001`) | `EmployeeController` |
| `POST` | `/api/employees/onboard` | Onboard staff, generate temporary password, queue ZeptoMail email | `EmployeeController` |
| `PUT` | `/api/employees/{id}` | Update employee profile or compensation details | `EmployeeController` |
| `DELETE`| `/api/employees/{id}` | Remove employee record | `EmployeeController` |
| `POST` | `/api/employees/{id}/resend-email` | Resend credentials welcome email | `EmployeeController` |
| `GET` | `/api/attendance` | Full attendance ledger (sorted descending by date) | `AttendanceController` |
| `GET` | `/api/attendance/paged` | Filtered, paginated attendance register with SQL status summary counts | `AttendanceController` |
| `GET` | `/api/attendance/employee/{id}` | Attendance records for a specific employee | `AttendanceController` |
| `GET` | `/api/attendance/employee/{id}/history` | Date-windowed (default 1 month), paginated employee attendance history | `AttendanceController` |
| `POST` | `/api/attendance/check-in` | Punch In with timestamp and shift metadata | `AttendanceController` |
| `POST` | `/api/attendance/check-out` | Punch Out and calculate hours worked | `AttendanceController` |
| `POST` | `/api/attendance/regularize` | Submit attendance correction request with reason | `AttendanceController` |
| `PUT` | `/api/attendance/{id}/approve-regularization`| Manager/Admin approval for attendance regularisation | `AttendanceController` |
| `GET` | `/api/leaves` | List all leave requests | `LeaveController` |
| `GET` | `/api/leaves/employee/{id}` | Leaves filed by specific employee | `LeaveController` |
| `GET` | `/api/leaves/balances/{id}` | Remaining leave quotas by category | `LeaveController` |
| `POST` | `/api/leaves/apply` | Submit new leave application | `LeaveController` |
| `PUT` | `/api/leaves/{id}/status` | Approve or decline leave request (auto-deducts balance) | `LeaveController` |
| `GET` | `/api/payroll/runs` | List monthly payroll cycles | `PayrollController` |
| `POST` | `/api/payroll/process` | Generate payslips for all active staff for month/year | `PayrollController` |
| `GET` | `/api/payroll/payslips/{empId}`| Get payslips for employee | `PayrollController` |
| `GET` | `/api/payroll/payslips/run/{runId}`| Get all payslips belonging to a payroll run | `PayrollController` |
| `GET` | `/api/settings` | Get company settings and statutory configuration | `SettingsController` |
| `PUT` | `/api/settings` | Update corporate settings | `SettingsController` |
| `GET` | `/api/departments` | List company departments | `SettingsController` |
| `GET` | `/api/holidays` | List company holiday calendar | `SettingsController` |
| `GET` | `/api/centers` | List active centers with staff/manager details | `CenterController` |
| `POST` / `PUT` / `DELETE` | `/api/centers`, `/api/centers/{id}` | Create, update, or remove a center (admin-only) | `CenterController` |
| `POST` | `/api/centers/{id}/managers` | Assign an employee as center manager | `CenterController` |
| `GET` | `/api/audit-logs` | Retrieve compliance audit trail | `SettingsController` |

---

## Auth & Role-Based Access Control (RBAC)

### Three Operational Personas:
1. **ADMIN**:
   - Access to `/admin/*`: Dashboard, Employees, Attendance, Leaves, Payroll, Reports, Settings.
   - Authority to onboard staff, disburse payroll, approve regularizations, and edit corporate configurations.
2. **MANAGER**:
   - Access to `/manager/*`: Venue Team Dashboard, Team Attendance, Team Leave Approvals.
   - Scoped to direct reports based on `managerId` or venue shift.
3. **EMPLOYEE**:
   - Access to `/employee/*`: Mobile-first shell, Attendance punch in/out (biometric camera & geofence), Leave quota requests, Payslip viewer, Profile.

### Session Persistence:
- `AuthFilter` enforces HMAC-SHA256 `Bearer` token authentication and role-based access control across `/api/**` routes (excluding `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`).
- Frontend persists user profile in `localStorage.getItem('maaya_current_user')` and signed token in `maaya_token`, attached automatically by `fetchJSON`.
- Passwords are hashed with `PBKDF2WithHmacSHA256` (`PasswordHasher`) and legacy plaintext DB rows upgrade transparently on login.
- Default seeded admin: `shyamsundaryedla1@gmail.com` (`Admin@12345`).

---

## Key Data Flows

### 1. Employee Onboarding & Credential Dispatch
```
Admin Submits Form (EmployeeManagement.tsx)
  │ (Validates with Zod schema)
  ▼
api.employees.onboard() ──> POST /api/employees/onboard
  │
  ▼
EmployeeServiceImpl
  ├── 1. Auto-generates unique MW-XXXX employee code
  ├── 2. Auto-generates secure temp password (e.g., Maaya@4821)
  ├── 3. Persists Employee in PostgreSQL
  ├── 4. Initializes 4-tier LeaveBalance record
  └── 5. Spawns asynchronous thread -> ZeptoMailService.sendOnboardingEmail()
        └── Dispatches branded HTML onboarding email with login URL & credentials
```

### 2. Geofenced Biometric Attendance Punch
```
Employee Clicks "Punch In" (EmployeeDashboard / MyAttendance)
  │
  ▼
BiometricAttendanceModal Opens
  ├── 1. Requests WebRTC Camera stream & analyzes frames via faceBiometrics.ts
  ├── 2. Loads enableGeoFencingAttendance policy & queries device GPS (250m Haversine radius)
  ├── 3. Detects face centering + liveness & runs compareFaceBiometrics() vs enrolled descriptor
  └── 4. On confirmation, invokes api.attendance.checkIn() with IST businessDate()
        └── POST /api/attendance/check-in -> Evaluates shift LATE/PRESENT status & saves in PostgreSQL
```

### 3. Leave Application & Approval Workflow
```
Employee applies for leave (MyLeaves.tsx)
  └── POST /api/leaves/apply (Status: PENDING)
        │
Manager views OperationsDashboard / TeamLeaves.tsx
  ├── Checks overlapping colleague leaves on same venue & shift
  └── Clicks Approve / Reject
        └── PUT /api/leaves/{id}/status
              └── LeaveController deducts days from LeaveBalance if APPROVED
```

### 4. Indian Statutory Payroll Calculation
```
Admin initiates cycle (PayrollProcessing.tsx)
  └── POST /api/payroll/process
        └── For each active employee:
              Basic: 50% of Gross
              HRA: 30% of Gross
              Special Allowance: 10% of Gross
              Conveyance: ₹1,600 | Medical: ₹1,250
              EPF Employee (12% of Basic) | EPF Employer (12% of Basic)
              Professional Tax: ₹200 fixed
              TDS: 5% | Group Health Insurance: ₹500
              Net Take-Home = Gross - Total Deductions
              Creates individual printable Payslips + overall PayrollRun
```

---

## Shared Utilities & Design System

- **`src/utils/faceBiometrics.ts`**: Browser-native canvas face localization, 64-D spatial intensity & geometric ratio descriptors, liveness tracking, and HUD renderer.
- **`src/utils/geolocation.ts`**: Haversine distance calculator, venue geofence definitions for Hyderabad, Vizag, Bhubaneswar (250m radius), and developer test presets.
- **`src/utils/formatters.ts`**: Indian currency format (`formatINR` with Lakhs/Crores), date/time formatters, number-to-words for Indian payslips (`numberToIndianWords`), CSV exporter.
- **`src/utils/shiftUtils.ts`**: Shift schedule definitions (`MORNING`: 9:00 AM – 1:00 PM, `EVENING`: 1:00 PM – 9:00 PM).
- **`src/utils/operations.ts`**: Real-time venue operations helpers (approved away counts, shift overlap detection).
- **`src/components/common/OperationsDashboard.tsx`**: Unified workforce operations command dashboard shared by Admin and Manager views.
- **`src/components/common/DataTable.tsx`**: Accessible, sortable, paginated data table component with search and selection.

---

## Known Gaps & Unmapped Areas

- **Client-Side Face Recognition**: Biometric matching runs in-browser via pixel/luminance heuristics rather than neural face embeddings or server-side verification.
- **Automated Test Suite**: Backend has only Spring `contextLoads` smoke test and frontend has minimal unit tests; verification relies on `oxlint`, `tsc -b`, `vite build`, and `mvnw test-compile`.

---

## Change Log

### 2026-10-21 — Comprehensive Codebase Architecture Graph Creation

**Request:** Complete codebase understanding and architectural mapping.

**Files created:** `graph.md`

**What & why:** Mapped the full dual-stack application architecture (React 19 + TypeScript frontend with Spring Boot 3.5.6 + PostgreSQL backend), documenting all 20+ screens, 3 operational roles, 7 backend REST controllers, 9 JPA entities, database relationships, Zoho ZeptoMail integration, geofencing engine, and Indian statutory payroll calculations.

### 2026-11-11 — Full-Stack Bug Audit, Login/Seed Fix, Attendance Pagination & Onboarding Updates

**Request:** Analyze face verification, fix codebase bugs, fix login issues, remove Regularization/All-dates UI, add 1-month paginated employee attendance history with Load More, convert onboarding salary to annual, prune salary components, gate UAN on PF in Work & Compensation, and add bank account confirmation.

**Files changed:** `backend/.../security/{PasswordHasher,AuthTokenService,AuthFilter}.java` (new), `backend/.../entity/{AuditLog,Employee,PayrollRun}.java`, `backend/.../repository/{AuditLog,Attendance,Employee,Location,PayrollRun,Payslip}Repository.java`, `backend/.../service/{AuthService,EmployeeService,EmployeeServiceImpl,ZeptoMailService}.java`, `backend/.../controller/{Auth,Employee,Attendance,Leave,OnDuty,Payroll,Settings,Home}Controller.java`, `backend/.../demo/DataInitializer.java`, `backend/src/main/resources/application.properties`, `src/utils/{faceBiometrics,operations}.ts`, `src/components/attendance/{BiometricAttendanceModal,EmployeeAttendanceHistoryModal}.tsx`, `src/services/api.ts`, `src/store/slices/{authSlice,uiSlice}.ts`, `src/App.tsx`, `src/components/layout/{AppLayout,EmployeeMobileLayout,Sidebar}.tsx`, `src/components/common/{CommandPalette,DataTable,EmployeeDetailsPanel,OperationsDashboard,OperationsFilters,PayrollReview}.tsx`, `src/hooks/useRouteBackGuard.ts`, `src/features/auth/Login.tsx`, `src/features/admin/{AttendanceManagement,CompanySettings,EmployeeManagement,OnDutyManagement,PayrollProcessing,ReportsAnalytics}.tsx`, `src/features/employee/{EmployeeDashboard,EmployeeProfile,MyAttendance,MyLeaves,MyOnDuty,MySalary}.tsx`, `src/features/manager/{TeamAttendance,TeamLeaves,TeamOnDuty}.tsx`

**What & why:** Replaced plaintext passwords and open endpoints with PBKDF2 hashing, HMAC-SHA256 Bearer tokens, and `AuthFilter` RBAC; moved ZeptoMail API token to `ZEPTOMAIL_TOKEN`; fixed password reset links/OTP binding and case-insensitive email handling; made `DataInitializer` avoid `employee_code` unique-key collisions (`resolveAvailableCode`); mounted `ToastContainer` globally in `App.tsx` and added inline error feedback on `Login.tsx`; added `/api/attendance/paged`, `/api/attendance/employee/{id}/history`, `EmployeeAttendanceHistoryModal`, and "Load More" pagination across Admin/Manager attendance views (removing Regularization column and All-dates filter button); updated `EmployeeManagement.tsx` and `EmployeeDetailsPanel.tsx` to use annual salary on onboarding, remove HRA/Special/Conveyance/ESI/Gratuity components, move UAN to Work & Compensation (activated only when PF is added), and require bank account number confirmation; repaired payroll, leaves, biometrics, analytics, and settings issues.

**Follow-ups/risks:** Set `ZEPTOMAIL_TOKEN` in the environment (and rotate the previously committed key) before expecting live ZeptoMail delivery. Existing browser sessions using legacy `mw_sess_...` tokens will be prompted to sign in again.

### 2026-11-12 — Centers Management Refactor, Mock Data Removal & UI Cleanup

**Request:** Deploy the latest local code and push to GitHub.

**Files changed:** `backend/.../controller/{Attendance,Auth,Employee,Leave,OnDuty,Payroll,Settings,Center}Controller.java`, `backend/.../service/{Audit,Auth,Center,EmployeeServiceImpl,ZeptoMail}Service.java`, `backend/.../security/{AuthFilter,PortalUrlResolver}.java`, `backend/.../entity/{CompanySettings,Employee,Location}.java`, `backend/.../repository/*`, `backend/.../demo/{DataInitializer,EmployeeApplication}.java`, `src/components/common/*`, `src/components/layout/{AppLayout,AuthLayout,EmployeeMobileLayout,ErrorBoundary,ProtectedRoute,Sidebar}.tsx`, `src/features/admin/{AttendanceManagement,CompanySettings,EmployeeManagement,LeaveManagement,OnDutyManagement,PayrollProcessing,ReportsAnalytics}.tsx`, `src/features/admin/{reports,settings}/*`, `src/features/auth/*`, `src/features/employee/*`, `src/features/manager/*`, `src/hooks/useCenters.ts`, `src/services/api.ts`, `src/services/mockData.ts` (deleted), `src/utils/{dutyTypes,formatters,geolocation,operations,reportingManager,shiftUtils}.ts`

**What & why:** Extracted center management (`CenterController`, `CenterService`, `useCenters`), centralized audit logging (`AuditService`), added `PortalUrlResolver`, split admin reports and settings into modular subcomponents (`reports/`, `settings/`), extracted `PageHeader`, `AuthLayout`, `dutyTypes`, and `reportingManager`, and removed `src/services/mockData.ts`.

### 2026-11-12 (Evening) — UI Primitives Consolidation, Code Splitting & Admin Payroll Exclusion

**Request:** Push the latest local code and deploy to AWS.

**Files changed:** `backend/.../controller/PayrollController.java`, `src/App.tsx`, `src/components/attendance/*`, `src/components/common/{PasswordInput,StatTile,Textarea}.tsx` (new), `src/components/common/{Breadcrumb,Card,StatCard}.tsx` (deleted), `src/components/employee/MobilePrimitives.tsx` (new), `src/components/layout/*`, `src/features/*`, `src/hooks/useRouteBackGuard.ts` (deleted), `src/utils/{access,status}.ts` (new), `src/index.css`

**What & why:** Excluded `ADMIN` owner accounts from payroll payslip generation in `PayrollController`, introduced route code-splitting in `App.tsx`, consolidated shared UI primitives (`StatTile`, `PasswordInput`, `Textarea`, `MobilePrimitives`) and helpers (`access.ts`, `status.ts`), and removed unused `Breadcrumb`, `Card`, `StatCard`, and `useRouteBackGuard`.

### 2026-11-13 — Payroll Calculation Engine & Unified Employee Attendance View

**Request:** Deploy the latest code and push to AWS / GitHub.

**Files changed:** `backend/.../service/PayrollCalculator.java` (new), `backend/.../test/.../PayrollCalculatorTest.java` (new), `backend/.../controller/PayrollController.java`, `backend/.../entity/{CompanySettings,PayrollRun,Payslip}.java`, `src/components/payroll/*` (new), `src/utils/payroll.ts` (new), `src/features/employee/EmployeeDashboard.tsx`, `src/features/employee/MyAttendance.tsx` (removed), `src/features/admin/PayrollProcessing.tsx`, `src/features/employee/MySalary.tsx`, `AGENTS.md`

**What & why:** Extracted standalone Indian payroll calculation into dedicated `PayrollCalculator` service covered by unit tests, moved payroll review and payslip rendering into `src/components/payroll/`, unified employee attendance and punch-in history into the mobile `EmployeeDashboard` home view (retiring the standalone `MyAttendance` page per mobile-first AGENTS rules), and integrated statutory payroll settings.
