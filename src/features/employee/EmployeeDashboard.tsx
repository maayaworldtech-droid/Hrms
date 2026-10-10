import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { AttendanceRecord, LeaveBalance, Holiday, Payslip } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatINR, formatDate, formatTime } from '@/utils/formatters';
import {
  Clock,
  CalendarDays,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance | null>(null);
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
      const [attList, balances, payslips] = await Promise.all([
        api.attendance.getByEmployee(employeeId),
        api.leaves.getBalances(employeeId),
        api.payroll.getPayslipsByEmployee(employeeId),
      ]);

      const todayRec = attList.find((a) => a.date === today);
      setTodayAttendance(todayRec || null);
      setLeaveBalances(balances);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Good day, Priya Sharma
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Senior Frontend Engineer • Employee ID: EMP-1003 • Bangalore HQ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employee/salary')}
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          >
            My Payslips
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/employee/leaves')}
            leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Hero Interactive Punch Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Live Attendance Punch Terminal */}
        <div className="lg:col-span-2">
          <div className="bg-[#0B0F19] rounded-xl p-5 sm:p-6 text-white border border-slate-800/80 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Live Workstation Terminal
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white mt-1 tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                {/* Punch Status Indicator */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  {todayAttendance?.checkIn ? (
                    <Badge variant="success" size="md" dot>
                      Active • Punched in at {formatTime(todayAttendance.checkIn)}
                      {todayAttendance.checkOut && ` (Out at ${formatTime(todayAttendance.checkOut)})`}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="md">
                      Not Punched In Today
                    </Badge>
                  )}
                </div>
              </div>

              {/* Punch Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                {!todayAttendance?.checkIn ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePunchIn}
                    isLoading={isPunching}
                    leftIcon={<LogIn className="w-4 h-4" />}
                    className="!bg-emerald-600 hover:!bg-emerald-700 shadow-sm"
                  >
                    Punch In Now
                  </Button>
                ) : !todayAttendance.checkOut ? (
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handlePunchOut}
                    isLoading={isPunching}
                    leftIcon={<LogOut className="w-4 h-4" />}
                    className="!bg-rose-600 hover:!bg-rose-700 shadow-sm"
                  >
                    Punch Out (Close Shift)
                  </Button>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/80 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-white">Shift Completed</span>
                    <p className="text-[10px] text-slate-400 tabular-nums">{todayAttendance.workHours} logged hours</p>
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
                <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                  <span className="text-slate-500 font-medium text-[11px]">Casual Leave</span>
                  <div className="text-xl font-bold text-indigo-700 mt-1 tabular-nums">
                    {leaveBalances?.casualLeave.remaining ?? 8}
                    <span className="text-xs font-normal text-slate-400"> / 12</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <span className="text-slate-500 font-medium text-[11px]">Sick Leave</span>
                  <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                    {leaveBalances?.sickLeave.remaining ?? 8}
                    <span className="text-xs font-normal text-slate-400"> / 10</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                  <span className="text-slate-500 font-medium text-[11px]">Earned Leave</span>
                  <div className="text-xl font-bold text-amber-700 mt-1 tabular-nums">
                    {leaveBalances?.earnedLeave.remaining ?? 13}
                    <span className="text-xs font-normal text-slate-400"> / 18</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100">
                  <span className="text-slate-500 font-medium text-[11px]">Comp-Off</span>
                  <div className="text-xl font-bold text-purple-700 mt-1 tabular-nums">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Latest Payslip Quick Overview */}
        <Card>
          <CardHeader
            title="Recent Salary Remittance"
            subtitle="September 2026 Monthly Electronic Credit"
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Net Take-Home Pay</span>
                <p className="text-2xl font-bold text-emerald-600 font-mono mt-0.5 tabular-nums">
                  {recentPayslip ? formatINR(recentPayslip.components.netMonthly) : '₹1,12,450'}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Credited to HDFC Bank (•••• 5827)</span>
                </div>
              </div>
              <Badge variant="success" size="md">PAID via NEFT</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-100 flex justify-between">
                <span className="text-slate-500">Gross Earnings:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {recentPayslip ? formatINR(recentPayslip.components.grossMonthly) : '₹1,32,000'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-100 flex justify-between">
                <span className="text-slate-500">Total Deductions:</span>
                <span className="font-semibold text-rose-600 font-mono">
                  {recentPayslip ? formatINR(recentPayslip.components.totalDeductions) : '₹19,550'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Venue Operational Hours & Schedule */}
        <Card>
          <CardHeader
            title="Venue Operations & Center Schedule"
            subtitle="Operational timings and attendance checkpoints"
            icon={<Clock className="w-4 h-4 text-slate-500" />}
          />
          <CardContent className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Experience Venue Timings</span>
                <span className="text-slate-600 font-mono text-[11px] font-medium">10:00 AM - 09:30 PM</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Experience destinations are active 7 days a week. Staff shift allocations are published by Venue Operations Managers.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Attendance Telemetry Check-In</span>
                <span className="text-emerald-600 font-medium text-[11px]">Daily Auto Sync</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Check-in upon arrival at the venue desk via your staff terminal or mobile biometric punch.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
