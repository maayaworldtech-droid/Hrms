import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  PayrollRun,
  CompanySettings,
  AuditLog,
  User,
} from '@/types';
import { calculateSalaryFromMonthly } from '@/utils/salaryCalculator';

export const MOCK_USERS: Record<string, User> = {
  admin: {
    id: 'emp-001',
    name: 'Sarah Jenkins',
    email: 'admin@maayaworld.com',
    role: 'ADMIN',
    designation: 'Head of People & Operations',
    department: 'Operations',
    employeeId: 'MW-1001',
    joiningDate: '2021-03-15',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
  },
  manager: {
    id: 'emp-002',
    name: 'Rajesh Kumar',
    email: 'manager@maayaworld.com',
    role: 'MANAGER',
    designation: 'Venue Operations Manager',
    department: 'Operations',
    employeeId: 'MW-1002',
    joiningDate: '2022-01-10',
    phone: '+91 98123 45678',
    managerId: 'emp-001',
    managerName: 'Sarah Jenkins',
    status: 'ACTIVE',
  },
  employee: {
    id: 'emp-003',
    name: 'Priya Sharma',
    email: 'employee@maayaworld.com',
    role: 'EMPLOYEE',
    designation: 'Senior Experience Host',
    department: 'Operations',
    employeeId: 'MW-1003',
    joiningDate: '2023-04-03',
    phone: '+91 99887 76655',
    managerId: 'emp-002',
    managerName: 'Rajesh Kumar',
    status: 'ACTIVE',
  },
};

// Preserve explicit reporting assignments; use only known demo account relationships as a fallback.
export const getReportingManager = (employee: Employee) => {
  if (employee.managerId !== undefined) return { id: employee.managerId, name: employee.managerName };
  const profile = Object.values(MOCK_USERS).find(user => user.id === employee.id && user.email.toLowerCase() === employee.email.toLowerCase() && user.employeeId === employee.employeeCode);
  return { id: profile?.managerId, name: profile?.managerName };
};

// No dummy employees - employees are loaded dynamically from the PostgreSQL backend
export const MOCK_EMPLOYEES: Employee[] = [];

