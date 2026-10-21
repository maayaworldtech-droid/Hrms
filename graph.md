# Maaya World HRMS — Codebase Graph

_Last updated: 2026-10-21 · Maintained by: Antigravity coding agent_

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
│       │   ├── controller/            — Spring REST Controllers (Auth, Employee, Attendance, Leave, Payroll, Settings)
│       │   ├── demo/                  — Main class (EmployeeApplication) & seed data (DataInitializer)
│       │   ├── entity/                — JPA Hibernate Entities (Employee, AttendanceRecord, LeaveRequest, Payslip, etc.)
│       │   ├── repository/            — Spring Data JPA Repositories
│       │   └── service/               — Business logic (EmployeeServiceImpl, AuthService, ZeptoMailService)
│       └── resources/
│           └── application.properties — DB URL (PostgreSQL 5432/hrms_db), port 8083, ZeptoMail API keys
│
└── src/                               — React TypeScript Single Page Application
    ├── main.tsx                       — React 19 entry point
    ├── App.tsx                        — App router, role routing, error boundary, QueryClient & Redux Provider
    ├── index.css                      — Global Tailwind CSS styles and reset
    ├── assets/                        — Logos, brand vectors, and media
    ├── components/
    │   ├── attendance/                — Biometric webcam scan & 250m geofence check modal (BiometricAttendanceModal.tsx)
    │   ├── common/                    — Shared UI: Button, Input, Modal, DataTable, OperationsDashboard, StatCard, etc.
    │   └── layout/                    — Shells: AppLayout (Desktop Admin/Manager), EmployeeMobileLayout (Mobile-First Shell), Sidebar, Header
    ├── features/
    │   ├── admin/                     — Admin screens: Dashboard, EmployeeManagement, Attendance, Leaves, Payroll, Reports, Settings
    │   ├── auth/                      — Auth screens: Login, ForgotPassword, ResetPassword
    │   ├── employee/                  — Employee screens: Dashboard, MyAttendance, MyLeaves, MySalary, Profile
    │   └── manager/                   — Manager screens: Dashboard, TeamAttendance, TeamLeaves
    ├── hooks/                         — Custom React hooks (e.g. useOperationsFilters)
    ├── services/
    │   ├── api.ts                     — Centralized API service layer calling `/api` endpoints
    │   └── mockData.ts                — Fallback demo data, reporting manager helper, location lists
    ├── store/                         — Redux Toolkit store setup
    │   └── slices/                    — authSlice (session & roles), uiSlice (toasts & mobile/sidebar toggles)
    ├── types/                         — Domain TypeScript interfaces and types
    └── utils/                         — Helpers: formatters (INR, dates), geolocation (Haversine formula), salaryCalculator, shiftUtils
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
- **Security**: `password`, `mustChangePassword`.

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
| `GET` | `/api/attendance/employee/{id}` | Attendance records for a specific employee | `AttendanceController` |
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
- Frontend persists user profile in `localStorage.getItem('maaya_current_user')` and token in `maaya_token`.
- Redux `authSlice` synchronizes authenticated state, active role, and temporary password flags (`mustChangePassword`).
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
  ├── 1. Requests WebRTC Camera stream & displays face scanner overlay
  ├── 2. Acquires Geolocation (or venue preset) & calculates Haversine distance
  │      to Venue Center (Hyderabad, Vizag, or Bhubaneswar). Allowed radius: <= 250m.
  ├── 3. Runs simulated biometric verification progress (0% -> 100%)
  └── 4. On confirmation, invokes api.attendance.checkIn()
        └── POST /api/attendance/check-in -> Saves timestamped record in PostgreSQL
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

- **`src/utils/geolocation.ts`**: Haversine distance calculator, venue geofence definitions for Hyderabad, Vizag, Bhubaneswar (250m radius), and developer test presets.
- **`src/utils/formatters.ts`**: Indian currency format (`formatINR` with Lakhs/Crores), date/time formatters, number-to-words for Indian payslips (`numberToIndianWords`), CSV exporter.
- **`src/utils/shiftUtils.ts`**: Shift schedule definitions (`MORNING`: 9:00 AM – 1:00 PM, `EVENING`: 1:00 PM – 9:00 PM).
- **`src/utils/operations.ts`**: Real-time venue operations helpers (approved away counts, shift overlap detection).
- **`src/components/common/OperationsDashboard.tsx`**: Unified workforce operations command dashboard shared by Admin and Manager views.
- **`src/components/common/DataTable.tsx`**: Accessible, sortable, paginated data table component with search and selection.

---

## Known Gaps & Unmapped Areas

- **Cryptographic JWT Interceptor**: Current backend uses session tokens (`mw_sess_...`); a full Spring Security JWT filter chain with Bearer token validation can be added for strict enterprise compliance.
- **Frontend Automated Test Suite**: Vitest/Jest unit test coverage on frontend components is currently minimal; business logic is validated via TypeScript compile and manual verification.

---

## Change Log

### 2026-10-21 — Comprehensive Codebase Architecture Graph Creation

**Request:** Complete codebase understanding and architectural mapping.

**Files created:** `graph.md`

**What & why:** Mapped the full dual-stack application architecture (React 19 + TypeScript frontend with Spring Boot 3.5.6 + PostgreSQL backend), documenting all 20+ screens, 3 operational roles, 7 backend REST controllers, 9 JPA entities, database relationships, Zoho ZeptoMail integration, geofencing engine, and Indian statutory payroll calculations.
