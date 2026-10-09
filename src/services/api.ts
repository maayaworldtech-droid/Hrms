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
  MOCK_EMPLOYEES,
  MOCK_ATTENDANCE,
  MOCK_LEAVE_REQUESTS,
  MOCK_LEAVE_BALANCES,
  MOCK_HOLIDAYS,
  MOCK_DEPARTMENTS,
  MOCK_COMPANY_SETTINGS,
  MOCK_AUDIT_LOGS,
  generateMockPayrollRuns,
} from './mockData';
import { calculateSalaryFromCTC } from '@/utils/salaryCalculator';

// LocalStorage Keys
const KEYS = {
  CURRENT_USER: 'pulse_current_user',
  EMPLOYEES: 'pulse_employees',
  ATTENDANCE: 'pulse_attendance',
  LEAVES: 'pulse_leaves',
  LEAVE_BALANCES: 'pulse_leave_balances',
  PAYROLL: 'pulse_payroll_runs',
  HOLIDAYS: 'pulse_holidays',
  DEPARTMENTS: 'pulse_departments',
  SETTINGS: 'pulse_settings',
  AUDIT: 'pulse_audit_logs',
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

// Initialise DB in browser storage if empty
export function initLocalStorage(): void {
  if (!localStorage.getItem(KEYS.EMPLOYEES)) {
    setStored(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
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
    setStored(KEYS.HOLIDAYS, MOCK_HOLIDAYS);
  }
  if (!localStorage.getItem(KEYS.DEPARTMENTS)) {
    setStored(KEYS.DEPARTMENTS, MOCK_DEPARTMENTS);
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
      await delay(250);
      const employees = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
      const emp = employees.find((e) => e.email.toLowerCase() === email.toLowerCase());

      if (emp) {
        const user: User = {
          id: emp.id,
          name: emp.fullName,
          email: emp.email,
          role: emp.role,
          designation: emp.designation,
          department: emp.departmentName,
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

      // Default mock fallback for admin login
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

  // --- EMPLOYEE SERVICES ---
  employees: {
    async getAll(): Promise<Employee[]> {
      await delay();
      return getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
    },

    async getById(id: string): Promise<Employee | undefined> {
      await delay();
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
      return list.find((e) => e.id === id);
    },

    async create(data: Omit<Employee, 'id'>): Promise<Employee> {
      await delay(200);
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
      const newEmp: Employee = {
        ...data,
        id: `emp-${String(list.length + 1).padStart(3, '0')}`,
      };
      const updated = [newEmp, ...list];
      setStored(KEYS.EMPLOYEES, updated);
      api.audit.log('EMPLOYEE_ONBOARDED', 'EMPLOYEE', `Added employee ${newEmp.fullName} (${newEmp.employeeCode})`);
      return newEmp;
    },

    async update(id: string, updates: Partial<Employee>): Promise<Employee> {
      await delay(200);
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
      const index = list.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Employee not found');
      const updatedEmp = { ...list[index], ...updates };
      list[index] = updatedEmp;
      setStored(KEYS.EMPLOYEES, list);
      api.audit.log('EMPLOYEE_UPDATED', 'EMPLOYEE', `Updated profile of ${updatedEmp.fullName}`);
      return updatedEmp;
    },

    async delete(id: string): Promise<void> {
      await delay(200);
      const list = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
      const target = list.find((e) => e.id === id);
      const filtered = list.filter((e) => e.id !== id);
      setStored(KEYS.EMPLOYEES, filtered);
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

    async checkIn(employeeId: string): Promise<AttendanceRecord> {
      await delay(150);
      const list = getStored<AttendanceRecord[]>(KEYS.ATTENDANCE, MOCK_ATTENDANCE);
      const employees = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);
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
        departmentName: emp?.departmentName || 'Engineering',
        date: today,
        checkIn: timeStr,
        status: isLate ? 'LATE' : 'PRESENT',
        workHours: 0,
        regularizationStatus: 'NONE',
        notes: 'Clocked in via Pulse Portal',
      };

      const updated = [newRecord, ...list];
      setStored(KEYS.ATTENDANCE, updated);
      api.audit.log('ATTENDANCE_CHECKIN', 'ATTENDANCE', `${emp?.fullName || 'Employee'} punched IN at ${timeStr}`);
      return newRecord;
    },

    async checkOut(employeeId: string): Promise<AttendanceRecord> {
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
      };

      list[index] = updatedRecord;
      setStored(KEYS.ATTENDANCE, list);
      api.audit.log('ATTENDANCE_CHECKOUT', 'ATTENDANCE', `${record.employeeName} punched OUT at ${timeStr} (${workHours} hrs)`);
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
      const employees = getStored<Employee[]>(KEYS.EMPLOYEES, MOCK_EMPLOYEES);

      const payslips: Payslip[] = employees.map((emp) => {
        const components = calculateSalaryFromCTC(emp.ctcAnnual);
        return {
          id: `ps-${year}-${month.toLowerCase()}-${emp.id}`,
          payrollRunId: `pr-${year}-${month.toLowerCase()}`,
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          designation: emp.designation,
          department: emp.departmentName,
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