// --- ATTENDANCE TELEMETRY FOR MAAYA WORLD VENUES (MORNING: 9AM-1PM, EVENING: 1PM-9PM) ---
const realToday = new Date().toISOString().split('T')[0];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-01',
    employeeId: 'emp-001',
    employeeName: 'Sarah Jenkins',
    location: 'Hyderabad',
    shift: 'MORNING',
    date: realToday,
    checkIn: '08:52',
    checkOut: '13:05',
    status: 'PRESENT',
    workHours: 4.22,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-02',
    employeeId: 'emp-002',
    employeeName: 'Rajesh Kumar',
    location: 'Vizag',
    shift: 'EVENING',
    date: realToday,
    checkIn: '12:55',
    checkOut: '21:05',
    status: 'PRESENT',
    workHours: 8.16,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-03',
    employeeId: 'emp-003',
    employeeName: 'Priya Sharma',
    location: 'Hyderabad',
    shift: 'MORNING',
    date: realToday,
    checkIn: '08:58',
    checkOut: '13:02',
    status: 'PRESENT',
    workHours: 4.07,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-04',
    employeeId: 'emp-004',
    employeeName: 'Aarav Reddy',
    location: 'Hyderabad',
    shift: 'EVENING',
    date: realToday,
    checkIn: '13:00',
    checkOut: '21:10',
    status: 'PRESENT',
    workHours: 8.16,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-05',
    employeeId: 'emp-005',
    employeeName: 'Bhavya Mishra',
    location: 'Bhubaneswar',
    shift: 'MORNING',
    date: realToday,
    checkIn: '08:55',
    checkOut: '13:00',
    status: 'PRESENT',
    workHours: 4.08,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-06',
    employeeId: 'emp-006',
    employeeName: 'Kalyan Naidu',
    location: 'Vizag',
    shift: 'MORNING',
    date: realToday,
    checkIn: '09:40',
    checkOut: '13:00',
    status: 'LATE',
    workHours: 3.33,
    regularizationStatus: 'PENDING',
    regularizationReason: 'Beach road heavy traffic diversion',
  },
  {
    id: 'att-07',
    employeeId: 'emp-007',
    employeeName: 'Lipsa Mohanty',
    location: 'Bhubaneswar',
    shift: 'EVENING',
    date: realToday,
    checkIn: '12:58',
    checkOut: '21:00',
    status: 'PRESENT',
    workHours: 8.03,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-08',
    employeeId: 'emp-008',
    employeeName: 'Venkatesh Rao',
    location: 'Hyderabad',
    shift: 'EVENING',
    date: realToday,
    status: 'ABSENT',
    workHours: 0,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-09',
    employeeId: 'emp-009',
    employeeName: 'Harini Varma',
    location: 'Vizag',
    shift: 'MORNING',
    date: realToday,
    checkIn: '08:50',
    checkOut: '13:00',
    status: 'PRESENT',
    workHours: 4.17,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-10',
    employeeId: 'emp-010',
    employeeName: 'Sambit Behera',
    location: 'Bhubaneswar',
    shift: 'EVENING',
    date: realToday,
    checkIn: '13:02',
    checkOut: '21:08',
    status: 'PRESENT',
    workHours: 8.1,
    regularizationStatus: 'NONE',
  },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr-101',
    employeeId: 'emp-003',
    employeeName: 'Priya Sharma',
    location: 'Hyderabad',
    leaveType: 'CASUAL_LEAVE',
    startDate: '2026-10-23',
    endDate: '2026-10-24',
    days: 2,
    reason: 'Family celebration out of town',
    status: 'PENDING',
    appliedOn: '2026-10-08',
  },
  {
    id: 'lr-102',
    employeeId: 'emp-006',
    employeeName: 'Kalyan Naidu',
    location: 'Vizag',
    leaveType: 'SICK_LEAVE',
    startDate: '2026-10-14',
    endDate: '2026-10-15',
    days: 2,
    reason: 'Medical consultation & recovery',
    status: 'PENDING',
    appliedOn: '2026-10-09',
  },
  {
    id: 'lr-103',
    employeeId: 'emp-007',
    employeeName: 'Lipsa Mohanty',
    location: 'Bhubaneswar',
    leaveType: 'EARNED_LEAVE',
    startDate: '2026-11-02',
    endDate: '2026-11-06',
    days: 5,
    reason: 'Annual personal leave',
    status: 'PENDING',
    appliedOn: '2026-10-07',
  },
  {
    id: 'lr-104',
    employeeId: 'emp-002',
    employeeName: 'Rajesh Kumar',
    location: 'Vizag',
    leaveType: 'CASUAL_LEAVE',
    startDate: '2026-09-18',
    endDate: '2026-09-18',
    days: 1,
    reason: 'Personal work',
    status: 'APPROVED',
    appliedOn: '2026-09-15',
    reviewedBy: 'Sarah Jenkins',
    reviewedOn: '2026-09-16',
  },
];

export const MOCK_LEAVE_BALANCES: Record<string, LeaveBalance> = {
  'emp-003': {
    casualLeave: { total: 12, used: 3, remaining: 9 },
    sickLeave: { total: 10, used: 2, remaining: 8 },
    earnedLeave: { total: 18, used: 4, remaining: 14 },
    compOff: { total: 2, used: 0, remaining: 2 },
  },
  'emp-002': {
    casualLeave: { total: 12, used: 2, remaining: 10 },
    sickLeave: { total: 10, used: 1, remaining: 9 },
    earnedLeave: { total: 18, used: 5, remaining: 13 },
    compOff: { total: 4, used: 1, remaining: 3 },
  },
  'emp-001': {
    casualLeave: { total: 12, used: 1, remaining: 11 },
    sickLeave: { total: 10, used: 0, remaining: 10 },
    earnedLeave: { total: 18, used: 3, remaining: 15 },
    compOff: { total: 2, used: 0, remaining: 2 },
  },
};

