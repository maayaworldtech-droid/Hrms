import {
  User,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  PayrollRun,
  Payslip,
  Holiday,
  Department,
  CompanySettings,
  AuditLog,
  UserRole,
} from '@/types';
import {
  MOCK_USERS,
  getReportingManager,
  MOCK_ATTENDANCE,
  MOCK_LEAVE_REQUESTS,
  MOCK_LEAVE_BALANCES,
  MOCK_COMPANY_SETTINGS,
  MOCK_AUDIT_LOGS,
  generateMockPayrollRuns,
} from './mockData';
import  { calculateSalaryFromMonthly } from '@/utils/salaryCalculator';

const MOCK_HOLIDAYS: Holiday[] = [];
const MOCK_DEPARTMENTS: Department[] = [];

// LocalStorage Keys for Maaya World HRMS
const KEYS = {
  CURRENT_USER: 'maaya_current_user_v5',
  EMPLOYEES: 'maaya_employees_v5',
  ATTENDANCE: 'maaya_attendance_v5',
  LEAVES: 'maaya_leaves_v5',
  LEAVE_BALANCES: 'maaya_leave_balances_v5',
  PAYROLL: 'maaya_payroll_runs_v5',
  HOLIDAYS: 'maaya_holidays_v5',
  DEPARTMENTS: 'maaya_departments_v5',
  SETTINGS: 'maaya_settings_v5',
  AUDIT: 'maaya_audit_logs_v5',
};

// Helper to simulate network latency
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// Safe Storage Helper
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Storage write failed', err);
  }
}

// Backend REST API Base URL (Spring Boot server on port 8083)
const BACKEND_URL = 'http://localhost:8083';

