import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, Employee, LeaveRequest, OnDutyRequest } from '@/types';
import { useAppSelector } from '@/store';
import { formatTime, formatLabel } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { businessDate } from '@/utils/operations';
import { attendanceStatusVariant } from '@/utils/status';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileCard, MobileSectionHeading, MobileSkeleton } from '@/components/employee/MobilePrimitives';
import { ScanFace, Clock, CalendarPlus, Briefcase, WifiOff, ChevronRight } from 'lucide-react';

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const EmployeeDashboard: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [pending, setPending] = useState<{ leaves: number; duties: number }>({ leaves: 0, duties: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [todayText] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }));

  const load = useCallback(async () => {
    if (!employeeId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [person, records, leaves, duties] = await Promise.all([
        api.employees.getById(employeeId),
        api.attendance.getByEmployee(employeeId).catch(() => [] as AttendanceRecord[]),
        api.leaves.getByEmployee(employeeId).catch(() => [] as LeaveRequest[]),
        api.onDuty.getByEmployee(employeeId).catch(() => [] as OnDutyRequest[]),
      ]);
      if (!person) throw new Error('Employee record could not be loaded');

      const today = businessDate();
      const sorted = Array.isArray(records) ? [...records].sort((a, b) => b.date.localeCompare(a.date)) : [];

      setEmployee(person);
      setAttendance(sorted.find((record) => record.date === today) || null);
      setRecentRecords(sorted.filter((record) => record.date !== today).slice(0, 5));
      setPending({
        leaves: (Array.isArray(leaves) ? leaves : []).filter((item) => item.status === 'PENDING').length,
        duties: (Array.isArray(duties) ? duties : []).filter((item) => item.status === 'PENDING').length,
      });
    } catch (err) {
      console.error('Failed to load employee details:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <MobileSkeleton heights={[200, 64, 180]} />;

  if (error || !employee) {
    return (
      <EmptyState
        tone="danger"
        icon={WifiOff}
        title="Unable to load your dashboard"
        description="Check your connection and try again."
        actionLabel="Try again"
        onAction={load}
      />
    );
  }

  const shift = getShiftDefinition(employee.shift || 'MORNING');
  const completed = Boolean(attendance?.checkOut);
  const working = Boolean(attendance?.checkIn) && !completed;
  const pendingTotal = pending.leaves + pending.duties;

  return (
    <div className="space-y-4 pb-3">
      <div>
        <p className="text-sm text-slate-600">{todayText}</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{employee.firstName || employee.fullName}</h1>
      </div>

      {/* Today's shift: the one thing an employee needs every day */}
      <MobileCard aria-labelledby="today-heading" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="today-heading" className="text-sm font-semibold text-slate-900">
              Today&apos;s attendance
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {shift.name} · {shift.timing}
            </p>
          </div>
          <Badge variant={completed ? 'success' : working ? 'info' : 'neutral'} dot>
            {completed ? 'Completed' : working ? 'On shift' : 'Not checked in'}
          </Badge>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-slate-600">Check in</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
              {attendance?.checkIn ? formatTime(attendance.checkIn) : '--:--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Check out</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
              {attendance?.checkOut ? formatTime(attendance.checkOut) : '--:--'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Hours</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
              {completed && attendance?.workHours ? `${attendance.workHours} h` : working ? 'Live' : '--'}
            </dd>
          </div>
        </dl>

        {completed ? (
          <p className="text-sm text-slate-600">Your attendance for today is recorded.</p>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={() => setScanOpen(true)}
            leftIcon={working ? <Clock className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}
          >
            {working ? 'Check out' : 'Check in with face ID'}
          </Button>
        )}
      </MobileCard>

      {/* Requests awaiting a decision */}
      {pendingTotal > 0 && (
        <MobileCard className="flex items-center justify-between gap-3 py-3">
          <div className="text-sm">
            <p className="font-semibold text-slate-900">
              {pendingTotal} request{pendingTotal > 1 ? 's' : ''} awaiting approval
            </p>
            <p className="mt-0.5 text-slate-600">
              {[pending.leaves ? `${pending.leaves} leave` : '', pending.duties ? `${pending.duties} On Duty` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link
            to={pending.leaves ? '/employee/leaves' : '/employee/on-duty'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="View pending requests"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </MobileCard>
      )}

      {/* Only the two actions the bottom navigation does not already cover */}
      <div className="grid grid-cols-2 gap-3" aria-label="Quick actions">
        <Link
          to="/employee/leaves?apply=true"
          className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <CalendarPlus className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden="true" />
          Apply for leave
        </Link>
        <Link
          to="/employee/on-duty?apply=true"
          className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <Briefcase className="h-5 w-5 text-brand-700" strokeWidth={1.75} aria-hidden="true" />
          Apply On Duty
        </Link>
      </div>

      <section className="space-y-2" aria-labelledby="recent-heading">
        <MobileSectionHeading
          title="Recent attendance"
          action={
            <Link to="/employee/attendance" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          }
        />
        {recentRecords.length === 0 ? (
          <EmptyState compact icon={Clock} title="No attendance yet" description="Check in above to record your first shift." />
        ) : (
          <MobileCard className="p-0">
            <ul className="divide-y divide-slate-100">
              {recentRecords.map((record) => (
                <li key={record.id || record.date} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{dayLabel(record.date)}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                      {record.checkIn ? formatTime(record.checkIn) : '--:--'} to {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                      {record.workHours ? ` · ${record.workHours} h` : ''}
                    </p>
                  </div>
                  <Badge variant={attendanceStatusVariant(record.status)} size="sm">
                    {formatLabel(record.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </MobileCard>
        )}
      </section>

      <BiometricAttendanceModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        mode={working ? 'LOGOUT' : 'LOGIN'}
        employee={{
          id: employee.id,
          fullName: employee.fullName,
          employeeCode: employee.employeeCode,
          location: employee.location,
          shift: employee.shift,
          enrolledFacePhoto: employee.enrolledFacePhoto,
          enrolledFaceBiometrics: employee.enrolledFaceBiometrics,
        }}
        onSuccess={() => {
          setScanOpen(false);
          void load();
        }}
      />
    </div>
  );
};
