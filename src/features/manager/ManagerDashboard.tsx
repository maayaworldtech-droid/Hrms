import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee, AttendanceRecord, LeaveRequest } from '@/types';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate, formatTime } from '@/utils/formatters';
import {
  Users,
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  X,
  UserCheck,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const managerId = 'emp-002'; // Rajesh Kumar (Engineering Lead)

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allEmps, allAtt, allLeaves] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getAll(),
        api.leaves.getAll(),
      ]);

      const myTeam = allEmps.filter((e) => e.managerId === managerId || e.departmentName === 'Engineering');
      const teamIds = new Set(myTeam.map((e) => e.id));

      setTeamMembers(myTeam);
      setTeamAttendance(allAtt.filter((a) => teamIds.has(a.employeeId)));
      setTeamLeaves(allLeaves.filter((l) => teamIds.has(l.employeeId)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingLeaves = teamLeaves.filter((l) => l.status === 'PENDING');
  const todayDate = '2026-10-09';
  const todayTeamAttendance = teamAttendance.filter((a) => a.date === todayDate);
  const presentCount = todayTeamAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'WORK_FROM_HOME').length;
  const pendingRegs = todayTeamAttendance.filter((a) => a.regularizationStatus === 'PENDING');

  const handleApproveLeave = async (leaveId: string, empName: string) => {
    try {
      await api.leaves.updateStatus(leaveId, 'APPROVED', 'Rajesh Kumar (Lead)', 'Approved for sprint scheduling');
      dispatch(
        addToast({
          type: 'success',
          title: 'Leave Approved',
          message: `Approved leave request for ${empName}`,
        })
      );
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Approval failed' }));
    }
  };

  const handleRejectLeave = async (leaveId: string, empName: string) => {
    try {
      await api.leaves.updateStatus(leaveId, 'REJECTED', 'Rajesh Kumar (Lead)', 'Sprint milestone release week');
      dispatch(
        addToast({
          type: 'info',
          title: 'Leave Declined',
          message: `Declined leave request for ${empName}`,
        })
      );
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Action failed' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Engineering Team Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rajesh Kumar • Team roster, shift adherence, punch approvals & sprint time-off
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/manager/attendance')}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Team Attendance
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/manager/leaves')}
            leftIcon={<CalendarDays className="w-4 h-4" />}
          >
            Review Leave Queue ({pendingLeaves.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Direct Reports"
          value={teamMembers.length}
          subtitle="Engineering department"
          icon={<Users className="w-5 h-5" />}
          variant="indigo"
        />
        <StatCard
          title="Team Present Today"
          value={`${presentCount} / ${teamMembers.length}`}
          subtitle={`${Math.round((presentCount / (teamMembers.length || 1)) * 100)}% attendance rate`}
          icon={<Clock className="w-5 h-5" />}
          trend={{ value: 100, label: 'on duty' }}
          variant="emerald"
        />
        <StatCard
          title="Pending Leave Reviews"
          value={pendingLeaves.length}
          subtitle="Requires your approval"
          icon={<CalendarDays className="w-5 h-5" />}
          variant="amber"
        />
        <StatCard
          title="Regularization Queue"
          value={pendingRegs.length}
          subtitle="Punch excuses pending"
          icon={<UserCheck className="w-5 h-5" />}
          variant="slate"
        />
      </div>

      {/* Main Grid: Pending Approvals & Today's Team Presence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Team Leaves */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Team Leave Requests Requiring Review"
              subtitle="Pending submissions from engineering teammates"
              icon={<CalendarDays className="w-4 h-4" />}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/manager/leaves')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Manage All
                </Button>
              }
            />
            <CardContent className="p-0">
              {pendingLeaves.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  All team leave requests are currently cleared.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Teammate</th>
                        <th className="py-2.5 px-4">Leave Type</th>
                        <th className="py-2.5 px-4">Period</th>
                        <th className="py-2.5 px-4">Reason</th>
                        <th className="py-2.5 px-4 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingLeaves.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {l.employeeName}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="purple" size="sm">{l.leaveType.replace('_', ' ')}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            {formatDate(l.startDate)} ({l.days}d)
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={l.reason}>
                            {l.reason}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApproveLeave(l.id, l.employeeName)}
                                className="!py-1 !px-2 text-xs"
                                leftIcon={<Check className="w-3.5 h-3.5" />}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectLeave(l.id, l.employeeName)}
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

        {/* Team Clock-In Status Today */}
        <div>
          <Card>
            <CardHeader
              title="Team Presence Today"
              subtitle="Real-time check-in log"
              icon={<Clock className="w-4 h-4" />}
            />
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {teamMembers.map((member) => {
                  const rec = todayTeamAttendance.find((a) => a.employeeId === member.id);
                  const isPresent = rec?.status === 'PRESENT';
                  const isWfh = rec?.status === 'WORK_FROM_HOME';
                  const isLate = rec?.status === 'LATE';

                  return (
                    <div key={member.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{member.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {rec?.checkIn ? `In: ${formatTime(rec.checkIn)}` : 'Not punched in yet'}
                        </div>
                      </div>
                      <Badge
                        variant={
                          isPresent
                            ? 'success'
                            : isWfh
                            ? 'info'
                            : isLate
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                        dot
                      >
                        {rec?.status ? rec.status.replace('_', ' ') : 'PENDING'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
