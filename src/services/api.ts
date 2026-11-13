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
  Center,
  CenterInput,
} from '@/types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('maaya_token');
  const authHeaders: Record<string, string> =
    token && token.includes('.') ? { Authorization: `Bearer ${token}` } : {};

  // Spread options first so a caller-supplied `headers` object is merged, not allowed to replace
  // the Authorization header wholesale.
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData?.message) errorMsg = errData.message;
    } catch {
      // ignore json parse error
    }
    if (response.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('maaya_current_user');
      localStorage.removeItem('maaya_token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
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
      bonus: Number(comp.bonus ?? slip?.bonus ?? 0),
      incentives: Number(comp.incentives ?? slip?.incentives ?? 0),
      adjustmentNotes: String(comp.adjustmentNotes ?? slip?.adjustmentNotes ?? ''),
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
    // Payslips made before days were tracked have none of these; they covered the full month
    daysInMonth: Number(slip?.daysInMonth) || 30,
    employedDays: Number(slip?.employedDays ?? slip?.daysInMonth ?? 30),
    workedDays: Number(slip?.workedDays) || 0,
    paidLeaveDays: Number(slip?.paidLeaveDays) || 0,
    unpaidLeaveDays: Number(slip?.unpaidLeaveDays) || 0,
    absentDays: Number(slip?.absentDays) || 0,
    suggestedLopDays: Number(slip?.suggestedLopDays ?? slip?.lossOfPayDays ?? 0),
    noAttendance: Boolean(slip?.noAttendance),
    fullMonthlySalary: Number(slip?.fullMonthlySalary) || Number(comp.grossMonthly ?? slip?.grossMonthly ?? 0),
    unpaidAmount: Number(slip?.unpaidAmount) || 0,
    esiEmployee: Number(slip?.esiEmployee) || 0,
    esiEmployer: Number(slip?.esiEmployer) || 0,
    otherDeductions: Number(slip?.otherDeductions) || 0,
    pfApplicable: Boolean(slip?.pfApplicable),
    esiApplicable: Boolean(slip?.esiApplicable),
    ptState: slip?.ptState || undefined,
    ptMonthly: Number(slip?.ptMonthly) || 0,
    legacyCalculation: slip?.daysInMonth == null,
  };
};

const normalizeCenter = (c: any): Center => ({
  id: String(c?.id ?? ''),
  name: c?.name || '',
  centerType: c?.centerType === 'GAMING_ZONE' ? 'GAMING_ZONE' : 'CENTER',
  city: c?.city || '',
  state: c?.state || '',
  address: c?.address || '',
  latitude: typeof c?.latitude === 'number' ? c.latitude : null,
  longitude: typeof c?.longitude === 'number' ? c.longitude : null,
  radiusMeters: Number(c?.radiusMeters) || 250,
  staffCount: Number(c?.staffCount) || 0,
  managers: Array.isArray(c?.managers)
    ? c.managers.map((m: any) => ({
        id: String(m.id),
        fullName: m.fullName || m.email || '',
        email: m.email || '',
        phone: m.phone || '',
        designation: m.designation || '',
      }))
    : [],
});

/**
 * The backend returns ids as numbers while the app's Employee.id is a string. Normalising at the API
 * boundary keeps every `employee.id === record.employeeId` comparison working (dashboards previously
 * matched nothing and showed zero check-ins and zero leave).
 */
const withStringIds = <T,>(row: any): T =>
  row && typeof row === 'object'
    ? ({ ...row, id: row.id != null ? String(row.id) : row.id, employeeId: row.employeeId != null ? String(row.employeeId) : row.employeeId } as T)
    : row;
const listWithStringIds = <T,>(rows: any): T[] => (Array.isArray(rows) ? rows.map((r) => withStringIds<T>(r)) : []);

