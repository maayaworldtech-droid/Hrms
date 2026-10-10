import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Payslip, Employee } from '@/types';
import { formatINR, formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { VENUE_GEOFENCES } from '@/utils/geolocation';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  Clock,
  MapPin,
  CalendarDays,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance | null>(null);
  const [recentPayslip, setRecentPayslip] = useState<Payslip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Biometric Modal State
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');

  const employeeId = 'emp-003'; // Priya Sharma

  const loadData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [empList, attList, balances, payslips] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getByEmployee(employeeId),
        api.leaves.getBalances(employeeId),
        api.payroll.getPayslipsByEmployee(employeeId),
      ]);

      const currentEmp = empList.find((e) => e.id === employeeId) || {
        id: 'emp-003',
        employeeCode: 'MW-1003',
        firstName: 'Priya',
        lastName: 'Sharma',
        fullName: 'Priya Sharma',
        email: 'employee@maayaworld.com',
        phone: '+91 99887 76655',
        location: 'Hyderabad',
        shift: 'MORNING',
        monthlySalary: 55000,
        ctcAnnual: 660000,
        joiningDate: '2023-04-03',
        employmentType: 'FULL_TIME',
      };

      setEmployee(currentEmp as Employee);
      const todayRec = attList.find((a) => a.date === today);
      setTodayAttendance(todayRec || null);
      setLeaveBalances(balances);
      setRecentPayslip(payslips[0] || null);
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openBiometricLogin = () => {
    setBiometricMode('LOGIN');
    setBiometricModalOpen(true);
  };

  const openBiometricLogout = () => {
    setBiometricMode('LOGOUT');
    setBiometricModalOpen(true);
  };

  const handleBiometricSuccess = (record: AttendanceRecord) => {
    setTodayAttendance(record);
    loadData();
  };

  const shiftInfo = getShiftDefinition(employee?.shift || 'MORNING');
  const venue = VENUE_GEOFENCES[employee?.location || 'Hyderabad'] || VENUE_GEOFENCES['Hyderabad'];

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate total number of leaves (no types of leaves per rule)
  const totalRemaining = leaveBalances
    ? (leaveBalances.casualLeave?.remaining ?? 0) +
      (leaveBalances.sickLeave?.remaining ?? 0) +
      (leaveBalances.earnedLeave?.remaining ?? 0) +
      (leaveBalances.compOff?.remaining ?? 0)
    : 33;

  const totalAllocated = leaveBalances
    ? (leaveBalances.casualLeave?.total ?? 0) +
      (leaveBalances.sickLeave?.total ?? 0) +
      (leaveBalances.earnedLeave?.total ?? 0) +
      (leaveBalances.compOff?.total ?? 0)
    : 42;

  const totalUsed = Math.max(0, totalAllocated - totalRemaining);

  return (
    <div className="space-y-3.5 pb-6">
      {/* 1. Clean Staff Header (No greeting fluff, direct identity & placement) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {employee?.fullName || 'Priya Sharma'}
          </h1>
          <p className="text-xs text-slate-500">
            Staff Code: <span className="font-mono font-semibold text-slate-700">{employee?.employeeCode || 'MW-1003'}</span> • {venue.shortName}
          </p>
        </div>

        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
          {shiftInfo.name}
        </span>
      </div>

      {/* 2. Primary Focal Card: Attendance & Shift Check-In (Flat, Single Surface) */}
      <section className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Shift Attendance
            </span>
            <span className="text-xs text-slate-600 mt-0.5 block">
              {todayDateFormatted}
            </span>
          </div>

          <div>
            {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Shift
              </span>
            ) : todayAttendance?.checkOut ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Shift Completed ({todayAttendance.workHours} hrs)
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Not Punched In
              </span>
            )}
          </div>
        </div>

        {/* Telemetry Row - Clean Flat Key-Values (No nested boxes) */}
        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Rostered Hours</span>
            <span className="font-semibold text-slate-800 font-mono mt-0.5 block">
              {shiftInfo.timing}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block">Today's Punch</span>
            <span className="font-semibold text-slate-800 font-mono mt-0.5 block">
              {todayAttendance?.checkIn ? (
                <>
                  {formatTime(todayAttendance.checkIn)}
                  {todayAttendance.checkOut && ` - ${formatTime(todayAttendance.checkOut)}`}
                </>
              ) : (
                'Pending Check-In'
              )}
            </span>
          </div>
        </div>

        {/* Primary Action Button (Touch-Friendly, Single Clear Action) */}
        <div className="pt-1">
          {!todayAttendance?.checkIn ? (
            <button
              type="button"
              onClick={openBiometricLogin}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              Punch In (Face & Venue Scan)
            </button>
          ) : !todayAttendance?.checkOut ? (
            <button
              type="button"
              onClick={openBiometricLogout}
              className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              Punch Out (Face Scan)
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full h-12 rounded-xl bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed flex items-center justify-center gap-2"
            >
              Today's Shift Completed
            </button>
          )}
        </div>
      </section>

      {/* 3. Leave Balance Card (Flat, Single Total Count, No Types of Leaves) */}
      <section
        onClick={() => navigate('/employee/leaves')}
        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Available Leaves
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalRemaining}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / {totalAllocated} Total Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {totalUsed} days availed this calendar year
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
          <span>Apply</span>
          <ChevronRight className="w-4 h-4 text-indigo-500" />
        </div>
      </section>

      {/* 4. Latest Monthly Salary Card (Flat, High Contrast) */}
      <section
        onClick={() => navigate('/employee/salary')}
        className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Latest Net Salary
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1 tabular-nums">
            {recentPayslip ? formatINR(recentPayslip.components.netMonthly) : '₹1,18,500'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            September 2026 • Credited to HDFC Bank
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
          <span>View Slip</span>
          <ChevronRight className="w-4 h-4 text-indigo-500" />
        </div>
      </section>

      {/* 5. Biometric Attendance Modal */}
      {employee && (
        <BiometricAttendanceModal
          isOpen={biometricModalOpen}
          onClose={() => setBiometricModalOpen(false)}
          mode={biometricMode}
          employee={{
            id: employee.id,
            fullName: employee.fullName,
            employeeCode: employee.employeeCode,
            location: employee.location,
            shift: employee.shift,
          }}
          onSuccess={handleBiometricSuccess}
        />
      )}
    </div>
  );
};
