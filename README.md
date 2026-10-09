# PulseHRMS — Enterprise Human Resource & Payroll Management Suite

A production-grade, enterprise web application built using **React, TypeScript, Tailwind CSS, and Vite**. Designed to match the visual polish and precision of **Linear, Razorpay, and Zoho People**.

---

## Highlights & Features

- **No Emojis Policy**: Exclusively utilizes premium vector icons from `lucide-react`.
- **Indian Statutory & Payroll Engine**:
  - Full Indian Rupee (`INR` / `₹`) formatting with Indian numbering format (Lakhs and Crores).
  - Accurate CTC to Monthly Gross & Net Take-Home calculator (Basic 45%, HRA 50%, EPF 12%, Professional Tax ₹200, Group Health Insurance, Income Tax TDS).
  - Printable electronic payslips formatted with Indian legal particulars, EPFO UAN, Income Tax PAN, and number-to-words generator.
- **Role-Based Access Control (RBAC)**:
  - Three distinct operational personas: **Admin**, **Manager**, and **Employee**.
  - Interactive top bar **Role Switcher** allowing instant real-time simulation without needing to re-login.
- **State Architecture**:
  - **Redux Toolkit**: Global user session, persistent role state, and toast notification queues.
  - **TanStack Query**: API state caching and query hooks.
  - **React Hook Form + Zod**: Strict runtime validation schemas on all forms.
  - **Local Persistence**: Client-side storage engine persisting employee onboardings, punches, leave decisions, and payroll disbursements across page refreshes.

---

## Complete 20 Screen Map

| # | Screen Name | Route | Role Access | Key Capabilities |
|---|---|---|---|---|
| **1** | **Login** | `/login` | Public | Instant 1-click demo role accounts, email/password validation |
| **2** | **Forgot Password** | `/forgot-password` | Public | Dispatches password reset recovery instructions |
| **3** | **Reset Password** | `/reset-password` | Public | Token/OTP verification, password strength requirements |
| **4** | **Admin Dashboard** | `/admin/dashboard` | Admin | Real-time headcount KPIs, attendance %, pending leaves, payroll expense |
| **5** | **Employee Directory** | `/admin/employees` | Admin | Staff directory, search, CSV export, Zod-validated onboarding modal |
| **6** | **Attendance Register** | `/admin/attendance` | Admin | Company-wide timesheets, punch tracking, shift adherence, approve excuses |
| **7** | **Leave Management** | `/admin/leaves` | Admin | Company leave ledger, filter by status/type, review & approve modal |
| **8** | **Salary Setup** | `/admin/salary-setup` | Admin | Interactive CTC simulator slider, statutory EPF/PT rules, structure templates |
| **9** | **Payroll Processing** | `/admin/payroll` | Admin | Run monthly payroll, review salary register, disburse batch (confetti + logs) |
| **10** | **Reports & Analytics** | `/admin/reports` | Admin | Headcount growth, attendance punctuality rates, department spending, CSV export |
| **11** | **Company Holidays** | `/admin/holidays` | All | 2026 Gazetted national holidays & festival non-working calendar, add holiday |
| **12** | **Company Settings** | `/admin/settings` | Admin | Corporate legal profile, GSTIN, PF code, shift policies, audit trail logs |
| **13** | **Manager Dashboard** | `/manager/dashboard` | Manager | Direct reports roster, team present count, quick leave approvals queue |
| **14** | **Team Attendance** | `/manager/attendance` | Manager | Team daily timesheet status, approve team attendance regularizations |
| **15** | **Team Leave Approvals**| `/manager/leaves` | Manager | Engineering direct report requests, approve/decline with manager notes |
| **16** | **Employee Dashboard** | `/employee/dashboard` | Employee | Interactive punch in/out terminal, live clock, leave balance cards, recent pay |
| **17** | **My Attendance** | `/employee/attendance` | Employee | Punch in/out action, monthly timesheets, submit regularisation justification |
| **18** | **My Leave Requests** | `/employee/leaves` | Employee | Leave balance quotas, apply for leave modal with auto days calculation |
| **19** | **My Salary & Payslips**| `/employee/salary` | Employee | Annual CTC summary, in-hand monthly net pay, printable official payslip view |
| **20** | **Employee Profile** | `/employee/profile` | Employee | Personal records, manager info, bank/UAN credentials, editable contact info |

---

## Instant Demo Credentials

You can use the 1-click buttons on the `/login` screen or login with:

- **Admin Account**:
  - Email: `admin@pulsehrms.com`
  - Password: `password123`
  - Persona: Sarah Jenkins (VP of People & Culture)

- **Manager Account**:
  - Email: `manager@pulsehrms.com`
  - Password: `password123`
  - Persona: Rajesh Kumar (Engineering Lead)

- **Employee Account**:
  - Email: `employee@pulsehrms.com`
  - Password: `password123`
  - Persona: Priya Sharma (Senior Frontend Engineer)

*(You can also effortlessly switch between roles at any time using the **Role Switcher** in the top navigation bar!)*

---

## Quick Start & Setup Instructions

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173/`.

### 4. Build Production Bundle
```bash
npm run build
```

---

## Integrating a Real Backend

See [`BACKEND_INTEGRATION.md`](./BACKEND_INTEGRATION.md) for full architecture notes, sample Axios interceptors, REST endpoint specifications, and security practices.
