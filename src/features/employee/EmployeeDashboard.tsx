import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, Employee } from '@/types';
import { useAppSelector } from '@/store';
import { formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  ScanFace,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Briefcase,
  UserCheck,
  CalendarDays,
  CalendarPlus,
  Receipt,
} from 'lucide-react';

function getDayParts(dateStr: string): { dayNum: string; weekday: string } {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return {
      dayNum: String(parts[2]).padStart(2, '0'),
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    };
  }
  return { dayNum: '--', weekday: '---' };
}

function getAttendanceStatusLabel(rec: AttendanceRecord): string {
  if (rec.status === 'LATE') return 'Late';
  if (rec.status === 'HALF_DAY') return 'Half Day';
  if (rec.status === 'ABSENT') return 'Absent';
  if (rec.status === 'ON_LEAVE') return 'On Leave';
  return rec.checkOut ? 'Present' : 'Checked In';
}

export const EmployeeDashboard: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || 'emp-003';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [person, records] = await Promise.all([
        api.employees.getById(employeeId),
        api.attendance.getByEmployee(employeeId).catch(() => []),
      ]);

      if (!person) throw new Error('Employee record could not be loaded');

      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const sorted = Array.isArray(records)
        ? [...records].sort((a, b) => b.date.localeCompare(a.date))
        : [];

      setEmployee(person);
      setAttendance(sorted.find((record) => record.date === todayStr) || null);
      setRecentRecords(sorted.slice(0, 4));
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

  if (loading) {
    return (
      <div className="employee-skeleton-group py-2" role="status">
        <div className="employee-skeleton" style={{ height: '56px' }} />
        <div className="employee-skeleton" style={{ height: '160px' }} />
        <div className="employee-skeleton" style={{ height: '90px' }} />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-empty" role="alert">
        <ShieldCheck className="w-10 h-10 text-[var(--accent-500)]" />
        <h3 className="text-sm font-semibold text-slate-900 mt-2">Unable to connect</h3>
        <p className="text-xs text-slate-500 mt-1">Please check connection and retry.</p>
        <button className="employee-secondary-btn mt-3" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const shift = getShiftDefinition(employee.shift || 'MORNING');
  const completed = !!attendance?.checkOut;
  const working = !!attendance?.checkIn && !completed;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  const statusLine = completed
    ? `Shift completed · ${attendance.workHours ? `${attendance.workHours}h logged` : 'Punched out'}`
    : working
    ? `Clocked in at ${formatTime(attendance!.checkIn!)}`
    : `${shift.name} · ${shift.timing}`;

  return (
    <div className="space-y-5 pb-3">
      {/* Clean Typographic Greeting Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {greeting}, {employee.firstName || employee.fullName}
        </h1>
      </div>

      {/* Compact Biometric Punch Action Bar (Flat, single CTA) */}
      <section className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-medium text-slate-500 block">
            {employee.departmentName || 'Operations'} · {employee.employeeCode}
          </span>
          <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{statusLine}</p>
        </div>
        <button
          type="button"
          disabled={completed}
          onClick={() => setScanOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-[var(--brand-500)] hover:bg-[var(--brand-600)] disabled:bg-slate-100 disabled:text-slate-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:cursor-default shadow-xs"
        >
          {completed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Done</span>
            </>
          ) : working ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Check Out</span>
            </>
          ) : (
            <>
              <ScanFace className="w-4 h-4" />
              <span>Check In</span>
            </>
          )}
        </button>
      </section>

      {/* Primary 2x2 Feature Grid */}
      <section className="grid grid-cols-2 gap-3" aria-label="Primary actions">
        <Link
          to="/employee/attendance"
          className="bg-white border border-slate-200 rounded-xl py-4 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-2.5 hover:border-[var(--brand-300)] transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
            <UserCheck className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Attendance</span>
        </Link>

        <Link
          to="/employee/salary"
          className="bg-white border border-slate-200 rounded-xl py-4 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-2.5 hover:border-[var(--brand-300)] transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
            <FileText className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Payslips</span>
        </Link>

        <Link
          to="/employee/on-duty"
          className="bg-white border border-slate-200 rounded-xl py-4 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-2.5 hover:border-[var(--brand-300)] transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
            <Briefcase className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-slate-800">On Duty (OD)</span>
        </Link>

        <Link
          to="/employee/leaves"
          className="bg-white border border-slate-200 rounded-xl py-4 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center gap-2.5 hover:border-[var(--brand-300)] transition-colors"
        >
          <span className="w-10 h-10 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
            <CalendarDays className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Leave History</span>
        </Link>
      </section>

      {/* More Action Section */}
      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-slate-900">More Action</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/employee/leaves?apply=true"
            className="bg-slate-200/70 border border-slate-300/70 rounded-xl py-4 px-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-200 hover:border-slate-300 transition-colors"
          >
            <CalendarPlus className="w-6 h-6 text-slate-700" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-slate-800">Apply Leaves</span>
          </Link>

          <Link
            to="/employee/on-duty?tab=EXPENSES"
            className="bg-slate-200/70 border border-slate-300/70 rounded-xl py-4 px-3 flex flex-col items-center justify-center gap-2 hover:bg-slate-200 hover:border-slate-300 transition-colors"
          >
            <Receipt className="w-6 h-6 text-slate-700" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-slate-800">Errand Claims</span>
          </Link>
        </div>
      </section>

      {/* Attendance Summary Section */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Attendance Summary</h2>
          <Link
            to="/employee/attendance"
            className="text-xs font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)]"
          >
            View all
          </Link>
        </div>

        {recentRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-5 text-center">
            <p className="text-xs text-slate-600">
              No attendance logs yet. Use Check In above to record today&apos;s shift.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentRecords.map((rec, idx) => {
              const { dayNum, weekday } = getDayParts(rec.date);
              const label = getAttendanceStatusLabel(rec);
              const isLatest = idx === 0;
              const isWarning = rec.status === 'LATE' || rec.status === 'HALF_DAY';
              const isDanger = rec.status === 'ABSENT';

              const pillStyle = isDanger
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : isWarning
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : isLatest
                ? 'bg-[var(--brand-500)] text-white'
                : 'bg-[var(--brand-50)] text-[var(--brand-600)] border border-[var(--brand-200)]';

              return (
                <div
                  key={rec.id || rec.date}
                  className={`rounded-xl px-3.5 py-3 flex items-center justify-between gap-2.5 border transition-colors ${
                    isLatest
                      ? 'bg-[var(--brand-50)] border-[var(--brand-300)]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="w-10 shrink-0 text-center pr-2.5 border-r border-slate-200">
                    <span className="block text-sm font-bold text-slate-900 leading-tight">
                      {dayNum}
                    </span>
                    <span className="block text-xs font-medium text-slate-500 uppercase leading-tight">
                      {weekday}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="block text-xs text-slate-500">Punch In</span>
                    <span className="block text-xs font-bold text-slate-900 tabular-nums">
                      {rec.checkIn ? formatTime(rec.checkIn) : '--:--'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="block text-xs text-slate-500">Punch Out</span>
                    <span className="block text-xs font-bold text-slate-900 tabular-nums">
                      {rec.checkOut ? formatTime(rec.checkOut) : '--:--'}
                    </span>
                  </div>

                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold shrink-0 ${pillStyle}`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Biometric Attendance Modal */}
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
