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

// --- REALISTIC MAAYA WORLD ~300 EMPLOYEE ROSTER ---
// Maaya World is an immersive sensory entertainment & experiential arts destination
// Locations: Hyderabad (Prism Mall), Vizag (Beach Road), Bhubaneswar (KIIT Chowk)
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Bhavya', 'Chaitanya', 'Deepak', 'Divya',
  'Gautam', 'Harini', 'Ishaan', 'Kalyan', 'Kavya', 'Kiran', 'Madhuri', 'Manish', 'Meghana',
  'Naveen', 'Niharika', 'Pranav', 'Pooja', 'Raghav', 'Roshni', 'Sai', 'Sandeep', 'Shalini',
  'Siddharth', 'Sneha', 'Srikant', 'Srinivas', 'Sunil', 'Swati', 'Tarun', 'Teja', 'Varun',
  'Venkatesh', 'Vidya', 'Vijay', 'Vikram', 'Vishal', 'Yash', 'Anurag', 'Biswajit', 'Chinmay',
  'Debasish', 'Lipsa', 'Manoj', 'Pradosh', 'Priyadarshini', 'Rajalaxmi', 'Sambit', 'Soumya',
  'Subhashree', 'Sujit', 'Tanmay', 'Tapas'
];

const LAST_NAMES = [
  'Reddy', 'Rao', 'Sharma', 'Verma', 'Patel', 'Kumar', 'Sen', 'Choudhury', 'Nayak', 'Das',
  'Patnaik', 'Mishra', 'Pradhan', 'Mohanty', 'Behera', 'Rout', 'Sahoo', 'Samal', 'Tripathy',
  'Vemula', 'Goud', 'Varma', 'Babu', 'Naidu', 'Challa', 'Konda', 'Yadav', 'Murthy', 'Iyer',
  'Kulkarni', 'Joshi', 'Mehta', 'Gupta', 'Singh', 'Bose', 'Chatterjee', 'Banerjee'
];

const DESIGNATIONS = [
  { title: 'Venue Operations Manager', salary: 65000 },
  { title: 'Assistant Venue Manager', salary: 50000 },
  { title: 'Senior Experience Host', salary: 34000 },
  { title: 'Experience Host & Guide', salary: 28000 },
  { title: 'Box Office Lead', salary: 32000 },
  { title: 'Ticketing & Cashier Executive', salary: 25000 },
  { title: 'Chief Lighting & Audio Specialist', salary: 48000 },
  { title: 'Immersive Visuals Technician', salary: 38000 },
  { title: 'Sound & Acoustics Specialist', salary: 36000 },
  { title: 'Guest Relations Officer', salary: 32000 },
  { title: 'Floor & Crowd Safety Marshal', salary: 24000 },
  { title: 'Retail & Merchandising Executive', salary: 26000 },
  { title: 'Facilities & Maintenance Lead', salary: 30000 },
  { title: 'Operations Associate', salary: 26000 },
];

