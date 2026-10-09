import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { AttendanceRecord, LeaveBalance, Holiday, Payslip } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatINR, formatDate, formatTime } from '@/utils/formatters';
import {
  Clock,
  CalendarDays,
  CreditCard,
  PartyPopper,
  ArrowRight,
  CheckCircle2,
  LogIn,
  LogOut,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recentPayslip, setRecentPayslip] = useState<Payslip | null>(null);
  const [isPunching, setIsPunching] = useState(false);

  const employeeId = 'emp-003'; // Priya Sharma

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [attList, balances, holList, payslips] = await Promise.all([
        api.attendance.getByEmployee(employeeId),
        api.leaves.getBalances(employeeId),
        api.holidays.getAll(),
        api.payroll.getPayslipsByEmployee(employeeId),
      ]);

      const todayRec = attList.find((a) => a.date === today);
      setTodayAttendance(todayRec || null);
      setLeaveBalances(balances);
      setHolidays(holList.slice(0, 3));
      setRecentPayslip(payslips[0] || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePunchIn = async () => {
    setIsPunching(true);
    try {
      const rec = await api.attendance.checkIn(employeeId);
      setTodayAttendance(rec);
      dispatch(
        addToast({
          type: 'success',
          title: 'Punch In Recorded',
          message: `Check-in registered at ${formatTime(rec.checkIn)}`,
        })
      );
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Punch In Failed', message: err.message }));
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    setIsPunching(true);
    try {
      const rec = await api.attendance.checkOut(employeeId);
      setTodayAttendance(rec);
      dispatch(
        addToast({
          type: 'success',
          title: 'Punch Out Recorded',
          message: `Shift closed at ${formatTime(rec.checkOut)}. Total duration: ${rec.workHours} hrs.`,
        })
      );
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Punch Out Failed', message: err.message }));
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Good Day, Priya Sharma</h1>
          <p className="text-xs text-slate-500 mt-1">
            Senior Frontend Engineer • Employee ID: EMP-1003 • Bangalore HQ
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee/salary')}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            My Payslips
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employee/leaves')}
            leftIcon={<CalendarDays className="w-4 h-4" />}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Hero Interactive Punch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Attendance Punch Terminal */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Web Clock-In Terminal
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white mt-1">
                  {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                {/* Punch Status Badge */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-slate-300">Status:</span>
                  {todayAttendance?.checkIn ? (
                    <Badge variant="success" size="md" dot>
                      Active • Punched in at {formatTime(todayAttendance.checkIn)}
                      {todayAttendance.checkOut && ` (Punched out at ${formatTime(todayAttendance.checkOut)})`}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="md">
                      Not Punched In Today
                    </Badge>
                  )}
                </div>
              </div>

              {/* Punch Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!todayAttendance?.checkIn ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePunchIn}
                    isLoading={isPunching}
                    leftIcon={<LogIn className="w-5 h-5" />}
                    className="!bg-emerald-600 hover:!bg-emerald-700 !shadow-lg !shadow-emerald-600/30"
                  >
                    Punch In Now
                  </Button>
                ) : !todayAttendance.checkOut ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePunchOut}
                    isLoading={isPunching}
                    leftIcon={<LogOut className="w-5 h-5" />}
                    className="!bg-rose-600 hover:!bg-rose-700 !shadow-lg !shadow-rose-600/30"
                  >
                    Punch Out
                  </Button>
                ) : (
                  <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <span className="text-xs font-bold text-white">Shift Completed</span>
                    <p className="text-[10px] text-slate-300">{todayAttendance.workHours} logged hours</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Leave Balance Widget */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader
              title="Time-Off Balance"
              subtitle="Current leave quotas available"
              icon={<CalendarDays className="w-4 h-4" />}
            />
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-slate-500 font-medium">Casual Leave</span>
                  <div className="text-xl font-bold text-indigo-700 mt-1">
                    {leaveBalances?.casualLeave.remaining ?? 8}
                    <span className="text-xs font-normal text-slate-400"> / 12</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-slate-500 font-medium">Sick Leave</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {leaveBalances?.sickLeave.remaining ?? 8}
                    <span className="text-xs font-normal text-slate-400"> / 10</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-slate-500 font-medium">Earned Leave</span>
                  <div className="text-xl font-bold text-amber-700 mt-1">
                    {leaveBalances?.earnedLeave.remaining ?? 13}
                    <span className="text-xs font-normal text-slate-400"> / 18</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                  <span className="text-slate-500 font-medium">Comp-Off</span>
                  <div className="text-xl font-bold text-purple-700 mt-1">
                    {leaveBalances?.compOff.remaining ?? 2}
                    <span className="text-xs font-normal text-slate-400"> / 3</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/employee/leaves')}
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Apply for Time Off
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Middle Row: Recent Pay & Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Payslip Quick Overview */}
        <Card>
          <CardHeader
            title="Recent Salary Credit"
            subtitle="September 2026 Monthly Remittance"
            icon={<CreditCard className="w-4 h-4" />}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/employee/salary')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Full Payslip
              </Button>
            }
          />
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Net Take-Home Pay</span>
                <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
                  {recentPayslip ? formatINR(recentPayslip.components.netMonthly) : '₹1,12,450'}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Credited to HDFC Bank (•••• 5827)</span>
                </div>
              </div>
              <Badge variant="success" size="md">PAID via NEFT</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 flex justify-between">
                <span className="text-slate-500">Gross Earnings:</span>
                <span className="font-semibold text-slate-800">
                  {recentPayslip ? formatINR(recentPayslip.components.grossMonthly) : '₹1,32,000'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 flex justify-between">
                <span className="text-slate-500">Total Deductions:</span>
                <span className="font-semibold text-rose-600">
                  {recentPayslip ? formatINR(recentPayslip.components.totalDeductions) : '₹19,550'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Holidays */}
        <Card>
          <CardHeader
            title="Upcoming Company Holidays"
            subtitle="Official paid holidays on the calendar"
            icon={<PartyPopper className="w-4 h-4" />}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/holidays')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View 2026 Calendar
              </Button>
            }
          />
          <CardContent className="space-y-3">
            {holidays.map((hol) => (
              <div
                key={hol.id}
                className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex flex-col items-center justify-center font-bold">
                    <span className="text-[10px] uppercase leading-none">{hol.date.split('-')[1]}</span>
                    <span className="text-sm leading-none mt-0.5">{hol.date.split('-')[2]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{hol.name}</div>
                    <div className="text-[11px] text-slate-500">{hol.dayOfWeek} • {formatDate(hol.date)}</div>
                  </div>
                </div>
                <Badge variant={hol.type === 'NATIONAL' ? 'purple' : 'success'} size="sm">
                  {hol.type}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