export interface BackendLocation {
  locationId?: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface BackendEmployee {
  id?: number;
  employeeId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  managerId?: number;
  employmentType?: string;
  status?: string;
  dateOfJoining?: string;
  createdDate?: string;
  updatedDate?: string;
  location?: BackendLocation | null;
}

export function backendToFrontendEmployee(b: BackendEmployee): Employee {
  const numId = b.id || 1;
  const empCode = b.employeeId ? `MW-${b.employeeId}` : `MW-${1000 + numId}`;
  const locName = b.location?.name || b.location?.city || 'Hyderabad';
  const fullName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || 'Staff Member';

  const statusMap: Record<string, Employee['status']> = {
    ACTIVE: 'ACTIVE',
    TERMINATED: 'TERMINATED',
    'ON LEAVE': 'PROBATION',
    PROBATION: 'PROBATION',
  };
  const statusNormalized = (b.status ? statusMap[b.status.toUpperCase()] || 'ACTIVE' : 'ACTIVE') as Employee['status'];

  const empTypeNormalized = (b.employmentType?.toUpperCase().includes('PART') ? 'PART_TIME' :
    b.employmentType?.toUpperCase().includes('CONTRACT') ? 'CONTRACT' :
    b.employmentType?.toUpperCase().includes('INTERN') ? 'INTERN' : 'FULL_TIME') as Employee['employmentType'];

  return {
    id: String(numId),
    employeeCode: empCode,
    firstName: b.firstName || '',
    lastName: b.lastName || '',
    fullName,
    email: b.email || '',
    phone: '+91 98765 43210',
    designation: b.jobTitle || 'Operations Specialist',
    location: locName,
    shift: 'MORNING',
    monthlySalary: 35000,
    ctcAnnual: 420000,
    joiningDate: b.dateOfJoining || new Date().toISOString().split('T')[0],
    employmentType: empTypeNormalized,
    role: (b.jobTitle?.toLowerCase().includes('manager') || (b.department && b.department.toLowerCase().includes('management')) ? 'MANAGER' : 'EMPLOYEE') as UserRole,
    departmentName: b.department || 'Operations',
    managerId: b.managerId ? String(b.managerId) : undefined,
    status: statusNormalized,
    bankDetails: {
      accountNumber: '918273645281',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank Ltd.',
      panNumber: 'ABCPS1234F',
      uanNumber: '100928374699',
    },
  };
}

export function frontendToBackendEmployee(f: Partial<Employee>, existingId?: number): BackendEmployee {
  const parsedEmpId = f.employeeCode ? parseInt(f.employeeCode.replace(/\D/g, ''), 10) : undefined;
  const rawLocation = typeof f.location === 'string' ? f.location : 'Hyderabad';

  return {
    id: existingId,
    employeeId: parsedEmpId || (existingId ? existingId + 100 : Math.floor(100 + Math.random() * 900)),
    firstName: f.firstName || (f.fullName ? f.fullName.split(' ')[0] : ''),
    lastName: f.lastName || (f.fullName ? f.fullName.split(' ').slice(1).join(' ') : ''),
    email: f.email || '',
    jobTitle: f.designation || 'Staff',
    department: f.departmentName || `${rawLocation} Center`,
    managerId: f.managerId ? parseInt(f.managerId.replace(/\D/g, ''), 10) || 1 : 1,
    employmentType: f.employmentType === 'PART_TIME' ? 'Part-time' : f.employmentType === 'CONTRACT' ? 'Contract' : 'Full-time',
    status: f.status === 'TERMINATED' ? 'Terminated' : 'Active',
    dateOfJoining: f.joiningDate || new Date().toISOString().split('T')[0],
    location: {
      name: `${rawLocation} Center`,
      address: 'Main Facility',
      city: rawLocation,
      state: rawLocation === 'Vizag' ? 'Andhra Pradesh' : rawLocation === 'Bhubaneswar' ? 'Odisha' : 'Telangana',
      country: 'India',
      zipCode: '500081',
    },
  };
}

// Initialise DB in browser storage if empty
export function initLocalStorage(): void {
  // Clear any old mock employee cached data from localStorage so live PostgreSQL records take precedence
  try {
    const cached = localStorage.getItem(KEYS.EMPLOYEES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && (parsed.length > 10 || parsed.some((e: any) => e.employeeCode?.startsWith('MW-1')))) {
        localStorage.removeItem(KEYS.EMPLOYEES);
      }
    }
  } catch {
    localStorage.removeItem(KEYS.EMPLOYEES);
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    setStored(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
  }
  if (!localStorage.getItem(KEYS.LEAVES)) {
    setStored(KEYS.LEAVES, MOCK_LEAVE_REQUESTS);
  }
  if (!localStorage.getItem(KEYS.LEAVE_BALANCES)) {
    setStored(KEYS.LEAVE_BALANCES, MOCK_LEAVE_BALANCES);
  }
  if (!localStorage.getItem(KEYS.PAYROLL)) {
    setStored(KEYS.PAYROLL, generateMockPayrollRuns());
  }
  if (!localStorage.getItem(KEYS.HOLIDAYS)) {
    setStored(KEYS.HOLIDAYS, []);
  }
  if (!localStorage.getItem(KEYS.DEPARTMENTS)) {
    setStored(KEYS.DEPARTMENTS, []);
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    setStored(KEYS.SETTINGS, MOCK_COMPANY_SETTINGS);
  }
  if (!localStorage.getItem(KEYS.AUDIT)) {
    setStored(KEYS.AUDIT, MOCK_AUDIT_LOGS);
  }
  if (!localStorage.getItem(KEYS.CURRENT_USER)) {
    setStored(KEYS.CURRENT_USER, MOCK_USERS.admin);
  }
}

// Initialize on load
initLocalStorage();

export const api = {
  // --- AUTH SERVICES ---
  auth: {
    async login(email: string, _pass: string): Promise<User> {
      await delay(150);
      let employees = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      if (employees.length === 0) {
        try {
          employees = await api.employees.getAll();
        } catch {
          // fallback
        }
      }
      const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());

      if (emp) {
        const user: User = {
          id: emp.id,
          name: emp.fullName,
          email: emp.email,
          role: emp.role || 'EMPLOYEE',
          designation: emp.designation || 'Staff',
          department: emp.departmentName || (emp.location ? `${emp.location} Center` : 'Operations'),
          employeeId: emp.employeeCode,
          joiningDate: emp.joiningDate,
          phone: emp.phone,
          managerId: emp.managerId,
          managerName: emp.managerName,
          status: 'ACTIVE',
        };
        setStored(KEYS.CURRENT_USER, user);
        return user;
      }

      // Default mock fallback for admin / manager demo login
      if (email.includes('admin')) {
        setStored(KEYS.CURRENT_USER, MOCK_USERS.admin);
        return MOCK_USERS.admin;
      } else if (email.includes('manager')) {
        setStored(KEYS.CURRENT_USER, MOCK_USERS.manager);
        return MOCK_USERS.manager;
      } else {
        setStored(KEYS.CURRENT_USER, MOCK_USERS.employee);
        return MOCK_USERS.employee;
      }
    },

    async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
      await delay(200);
      return {
        success: true,
        message: `A password reset link with secure token has been dispatched to ${email}.`,
      };
    },

