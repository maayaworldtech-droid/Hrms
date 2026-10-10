import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Payslip, Employee } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatINR, formatTime } from '@/utils/formatters';
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
  ShieldCheck,
  Building2,
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
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Good day, {employee?.fullName || 'Priya Sharma'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Staff Code: {employee?.employeeCode || 'MW-1003'} / {venue.shortName} / {shiftInfo.name} ({shiftInfo.timing})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee/salary')}
          >
            My Payslips
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employee/leaves')}
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Main Attendance Card - Streamlined, Minimal, No Icons */}
      <Card>
        <CardHeader
          title="Attendance"
          subtitle={todayDateFormatted}
          action={
            todayAttendance?.checkIn && !todayAttendance?.checkOut ? (
              <span className="text-xs font-semibold text-emerald-600">
                Active Shift
              </span>
            ) : todayAttendance?.checkOut ? (
              <span className="text-xs font-semibold text-indigo-600">
                Shift Completed ({todayAttendance.workHours} hrs)
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-600">
                Not Logged In
              </span>
            )
          }
        />
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Minimal Telemetry Info */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Venue</span>
                <span className="font-semibold text-slate-800">{venue.shortName}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Shift</span>
                <span className="font-semibold text-slate-800">{shiftInfo.name} ({shiftInfo.timing})</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Today</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {todayAttendance?.checkIn ? (
                    <>
                      In: {formatTime(todayAttendance.checkIn)}
                      {todayAttendance.checkOut && ` / Out: ${formatTime(todayAttendance.checkOut)}`}
                    </>
                  ) : (
                    'Not Logged In'
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons - No Icons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={openBiometricLogin}
                disabled={!!todayAttendance?.checkIn}
                className={
                  !todayAttendance?.checkIn
                    ? '!bg-emerald-600 hover:!bg-emerald-700 text-white'
                    : 'opacity-60 cursor-not-allowed'
                }
              >
                {!todayAttendance?.checkIn ? 'Attendance Login' : 'Logged In'}
              </Button>

              <Button
                variant="danger"
                size="md"
                onClick={openBiometricLogout}
                disabled={!todayAttendance?.checkIn || !!todayAttendance?.checkOut}
                className={
                  todayAttendance?.checkIn && !todayAttendance?.checkOut
                    ? '!bg-rose-600 hover:!bg-rose-700 text-white'
                    : 'opacity-60 cursor-not-allowed'
                }
              >
                {todayAttendance?.checkOut ? 'Shift Closed' : 'Attendance Logout'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Middle Grid: Leave Quotas & Monthly Salary - No Icons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Quotas Card */}
        <Card>
          <CardHeader
            title="Leave Quotas"
            subtitle="Current available time-off balances"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/leaves')}
              >
                Apply
              </Button>
            }
          />
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Casual Leave</span>
                <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.casualLeave.remaining ?? 8}
                  <span className="text-xs font-normal text-slate-400"> / 12</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Sick Leave</span>
                <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.sickLeave.remaining ?? 8}
                  <span className="text-xs font-normal text-slate-400"> / 10</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-slate-500 font-medium text-[11px]">Earned Leave</span>
                <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {leaveBalances?.earnedLeave.remaining ?? 13}
                  <span className="text-xs font-normal text-slate-400"> / 18</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Monthly Salary Remittance */}
        <Card>
          <CardHeader
            title="Monthly Salary"
            subtitle="September 2026 Electronic Remittance"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/salary')}
              >
                View Slip
              </Button>
            }
          />
          <CardContent className="pt-0">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Net Take-Home Pay</span>
                <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5 tabular-nums">
                  {recentPayslip ? formatINR(recentPayslip.components.netMonthly) : '₹48,250'}
                </p>
                <div className="mt-1 text-xs text-slate-500">
                  <span>Credited to Bank Account</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Paid
                </span>
                <p className="text-xs text-slate-400 font-mono mt-0.5">30 Sep 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biometric Attendance Face & Location Modal */}
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