// Helper to generate realistic payroll runs across 300 employees
export function generateMockPayrollRuns(): PayrollRun[] {
  const months = [
    { month: 'September', year: 2026, status: 'DISBURSED' as const },
    { month: 'August', year: 2026, status: 'DISBURSED' as const },
    { month: 'July', year: 2026, status: 'DISBURSED' as const },
    { month: 'October', year: 2026, status: 'APPROVED' as const },
  ];

  return months.map((m, idx) => {
    const payslips = MOCK_EMPLOYEES.map((emp) => {
      const comp = calculateSalaryFromMonthly(emp.monthlySalary);
      return {
        id: `ps-${m.year}-${m.month.toLowerCase()}-${emp.id}`,
        payrollRunId: `pr-${m.year}-${m.month.toLowerCase()}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        designation: emp.designation || 'Staff',
        department: `${emp.location} Center`,
        location: emp.location,
        panNumber: emp.bankDetails.panNumber,
        uanNumber: emp.bankDetails.uanNumber,
        bankAccount: emp.bankDetails.accountNumber,
        bankName: emp.bankDetails.bankName,
        month: m.month,
        year: m.year,
        payableDays: 30,
        lossOfPayDays: 0,
        components: comp,
        paymentStatus: m.status === 'DISBURSED' ? ('PAID' as const) : ('PENDING' as const),
        paymentDate: m.status === 'DISBURSED' ? `${m.year}-${String(10 - idx).padStart(2, '0')}-01` : undefined,
        paymentMode: 'NEFT' as const,
      };
    });

    const totalGross = payslips.reduce((acc, p) => acc + p.components.grossMonthly, 0);
    const totalDeductions = payslips.reduce((acc, p) => acc + p.components.totalDeductions, 0);
    const totalNet = payslips.reduce((acc, p) => acc + p.components.netMonthly, 0);

    return {
      id: `pr-${m.year}-${m.month.toLowerCase()}`,
      month: m.month,
      year: m.year,
      totalEmployees: payslips.length,
      totalGrossPay: totalGross,
      totalDeductions: totalDeductions,
      totalNetPay: totalNet,
      status: m.status,
      processedAt: `${m.year}-${String(10 - idx).padStart(2, '0')}-01`,
      disbursedAt: m.status === 'DISBURSED' ? `${m.year}-${String(10 - idx).padStart(2, '0')}-01` : undefined,
      disbursedBy: m.status === 'DISBURSED' ? 'Sarah Jenkins (Finance & Ops)' : undefined,
      payslips,
    };
  });
}

export const MOCK_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Maaya World Pvt. Ltd.',
  legalEntityName: 'Maaya World Entertainment & Arts Pvt. Ltd.',
  corporateTaxId: '36AABCM1987K1Z8',
  pfRegistrationNo: 'TELHYD001928374',
  esiRegistrationNo: '52000987654321001',
  registeredAddress: '2nd Floor, Prism Mall, Gachibowli, Hyderabad, Telangana - 500032',
  contactEmail: 'hr@themaayaworld.com',
  contactPhone: '+91 40 4910 8800',
  standardWorkHoursPerDay: 8.5,
  workDaysPerWeek: 6,
  fiscalYearStartMonth: 'April',
  currencySymbol: '₹',
  enableGeoFencingAttendance: true,
  autoApproveRegularizationWithinDays: 3,
};

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    action: 'PAYROLL_DISBURSED',
    module: 'PAYROLL',
    details: 'Disbursed September 2026 payroll for 300 active venue employees across Hyderabad, Vizag, and Bhubaneswar',
    actorName: 'Sarah Jenkins',
    actorRole: 'ADMIN',
    timestamp: '2026-10-01 11:30:15',
    ipAddress: '192.168.1.45',
  },
  {
    id: 'log-02',
    action: 'LEAVE_APPROVED',
    module: 'LEAVE',
    details: 'Approved 1-day Casual Leave for Rajesh Kumar (Vizag Venue Manager)',
    actorName: 'Sarah Jenkins',
    actorRole: 'ADMIN',
    timestamp: '2026-09-16 10:15:20',
    ipAddress: '192.168.1.28',
  },
  {
    id: 'log-03',
    action: 'EMPLOYEE_ONBOARDED',
    module: 'EMPLOYEE',
    details: 'Onboarded Experience Host for Bhubaneswar center at KIIT Chowk',
    actorName: 'Sarah Jenkins',
    actorRole: 'ADMIN',
    timestamp: '2026-09-01 09:40:00',
    ipAddress: '192.168.1.12',
  },
];