    async resetPassword(_token: string, _newPass: string): Promise<{ success: boolean; message: string }> {
      await delay(250);
      return {
        success: true,
        message: 'Your account password has been updated successfully. Please log in with your new credentials.',
      };
    },

    getCurrentUser(): User {
      return getStored<User>(KEYS.CURRENT_USER, MOCK_USERS.admin);
    },

    switchRole(role: UserRole): User {
      let targetUser = MOCK_USERS.admin;
      if (role === 'MANAGER') targetUser = MOCK_USERS.manager;
      if (role === 'EMPLOYEE') targetUser = MOCK_USERS.employee;
      setStored(KEYS.CURRENT_USER, targetUser);
      return targetUser;
    },

    logout(): void {
      localStorage.removeItem(KEYS.CURRENT_USER);
    },
  },

  // --- EMPLOYEE SERVICES (INTEGRATED WITH POSTGRESQL SPRING BOOT BACKEND) ---
  employees: {
    async getAll(): Promise<Employee[]> {
      try {
        const res = await fetch(`${BACKEND_URL}/api/employees`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: BackendEmployee[] = await res.json();
        const mapped = data.map(backendToFrontendEmployee);
        setStored(KEYS.EMPLOYEES, mapped);
        return mapped;
      } catch (err) {
        console.warn('Backend fetch failed, falling back to local cache', err);
        return getStored<Employee[]>(KEYS.EMPLOYEES, []);
      }
    },

    async getById(id: string): Promise<Employee | undefined> {
      try {
        const numId = parseInt(id.replace(/\D/g, ''), 10);
        if (!isNaN(numId)) {
          const res = await fetch(`${BACKEND_URL}/api/employees/${numId}`);
          if (res.ok) {
            const data: BackendEmployee = await res.json();
            return backendToFrontendEmployee(data);
          }
        }
      } catch (err) {
        console.warn(`Backend fetch failed for employee ID ${id}`, err);
      }

      let list = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      if (!list || list.length === 0) {
        try {
          list = await api.employees.getAll();
        } catch {
          // ignore
        }
      }

      const found = list.find((e) => e.id === id || e.employeeCode === id);
      if (found) return found;

      const currentUser = api.auth.getCurrentUser();
      if (currentUser) {
        const userMatch = list.find(
          (e) =>
            e.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
            e.employeeCode === currentUser.employeeId
        );
        if (userMatch) return userMatch;
      }

      if (list.length > 0) {
        return list[0];
      }

      return {
        id: id || '1',
        employeeCode: currentUser?.employeeId || 'MW-1003',
        firstName: currentUser?.name ? currentUser.name.split(' ')[0] : 'Staff',
        lastName: currentUser?.name ? currentUser.name.split(' ').slice(1).join(' ') : 'Member',
        fullName: currentUser?.name || 'Staff Member',
        email: currentUser?.email || 'employee@maayaworld.com',
        location: 'Hyderabad Center',
        designation: currentUser?.designation || 'Experience Host',
        departmentName: currentUser?.department || 'Operations',
        shift: 'MORNING',
        shiftTiming: 'Morning (9 AM – 6 PM)',
        joiningDate: '2023-04-03',
        monthlySalary: 35000,
        ctcAnnual: 420000,
        status: 'ACTIVE',
        attendanceCount: 24,
        bankDetails: {
          accountNumber: '918273645281',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank Ltd.',
          panNumber: 'ABCPS1234F',
          uanNumber: '100928374699',
        },
      };
    },

    async create(data: Omit<Employee, 'id'>): Promise<Employee> {
      const backendPayload = frontendToBackendEmployee(data);
      const res = await fetch(`${BACKEND_URL}/api/employees/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
      });

      if (!res.ok) {
        throw new Error(`Failed to create employee: HTTP ${res.status}`);
      }

      const created: BackendEmployee = await res.json();
      const newEmp = backendToFrontendEmployee(created);

      // Keep cache in sync
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      setStored(KEYS.EMPLOYEES, [newEmp, ...list.filter((e) => e.id !== newEmp.id)]);

      api.audit.log('EMPLOYEE_ONBOARDED', 'EMPLOYEE', `Added employee ${newEmp.fullName} (${newEmp.employeeCode})`);
      return newEmp;
    },

    async update(id: string, updates: Partial<Employee>): Promise<Employee> {
      const numId = parseInt(id, 10);
      const backendPayload = frontendToBackendEmployee(updates, isNaN(numId) ? undefined : numId);
      const res = await fetch(`${BACKEND_URL}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
      });

      if (!res.ok) {
        throw new Error(`Failed to update employee: HTTP ${res.status}`);
      }

      const updated: BackendEmployee = await res.json();
      const emp = backendToFrontendEmployee(updated);

      // Keep cache in sync
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      const index = list.findIndex((e) => e.id === id);
      if (index !== -1) {
        list[index] = emp;
      } else {
        list.push(emp);
      }
      setStored(KEYS.EMPLOYEES, list);

      api.audit.log('EMPLOYEE_UPDATED', 'EMPLOYEE', `Updated profile of ${emp.fullName}`);
      return emp;
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${BACKEND_URL}/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 404) {
        throw new Error(`Failed to delete employee: HTTP ${res.status}`);
      }

      const list = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      const target = list.find((e) => e.id === id);
      setStored(KEYS.EMPLOYEES, list.filter((e) => e.id !== id));

      if (target) {
        api.audit.log('EMPLOYEE_DELETED', 'EMPLOYEE', `Archived employee ${target.fullName} (${target.employeeCode})`);
      }
    },
  },

  // --- ATTENDANCE SERVICES ---
  attendance: {
    async getAll(): Promise<AttendanceRecord[]> {
      await delay();
      return getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
    },

    async getByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
      await delay();
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      return list.filter((a) => a.employeeId === employeeId);
    },

    async checkIn(
      employeeId: string,
      options?: { location?: string; shift?: any; notes?: string }
    ): Promise<AttendanceRecord> {
      await delay(150);
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      const employees = getStored<Employee[]>(KEYS.EMPLOYEES, []);
      const emp = employees.find((e) => e.id === employeeId);

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check if already checked in today
      const existing = list.find((a) => a.employeeId === employeeId && a.date === today);
      if (existing) {
        return existing;
      }

      const isLate = now.getHours() >= 10;
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId,
        employeeName: emp?.fullName || 'Employee',
        departmentName: emp?.departmentName,
        location: options?.location || emp?.location || 'Hyderabad',
        shift: options?.shift || emp?.shift || 'MORNING',
        date: today,
        checkIn: timeStr,
        status: isLate ? 'LATE' : 'PRESENT',
        workHours: 0,
        regularizationStatus: 'NONE',
        notes: options?.notes || 'Biometric Face & Location Verified',
      };

      const updated = [newRecord, ...list];
      setStored(KEYS.ATTENDANCE, updated);
      api.audit.log(
        'ATTENDANCE_CHECKIN',
        'ATTENDANCE',
        `${emp?.fullName || 'Employee'} logged in at ${timeStr} (${options?.notes || 'Biometric Authenticated'})`
      );
      return newRecord;
    },

    async checkOut(
      employeeId: string,
      options?: { notes?: string }
    ): Promise<AttendanceRecord> {
      await delay(150);
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const index = list.findIndex((a) => a.employeeId === employeeId && a.date === today);
      if (index === -1) {
        throw new Error('No clock-in record found for today');
      }

      const record = list[index];
      let workHours = 8.0;
      if (record.checkIn) {
        const [inH, inM] = record.checkIn.split(':').map(Number);
        const [outH, outM] = timeStr.split(':').map(Number);
        const diffMinutes = outH * 60 + outM - (inH * 60 + inM);
        workHours = Math.max(0, Math.round((diffMinutes / 60) * 100) / 100);
      }

      const updatedRecord: AttendanceRecord = {
        ...record,
        checkOut: timeStr,
        workHours,
        notes: options?.notes || record.notes || 'Biometric Face Authenticated (Shift Closed)',
      };

      list[index] = updatedRecord;
      setStored(KEYS.ATTENDANCE, list);
      api.audit.log(
        'ATTENDANCE_CHECKOUT',
        'ATTENDANCE',
        `${record.employeeName} logged out at ${timeStr} (${workHours} hrs)`
      );
      return updatedRecord;
    },

    async regularize(attendanceId: string, reason: string): Promise<AttendanceRecord> {
      await delay(150);
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      const index = list.findIndex((a) => a.id === attendanceId);
      if (index === -1) throw new Error('Attendance record not found');

      const updated = {
        ...list[index],
        regularizationStatus: 'PENDING' as const,
        regularizationReason: reason,
      };
      list[index] = updated;
      setStored(KEYS.ATTENDANCE, list);
      return updated;
    },

    async approveRegularization(attendanceId: string): Promise<AttendanceRecord> {
      await delay(150);
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      const index = list.findIndex((a) => a.id === attendanceId);
      if (index === -1) throw new Error('Attendance record not found');

      const updated = {
        ...list[index],
        status: 'PRESENT' as const,
        regularizationStatus: 'APPROVED' as const,
      };
      list[index] = updated;
      setStored(KEYS.ATTENDANCE, list);
      api.audit.log('REGULARIZATION_APPROVED', 'ATTENDANCE', `Approved regularization for ${updated.employeeName} on ${updated.date}`);
      return updated;
    },
  },

  // --- LEAVE SERVICES ---
  leaves: {
    async getAll(): Promise<LeaveRequest[]> {
      await delay();
      return getStored<LeaveRequest[]>(KEYS.LEAVES, MOCK_LEAVE_REQUESTS);
    },

    async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
      await delay();
      const list = getStored<LeaveRequest[]>(KEYS.LEAVES, MOCK_LEAVE_REQUESTS);
      return list.filter((l) => l.employeeId === employeeId);
    },

    async getBalances(employeeId: string): Promise<LeaveBalance> {
      await delay();
      const allBalances = getStored<Record<string, LeaveBalance>>(KEYS.LEAVE_BALANCES, MOCK_LEAVE_BALANCES);
      return (
        allBalances[employeeId] || {
          casualLeave: { total: 12, used: 2, remaining: 10 },
          sickLeave: { total: 10, used: 1, remaining: 9 },
          earnedLeave: { total: 18, used: 3, remaining: 15 },
          compOff: { total: 2, used: 0, remaining: 2 },
        }
      );
    },

    async apply(data: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>): Promise<LeaveRequest> {
      await delay(200);
      const list = getStored<LeaveRequest[]>(KEYS.LEAVES, MOCK_LEAVE_REQUESTS);
      const today = new Date().toISOString().split('T')[0];

      const newLeave: LeaveRequest = {
        ...data,
        id: `lr-${Date.now()}`,
        status: 'PENDING',
        appliedOn: today,
      };

      const updated = [newLeave, ...list];
      setStored(KEYS.LEAVES, updated);
      api.audit.log('LEAVE_APPLIED', 'LEAVE', `${newLeave.employeeName} requested ${newLeave.days}d ${newLeave.leaveType}`);
      return newLeave;
    },

    async updateStatus(
      id: string,
      status: 'APPROVED' | 'REJECTED',
      reviewerName: string,
      comments?: string
    ): Promise<LeaveRequest> {
      await delay(200);
      const list = getStored<LeaveRequest[]>(KEYS.LEAVES, MOCK_LEAVE_REQUESTS);
      const index = list.findIndex((l) => l.id === id);
      if (index === -1) throw new Error('Leave request not found');

      const target = list[index];
      const reviewer = api.auth.getCurrentUser();
      const employee = getStored<Employee[]>(KEYS.EMPLOYEES, []).find(person => person.id === target.employeeId);
      if (reviewer?.role !== 'MANAGER' || !employee || getReportingManager(employee).id !== reviewer.id) {
        throw new Error('Only the assigned manager can decide this leave request');
      }
      if (target.status !== 'PENDING') throw new Error('This leave request has already been decided');
      const today = new Date().toISOString().split('T')[0];
      const updated: LeaveRequest = {
        ...target,
        status,
        reviewedBy: reviewerName,
        reviewedOn: today,
        reviewerComments: comments || (status === 'APPROVED' ? 'Approved by manager' : 'Declined'),
      };

      list[index] = updated;
      setStored(KEYS.LEAVES, list);

      // Deduct balance if approved
      if (status === 'APPROVED') {
        const balances = getStored<Record<string, LeaveBalance>>(KEYS.LEAVE_BALANCES, MOCK_LEAVE_BALANCES);
        const empBal = balances[target.employeeId];
        if (empBal) {
          if (target.leaveType === 'CASUAL_LEAVE') {
            empBal.casualLeave.used += target.days;
            empBal.casualLeave.remaining -= target.days;
          } else if (target.leaveType === 'SICK_LEAVE') {
            empBal.sickLeave.used += target.days;
            empBal.sickLeave.remaining -= target.days;
          } else if (target.leaveType === 'EARNED_LEAVE') {
            empBal.earnedLeave.used += target.days;
            empBal.earnedLeave.remaining -= target.days;
          }
          setStored(KEYS.LEAVE_BALANCES, balances);
        }
      }

      api.audit.log(
        status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        'LEAVE',
        `${reviewerName} ${status.toLowerCase()} leave for ${target.employeeName}`
      );
      return updated;
    },
  },

  // --- PAYROLL SERVICES ---
  payroll: {
    async getRuns(): Promise<PayrollRun[]> {
      await delay();
      return getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
    },

    async getRunById(id: string): Promise<PayrollRun | undefined> {
      await delay();
      const runs = getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
      return runs.find((r) => r.id === id);
    },

    async createRun(month: string, year: number): Promise<PayrollRun> {
      await delay(350);
      const runs = getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
      const employees = getStored<Employee[]>(KEYS.EMPLOYEES, []);

      const payslips: Payslip[] = employees.map((emp) => {
        const components = calculateSalaryFromMonthly(emp.monthlySalary || Math.round((emp.ctcAnnual || 360000) / 12));
        return {
          id: `ps-${year}-${month.toLowerCase()}-${emp.id}`,
          payrollRunId: `pr-${year}-${month.toLowerCase()}`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          designation: emp.designation || 'Venue Specialist',
          department: emp.departmentName || `${emp.location} Center`,
          location: emp.location,
          panNumber: emp.bankDetails.panNumber,
          uanNumber: emp.bankDetails.uanNumber,
          bankAccount: emp.bankDetails.accountNumber,
          bankName: emp.bankDetails.bankName,
          month,
          year,
          payableDays: 30,
          lossOfPayDays: 0,
          components,
          paymentStatus: 'PENDING',
          paymentMode: 'NEFT',
        };
      });

      const totalGrossPay = payslips.reduce((acc, p) => acc + p.components.grossMonthly, 0);
      const totalDeductions = payslips.reduce((acc, p) => acc + p.components.totalDeductions, 0);
      const totalNetPay = payslips.reduce((acc, p) => acc + p.components.netMonthly, 0);

      const newRun: PayrollRun = {
        id: `pr-${year}-${month.toLowerCase()}`,
        month,
        year,
        totalEmployees: payslips.length,
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        status: 'DRAFT',
        processedAt: new Date().toISOString().split('T')[0],
        payslips,
      };

      const updated = [newRun, ...runs.filter((r) => r.id !== newRun.id)];
      setStored(KEYS.PAYROLL, updated);
      api.audit.log('PAYROLL_PROCESSED', 'PAYROLL', `Generated salary register for ${month} ${year}`);
      return newRun;
    },

    async disburseRun(id: string, actorName: string): Promise<PayrollRun> {
      await delay(400);
      const runs = getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
      const index = runs.findIndex((r) => r.id === id);
      if (index === -1) throw new Error('Payroll run not found');

      const today = new Date().toISOString().split('T')[0];
      const target = runs[index];
      const updatedPayslips = target.payslips.map((p) => ({
        ...p,
        paymentStatus: 'PAID' as const,
        paymentDate: today,
      }));

      const updatedRun: PayrollRun = {
        ...target,
        status: 'DISBURSED',
        disbursedAt: today,
        disbursedBy: actorName,
        payslips: updatedPayslips,
      };

      runs[index] = updatedRun;
      setStored(KEYS.PAYROLL, runs);
      api.audit.log('PAYROLL_DISBURSED', 'PAYROLL', `Disbursed salaries for ${target.month} ${target.year} (${target.totalEmployees} employees)`);
      return updatedRun;
    },

    async getPayslip(payslipId: string): Promise<Payslip | undefined> {
      await delay();
      const runs = getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
      for (const run of runs) {
        const found = run.payslips.find((p) => p.id === payslipId);
        if (found) return found;
      }
      return undefined;
    },

    async getPayslipsByEmployee(employeeId: string): Promise<Payslip[]> {
      await delay();
      const runs = getStored<PayrollRun[]>(KEYS.PAYROLL, generateMockPayrollRuns());
      const result: Payslip[] = [];
      for (const run of runs) {
        const found = run.payslips.find((p) => p.employeeId === employeeId);
        if (found) result.push(found);
      }
      return result;
    },
  },

  // --- HOLIDAYS ---
  holidays: {
    async getAll(): Promise<Holiday[]> {
      await delay();
      return getStored<Holiday[]>(KEYS.HOLIDAYS, MOCK_HOLIDAYS);
    },

    async create(data: Omit<Holiday, 'id'>): Promise<Holiday> {
      await delay(150);
      const list = getStored<Holiday[]>(KEYS.HOLIDAYS, MOCK_HOLIDAYS);
      const newHol: Holiday = {
        ...data,
        id: `hol-${Date.now()}`,
      };
      const updated = [...list, newHol].sort((a, b) => a.date.localeCompare(b.date));
      setStored(KEYS.HOLIDAYS, updated);
      api.audit.log('HOLIDAY_ADDED', 'SETTINGS', `Added holiday: ${newHol.name} on ${newHol.date}`);
      return newHol;
    },

    async delete(id: string): Promise<void> {
      await delay(150);
      const list = getStored<Holiday[]>(KEYS.HOLIDAYS, MOCK_HOLIDAYS);
      const filtered = list.filter((h) => h.id !== id);
      setStored(KEYS.HOLIDAYS, filtered);
    },
  },

  // --- DEPARTMENTS ---
  departments: {
    async getAll(): Promise<Department[]> {
      await delay();
      return getStored<Department[]>(KEYS.DEPARTMENTS, MOCK_DEPARTMENTS);
    },

    async create(data: Omit<Department, 'id'>): Promise<Department> {
      await delay(150);
      const list = getStored<Department[]>(KEYS.DEPARTMENTS, MOCK_DEPARTMENTS);
      const newDept: Department = {
        ...data,
        id: `dept-${Date.now()}`,
      };
      setStored(KEYS.DEPARTMENTS, [...list, newDept]);
      return newDept;
    },
  },

  // --- SETTINGS ---
  settings: {
    async get(): Promise<CompanySettings> {
      await delay();
      return getStored<CompanySettings>(KEYS.SETTINGS, MOCK_COMPANY_SETTINGS);
    },

    async update(updates: Partial<CompanySettings>): Promise<CompanySettings> {
      await delay(200);
      const current = getStored<CompanySettings>(KEYS.SETTINGS, MOCK_COMPANY_SETTINGS);
      const updated = { ...current, ...updates };
      setStored(KEYS.SETTINGS, updated);
      api.audit.log('SETTINGS_UPDATED', 'SETTINGS', 'Updated company profile and organizational policies');
      return updated;
    },
  },

  // --- AUDIT LOGS ---
  audit: {
    async getLogs(): Promise<AuditLog[]> {
      await delay();
      return getStored<AuditLog[]>(KEYS.AUDIT, MOCK_AUDIT_LOGS);
    },

    log(action: string, module: AuditLog['module'], details: string): void {
      const logs = getStored<AuditLog[]>(KEYS.AUDIT, MOCK_AUDIT_LOGS);
      const user = api.auth.getCurrentUser();
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action,
        module,
        details,
        actorName: user?.name || 'System Admin',
        actorRole: user?.role || 'ADMIN',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        ipAddress: '192.168.1.10',
      };
      setStored(KEYS.AUDIT, [newLog, ...logs.slice(0, 49)]);
    },
  },
};
