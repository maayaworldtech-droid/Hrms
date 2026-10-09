# Backend Integration Guide for PulseHRMS

PulseHRMS is architected with a strict separation between UI components, business logic, and the API service layer. All API calls are decoupled through `src/services/api.ts` and domain types in `src/types/index.ts`.

---

## 1. Architecture Overview

```
[UI Components / Pages] 
        │
        ▼
[React Hook Form / TanStack Query / Redux Store]
        │
        ▼
[src/services/api.ts] ─── (Environment Toggle: VITE_USE_MOCK_API)
        │
   ┌────┴─────────────────────────────┐
   ▼                                  ▼
[Mock Engine + LocalStorage]   [Live REST / GraphQL Backend]
(Current default for demo)      (Axios / Fetch Client)
```

---

## 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
VITE_APP_NAME="PulseHRMS"
VITE_API_BASE_URL="https://api.yourcompany.com/v1"
VITE_USE_MOCK_API="false"
VITE_COMPANY_NAME="Pulse Technologies Pvt. Ltd."
VITE_CURRENCY="INR"
```

When `VITE_USE_MOCK_API="false"`, swap `src/services/api.ts` to call your real HTTP client.

---

## 3. Replacing Mock Services with Real REST Endpoints

### Step A: Install Axios (or use native Fetch)

```bash
npm install axios
```

### Step B: Create an HTTP Client (`src/services/httpClient.ts`)

```typescript
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic JWT Bearer Token Injection
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulse_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized Error Interceptor
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pulse_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);
```

### Step C: Recommended REST Endpoints

| Resource | HTTP Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/auth/login` | Login with email & password; returns `{ token, user }` |
| **Auth** | `POST` | `/auth/forgot-password` | Initiates reset token email |
| **Auth** | `POST` | `/auth/reset-password` | Resets password with verification token |
| **Employees** | `GET` | `/employees` | List all employees (paginated) |
| **Employees** | `POST` | `/employees` | Onboard new employee |
| **Employees** | `GET` | `/employees/:id` | Fetch employee file by ID |
| **Employees** | `PUT` | `/employees/:id` | Update profile / compensation details |
| **Attendance** | `GET` | `/attendance` | Company timesheet ledger |
| **Attendance** | `POST` | `/attendance/check-in` | Punch In with server timestamp & IP |
| **Attendance** | `POST` | `/attendance/check-out` | Punch Out and calculate work hours |
| **Attendance** | `POST` | `/attendance/:id/regularize` | Submit regularisation justification |
| **Leaves** | `GET` | `/leaves` | All leave applications |
| **Leaves** | `POST` | `/leaves` | Submit new leave application |
| **Leaves** | `PATCH` | `/leaves/:id/status` | Approve or reject leave request |
| **Leaves** | `GET` | `/leaves/balance/:employeeId` | Fetch remaining leave quotas |
| **Payroll** | `GET` | `/payroll/runs` | Get all historical payroll runs |
| **Payroll** | `POST` | `/payroll/runs` | Trigger automated payroll calculation |
| **Payroll** | `POST` | `/payroll/runs/:id/disburse` | Execute bank payment batch |
| **Payroll** | `GET` | `/payroll/payslips/:id` | Download or view individual payslip |
| **Holidays** | `GET` | `/holidays` | Company holidays calendar |
| **Settings** | `GET` | `/company/settings` | Company details & statutory numbers |
| **Settings** | `PUT` | `/company/settings` | Update company configuration |
| **Audit** | `GET` | `/audit/logs` | Chronological compliance audit logs |

---

## 4. Role-Based Access Control (RBAC) on the Server

PulseHRMS implements 3 standard roles:
- `ADMIN`: Full organizational access, payroll execution, statutory settings.
- `MANAGER`: Direct report attendance monitoring, team leave approvals.
- `EMPLOYEE`: Self-service clock-in, leave application, payslip downloads, profile updates.

Ensure all backend routes enforce authorization middleware checking the JWT claims:
```json
{
  "sub": "emp-001",
  "role": "ADMIN",
  "permissions": ["payroll:write", "employees:write"]
}
```

---

## 5. Security & Statutory Compliance Standards

1. **Secrets**: Never commit `.env` or API secret keys to version control.
2. **PAN & Bank Encryption**: Protect employee bank account numbers and PAN with AES-256 field-level encryption at rest on the backend.
3. **EPFO & ESIC Compliance**: Maintain accurate calculations (EPF employee 12%, employer 12%, PT ₹200) as modeled in `src/utils/salaryCalculator.ts`.