function generate300Employees(): Employee[] {
  const list: Employee[] = [
    {
      id: 'emp-001',
      employeeCode: 'MW-1001',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      fullName: 'Sarah Jenkins',
      email: 'admin@maayaworld.com',
      phone: '+91 98765 43210',
      designation: 'Head of People & Operations',
      location: 'Hyderabad',
      monthlySalary: 75000,
      ctcAnnual: 900000,
      joiningDate: '2021-03-15',
      bankDetails: {
        accountNumber: '9123894582910',
        ifscCode: 'HDFC0001234',
        bankName: 'HDFC Bank',
        panNumber: 'ABCPS1234F',
        uanNumber: '100928374651',
      },
    },
    {
      id: 'emp-002',
      employeeCode: 'MW-1002',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      fullName: 'Rajesh Kumar',
      email: 'manager@maayaworld.com',
      phone: '+91 98123 45678',
      designation: 'Venue Operations Manager',
      location: 'Vizag',
      monthlySalary: 62000,
      ctcAnnual: 744000,
      joiningDate: '2022-01-10',
      bankDetails: {
        accountNumber: '5010029384756',
        ifscCode: 'ICIC0000045',
        bankName: 'ICICI Bank',
        panNumber: 'BKRPS4567E',
        uanNumber: '100928374652',
      },
    },
    {
      id: 'emp-003',
      employeeCode: 'MW-1003',
      firstName: 'Priya',
      lastName: 'Sharma',
      fullName: 'Priya Sharma',
      email: 'employee@maayaworld.com',
      phone: '+91 99887 76655',
      designation: 'Senior Experience Host',
      location: 'Hyderabad',
      monthlySalary: 34000,
      ctcAnnual: 408000,
      joiningDate: '2023-04-03',
      bankDetails: {
        accountNumber: '382910495827',
        ifscCode: 'SBIN0004567',
        bankName: 'State Bank of India',
        panNumber: 'CPRPS7890D',
        uanNumber: '100928374653',
      },
    },
  ];

  // Distribute remaining 297 employees:
  // Hyderabad: 138 more (total 140)
  // Vizag: 89 more (total 90)
  // Bhubaneswar: 70 (total 70)
  const locationPlan = [
    ...Array(137).fill('Hyderabad'),
    ...Array(89).fill('Vizag'),
    ...Array(70).fill('Bhubaneswar'),
  ];

  const banks = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Union Bank of India'];
  const ifscPrefixes = ['HDFC000', 'ICIC000', 'SBIN000', 'UTIB000', 'KKBK000', 'UBIN000'];

  for (let i = 0; i < locationPlan.length; i++) {
    const idx = i + 4; // MW-1004 onwards
    const loc = locationPlan[i];
    const fName = FIRST_NAMES[(i * 7 + 11) % FIRST_NAMES.length];
    const lName = LAST_NAMES[(i * 13 + 3) % LAST_NAMES.length];
    const desigObj = DESIGNATIONS[(i * 5 + 2) % DESIGNATIONS.length];
    const bankIdx = i % banks.length;

    // slight salary variance per individual
    const salaryVariance = ((i % 5) - 2) * 1500;
    const monthlySalary = desigObj.salary + salaryVariance;

    const startYear = 2021 + (i % 6);
    const startMonth = String((i % 12) + 1).padStart(2, '0');
    const startDay = String((i % 27) + 1).padStart(2, '0');

    list.push({
      id: `emp-${String(idx).padStart(3, '0')}`,
      employeeCode: `MW-${1000 + idx}`,
      firstName: fName,
      lastName: lName,
      fullName: `${fName} ${lName}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i > 40 ? i : ''}@maayaworld.com`,
      phone: `+91 9${String(100000000 + (i * 2891341) % 899999999).slice(0, 9)}`,
      designation: desigObj.title,
      location: loc,
      monthlySalary,
      ctcAnnual: monthlySalary * 12,
      joiningDate: `${startYear}-${startMonth}-${startDay}`,
      bankDetails: {
        accountNumber: `${400000000000 + (i * 987123) % 500000000000}`,
        ifscCode: `${ifscPrefixes[bankIdx]}${String(1000 + (i % 899))}`,
        bankName: banks[bankIdx],
        panNumber: `MWP${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i * 3) % 26))}${1000 + i}K`,
        uanNumber: `10092837${String(5000 + i).slice(-4)}`,
      },
    });
  }

  return list;
}

export const MOCK_EMPLOYEES: Employee[] = generate300Employees();

// --- ATTENDANCE TELEMETRY FOR MAAYA WORLD VENUES ---
const realToday = new Date().toISOString().split('T')[0];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-01',
    employeeId: 'emp-001',
    employeeName: 'Sarah Jenkins',
    location: 'Hyderabad',
    date: realToday,
    checkIn: '08:50',
    checkOut: '17:45',
    status: 'PRESENT',
    workHours: 8.92,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-02',
    employeeId: 'emp-002',
    employeeName: 'Rajesh Kumar',
    location: 'Vizag',
    date: realToday,
    checkIn: '09:05',
    checkOut: '18:10',
    status: 'PRESENT',
    workHours: 9.08,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-03',
    employeeId: 'emp-003',
    employeeName: 'Priya Sharma',
    location: 'Hyderabad',
    date: realToday,
    checkIn: '09:12',
    checkOut: '18:15',
    status: 'PRESENT',
    workHours: 9.05,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-04',
    employeeId: 'emp-004',
    employeeName: 'Aarav Reddy',
    location: 'Hyderabad',
    date: realToday,
    checkIn: '09:30',
    status: 'PRESENT',
    workHours: 8.0,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-05',
    employeeId: 'emp-005',
    employeeName: 'Bhavya Mishra',
    location: 'Bhubaneswar',
    date: realToday,
    checkIn: '08:55',
    status: 'PRESENT',
    workHours: 8.5,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-06',
    employeeId: 'emp-006',
    employeeName: 'Kalyan Naidu',
    location: 'Vizag',
    date: realToday,
    checkIn: '10:15',
    status: 'LATE',
    workHours: 7.25,
    regularizationStatus: 'PENDING',
    regularizationReason: 'Beach road heavy traffic diversion',
  },
  {
    id: 'att-07',
    employeeId: 'emp-007',
    employeeName: 'Lipsa Mohanty',
    location: 'Bhubaneswar',
    date: realToday,
    checkIn: '09:00',
    status: 'PRESENT',
    workHours: 8.0,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-08',
    employeeId: 'emp-008',
    employeeName: 'Venkatesh Rao',
    location: 'Hyderabad',
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
    date: realToday,
    checkIn: '09:02',
    status: 'PRESENT',
    workHours: 8.2,
    regularizationStatus: 'NONE',
  },
  {
    id: 'att-10',
    employeeId: 'emp-010',
    employeeName: 'Sambit Behera',
    location: 'Bhubaneswar',
    date: realToday,
    checkIn: '08:45',
    status: 'PRESENT',
    workHours: 8.5,
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
