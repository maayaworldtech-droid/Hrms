import {
  User,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  OnDutyRequest,
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

const normalizePayslip = (slip: any): Payslip => {
  const comp = slip?.components || {};
  return {
    ...slip,
    id: String(slip?.id || ''),
    payrollRunId: String(slip?.payrollRunId || ''),
    employeeId: String(slip?.employeeId || ''),
    employeeCode: slip?.employeeCode || '',
    employeeName: slip?.employeeName || '',
    payableDays: slip?.payableDays ?? 30,
    lossOfPayDays: slip?.lossOfPayDays ?? 0,
    components: {
      basic: Number(comp.basic ?? slip?.basic ?? 0),
      hra: Number(comp.hra ?? slip?.hra ?? 0),
      specialAllowance: Number(comp.specialAllowance ?? slip?.specialAllowance ?? 0),
      conveyanceAllowance: Number(comp.conveyanceAllowance ?? slip?.conveyanceAllowance ?? 0),
      medicalAllowance: Number(comp.medicalAllowance ?? slip?.medicalAllowance ?? 0),
      grossMonthly: Number(comp.grossMonthly ?? slip?.grossMonthly ?? 0),
      epfEmployee: Number(comp.epfEmployee ?? slip?.epfEmployee ?? 0),
      epfEmployer: Number(comp.epfEmployer ?? slip?.epfEmployer ?? 0),
      professionalTax: Number(comp.professionalTax ?? slip?.professionalTax ?? 0),
      tds: Number(comp.tds ?? slip?.tds ?? 0),
      healthInsurance: Number(comp.healthInsurance ?? slip?.healthInsurance ?? 0),
      totalDeductions: Number(comp.totalDeductions ?? slip?.totalDeductions ?? 0),
      netMonthly: Number(comp.netMonthly ?? slip?.netMonthly ?? 0),
      ctcAnnual: Number(comp.ctcAnnual ?? slip?.ctcAnnual ?? 0),
    },
    paymentStatus: slip?.paymentStatus || 'PAID',
    paymentMode: slip?.paymentMode || 'NEFT',
  };
};

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
      return fetchJSON<{
        success: boolean;
        message: string;
        emailSent?: boolean;
        email?: string;
      }>(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword: async (
      payloadOrToken: string | { email?: string; token: string; password: string },
      newPassword?: string
    ) => {
      const payload =
        typeof payloadOrToken === 'string'
          ? { token: payloadOrToken, password: newPassword || '' }
          : payloadOrToken;
      return fetchJSON<{
        success: boolean;
        message: string;
        email?: string;
      }>(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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
          enrolledFacePhoto: u.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${u.id}`) || undefined,
          enrolledFaceBiometrics: u.enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${u.id}`) || undefined,
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
        enrolledFacePhoto: emp.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${emp.id}`) || undefined,
        enrolledFaceBiometrics: emp.enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${emp.id}`) || undefined,
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
          enrolledFacePhoto: emp.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${cleanId}`) || undefined,
          enrolledFaceBiometrics: emp.enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${cleanId}`) || undefined,
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

    resendWelcomeEmail: async (idOrEmail: string | number): Promise<{ success: boolean; message: string }> => {
      const cleanId = String(idOrEmail).replace('emp-', '');
      if (cleanId.includes('@')) {
        return fetchJSON<{ success: boolean; message: string }>(`${API_BASE}/employees/resend-email?email=${encodeURIComponent(cleanId)}`, {
          method: 'POST',
        });
      }
      return fetchJSON<{ success: boolean; message: string }>(`${API_BASE}/employees/${cleanId}/resend-email`, {
        method: 'POST',
      });
    },

    enrollFace: async (
      id: string | number,
      enrolledFacePhoto: string,
      enrolledFaceBiometrics: string
    ): Promise<{ success: boolean; message: string; enrolledFacePhoto?: string }> => {
      const cleanId = String(id).replace('emp-', '');
      try {
        localStorage.setItem(`maaya_face_photo_${cleanId}`, enrolledFacePhoto);
        localStorage.setItem(`maaya_face_bio_${cleanId}`, enrolledFaceBiometrics);
        const res = await fetchJSON<{ success: boolean; message: string; enrolledFacePhoto?: string }>(
          `${API_BASE}/employees/${cleanId}/enroll-face`,
          {
            method: 'POST',
            body: JSON.stringify({ enrolledFacePhoto, enrolledFaceBiometrics }),
          }
        );
        return res;
      } catch {
        return { success: true, message: 'Enrolled in local profile', enrolledFacePhoto };
      }
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

  // On Duty (OD) & Expense Reimbursement Endpoints
  onDuty: {
    getAll: async (): Promise<OnDutyRequest[]> => {
      const list = await fetchJSON<any[]>(`${API_BASE}/on-duty`);
      return (list || []).map((item) => ({ ...item, id: String(item.id) }));
    },

    getByEmployee: async (employeeId: string | number): Promise<OnDutyRequest[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      const list = await fetchJSON<any[]>(`${API_BASE}/on-duty/employee/${cleanId}`);
      return (list || []).map((item) => ({ ...item, id: String(item.id) }));
    },

    apply: async (request: Partial<OnDutyRequest>): Promise<OnDutyRequest> => {
      const cleanId = request.employeeId ? String(request.employeeId).replace('emp-', '') : undefined;
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/apply`, {
        method: 'POST',
        body: JSON.stringify({ ...request, employeeId: cleanId }),
      });
      return { ...res, id: String(res.id) };
    },

    updateStatus: async (
      id: string | number,
      status: 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED',
      comments?: string,
      reviewer?: string
    ): Promise<OnDutyRequest> => {
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, comments, reviewer }),
      });
      return { ...res, id: String(res.id) };
    },

    claimExpense: async (
      id: string | number,
      expense: { expenseAmount: number; expenseDescription: string; billPhoto: string }
    ): Promise<OnDutyRequest> => {
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/${id}/claim-expense`, {
        method: 'POST',
        body: JSON.stringify(expense),
      });
      return { ...res, id: String(res.id) };
    },

    updateReimbursement: async (
      id: string | number,
      reimbursementStatus: 'REIMBURSED' | 'REJECTED',
      comments?: string,
      reviewer?: string
    ): Promise<OnDutyRequest> => {
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/${id}/reimburse`, {
        method: 'PUT',
        body: JSON.stringify({ reimbursementStatus, comments, reviewer }),
      });
      return { ...res, id: String(res.id) };
    },
  },

  // Payroll Management Endpoints
  payroll: {
    getRuns: async (): Promise<PayrollRun[]> => {
      const runs = await fetchJSON<any[]>(`${API_BASE}/payroll/runs`);
      return (runs || []).map((r) => ({
        ...r,
        id: String(r.id),
        payslips: Array.isArray(r.payslips) ? r.payslips.map(normalizePayslip) : [],
      }));
    },

    getPayslipsByEmployee: async (employeeId: string | number): Promise<Payslip[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      const list = await fetchJSON<any[]>(`${API_BASE}/payroll/payslips/${cleanId}`);
      return (list || []).map(normalizePayslip);
    },

    getPayslipsByRun: async (runId: string | number): Promise<Payslip[]> => {
      const list = await fetchJSON<any[]>(`${API_BASE}/payroll/payslips/run/${runId}`);
      return (list || []).map(normalizePayslip);
    },

    process: async (month?: string, year?: number): Promise<PayrollRun> => {
      const res = await fetchJSON<any>(`${API_BASE}/payroll/process`, {
        method: 'POST',
        body: JSON.stringify({ month: month || 'October', year: year || 2026 }),
      });
      return {
        ...res,
        id: String(res.id),
        payslips: Array.isArray(res.payslips) ? res.payslips.map(normalizePayslip) : [],
      };
    },

    createRun: async (month?: string, year?: number): Promise<PayrollRun> => {
      return api.payroll.process(month, year);
    },

    disburseRun: async (runId: string | number, disbursedBy?: string): Promise<PayrollRun> => {
      const res = await fetchJSON<any>(`${API_BASE}/payroll/disburse/${runId}`, {
        method: 'POST',
        body: JSON.stringify({ disbursedBy: disbursedBy || 'Administrator' }),
      });
      return {
        ...res,
        id: String(res.id),
        payslips: Array.isArray(res.payslips) ? res.payslips.map(normalizePayslip) : [],
      };
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
