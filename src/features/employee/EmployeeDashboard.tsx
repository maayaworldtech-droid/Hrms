import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, Employee, LeaveRequest, OnDutyRequest } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { formatTime, formatLabel, formatDate } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { businessDate } from '@/utils/operations';
import { attendanceStatusVariant } from '@/utils/status';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileCard, MobileSkeleton } from '@/components/employee/MobilePrimitives';
import { ScanFace, Clock, WifiOff, ChevronRight, ShieldCheck } from 'lucide-react';

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const monthLabel = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const WORKED = new Set(['PRESENT', 'LATE', 'ON_DUTY', 'WORK_FROM_HOME']);
const CORRECTABLE = new Set(['LATE', 'ABSENT', 'HALF_DAY']);

/**
 * The employee's home and attendance screen in one: today's check-in, this month in numbers,
 * and the attendance history with corrections. There is no separate attendance page any more.
 */
export const EmployeeDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [duties, setDuties] = useState<OnDutyRequest[]>([]);
  const [paidPerMonth, setPaidPerMonth] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [today] = useState(() => businessDate());
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
      const [person, att, lv, od] = await Promise.all([
        api.employees.getById(employeeId),
        api.attendance.getByEmployee(employeeId).catch(() => [] as AttendanceRecord[]),
        api.leaves.getByEmployee(employeeId).catch(() => [] as LeaveRequest[]),
        api.onDuty.getByEmployee(employeeId).catch(() => [] as OnDutyRequest[]),
      ]);
      if (!person) throw new Error('Employee record could not be loaded');
      setEmployee(person);
      setRecords(Array.isArray(att) ? [...att].sort((a, b) => b.date.localeCompare(a.date)) : []);
      setLeaves(Array.isArray(lv) ? lv : []);
      setDuties(Array.isArray(od) ? od : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
    api.settings
      .get()
      .then((s) => setPaidPerMonth(typeof s?.paidLeavesPerMonth === 'number' ? s.paidLeavesPerMonth : 1))
      .catch(() => setPaidPerMonth(1));
  }, [load]);

  // ---------------- this month in numbers
  const monthKey = today.slice(0, 7);
  const month = useMemo(() => {
    const thisMonth = records.filter((r) => r.date.startsWith(monthKey));
    const worked = thisMonth.reduce((sum, r) => sum + (r.status === 'HALF_DAY' ? 0.5 : WORKED.has(r.status) || r.checkIn ? 1 : 0), 0);
    const late = thisMonth.filter((r) => r.status === 'LATE').length;
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-31`;
    let leaveDays = 0;
    for (const l of leaves) {
      if (l.status !== 'APPROVED' || l.endDate < monthStart || l.startDate > monthEnd) continue;
      const from = new Date(l.startDate < monthStart ? monthStart : l.startDate);
      const to = new Date(l.endDate > today ? today : l.endDate);
      const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
      leaveDays += l.startDate === l.endDate && l.days > 0 && l.days < 1 ? l.days : Math.max(0, days);
    }
    return { worked, late, leaveDays, paidLeft: Math.max(0, paidPerMonth - leaveDays) };
  }, [records, leaves, monthKey, today, paidPerMonth]);

  const pending = leaves.filter((l) => l.status === 'PENDING').length + duties.filter((d) => d.status === 'PENDING').length;

  if (loading) return <MobileSkeleton heights={[210, 90, 64, 64, 64]} />;

  if (error || !employee) {
    return <EmptyState tone="danger" icon={WifiOff} title="Unable to load your attendance" description="Check your connection and try again." actionLabel="Try again" onAction={load} />;
  }

  const todayRec = records.find((r) => r.date === today);
  const completed = Boolean(todayRec?.checkOut);
  const working = Boolean(todayRec?.checkIn) && !completed;
  const shift = getShiftDefinition(employee.shift || 'MORNING');
  const history = records.filter((r) => r.date !== today);
  const shown = showAll ? history : history.slice(0, 10);

  const sendCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correcting || !reason.trim()) return;
    setSending(true);
    try {
      await api.attendance.regularize(correcting.id, reason.trim());
      dispatch(addToast({ type: 'success', title: 'Correction sent', message: 'Your manager will review it.' }));
      setCorrecting(null);
      setReason('');
      void load();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not send', message: 'Please try again.' }));
    } finally {
      setSending(false);
    }
  };

  // Group the history by month so long lists stay readable
  const groups: { key: string; items: AttendanceRecord[] }[] = [];
  for (const r of shown) {
    const key = r.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(r);
    else groups.push({ key, items: [r] });
  }

  return (
    <div className="space-y-5 pb-3">
      <div>
        <p className="text-sm text-slate-600">{todayText}</p>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{employee.firstName || employee.fullName}</h1>
      </div>

      {/* Today */}
      <MobileCard aria-labelledby="today-heading" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="today-heading" className="text-sm font-semibold text-slate-900">
              Today
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {shift.name} · {shift.timing}
            </p>
          </div>
          <Badge variant={completed ? 'success' : working ? 'info' : 'neutral'} dot>
            {completed ? 'Done' : working ? 'On shift' : 'Not checked in'}
          </Badge>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {(
            [
              ['Check in', todayRec?.checkIn ? formatTime(todayRec.checkIn) : '--:--'],
              ['Check out', todayRec?.checkOut ? formatTime(todayRec.checkOut) : '--:--'],
              ['Hours', completed && todayRec?.workHours ? `${todayRec.workHours} h` : working ? 'Live' : '--'],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-600">{label}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {!completed && (
          <Button size="lg" className="w-full" onClick={() => setScanOpen(true)} leftIcon={working ? <Clock className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}>
            {working ? 'Check out' : 'Check in with face'}
          </Button>
        )}
      </MobileCard>

      {/* This month */}
      <section aria-labelledby="month-heading" className="space-y-2">
        <h2 id="month-heading" className="text-sm font-semibold text-slate-900">
          This month
        </h2>
        <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-center">
          {(
            [
              ['Worked', month.worked],
              ['Leave', month.leaveDays],
              ['Paid leave left', month.paidLeft],
              ['Late', month.late],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse bg-white px-1 py-3">
              <dt className="mt-0.5 text-xs leading-tight text-slate-600">{label}</dt>
              <dd className={`text-lg font-semibold tabular-nums ${label === 'Late' && value > 0 ? 'text-amber-800' : 'text-slate-900'}`}>{value}</dd>
            </div>
          ))}
        </dl>
        {month.leaveDays > paidPerMonth && (
          <p className="text-sm text-amber-800">
            Leave above {paidPerMonth} day{paidPerMonth === 1 ? '' : 's'} this month is cut from your salary.
          </p>
        )}
      </section>

      {pending > 0 && (
        <Link
          to={leaves.some((l) => l.status === 'PENDING') ? '/employee/leaves' : '/employee/on-duty'}
          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-colors hover:bg-slate-50"
        >
          <span className="font-medium text-slate-900">
            {pending} request{pending > 1 ? 's' : ''} waiting for your manager
          </span>
          <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </Link>
      )}

      {/* History */}
      <section className="space-y-2" aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-sm font-semibold text-slate-900">
          Attendance history
        </h2>
        {history.length === 0 ? (
          <EmptyState compact icon={Clock} title="No attendance yet" description="Your check-ins will be listed here." />
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.key} className="space-y-1.5">
                <p className="px-1 pt-1 text-xs font-medium text-slate-600">{monthLabel(g.key)}</p>
                <MobileCard className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {g.items.map((r) => (
                      <li key={r.id || r.date} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{dayLabel(r.date)}</p>
                            <p className="mt-0.5 text-xs tabular-nums text-slate-600">
                              {r.checkIn ? formatTime(r.checkIn) : '--:--'} to {r.checkOut ? formatTime(r.checkOut) : '--:--'}
                              {r.workHours ? ` · ${r.workHours} h` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {r.facePhoto && (
                              <button type="button" onClick={() => setPhoto(r.facePhoto!)} className="rounded p-1 text-emerald-700 hover:bg-emerald-50" aria-label="View check-in photo">
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            )}
                            <Badge variant={attendanceStatusVariant(r.status)} size="sm">
                              {formatLabel(r.status)}
                            </Badge>
                          </div>
                        </div>
                        {r.regularizationStatus === 'PENDING' ? (
                          <p className="mt-1.5 text-xs font-medium text-amber-800">Correction sent, waiting for your manager</p>
                        ) : r.regularizationStatus === 'APPROVED' ? (
                          <p className="mt-1.5 text-xs font-medium text-emerald-700">Correction approved</p>
                        ) : CORRECTABLE.has(r.status) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCorrecting(r);
                              setReason('');
                            }}
                            className="mt-1.5 text-xs font-medium text-brand-700 hover:underline"
                          >
                            Request correction
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </MobileCard>
              </div>
            ))}
            {history.length > shown.length && (
              <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
                Show all {history.length} days
              </Button>
            )}
          </>
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

      <Modal isOpen={Boolean(correcting)} onClose={() => setCorrecting(null)} title="Request a correction" subtitle={correcting ? formatDate(correcting.date) : undefined} size="sm">
        <form onSubmit={sendCorrection} className="space-y-4">
          <Textarea
            label="What happened?"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: came in late because the bus was delayed"
            helperText="Your manager sees this when reviewing."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCorrecting(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={sending} disabled={!reason.trim()}>
              Send
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(photo)} onClose={() => setPhoto(null)} title="Check-in photo" size="sm">
        {photo && (
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-950">
            <img src={photo} alt="Face captured at check-in" className="h-full w-full object-cover" />
          </div>
        )}
      </Modal>
    </div>
  );
};
