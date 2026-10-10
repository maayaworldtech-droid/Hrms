import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee, AttendanceRecord, LeaveRequest, Department } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatINR, formatDate, formatTime } from '@/utils/formatters';
import {
  Users,
  Clock,
  CalendarDays,
  Banknote,
  UserPlus,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empData, attData, leaveData, deptData] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getAll(),
        api.leaves.getAll(),
        api.departments.getAll(),
      ]);
      setEmployees(empData);
      setAttendance(attData);
      setLeaves(leaveData);
      setDepartments(deptData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');
  
  // Dynamic current date detection with fallback to most recent ledger date
  const realToday = new Date().toISOString().split('T')[0];
  const distinctDates = Array.from(new Set(attendance.map((a) => a.date))).sort().reverse();
  const activeDate = attendance.some((a) => a.date === realToday)
    ? realToday
    : distinctDates[0] || realToday;
  
  const todayAttendance = attendance.filter((a) => a.date === activeDate);
  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'WORK_FROM_HOME').length;
  const attendanceRate = employees.length > 0 ? Math.round((presentCount / employees.length) * 100) : 0;

  // Monthly payroll estimate
  const totalPayrollMonthly = employees.reduce((acc, emp) => acc + Math.round(emp.ctcAnnual / 12), 0);

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await api.leaves.updateStatus(leaveId, 'APPROVED', 'Sarah Jenkins (Admin)', 'Approved by HR Operations');
      dispatch(
        addToast({
          type: 'success',
          title: 'Leave Approved',
          message: 'The leave application has been approved and balance updated.',
        })
      );
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Action Failed' }));
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      await api.leaves.updateStatus(leaveId, 'REJECTED', 'Sarah Jenkins (Admin)', 'Operational requirements conflict');
      dispatch(
        addToast({
          type: 'info',
          title: 'Leave Declined',
          message: 'The applicant has been notified of the rejection.',
        })
      );
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Action Failed' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Zoho Inspiration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/payroll')}
            leftIcon={<Banknote className="w-3.5 h-3.5" />}
          >
            Process Payroll
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/employees')}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Onboard Employee
          </Button>
        </div>
      </div>

      {/* SECTION 1: "Overview" Container (Zoho CPaaS Inspiration) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Workforce overview across Hyderabad, Vizag, and Bhubaneswar centers.
          </p>
        </div>

        {/* 4 Clean Metric Cards (Subtext rows removed per request) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Workforce */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Workforce</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-sans">
              {employees.length}
            </div>
          </div>

          {/* Card 2: Daily Attendance */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Attendance</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-sans">
              {presentCount}
            </div>
          </div>

          {/* Card 3: Pending Leaves */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>Leave Queue</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-sans">
              {pendingLeaves.length}
            </div>
          </div>

          {/* Card 4: Monthly Payroll Outlay */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <Banknote className="w-4 h-4 text-slate-500" />
              <span>Payroll Outlay</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums font-sans">
              {formatINR(totalPayrollMonthly)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Pending Leave Applications Table */}
      <Card>
        <CardHeader
          title="Pending Leave Applications"
          subtitle="Requests requiring prompt HR operations decision"
          icon={<CalendarDays className="w-4 h-4 text-slate-500" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/leaves')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View All
            </Button>
          }
        />
        <CardContent className="p-0">
          {pendingLeaves.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending leave applications awaiting review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Period</th>
                    <th className="py-2.5 px-4">Duration</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <div>{leave.employeeName}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{leave.location || 'Hyderabad'} Center</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="purple" size="sm">
                          {leave.leaveType.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 tabular-nums">
                        {leave.days} d
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApproveLeave(leave.id)}
                            className="!h-7 !px-2 text-xs"
                            leftIcon={<Check className="w-3 h-3" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectLeave(leave.id)}
                            className="!h-7 !px-2 text-xs hover:border-rose-300 hover:text-rose-600"
                            leftIcon={<X className="w-3 h-3" />}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: Live Clock-In Activity */}
      <Card>
        <CardHeader
          title="Live Clock-In Activity"
          subtitle="Check-in telemetry recorded for active date"
          icon={<Clock className="w-4 h-4 text-slate-500" />}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/attendance')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Full Register
            </Button>
          }
        />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Punch In</th>
                  <th className="py-2.5 px-4">Punch Out</th>
                  <th className="py-2.5 px-4">Total Hours</th>
                  <th className="py-2.5 px-4">Regularization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAttendance.slice(0, 10).map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {rec.employeeName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          rec.status === 'PRESENT'
                            ? 'success'
                            : rec.status === 'WORK_FROM_HOME'
                            ? 'info'
                            : rec.status === 'LATE'
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      >
                        {rec.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {rec.checkIn ? formatTime(rec.checkIn) : '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {rec.checkOut ? formatTime(rec.checkOut) : '--:--'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {rec.workHours ? `${rec.workHours} hrs` : '--'}
                    </td>
                    <td className="py-3 px-4">
                      {rec.regularizationStatus === 'PENDING' ? (
                        <Badge variant="warning" size="sm">
                          Pending Review
                        </Badge>
                      ) : (
                        <span className="text-slate-400">Regular</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
