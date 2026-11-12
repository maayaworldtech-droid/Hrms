import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { AttendanceRecord, Employee, LeaveRequest, PayrollRun } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { formatDate } from '@/utils/formatters';
import { getShiftDefinition, getShiftLabel } from '@/utils/shiftUtils';
import { approvedAway, businessDate, overlappingLeaveCount } from '@/utils/operations';
import { useCenters } from '@/hooks/useCenters';

type Snapshot = { employees: Employee[]; attendance: AttendanceRecord[]; leaves: LeaveRequest[]; payroll: PayrollRun[] };
const statusLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());

const FIELD =
  'h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

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
      employee.role !== 'ADMIN' &&
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
  const exceptions = records.filter((record) => record.status === 'LATE' || record.status === 'ABSENT' || record.regularizationStatus === 'PENDING');
  const pending = leaves.filter((leave) => leave.status === 'PENDING');
  const missing = expected.filter((employee) => !records.some((record) => record.employeeId === employee.id && record.checkIn));
  const link = (page: string, extra: Record<string, string> = {}) => `${root}/${page}?${new URLSearchParams({ location: venue, date, shift, ...extra })}`;
  const allVenues = manager ? centerNames.filter((location) => data.employees.some((employee) => employee.location === location)) : centerNames;
  const latestRun = [...data.payroll].sort((a, b) => b.processedAt.localeCompare(a.processedAt))[0];
  const coverage = expected.length > 0 ? Math.round((checkedIn / expected.length) * 100) : 0;

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!manager || !review || saving || (status === 'REJECTED' && !comment.trim())) return;
    setSaving(true);
    try {
      await api.leaves.updateStatus(review.id, status, comment.trim() || 'Approved after reviewing shift coverage', user?.name || 'People operations');
      dispatch(addToast({ type: 'success', title: status === 'APPROVED' ? 'Leave approved' : 'Leave declined', message: `Decision saved for ${review.employeeName}.` }));
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
      <PageHeader
        title={manager ? 'My team today' : 'Today at Maaya World'}
        description={manager ? 'Who is in, who is away, and what needs your approval.' : 'Check-ins, staffing and approvals across all centers.'}
        actions={
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Center
              <select aria-label="Dashboard center" className={FIELD} value={venue} onChange={(event) => update('location', event.target.value)}>
                <option value="ALL">{manager ? 'All my centers' : 'All centers'}</option>
                {allVenues.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              Date
              <input
                aria-label="Dashboard date"
                type="date"
                className={FIELD}
                value={date}
                onChange={(event) => {
                  if (event.target.value) update('date', event.target.value);
                }}
              />
            </label>
            {manager && (
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                Shift
                <select aria-label="Dashboard shift" className={FIELD} value={shift} onChange={(event) => update('shift', event.target.value)}>
                  <option value="ALL">All shifts</option>
                  <option value="MORNING">{getShiftLabel('MORNING')}</option>
                  <option value="EVENING">{getShiftLabel('EVENING')}</option>
                </select>
              </label>
            )}
          </>
        }
      />

      {error ? (
        <EmptyState tone="danger" title="Unable to load the dashboard" description="Today's staff and attendance could not be loaded." actionLabel="Try again" onAction={load} />
      ) : loading ? (
        <div className="space-y-6" role="status" aria-label="Loading dashboard">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="h-64 animate-pulse rounded-lg bg-slate-200 lg:col-span-7" />
            <div className="h-64 animate-pulse rounded-lg bg-slate-200 lg:col-span-5" />
          </div>
        </div>
      ) : (
        <>
          <StatTiles columns={4} aria-label="Operations summary">
            <StatTile
              label="Checked in"
              value={
                <>
                  {checkedIn}
                  <span className="text-sm font-normal text-slate-600"> / {expected.length}</span>
                </>
              }
              hint={away.size === 0 ? 'Full team expected' : `${away.size} on approved leave`}
              to={link('attendance')}
            />
            <StatTile
              label="Attendance issues"
              value={exceptions.length}
              tone={exceptions.length > 0 ? 'warning' : 'neutral'}
              hint={exceptions.length === 0 ? 'No late or missing check-ins' : 'Late, absent or awaiting correction'}
              to={link('attendance', { status: 'ISSUES' })}
            />
            {manager ? (
              <StatTile
                label="Leave to approve"
                value={pending.length}
                tone={pending.length > 0 ? 'warning' : 'neutral'}
                hint={pending.length === 0 ? 'All requests reviewed' : 'Waiting for your decision'}
                to={link('leaves', { status: 'PENDING' })}
              />
            ) : (
              <StatTile label="On approved leave" value={away.size} hint={`On ${formatDate(date)}`} to={link('leaves', { status: 'APPROVED', onDate: date })} />
            )}
            {manager ? (
              <StatTile
                label="Corrections"
                value={corrections.length}
                tone={corrections.length > 0 ? 'warning' : 'neutral'}
                hint="Attendance corrections to review"
                to={link('attendance', { status: 'REGULARIZATION_PENDING' })}
              />
            ) : (
              <StatTile
                label="Latest payroll"
                value={<span className="text-base">{latestRun ? statusLabel(latestRun.status) : 'No run yet'}</span>}
                hint={latestRun ? `${latestRun.month} ${latestRun.year}` : 'Start the first payroll run'}
                to="/admin/payroll"
              />
            )}
          </StatTiles>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {manager ? (
                <section className="ops-panel">
                  <div className="ops-panel-heading">
                    <div>
                      <h2>Leave requests to review</h2>
                      <p>Check coverage before deciding.</p>
                    </div>
                    <Link className="ops-link" to={link('leaves', { status: 'PENDING' })}>
                      View all <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                  {!pending.length ? (
                    <EmptyState bare compact icon={CheckCircle2} title="No pending leave requests" description="Your team has no outstanding approvals." />
                  ) : (
                    <ul className="ops-list">
                      {pending.slice(0, 5).map((request) => (
                        <li className="ops-row" key={request.id}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{request.employeeName}</p>
                            <p className="text-sm text-slate-700">
                              {formatDate(request.startDate)} to {formatDate(request.endDate)} · {request.days} day{request.days > 1 ? 's' : ''}
                            </p>
                            <p className="ops-muted">{overlappingLeaveCount(request, data.leaves, data.employees)} colleagues on the same shift have approved leave.</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setReview(request);
                              setComment('');
                            }}
                          >
                            Review
                          </Button>
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
                      Employees <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="ops-list">
                    {centerNames
                      .filter((location) => venue === 'ALL' || venue === location)
                      .map((location) => {
                        const local = staff.filter((employee) => employee.location === location);
                        const localIds = new Set(local.map((employee) => employee.id));
                        const localCheckedIn = records.filter((record) => localIds.has(record.employeeId) && record.checkIn).length;
                        const onLeaveCount = local.filter((employee) => away.has(employee.id)).length;
                        return (
                          <li className="ops-row" key={location}>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{location}</p>
                              <p className="ops-muted">
                                {local.length} assigned · {onLeaveCount} on leave
                              </p>
                            </div>
                            <Link className="ops-link" to={`${root}/attendance?${new URLSearchParams({ location, date, shift })}`}>
                              <span className="tabular-nums">
                                {localCheckedIn} / {local.length - onLeaveCount} in
                              </span>
                              <ArrowRight size={13} aria-hidden="true" />
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              )}
            </div>

            <div className="lg:col-span-5">
              <section className="ops-panel">
                <div className="ops-panel-heading">
                  <div>
                    <h2>Shift coverage</h2>
                    <p>
                      {formatDate(date)} · {staff.length} assigned
                    </p>
                  </div>
                  <span className="text-xl font-semibold tabular-nums text-slate-900">{coverage}%</span>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={coverage} aria-valuemin={0} aria-valuemax={100} aria-label="Coverage">
                  <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${coverage}%` }} />
                </div>

                <dl className="mt-3 divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-600">Expected</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{expected.length}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-600">Checked in</dt>
                    <dd className="font-semibold tabular-nums text-emerald-700">{checkedIn}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-600">Not yet checked in</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{missing.length}</dd>
                  </div>
                </dl>
                <p className="ops-muted mt-2">Not yet checked in includes shifts that have not started.</p>

                {manager && missing.length > 0 && (
                  <ul className="ops-list mt-3">
                    {missing.slice(0, 4).map((employee) => (
                      <li className="ops-row" key={employee.id}>
                        <span>
                          <span className="text-sm font-medium text-slate-900">{employee.fullName}</span>
                          <small className="ops-muted block">{getShiftDefinition(employee.shift).name}</small>
                        </span>
                        <span className="ops-muted">Not checked in</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <Link className="ops-link" to={link('attendance')}>
                    Open attendance register <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={manager && !!review}
        onClose={() => {
          if (!saving) setReview(null);
        }}
        title="Review leave request"
        subtitle={review?.employeeName}
        size="md"
        footer={
          <>
            <Button variant="outline" disabled={saving || !comment.trim()} onClick={() => decide('REJECTED')}>
              Decline
            </Button>
            <Button isLoading={saving} onClick={() => decide('APPROVED')}>
              Approve leave
            </Button>
          </>
        }
      >
        {review && (
          <div className="space-y-4">
            <dl className="ops-definition">
              <dt>Dates</dt>
              <dd>
                {formatDate(review.startDate)} to {formatDate(review.endDate)} · {review.days} day{review.days > 1 ? 's' : ''}
              </dd>
              <dt>Reason</dt>
              <dd className="font-normal">{review.reason}</dd>
              <dt>Coverage</dt>
              <dd className="font-normal">{overlappingLeaveCount(review, data.leaves, data.employees)} colleagues on the same center and shift have overlapping approved leave.</dd>
            </dl>
            <Textarea
              label="Decision note"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Required when declining"
              helperText="The employee sees this note."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
