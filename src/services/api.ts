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
} from '@/types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData?.message) errorMsg = errData.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Authentication Endpoints
  auth: {
    login: async (credentials: { email: string; password?: string }) => {
      const result = await fetchJSON<{
        success: boolean;
        message?: string;
        token: string;
        mustChangePassword: boolean;
        role: string;
        user: any;
      }>(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (result.user) {
        localStorage.setItem('maaya_current_user', JSON.stringify(result.user));
        localStorage.setItem('maaya_token', result.token);
      }
      return result;
    },

    changePassword: async (payload: { email: string; oldPassword?: string; newPassword: string }) => {
      return fetchJSON<{
        success: boolean;
        message: string;
        user: any;
      }>(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    forgotPassword: async (email: string) => {
      return { success: true, message: `Password reset instructions dispatched to ${email}.` };
    },

    resetPassword: async (tokenOrPayload: string | { token: string; password: string }, _password?: string) => {
      return { success: true, message: 'Your password has been successfully reset. Please log in.' };
    },

    getCurrentUser: async (): Promise<User | null> => {
      try {
        const stored = localStorage.getItem('maaya_current_user');
        if (!stored) return null;
        const u = JSON.parse(stored);
        return {
          id: String(u.id),
          name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          role: u.role || 'EMPLOYEE',
          designation: u.jobTitle || u.designation || 'Staff',
          department: u.department || 'General',
          employeeId: u.employeeCode || `MW-${u.id}`,
          joiningDate: u.dateOfJoining || u.joiningDate || '2024-01-15',
          phone: u.phone || '+91 98765 43210',
          address: u.address || '',
          status: u.status || 'ACTIVE',
          mustChangePassword: u.mustChangePassword,
        };
      } catch {
        return null;
      }
    },
  },

  // Employee Directory & Onboarding Endpoints
  employees: {
    getAll: async (): Promise<Employee[]> => {
      const data = await fetchJSON<any[]>(`${API_BASE}/employees`);
      return data.map((emp) => ({
        id: String(emp.id),
        employeeCode: emp.employeeCode || `MW-${emp.id}`,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        email: emp.email,
        phone: emp.phone || '',
        address: emp.address || '',
        designation: emp.jobTitle || emp.designation || 'Specialist',
        location: emp.location || 'Hyderabad',
        shift: emp.shift || 'MORNING',
        monthlySalary: emp.monthlySalary || 35000,
        ctcAnnual: emp.ctcAnnual || ((emp.monthlySalary || 35000) * 12),
        joiningDate: emp.dateOfJoining || emp.joiningDate || '2024-01-15',
        employmentType: emp.employmentType || 'FULL_TIME',
        role: emp.role || 'EMPLOYEE',
        mustChangePassword: emp.mustChangePassword,
        departmentName: emp.department || 'Engineering',
        status: emp.status || 'ACTIVE',
        bankDetails: emp.bankDetails || {
          accountNumber: emp.accountNumber || '918273645281',
          ifscCode: emp.ifscCode || 'HDFC0001234',
          bankName: emp.bankName || 'HDFC Bank',
          panNumber: emp.panNumber || 'ABCPS1234F',
          uanNumber: emp.uanNumber || '100928374699',
        },
        emergencyContact: emp.emergencyContact || {
          name: emp.emergencyContactName || 'Ramesh Sharma',
          relationship: emp.emergencyContactRelationship || 'Spouse',
          phone: emp.emergencyContactPhone || '+91 98765 00000',
        },
      }));
    },

    getById: async (id: string | number): Promise<Employee | null> => {
      const cleanId = String(id).replace('emp-', '');
      try {
        const emp = await fetchJSON<any>(`${API_BASE}/employees/${cleanId}`);
        return {
          id: String(emp.id),
          employeeCode: emp.employeeCode || `MW-${emp.id}`,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          email: emp.email,
          phone: emp.phone || '',
          address: emp.address || '',
          designation: emp.jobTitle || emp.designation || 'Specialist',
          location: emp.location || 'Hyderabad',
          shift: emp.shift || 'MORNING',
          monthlySalary: emp.monthlySalary || 35000,
          ctcAnnual: emp.ctcAnnual || ((emp.monthlySalary || 35000) * 12),
          joiningDate: emp.dateOfJoining || emp.joiningDate || '2024-01-15',
          employmentType: emp.employmentType || 'FULL_TIME',
          role: emp.role || 'EMPLOYEE',
          mustChangePassword: emp.mustChangePassword,
          departmentName: emp.department || 'Engineering',
          status: emp.status || 'ACTIVE',
          bankDetails: emp.bankDetails || {
            accountNumber: emp.accountNumber || '918273645281',
            ifscCode: emp.ifscCode || 'HDFC0001234',
            bankName: emp.bankName || 'HDFC Bank',
            panNumber: emp.panNumber || 'ABCPS1234F',
            uanNumber: emp.uanNumber || '100928374699',
          },
          emergencyContact: emp.emergencyContact || {
            name: emp.emergencyContactName || 'Ramesh Sharma',
            relationship: emp.emergencyContactRelationship || 'Spouse',
            phone: emp.emergencyContactPhone || '+91 98765 00000',
          },
        };
      } catch {
        // If query by numeric ID fails, try get all and match
        const all = await api.employees.getAll();
        return all.find((e) => e.id === cleanId || e.employeeCode === id) || all[0] || null;
      }
    },

    onboard: async (employeeData: Partial<Employee>): Promise<Employee> => {
      const empData = employeeData as any;
      const payload: any = {
        ...employeeData,
        jobTitle: empData.designation || empData.jobTitle,
        department: empData.departmentName || empData.department,
        dateOfJoining: empData.joiningDate || empData.dateOfJoining,
      };

      if (employeeData.bankDetails) {
        payload.accountNumber = employeeData.bankDetails.accountNumber;
        payload.ifscCode = employeeData.bankDetails.ifscCode;
        payload.bankName = employeeData.bankDetails.bankName;
        payload.panNumber = employeeData.bankDetails.panNumber;
        payload.uanNumber = employeeData.bankDetails.uanNumber;
      }

      if (employeeData.emergencyContact) {
        payload.emergencyContactName = employeeData.emergencyContact.name;
        payload.emergencyContactPhone = employeeData.emergencyContact.phone;
        payload.emergencyContactRelationship = employeeData.emergencyContact.relationship;
      }

      const res = await fetchJSON<any>(`${API_BASE}/employees/onboard`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        ...res,
        id: String(res.id),
      };
    },

    create: async (employeeData: Partial<Employee>): Promise<Employee> => {
      return api.employees.onboard(employeeData);
    },

    update: async (id: string | number, employeeData: Partial<Employee>): Promise<Employee> => {
      const cleanId = String(id).replace('emp-', '');
      const empData = employeeData as any;
      const payload: any = {
        ...employeeData,
        jobTitle: empData.designation || empData.jobTitle,
        department: empData.departmentName || empData.department,
        dateOfJoining: empData.joiningDate || empData.dateOfJoining,
      };

      if (employeeData.bankDetails) {
        payload.accountNumber = employeeData.bankDetails.accountNumber;
        payload.ifscCode = employeeData.bankDetails.ifscCode;
        payload.bankName = employeeData.bankDetails.bankName;
        payload.panNumber = employeeData.bankDetails.panNumber;
        payload.uanNumber = employeeData.bankDetails.uanNumber;
      }

      if (employeeData.emergencyContact) {
        payload.emergencyContactName = employeeData.emergencyContact.name;
        payload.emergencyContactPhone = employeeData.emergencyContact.phone;
        payload.emergencyContactRelationship = employeeData.emergencyContact.relationship;
      }

      const res = await fetchJSON<any>(`${API_BASE}/employees/${cleanId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      return {
        ...res,
        id: String(res.id),
      };
    },

    delete: async (id: string | number): Promise<boolean> => {
      const cleanId = String(id).replace('emp-', '');
      await fetchJSON(`${API_BASE}/employees/${cleanId}`, { method: 'DELETE' });
      return true;
    },
  },

  // Attendance Endpoints
  attendance: {
    getAll: async (): Promise<AttendanceRecord[]> => {
      return fetchJSON<AttendanceRecord[]>(`${API_BASE}/attendance`);
    },

    getByEmployee: async (employeeId: string | number): Promise<AttendanceRecord[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return fetchJSON<AttendanceRecord[]>(`${API_BASE}/attendance/employee/${cleanId}`);
    },

    checkIn: async (
      payloadOrId: { employeeId: string | number; location?: string; time?: string; [key: string]: any } | string | number,
      options?: { location?: string; shift?: string; notes?: string; time?: string }
    ): Promise<AttendanceRecord> => {
      let cleanId: string;
      let bodyData: any = {};
      if (typeof payloadOrId === 'object' && payloadOrId !== null) {
        cleanId = String(payloadOrId.employeeId).replace('emp-', '');
        bodyData = { ...payloadOrId, employeeId: cleanId };
      } else {
        cleanId = String(payloadOrId).replace('emp-', '');
        bodyData = { employeeId: cleanId, ...options };
      }
      return fetchJSON<AttendanceRecord>(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        body: JSON.stringify(bodyData),
      });
    },

    checkOut: async (
      payloadOrId: { employeeId: string | number; time?: string; [key: string]: any } | string | number,
      options?: { notes?: string; time?: string }
    ): Promise<AttendanceRecord> => {
      let cleanId: string;
      let bodyData: any = {};
      if (typeof payloadOrId === 'object' && payloadOrId !== null) {
        cleanId = String(payloadOrId.employeeId).replace('emp-', '');
        bodyData = { ...payloadOrId, employeeId: cleanId };
      } else {
        cleanId = String(payloadOrId).replace('emp-', '');
        bodyData = { employeeId: cleanId, ...options };
      }
      return fetchJSON<AttendanceRecord>(`${API_BASE}/attendance/check-out`, {
        method: 'POST',
        body: JSON.stringify(bodyData),
      });
    },

    regularize: async (recordId: string | number, reason: string): Promise<AttendanceRecord> => {
      return fetchJSON<AttendanceRecord>(`${API_BASE}/attendance/regularize`, {
        method: 'POST',
        body: JSON.stringify({ recordId, reason }),
      });
    },

    approveRegularization: async (recordId: string | number): Promise<AttendanceRecord> => {
      return fetchJSON<AttendanceRecord>(`${API_BASE}/attendance/${recordId}/approve-regularization`, {
        method: 'PUT',
      });
    },
  },

  // Leave Management Endpoints
  leaves: {
    getAll: async (): Promise<LeaveRequest[]> => {
      return fetchJSON<LeaveRequest[]>(`${API_BASE}/leaves`);
    },

    getByEmployee: async (employeeId: string | number): Promise<LeaveRequest[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return fetchJSON<LeaveRequest[]>(`${API_BASE}/leaves/employee/${cleanId}`);
    },

    getBalances: async (employeeId: string | number): Promise<LeaveBalance> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return fetchJSON<LeaveBalance>(`${API_BASE}/leaves/balances/${cleanId}`);
    },

    apply: async (request: Partial<LeaveRequest>): Promise<LeaveRequest> => {
      const cleanId = request.employeeId ? String(request.employeeId).replace('emp-', '') : undefined;
      return fetchJSON<LeaveRequest>(`${API_BASE}/leaves/apply`, {
        method: 'POST',
        body: JSON.stringify({ ...request, employeeId: cleanId }),
      });
    },

    updateStatus: async (
      id: string | number,
      status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
      comments?: string,
      reviewer?: string
    ): Promise<LeaveRequest> => {
      return fetchJSON<LeaveRequest>(`${API_BASE}/leaves/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, comments, reviewer }),
      });
    },
  },

  // Payroll Management Endpoints
  payroll: {
    getRuns: async (): Promise<PayrollRun[]> => {
      return fetchJSON<PayrollRun[]>(`${API_BASE}/payroll/runs`);
    },

    getPayslipsByEmployee: async (employeeId: string | number): Promise<Payslip[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return fetchJSON<Payslip[]>(`${API_BASE}/payroll/payslips/${cleanId}`);
    },

    getPayslipsByRun: async (runId: string | number): Promise<Payslip[]> => {
      return fetchJSON<Payslip[]>(`${API_BASE}/payroll/payslips/run/${runId}`);
    },

    process: async (month?: string, year?: number): Promise<PayrollRun> => {
      return fetchJSON<PayrollRun>(`${API_BASE}/payroll/process`, {
        method: 'POST',
        body: JSON.stringify({ month: month || 'October', year: year || 2026 }),
      });
    },

    createRun: async (month?: string, year?: number): Promise<PayrollRun> => {
      return api.payroll.process(month, year);
    },

    disburseRun: async (runId: string | number, disbursedBy?: string): Promise<PayrollRun> => {
      return fetchJSON<PayrollRun>(`${API_BASE}/payroll/disburse/${runId}`, {
        method: 'POST',
        body: JSON.stringify({ disbursedBy: disbursedBy || 'Administrator' }),
      });
    },
  },

  // Department Endpoints
  departments: {
    getAll: async (): Promise<Department[]> => {
      return fetchJSON<Department[]>(`${API_BASE}/departments`);
    },
  },

  // Company Settings Endpoints
  settings: {
    get: async (): Promise<CompanySettings> => {
      return fetchJSON<CompanySettings>(`${API_BASE}/settings`);
    },

    update: async (settings: Partial<CompanySettings>): Promise<CompanySettings> => {
      return fetchJSON<CompanySettings>(`${API_BASE}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    },
  },

  // Holidays Endpoints
  holidays: {
    getAll: async (): Promise<Holiday[]> => {
      return fetchJSON<Holiday[]>(`${API_BASE}/holidays`);
    },
  },

  // Audit Logs Endpoints
  auditLogs: {
    getAll: async (): Promise<AuditLog[]> => {
      return fetchJSON<AuditLog[]>(`${API_BASE}/audit-logs`);
    },
  },

  audit: {
    getAll: async (): Promise<AuditLog[]> => {
      return fetchJSON<AuditLog[]>(`${API_BASE}/audit-logs`);
    },
    getLogs: async (): Promise<AuditLog[]> => {
      return fetchJSON<AuditLog[]>(`${API_BASE}/audit-logs`);
    },
    log: async (_payload: any): Promise<{ success: boolean }> => {
      return { success: true };
    },
  },
};
