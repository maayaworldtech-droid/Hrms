import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Payslip, Employee } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatINR, formatDate, formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { VENUE_GEOFENCES } from '@/utils/geolocation';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  CalendarDays,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  LogIn,
  LogOut,
  MapPin,
  Clock,
  Scan,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 pb-8">
      {/* Mobile-Friendly Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
              PS
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {employee?.fullName || 'Priya Sharma'}
                </h1>
                <span className="text-xs font-mono text-slate-500 font-medium">
                  {employee?.employeeCode || 'MW-1003'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {venue.shortName}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {shiftInfo.name} ({shiftInfo.timing})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation on Mobile */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employee/salary')}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-none text-xs"
            >
              My Payslips
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/employee/leaves')}
              leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-none text-xs"
            >
              Apply Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Attendance Action Center (White Card Theme) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 text-slate-900 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Top Bar: Date & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 sm:pb-4">
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-600">
                Attendance Checkpoint
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                {todayDateFormatted}
              </p>
            </div>

            {/* Attendance Status Display */}
            <div>
              {todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Logged In • Active Shift</span>
                </div>
              ) : todayAttendance?.checkOut ? (
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Shift Completed ({todayAttendance.workHours} hrs logged)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Not Logged In Today</span>
                </div>
              )}
            </div>
          </div>

          {/* Location & Shift Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-500 text-[11px]">Authorized Company Venue:</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {venue.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {venue.address} (Geofence: 250m)
              </p>
            </div>

            <div>
              <span className="text-slate-500 text-[11px]">Assigned Shift Schedule:</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                {shiftInfo.name}: {shiftInfo.timing}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {todayAttendance?.checkIn ? (
                  <>
                    Logged in at <strong className="text-slate-900 font-mono">{formatTime(todayAttendance.checkIn)}</strong>
                    {todayAttendance.checkOut && (
                      <> • Out at <strong className="text-slate-900 font-mono">{formatTime(todayAttendance.checkOut)}</strong></>
                    )}
                  </>
                ) : (
                  'Login requires on-premise location & face verification'
                )}
              </p>
            </div>
          </div>

          {/* Primary Action Buttons: Attendance Login & Attendance Logout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Attendance Login Button */}
            <button
              type="button"
              onClick={openBiometricLogin}
              disabled={!!todayAttendance?.checkIn}
              className={`w-full p-4 rounded-xl font-semibold text-left transition-all flex items-center justify-between shadow-sm ${
                !todayAttendance?.checkIn
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    !todayAttendance?.checkIn ? 'bg-emerald-700/80 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm sm:text-base font-bold ${!todayAttendance?.checkIn ? 'text-white' : 'text-slate-500'}`}>
                    Attendance Login
                  </div>
                  <div className={`text-[11px] font-normal ${!todayAttendance?.checkIn ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {!todayAttendance?.checkIn
                      ? 'Face Scan & Location Check'
                      : `Logged In at ${formatTime(todayAttendance.checkIn)}`}
                  </div>
                </div>
              </div>
              <Scan className={`w-5 h-5 ${!todayAttendance?.checkIn ? 'opacity-80' : 'opacity-40'}`} />
            </button>

            {/* Attendance Logout Button */}
            <button
              type="button"
              onClick={openBiometricLogout}
              disabled={!todayAttendance?.checkIn || !!todayAttendance?.checkOut}
              className={`w-full p-4 rounded-xl font-semibold text-left transition-all flex items-center justify-between shadow-sm ${
                todayAttendance?.checkIn && !todayAttendance?.checkOut
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    todayAttendance?.checkIn && !todayAttendance?.checkOut
                      ? 'bg-rose-700/80 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm sm:text-base font-bold ${todayAttendance?.checkIn && !todayAttendance?.checkOut ? 'text-white' : 'text-slate-500'}`}>
                    Attendance Logout
                  </div>
                  <div className={`text-[11px] font-normal ${todayAttendance?.checkIn && !todayAttendance?.checkOut ? 'text-rose-100' : 'text-slate-400'}`}>
                    {todayAttendance?.checkIn && !todayAttendance?.checkOut
                      ? 'Face Scan to Close Shift'
                      : todayAttendance?.checkOut
                      ? `Shift Closed (${todayAttendance.workHours} hrs)`
                      : 'Requires Active Check-In'}
                  </div>
                </div>
              </div>
              <Scan className={`w-5 h-5 ${todayAttendance?.checkIn && !todayAttendance?.checkOut ? 'opacity-80' : 'opacity-40'}`} />
            </button>
          </div>

          {/* Info note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Attendance login is geofenced and strictly restricted to the authorized company venue ({venue.shortName}).
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Streamlined Quick Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Leave Quotas Card */}
        <Card>
          <CardHeader
            title="Leave Quotas"
            subtitle="Available time-off balances"
            icon={<CalendarDays className="w-4 h-4 text-indigo-600" />}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/leaves')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Apply
              </Button>
            }
          />
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Casual</span>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.casualLeave.remaining ?? 8}
                  <span className="text-xs font-normal text-slate-400">/12</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Sick</span>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.sickLeave.remaining ?? 8}
                  <span className="text-xs font-normal text-slate-400">/10</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Earned</span>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.earnedLeave.remaining ?? 13}
                  <span className="text-xs font-normal text-slate-400">/18</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Monthly Salary Remittance */}
        <Card>
          <CardHeader
            title="Monthly Salary"
            subtitle="September 2026 Remittance"
            icon={<CreditCard className="w-4 h-4 text-indigo-600" />}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/salary')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                View Slip
              </Button>
            }
          />
          <CardContent className="pt-0">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Net Take-Home Pay</span>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono mt-0.5 tabular-nums">
                  {recentPayslip ? formatINR(recentPayslip.components.netMonthly) : '₹48,250'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Credited via Direct Bank Transfer</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Paid
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">30 Sep 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biometric Attendance Modal */}
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
