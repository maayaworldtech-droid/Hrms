export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  designation: string;
  department: string;
  employeeId: string;
  joiningDate: string;
  phone: string;
  address?: string;
  managerId?: string;
  managerName?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'TERMINATED';
  mustChangePassword?: boolean;
}

export type EmployeeLocation = 'Hyderabad' | 'Vizag' | 'Bhubaneswar';
export type ShiftType = 'MORNING' | 'EVENING';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  designation?: string;
  location: EmployeeLocation | string;
  shift?: ShiftType;
  monthlySalary: number;
  ctcAnnual: number;
  joiningDate: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  role?: UserRole;
  password?: string;
  mustChangePassword?: boolean;
  departmentId?: string;
  departmentName?: string;
  managerId?: string;
  managerName?: string;
  status?: 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'TERMINATED';
  salaryStructureId?: string;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    panNumber: string;
    uanNumber: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  avatarUrl?: string;
}

export type AttendanceStatus = 
  | 'PRESENT' 
  | 'ABSENT' 
  | 'HALF_DAY' 
  | 'ON_LEAVE' 
  | 'WORK_FROM_HOME' 
  | 'LATE';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  location?: string;
  shift?: ShiftType;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  status: AttendanceStatus;
  workHours: number;
  regularizationStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  regularizationReason?: string;
  notes?: string;
}

export type LeaveType = 
  | 'CASUAL_LEAVE' 
  | 'SICK_LEAVE' 
  | 'EARNED_LEAVE' 
  | 'MATERNITY_LEAVE' 
  | 'PATERNITY_LEAVE' 
  | 'LOSS_OF_PAY';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  location?: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedBy?: string;
  reviewedOn?: string;
  reviewerComments?: string;
}

export interface LeaveBalance {
  casualLeave: { total: number; used: number; remaining: number };
  sickLeave: { total: number; used: number; remaining: number };
  earnedLeave: { total: number; used: number; remaining: number };
  compOff: { total: number; used: number; remaining: number };
}

export interface SalaryComponent {
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  grossMonthly: number;
  epfEmployee: number;
  epfEmployer: number;
  professionalTax: number;
  tds: number;
  healthInsurance: number;
  totalDeductions: number;
  netMonthly: number;
  ctcAnnual: number;
}

export interface SalaryStructureTemplate {
  id: string;
  name: string;
  designationLevel: string;
  description: string;
  basicPercent: number; // % of CTC/Gross
  hraPercent: number; // % of Basic
  conveyance: number;
  medical: number;
  specialPercent: number;
  pfRate: number; // 12%
  professionalTaxFixed: number;
  standardTdsPercent: number;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation?: string;
  department?: string;
  location?: string;
  panNumber: string;
  uanNumber: string;
  bankAccount: string;
  bankName: string;
  month: string;
  year: number;
  payableDays: number;
  lossOfPayDays: number;
  components: SalaryComponent;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  paymentDate?: string;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
}

export interface PayrollRun {
  id: string;
  month: string;
  year: number;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: 'DRAFT' | 'APPROVED' | 'DISBURSED';
  processedAt: string;
  disbursedAt?: string;
  disbursedBy?: string;
  payslips: Payslip[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
  type: 'NATIONAL' | 'FESTIVAL' | 'OPTIONAL';
  isMandatory: boolean;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headName: string;
  headEmail: string;
  employeeCount: number;
  budgetAllocated: number;
}

export interface CompanySettings {
  companyName: string;
  legalEntityName: string;
  corporateTaxId: string; // GST/PAN
  pfRegistrationNo: string;
  esiRegistrationNo: string;
  registeredAddress: string;
  contactEmail: string;
  contactPhone: string;
  standardWorkHoursPerDay: number;
  workDaysPerWeek: number;
  fiscalYearStartMonth: string;
  currencySymbol: string;
  enableGeoFencingAttendance: boolean;
  autoApproveRegularizationWithinDays: number;
}

export interface AuditLog {
  id: string;
  action: string;
  module: 'AUTH' | 'EMPLOYEE' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'SETTINGS';
  details: string;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  ipAddress: string;
}
