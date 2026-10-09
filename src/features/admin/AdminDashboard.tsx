import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee, AttendanceRecord, LeaveRequest, Department } from '@/types';
import { StatCard } from '@/components/common/StatCard';
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
  FileSpreadsheet,
  ArrowRight,
  Building2,
  Check,
  X,
  AlertCircle,
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
  const todayDate = '2026-10-09';
  const todayAttendance = attendance.filter((a) => a.date === todayDate);
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
          message: 'The leave request has been marked as approved.',
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
          title: 'Leave Rejected',
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
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive HR Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time workforce metrics, attendance status, and pending approvals
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/payroll')}
            leftIcon={<Banknote className="w-4 h-4" />}
          >
            Process Payroll
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/employees')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Onboard Employee
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Workforce"
          value={employees.length}
          subtitle="Across 5 departments"
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 12.5, label: 'vs last quarter' }}
          variant="indigo"
        />
        <StatCard
          title="Today's Attendance"
          value={`${attendanceRate}%`}
          subtitle={`${presentCount} of ${employees.length} logged in`}
          icon={<Clock className="w-5 h-5" />}
          trend={{ value: 4.2, label: 'on-time rate' }}
          variant="emerald"
        />
        <StatCard
          title="Pending Leave Requests"
          value={pendingLeaves.length}
          subtitle="Require HR/Manager review"
          icon={<CalendarDays className="w-5 h-5" />}
          variant="amber"
        />
        <StatCard
          title="Monthly Payroll Expense"
          value={formatINR(totalPayrollMonthly)}
          subtitle="Estimated gross compensation"
          icon={<Banknote className="w-5 h-5" />}
          trend={{ value: 2.1, label: 'statutory compliance' }}
          variant="slate"
        />
      </div>

      {/* Middle Row: Pending Approvals & Live Punch Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Leave Requests Card (2 columns) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Pending Leave Applications"
              subtitle="Requires prompt management or HR decision"
              icon={<CalendarDays className="w-4 h-4" />}
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
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
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
                        <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>{leave.employeeName}</div>
                            <span className="text-[10px] text-slate-400 font-normal">{leave.departmentName}</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="purple" size="sm">
                              {leave.leaveType.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {leave.days} day{leave.days > 1 ? 's' : ''}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={leave.reason}>
                            {leave.reason}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApproveLeave(leave.id)}
                                className="!py-1 !px-2 text-xs"
                                leftIcon={<Check className="w-3.5 h-3.5" />}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectLeave(leave.id)}
                                className="!py-1 !px-2 text-xs hover:border-rose-300 hover:text-rose-600"
                                leftIcon={<X className="w-3.5 h-3.5" />}
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
        </div>

        {/* Department Distribution (1 column) */}
        <div>
          <Card>
            <CardHeader
              title="Department Headcount"
              subtitle="Staff allocation per business unit"
              icon={<Building2 className="w-4 h-4" />}
            />
            <CardContent className="space-y-4">
              {departments.map((dept) => {
                const percentage = Math.round((dept.employeeCount / 68) * 100);
                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{dept.name}</span>
                      <span className="text-slate-500 font-medium">
                        {dept.employeeCount} members ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Today's Attendance Feed & Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Activity Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Live Clock-In Activity"
              subtitle="Check-in records recorded for today"
              icon={<Clock className="w-4 h-4" />}
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
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
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
                    {todayAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
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
                            dot
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

        {/* Quick Operations Guide */}
        <div>
          <Card>
            <CardHeader
              title="Statutory & Compliance"
              subtitle="Indian regulatory calendar & checks"
              icon={<Building2 className="w-4 h-4" />}
            />
            <CardContent className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">EPF ECR Filing</span>
                  <Badge variant="success" size="sm">Due Oct 15</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Electronic Challan cum Return generation for monthly EPF/EPS compliance.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">TDS Payment (Sec 192)</span>
                  <Badge variant="info" size="sm">Due Oct 07 (Filed)</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  Salary tax deduction deposited with Central Government via Challan 281.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">Professional Tax (PT)</span>
                  <Badge variant="purple" size="sm">Monthly Auto</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  ₹200 flat state professional tax remittance prepared.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
