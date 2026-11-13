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
  location?: EmployeeLocation | string;
  shift?: ShiftType;
  enrolledFacePhoto?: string;
  enrolledFaceBiometrics?: string;
}

/** Name of a center, e.g. "Maaya World Hyderabad". Centers are managed in Settings. */
export type EmployeeLocation = string;

export type CenterType = 'CENTER' | 'GAMING_ZONE';

export interface CenterManager {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
}

export interface Center {
  id: string;
  name: string;
  centerType: CenterType;
  city: string;
  state: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  staffCount: number;
  managers: CenterManager[];
}

export interface CenterInput {
  name: string;
  centerType: CenterType;
  city: string;
  state?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
}
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
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  salaryStructureJson?: string;
  avatarUrl?: string;
  enrolledFacePhoto?: string;
  enrolledFaceBiometrics?: string;
  /** The employee list leaves the photo out; this says whether one is saved. */
  hasFacePhoto?: boolean;
}

export type AttendanceStatus = 
  | 'PRESENT' 
  | 'ABSENT' 
  | 'HALF_DAY' 
  | 'ON_LEAVE' 
  | 'WORK_FROM_HOME' 
  | 'LATE'
  | 'ON_DUTY';

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
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  biometricScore?: number;
  isLocationVerified?: boolean;
  isBiometricVerified?: boolean;
  facePhoto?: string;
  faceBiometrics?: string;
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

export type OnDutyType = 
  | 'BANK_DEPOSIT' 
  | 'PROCUREMENT' 
  | 'CLIENT_VISIT' 
  | 'DELIVERY' 
  | 'OFFICIAL_ERRAND' 
  | 'OTHER';

export type OnDutyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type ReimbursementStatus = 'NONE' | 'PENDING' | 'REIMBURSED' | 'REJECTED';

export interface OnDutyRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  location?: string;
  dutyDate: string;
  startTime: string;
  endTime: string;
  dutyType: OnDutyType;
  reason: string;
  status: OnDutyStatus;
  reviewedBy?: string;
  reviewedOn?: string;
  reviewerComments?: string;
  hasExpense?: boolean;
  expenseAmount?: number;
  expenseDescription?: string;
  billPhoto?: string;
  reimbursementStatus?: ReimbursementStatus;
  reimbursedBy?: string;
  reimbursedOn?: string;
  reimbursementComments?: string;
  createdAt?: string;
}

export interface DynamicSalaryItem {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
  code?: string;
}

export interface SalaryComponent {
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  bonus?: number;
  incentives?: number;
  adjustmentNotes?: string;
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

  // Days, worked out from attendance and approved leave when the month is generated
  daysInMonth: number;
  /** Days on the payroll this month (from the joining date or the 1st). */
  employedDays: number;
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  /** Unpaid days suggested from attendance; lossOfPayDays may differ if the admin changed it. */
  suggestedLopDays: number;
  /** No check-in at all this month. */
  noAttendance: boolean;

  /** Full monthly salary before unpaid days. */
  fullMonthlySalary: number;
  /** Salary not paid for unpaid days and days before joining. */
  unpaidAmount: number;
  esiEmployee: number;
  esiEmployer: number;
  otherDeductions: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptState?: string;
  /** Professional tax entered at onboarding; 0 when none was added. */
  ptMonthly: number;
  /** Made by the old calculation, which ignored attendance and leave. */
  legacyCalculation?: boolean;
}

export interface PayrollRun {
  id: string;
  /** Center this payroll covers; empty on older all-centers runs. */
  center?: string;
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
  /** Leave days a month paid in full; leave after that is cut from salary. */
  paidLeavesPerMonth?: number;
  fiscalYearStartMonth: string;
  currencySymbol: string;
  enableGeoFencingAttendance: boolean;
  autoApproveRegularizationWithinDays: number;
  /** Shift timings, "HH:mm" 24-hour */
  morningShiftStart: string;
  morningShiftEnd: string;
  eveningShiftStart: string;
  eveningShiftEnd: string;
  /** Minutes after shift start before a check-in counts as late */
  lateGraceMinutes: number;
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
