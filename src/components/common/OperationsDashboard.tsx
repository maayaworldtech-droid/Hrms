import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Users,
  AlertCircle,
  CalendarDays,
  Banknote,
  CheckCircle2,
  Building2,
  Calendar,
} from 'lucide-react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { AttendanceRecord, Employee, LeaveRequest, PayrollRun } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';
import { getShiftDefinition, getShiftLabel } from '@/utils/shiftUtils';
import { approvedAway, businessDate, overlappingLeaveCount } from '@/utils/operations';
import { useCenters } from '@/hooks/useCenters';

type Snapshot = { employees: Employee[]; attendance: AttendanceRecord[]; leaves: LeaveRequest[]; payroll: PayrollRun[] };
const statusLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());

export const OperationsDashboard = ({ manager = false }: { manager?: boolean }) => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const { centerNames } = useCenters();
  const date = params.get('date') || businessDate();
  const venue = params.get('location') || 'ALL';
  const shift = params.get('shift') || 'ALL';
  const [data, setData] = useState<Snapshot>({ employees: [], attendance: [], leaves: [], payroll: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [review, setReview] = useState<LeaveRequest | null>(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const root = manager ? '/manager' : '/admin';

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [employees, attendance, leaves, payroll] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getAll(),
        api.leaves.getAll(),
        manager ? Promise.resolve([] as PayrollRun[]) : api.payroll.getRuns(),
      ]);
      const team = manager ? employees.filter((employee) => getReportingManager(employee).id === user?.id) : employees;
      const ids = new Set(team.map((employee) => employee.id));
      setData({
        employees: team,
        attendance: attendance.filter((record) => ids.has(record.employeeId)),
        leaves: leaves.filter((leave) => ids.has(leave.employeeId)),
        payroll,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [manager, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  const staff = data.employees.filter(
    (employee) =>
      employee.status !== 'TERMINATED' &&
      employee.joiningDate <= date &&
      (venue === 'ALL' || employee.location === venue) &&
      (shift === 'ALL' || (employee.shift || 'MORNING') === shift)
  );
  const ids = new Set(staff.map((employee) => employee.id));
  const records = data.attendance.filter((record) => record.date === date && ids.has(record.employeeId));
  const leaves = data.leaves.filter((leave) => ids.has(leave.employeeId));
  const away = approvedAway(leaves, date);
  const expected = staff.filter((employee) => !away.has(employee.id));
  const checkedIn = records.filter((record) => !!record.checkIn).length;
  const corrections = records.filter((record) => record.regularizationStatus === 'PENDING');
  const exceptions = records.filter(
    (record) => record.status === 'LATE' || record.status === 'ABSENT' || record.regularizationStatus === 'PENDING'
  );
  const pending = leaves.filter((leave) => leave.status === 'PENDING');
  const missing = expected.filter((employee) => !records.some((record) => record.employeeId === employee.id && record.checkIn));
  const link = (page: string, extra: Record<string, string> = {}) =>
    `${root}/${page}?${new URLSearchParams({ location: venue, date, shift, ...extra })}`;
  const allVenues = manager
    ? centerNames.filter((location) => data.employees.some((employee) => employee.location === location))
    : centerNames;
  const latestRun = [...data.payroll].sort((a, b) => b.processedAt.localeCompare(a.processedAt))[0];

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!manager || !review || saving || (status === 'REJECTED' && !comment.trim())) return;
    setSaving(true);
    try {
      await api.leaves.updateStatus(
        review.id,
        status,
        comment.trim() || 'Approved after reviewing shift coverage',
        user?.name || 'People operations'
      );
      dispatch(
        addToast({
          type: 'success',
          title: status === 'APPROVED' ? 'Leave approved' : 'Leave declined',
          message: `Decision saved for ${review.employeeName}.`,
        })
      );
      setReview(null);
      setComment('');
      await load();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not save decision', message: 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Global Context Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {manager ? 'My team today' : 'Today at Maaya World'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {manager
              ? 'Who is in, who is away, and what needs your approval.'
              : 'Check-ins, staffing and approvals across all centers.'}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium">Center:</span>
            <select
              aria-label="Dashboard center"
              value={venue}
              onChange={(event) => update('location', event.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">{manager ? 'All my centers' : 'All centers'}</option>
              {allVenues.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-500 font-medium">Date:</span>
            <input
              aria-label="Dashboard date"
              type="date"
              value={date}
              onChange={(event) => {
                if (event.target.value) update('date', event.target.value);
              }}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {manager && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium">Shift:</span>
              <select
                aria-label="Dashboard shift"
                value={shift}
                onChange={(event) => update('shift', event.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All shifts</option>
                <option value="MORNING">{getShiftLabel('MORNING')}</option>
                <option value="EVENING">{getShiftLabel('EVENING')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div role="alert" className="ops-panel text-center py-12">
          <AlertCircle className="w-8 h-8 text-accent-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900">Unable to load the dashboard</h2>
          <p className="ops-muted my-2 max-w-md mx-auto">
            We couldn't load today's staff and attendance. Please try again.
          </p>
          <button className="ops-button mt-2" onClick={load}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="ops-panel py-16 text-center text-slate-500 text-xs font-medium" role="status">
          <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin mb-2" />
          <p>Loading today's staff and attendance…</p>
        </div>
      ) : (
        <>
          {/* 4-Column KPI Summary Strip */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-default)]"
            aria-label="Operations summary"
          >
            {/* KPI 1: Staff Checked In */}
            <Link
              to={link('attendance')}
              className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Staff checked in
                </span>
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {checkedIn}{' '}
                  <span className="text-sm font-normal text-slate-500">/ {expected.length}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {away.size === 0 ? 'Full team expected' : `${away.size} on approved leave`}
                </p>
              </div>
            </Link>

            {/* KPI 2: Attendance Issues */}
            <Link
              to={link('attendance', { status: 'ISSUES' })}
              className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Attendance issues
                </span>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    exceptions.length > 0
                      ? 'bg-accent-50 text-accent-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {exceptions.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {exceptions.length === 0 ? 'No attendance anomalies' : 'Late, absent or awaiting correction'}
                </p>
              </div>
            </Link>

            {/* KPI 3: On Leave / Pending Approvals */}
            {manager ? (
              <Link
                to={link('leaves', { status: 'PENDING' })}
                className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Pending approvals
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {pending.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {pending.length === 0 ? 'All leave requests reviewed' : 'Leave requests to review'}
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                to={link('leaves', { status: 'APPROVED', onDate: date })}
                className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    On approved leave
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {away.size}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Approved for selected date</p>
                </div>
              </Link>
            )}

            {/* KPI 4: Latest Payroll / Attendance Corrections */}
            {manager ? (
              <Link
                to={link('attendance', { status: 'REGULARIZATION_PENDING' })}
                className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Corrections
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {corrections.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Awaiting manager review</p>
                </div>
              </Link>
            ) : (
              <Link
                to="/admin/payroll"
                className="p-5 flex flex-col justify-between hover:bg-slate-50/70 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Latest payroll
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-semibold tracking-tight text-slate-900 truncate">
                    {latestRun ? statusLabel(latestRun.status) : 'No run yet'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {latestRun ? `${latestRun.month} ${latestRun.year}` : 'Draft payroll cycle'}
                  </p>
                </div>
              </Link>
            )}
          </div>

          {/* Main grid: staff by center and shift coverage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left column: staff by center */}
            <div className="lg:col-span-7">
              {manager ? (
                <section className="ops-panel">
                  <div className="ops-panel-heading">
                    <div>
                      <h2>Leave requests to review</h2>
                      <p>Check coverage before deciding.</p>
                    </div>
                    <Link className="ops-link" to={link('leaves', { status: 'PENDING' })}>
                      View all <ArrowRight size={14} />
                    </Link>
                  </div>
                  {!pending.length ? (
                    <div className="ops-empty py-10">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                      <p className="font-medium text-slate-700">No pending leave requests</p>
                      <p className="text-xs text-slate-500 mt-0.5">Your team has no outstanding approvals.</p>
                    </div>
                  ) : (
                    <ul className="ops-list">
                      {pending.slice(0, 5).map((request) => (
                        <li className="ops-row" key={request.id}>
                          <div className="min-w-0">
                            <strong className="text-xs font-semibold text-slate-900 block truncate">
                              {request.employeeName}
                            </strong>
                            <p className="text-xs text-slate-600">
                              {formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.days} days
                            </p>
                            <p className="ops-muted text-xs">
                              {overlappingLeaveCount(request, data.leaves, data.employees)} colleagues on same shift
                              have approved leave.
                            </p>
                          </div>
                          <button
                            className="ops-button secondary shrink-0 text-xs py-1.5 px-3"
                            onClick={() => {
                              setReview(request);
                              setComment('');
                            }}
                          >
                            Review
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="ops-panel">
                  <div className="ops-panel-heading">
                    <div>
                      <h2>Staff by center</h2>
                      <p>Assigned staff and recorded check-ins for {formatDate(date)}.</p>
                    </div>
                    <Link className="ops-link" to="/admin/employees">
                      Employee management <ArrowRight size={14} />
                    </Link>
                  </div>

                  <ul className="ops-list">
                    {centerNames
                      .filter((location) => venue === 'ALL' || venue === location)
                      .map((location) => {
                        const local = staff.filter((employee) => employee.location === location);
                        const localIds = new Set(local.map((employee) => employee.id));
                        const localCheckedIn = records.filter(
                          (record) => localIds.has(record.employeeId) && record.checkIn
                        ).length;
                        const onLeaveCount = local.filter((employee) => away.has(employee.id)).length;

                        return (
                          <li className="ops-row" key={location}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-slate-900">{location}</span>
                                {local.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                    {local.length} staff
                                  </span>
                                )}
                              </div>
                              <p className="ops-muted text-xs mt-0.5">
                                {local.length} assigned · {onLeaveCount} on leave
                              </p>
                            </div>

                            <Link
                              className="ops-link text-xs font-medium"
                              to={`${root}/attendance?${new URLSearchParams({ location, date, shift })}`}
                            >
                              <span>{localCheckedIn} checked in</span>
                              <ArrowRight size={13} />
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                  <p className="ops-muted mt-3 text-xs">
                    Managers handle leave and attendance adjustments for their assigned teams.
                  </p>
                </section>
              )}
            </div>

            {/* Right Column (5 cols): Shift Coverage */}
            <div className="lg:col-span-5">
              <section className="ops-panel">
                <div className="ops-panel-heading">
                  <div>
                    <h2>Shift coverage</h2>
                    <p>
                      {formatDate(date)} · {staff.length} assigned
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-slate-500" />
                </div>

                {/* Progress bar of coverage */}
                <div className="mt-4 mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                    <span>Coverage</span>
                    <span>
                      {expected.length > 0 ? Math.round((checkedIn / expected.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-brand-500 h-full transition-all duration-300"
                      style={{
                        width: `${expected.length > 0 ? (checkedIn / expected.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <dl className="ops-definition text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Expected staff</dt>
                    <dd className="font-semibold text-slate-800 tabular-nums">{expected.length}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Checked in</dt>
                    <dd className="font-semibold text-emerald-700 tabular-nums">{checkedIn}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">Not checked in</dt>
                    <dd className="font-semibold text-slate-700 tabular-nums">{missing.length}</dd>
                  </div>
                </dl>

                <p className="ops-muted mt-3 text-xs">
                  Not checked in includes upcoming shifts. It does not automatically signify an unexcused absence.
                </p>

                {manager && missing.length > 0 && (
                  <ul className="ops-list mt-3">
                    {missing.slice(0, 4).map((employee) => (
                      <li className="ops-row" key={employee.id}>
                        <span>
                          <span className="font-medium text-xs text-slate-800">{employee.fullName}</span>
                          <small className="block ops-muted text-xs">
                            {getShiftDefinition(employee.shift).name}
                          </small>
                        </span>
                        <span className="ops-muted text-xs">Not checked in</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-3 border-t border-[var(--border-default)] mt-3">
                  <Link className="ops-link text-xs font-medium" to={link('attendance')}>
                    Open attendance register <ArrowRight size={13} />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {/* Leave Approval Modal for Manager */}
      <Modal
        isOpen={manager && !!review}
        onClose={() => {
          if (!saving) setReview(null);
        }}
        title="Review leave request"
        subtitle={review?.employeeName}
        size="md"
      >
        {review && (
          <div className="space-y-4">
            <p className="text-xs text-slate-700">
              {formatDate(review.startDate)} – {formatDate(review.endDate)} · {review.days} days
            </p>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {review.reason}
            </p>
            <p className="ops-muted text-xs">
              {overlappingLeaveCount(review, data.leaves, data.employees)} colleagues on the same center and shift have
              overlapping approved leave.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1" htmlFor="ops-decision-note">
                Decision note
              </label>
              <textarea
                id="ops-decision-note"
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Required when declining a request"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="ops-button secondary text-xs"
                disabled={saving || !comment.trim()}
                onClick={() => decide('REJECTED')}
              >
                Decline
              </button>
              <button className="ops-button text-xs" disabled={saving} onClick={() => decide('APPROVED')}>
                {saving ? 'Saving…' : 'Approve leave'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