const parseNumericId = (raw?: string | number | null): number | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const numeric = Number(String(raw).replace(/\D+/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const mapEmployee = (emp: any, fallbackId?: string): Employee => {
  const storageKeyId = fallbackId || emp.id;
  return {
    id: String(emp.id),
    employeeCode: emp.employeeCode || `MW-${emp.id}`,
    firstName: emp.firstName || '',
    lastName: emp.lastName || '',
    fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    email: emp.email,
    phone: emp.phone || '',
    address: emp.address || '',
    designation: emp.jobTitle || emp.designation || '',
    location: emp.location || '',
    shift: emp.shift || 'MORNING',
    managerId: emp.managerId != null ? String(emp.managerId) : undefined,
    managerName: emp.managerName || undefined,
    monthlySalary: emp.monthlySalary || 0,
    ctcAnnual: emp.ctcAnnual || (emp.monthlySalary || 0) * 12,
    joiningDate: emp.dateOfJoining || emp.joiningDate || '',
    employmentType: emp.employmentType || 'FULL_TIME',
    role: emp.role || 'EMPLOYEE',
    mustChangePassword: emp.mustChangePassword,
    departmentName: emp.department || '',
    status: emp.status || 'ACTIVE',
    bankDetails: emp.bankDetails || {
      accountNumber: emp.accountNumber || '',
      ifscCode: emp.ifscCode || '',
      bankName: emp.bankName || '',
      panNumber: emp.panNumber || '',
      uanNumber: emp.uanNumber || '',
    },
    emergencyContact: emp.emergencyContact || {
      name: emp.emergencyContactName || '',
      relationship: emp.emergencyContactRelationship || 'Spouse',
      phone: emp.emergencyContactPhone || '',
    },
    bloodGroup: emp.bloodGroup || '',
    emergencyContactName: emp.emergencyContactName || emp.emergencyContact?.name || '',
    emergencyContactPhone: emp.emergencyContactPhone || emp.emergencyContact?.phone || '',
    emergencyContactRelationship: emp.emergencyContactRelationship || emp.emergencyContact?.relationship || '',
    salaryStructureJson: emp.salaryStructureJson || '',
    enrolledFacePhoto: emp.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${storageKeyId}`) || undefined,
    enrolledFaceBiometrics: emp.enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${storageKeyId}`) || undefined,
  };
};

const buildEmployeePayload = (employeeData: Partial<Employee>): Record<string, any> => {
  const empData = employeeData as any;
  const payload: Record<string, any> = {
    ...employeeData,
    jobTitle: empData.designation || empData.jobTitle,
    department: empData.departmentName || empData.department,
    dateOfJoining: empData.joiningDate || empData.dateOfJoining,
    managerId: parseNumericId(empData.managerId),
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

  return payload;
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
          department: u.department || '',
          employeeId: u.employeeCode || `MW-${u.id}`,
          joiningDate: u.dateOfJoining || u.joiningDate || '',
          phone: u.phone || '',
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
      return data.map((emp) => mapEmployee(emp));
    },

    getById: async (id: string | number): Promise<Employee | null> => {
      const cleanId = String(id).replace('emp-', '');
      try {
        const emp = await fetchJSON<any>(`${API_BASE}/employees/${cleanId}`);
        return mapEmployee(emp, cleanId);
      } catch {
        return null;
      }
    },

    onboard: async (employeeData: Partial<Employee>): Promise<Employee> => {
      const payload = buildEmployeePayload(employeeData);
      const res = await fetchJSON<any>(`${API_BASE}/employees/onboard`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const mapped = mapEmployee(res);
      if (res.temporaryPassword) {
        (mapped as any).temporaryPassword = res.temporaryPassword;
      }
      return mapped;
    },

    create: async (employeeData: Partial<Employee>): Promise<Employee> => {
      return api.employees.onboard(employeeData);
    },

    update: async (id: string | number, employeeData: Partial<Employee>): Promise<Employee> => {
      const cleanId = String(id).replace('emp-', '');
      const payload = buildEmployeePayload(employeeData);
      const res = await fetchJSON<any>(`${API_BASE}/employees/${cleanId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      return mapEmployee(res, cleanId);
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
      const res = await fetchJSON<{ success: boolean; message: string; enrolledFacePhoto?: string }>(
        `${API_BASE}/employees/${cleanId}/enroll-face`,
        {
          method: 'POST',
          body: JSON.stringify({ enrolledFacePhoto, enrolledFaceBiometrics }),
        }
      );
      localStorage.setItem(`maaya_face_photo_${cleanId}`, enrolledFacePhoto);
      localStorage.setItem(`maaya_face_bio_${cleanId}`, enrolledFaceBiometrics);
      try {
        const rawUser = localStorage.getItem('maaya_current_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (String(parsed.id) === cleanId) {
            parsed.enrolledFacePhoto = enrolledFacePhoto;
            parsed.enrolledFaceBiometrics = enrolledFaceBiometrics;
            localStorage.setItem('maaya_current_user', JSON.stringify(parsed));
          }
        }
      } catch { /* ignore storage sync error */ }
      return res;
    },
  },

  // Attendance Endpoints
  attendance: {
    getAll: async (): Promise<AttendanceRecord[]> => {
      return listWithStringIds<AttendanceRecord>(await fetchJSON<any[]>(`${API_BASE}/attendance`));
    },

    getPaged: async (params: {
      date?: string;
      fromDate?: string;
      toDate?: string;
      location?: string;
      shift?: string;
      status?: string;
      search?: string;
      employeeIds?: (string | number)[];
      page?: number;
      size?: number;
    }): Promise<{
      items: AttendanceRecord[];
      page: number;
      size: number;
      hasMore: boolean;
      totalElements: number;
      summary?: { present: number; onDuty: number; late: number; onLeave: number };
    }> => {
      const qs = new URLSearchParams();
      if (params.date) qs.set('date', params.date);
      if (params.fromDate) qs.set('fromDate', params.fromDate);
      if (params.toDate) qs.set('toDate', params.toDate);
      if (params.location && params.location !== 'ALL') qs.set('location', params.location);
      if (params.shift && params.shift !== 'ALL') qs.set('shift', params.shift);
      if (params.status && params.status !== 'ALL') qs.set('status', params.status);
      if (params.search && params.search.trim()) qs.set('search', params.search.trim());
      if (params.employeeIds && params.employeeIds.length > 0) {
        params.employeeIds.forEach((id) => {
          const clean = String(id).replace('emp-', '').trim();
          if (/^\d+$/.test(clean)) qs.append('employeeIds', clean);
        });
      }
      qs.set('page', String(params.page ?? 0));
      qs.set('size', String(params.size ?? 20));
      const res = await fetchJSON<any>(`${API_BASE}/attendance/paged?${qs.toString()}`);
      return { ...res, items: listWithStringIds<AttendanceRecord>(res?.items) };
    },

    getByEmployee: async (employeeId: string | number): Promise<AttendanceRecord[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return listWithStringIds<AttendanceRecord>(await fetchJSON<any[]>(`${API_BASE}/attendance/employee/${cleanId}`));
    },

    getEmployeeHistory: async (
      employeeId: string | number,
      params?: { fromDate?: string; toDate?: string; page?: number; size?: number }
    ): Promise<{
      items: AttendanceRecord[];
      fromDate: string;
      toDate: string;
      page: number;
      size: number;
      hasMore: boolean;
      hasOlderRecords: boolean;
    }> => {
      const cleanId = String(employeeId).replace('emp-', '');
      const qs = new URLSearchParams();
      if (params?.fromDate) qs.set('fromDate', params.fromDate);
      if (params?.toDate) qs.set('toDate', params.toDate);
      qs.set('page', String(params?.page ?? 0));
      qs.set('size', String(params?.size ?? 10));
      const res = await fetchJSON<any>(`${API_BASE}/attendance/employee/${cleanId}/history?${qs.toString()}`);
      return { ...res, items: listWithStringIds<AttendanceRecord>(res?.items) };
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
      return withStringIds<AttendanceRecord>(
        await fetchJSON<any>(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        body: JSON.stringify(bodyData),
        })
      );
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
      return withStringIds<AttendanceRecord>(
        await fetchJSON<any>(`${API_BASE}/attendance/check-out`, {
        method: 'POST',
        body: JSON.stringify(bodyData),
        })
      );
    },

    regularize: async (recordId: string | number, reason: string): Promise<AttendanceRecord> => {
      return withStringIds<AttendanceRecord>(
        await fetchJSON<any>(`${API_BASE}/attendance/regularize`, {
        method: 'POST',
        body: JSON.stringify({ recordId, reason }),
        })
      );
    },

    approveRegularization: async (recordId: string | number): Promise<AttendanceRecord> => {
      return withStringIds<AttendanceRecord>(
        await fetchJSON<any>(`${API_BASE}/attendance/${recordId}/approve-regularization`, {
        method: 'PUT',
        })
      );
    },
  },

  // Leave Management Endpoints
  leaves: {
    getAll: async (): Promise<LeaveRequest[]> => {
      return listWithStringIds<LeaveRequest>(await fetchJSON<any[]>(`${API_BASE}/leaves`));
    },

    getByEmployee: async (employeeId: string | number): Promise<LeaveRequest[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return listWithStringIds<LeaveRequest>(await fetchJSON<any[]>(`${API_BASE}/leaves/employee/${cleanId}`));
    },

    getBalances: async (employeeId: string | number): Promise<LeaveBalance> => {
      const cleanId = String(employeeId).replace('emp-', '');
      return fetchJSON<LeaveBalance>(`${API_BASE}/leaves/balances/${cleanId}`);
    },

    apply: async (request: Partial<LeaveRequest>): Promise<LeaveRequest> => {
      const cleanId = request.employeeId ? String(request.employeeId).replace('emp-', '') : undefined;
      return withStringIds<LeaveRequest>(
        await fetchJSON<any>(`${API_BASE}/leaves/apply`, {
        method: 'POST',
        body: JSON.stringify({ ...request, employeeId: cleanId }),
        })
      );
    },

    updateStatus: async (
      id: string | number,
      status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
      comments?: string,
      reviewer?: string
    ): Promise<LeaveRequest> => {
      return withStringIds<LeaveRequest>(
        await fetchJSON<any>(`${API_BASE}/leaves/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, comments, reviewer }),
        })
      );
    },
  },

  // On Duty (OD) & Expense Reimbursement Endpoints
  onDuty: {
    getAll: async (): Promise<OnDutyRequest[]> => {
      const list = await fetchJSON<any[]>(`${API_BASE}/on-duty`);
      return listWithStringIds<OnDutyRequest>(list);
    },

    getByEmployee: async (employeeId: string | number): Promise<OnDutyRequest[]> => {
      const cleanId = String(employeeId).replace('emp-', '');
      const list = await fetchJSON<any[]>(`${API_BASE}/on-duty/employee/${cleanId}`);
      return listWithStringIds<OnDutyRequest>(list);
    },

    apply: async (request: Partial<OnDutyRequest>): Promise<OnDutyRequest> => {
      const cleanId = request.employeeId ? String(request.employeeId).replace('emp-', '') : undefined;
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/apply`, {
        method: 'POST',
        body: JSON.stringify({ ...request, employeeId: cleanId }),
      });
      return withStringIds<OnDutyRequest>(res);
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
      return withStringIds<OnDutyRequest>(res);
    },

    claimExpense: async (
      id: string | number,
      expense: { expenseAmount: number; expenseDescription: string; billPhoto: string }
    ): Promise<OnDutyRequest> => {
      const res = await fetchJSON<any>(`${API_BASE}/on-duty/${id}/claim-expense`, {
        method: 'POST',
        body: JSON.stringify(expense),
      });
      return withStringIds<OnDutyRequest>(res);
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
      return withStringIds<OnDutyRequest>(res);
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

    process: async (month: string, year: number, center?: string): Promise<PayrollRun> => {
      const res = await fetchJSON<any>(`${API_BASE}/payroll/process`, {
        method: 'POST',
        body: JSON.stringify({ month, year, center }),
      });
      return {
        ...res,
        id: String(res.id),
        payslips: Array.isArray(res.payslips) ? res.payslips.map(normalizePayslip) : [],
      };
    },

    createRun: async (month: string, year: number, center?: string): Promise<PayrollRun> => {
      return api.payroll.process(month, year, center);
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

    adjustPayslip: async (
      payslipId: string | number,
      adjustment: {
        lossOfPayDays?: number;
        bonus?: number;
        tds?: number;
        otherDeductions?: number;
        notes?: string;
      }
    ): Promise<Payslip> => {
      const res = await fetchJSON<any>(`${API_BASE}/payroll/payslips/${payslipId}/adjust`, {
        method: 'PUT',
        body: JSON.stringify(adjustment),
      });
      return normalizePayslip(res);
    },
  },

  // Centers (Maaya World Hyderabad, gaming zones, ...) and their managers
  centers: {
    getAll: async (): Promise<Center[]> => {
      const list = await fetchJSON<any[]>(`${API_BASE}/centers`);
      return (list || []).map(normalizeCenter);
    },

    create: async (input: CenterInput): Promise<Center> => {
      const res = await fetchJSON<any>(`${API_BASE}/centers`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return normalizeCenter(res);
    },

    update: async (id: string, input: Partial<CenterInput>): Promise<Center> => {
      const res = await fetchJSON<any>(`${API_BASE}/centers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return normalizeCenter(res);
    },

    delete: async (id: string): Promise<void> => {
      await fetchJSON(`${API_BASE}/centers/${id}`, { method: 'DELETE' });
    },

    addManager: async (centerId: string, employeeId: string): Promise<Center> => {
      const res = await fetchJSON<any>(`${API_BASE}/centers/${centerId}/managers`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: String(employeeId).replace('emp-', '') }),
      });
      return normalizeCenter(res);
    },

    removeManager: async (
      centerId: string,
      employeeId: string,
      action: 'demote' | 'deactivate'
    ): Promise<Center> => {
      const res = await fetchJSON<any>(
        `${API_BASE}/centers/${centerId}/managers/${String(employeeId).replace('emp-', '')}?action=${action}`,
        { method: 'DELETE' }
      );
      return normalizeCenter(res);
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
