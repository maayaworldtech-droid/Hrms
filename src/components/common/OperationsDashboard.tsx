import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { getReportingManager } from '@/services/mockData';
import { AttendanceRecord, Employee, LeaveRequest, PayrollRun } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { approvedAway, businessDate, locationOptions, overlappingLeaveCount } from '@/utils/operations';

type Snapshot = { employees: Employee[]; attendance: AttendanceRecord[]; leaves: LeaveRequest[]; payroll: PayrollRun[] };
const statusLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());

export const OperationsDashboard = ({ manager = false }: { manager?: boolean }) => {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
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
    setLoading(true); setError(false);
    try {
      const [employees, attendance, leaves, payroll] = await Promise.all([api.employees.getAll(), api.attendance.getAll(), api.leaves.getAll(), manager ? Promise.resolve([] as PayrollRun[]) : api.payroll.getRuns()]);
      const team = manager ? employees.filter(employee => getReportingManager(employee).id === user?.id) : employees;
      const ids = new Set(team.map(employee => employee.id));
      setData({ employees: team, attendance: attendance.filter(record => ids.has(record.employeeId)), leaves: leaves.filter(leave => ids.has(leave.employeeId)), payroll });
    } catch { setError(true); } finally { setLoading(false); }
  }, [manager, user?.id]);
  useEffect(() => { void load(); }, [load]);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next); };
  const staff = data.employees.filter(employee => employee.status !== 'TERMINATED' && employee.joiningDate <= date && (venue === 'ALL' || employee.location === venue) && (shift === 'ALL' || (employee.shift || 'MORNING') === shift));
  const ids = new Set(staff.map(employee => employee.id));
  const records = data.attendance.filter(record => record.date === date && ids.has(record.employeeId));
  const leaves = data.leaves.filter(leave => ids.has(leave.employeeId));
  const away = approvedAway(leaves, date);
  const expected = staff.filter(employee => !away.has(employee.id));
  const checkedIn = records.filter(record => !!record.checkIn).length;
  const corrections = records.filter(record => record.regularizationStatus === 'PENDING');
  const exceptions = records.filter(record => record.status === 'LATE' || record.status === 'ABSENT' || record.regularizationStatus === 'PENDING');
  const pending = leaves.filter(leave => leave.status === 'PENDING');
  const missing = expected.filter(employee => !records.some(record => record.employeeId === employee.id && record.checkIn));
  const link = (page: string, extra: Record<string, string> = {}) => `${root}/${page}?${new URLSearchParams({ location: venue, date, shift, ...extra })}`;
  const allVenues = manager ? locationOptions.filter(location => data.employees.some(employee => employee.location === location)) : locationOptions;
  const latestRun = [...data.payroll].sort((a,b) => b.processedAt.localeCompare(a.processedAt))[0];
  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    if (!manager || !review || saving || (status === 'REJECTED' && !comment.trim())) return;
    setSaving(true);
    try {
      await api.leaves.updateStatus(review.id, status, user?.name || 'People operations', comment.trim() || 'Approved after reviewing shift coverage');
      dispatch(addToast({ type: 'success', title: status === 'APPROVED' ? 'Leave approved' : 'Leave declined', message: `Decision saved for ${review.employeeName}.` }));
      setReview(null); setComment(''); await load();
    } catch { dispatch(addToast({ type: 'error', title: 'Could not save decision', message: 'Please try again.' })); } finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <div className="ops-heading">
      <div><h1>{manager ? 'Venue team' : 'People & operations'}</h1><p>{manager ? 'Staffing, shift coverage and team approvals.' : 'Your workforce across Maaya World venues.'}</p></div>
      <div className="ops-context">
        <label>Venue<select aria-label="Dashboard venue" value={venue} onChange={event => update('location', event.target.value)}><option value="ALL">{manager ? 'All my venues' : 'All locations'}</option>{allVenues.map(location => <option key={location}>{location}</option>)}</select></label>
        <label>Date<input aria-label="Dashboard date" type="date" value={date} onChange={event => { if (event.target.value) update('date', event.target.value); }} /></label>
        {manager && <label>Employee shift<select aria-label="Dashboard shift" value={shift} onChange={event => update('shift', event.target.value)}><option value="ALL">All shifts</option><option value="MORNING">Morning · 9 AM–1 PM</option><option value="EVENING">Evening · 1 PM–9 PM</option></select></label>}
      </div>
    </div>
    {error ? <div role="alert" className="ops-panel"><h2>Unable to load operations</h2><p className="ops-muted my-3">Please retry to see current staffing and approvals.</p><button className="ops-button" onClick={load}>Try again</button></div> : loading ? <div className="ops-panel" role="status">Loading staffing and approvals…</div> : <>
      <div className="ops-summary" aria-label="Operations summary">
        <Link to={link('attendance')}><span>Staff checked in</span><strong>{checkedIn} <span className="ops-muted">/ {expected.length}</span></strong><span className="ops-muted">{away.size} on approved leave</span></Link>
        <Link to={link('attendance', { status: 'ISSUES' })}><span>Attendance issues</span><strong>{exceptions.length}</strong><span className="ops-muted">Late, absent or awaiting correction</span></Link>
        {manager ? <Link to={link('leaves', { status: 'PENDING' })}><span>Pending approvals</span><strong>{pending.length}</strong><span className="ops-muted">Leave requests to review</span></Link> : <Link to={link('leaves', { status: 'APPROVED', onDate: date })}><span>On approved leave</span><strong>{away.size}</strong><span className="ops-muted">For the selected date</span></Link>}
        {manager ? <Link to={link('attendance', { status: 'REGULARIZATION_PENDING' })}><span>Attendance corrections</span><strong>{corrections.length}</strong><span className="ops-muted">Awaiting your review</span></Link> : <Link to="/admin/payroll"><span>Latest payroll</span><strong>{latestRun ? statusLabel(latestRun.status) : 'No run yet'}</strong><span className="ops-muted">{latestRun ? `${latestRun.month} ${latestRun.year}` : 'Create your first payroll draft'}</span></Link>}
      </div>
      <div className="ops-main-grid">
        {manager ? <section className="ops-panel">
          <div className="ops-panel-heading"><div><h2>Leave requests to review</h2><p>Check coverage before deciding.</p></div><Link className="ops-link" to={link('leaves', { status: 'PENDING' })}>View all <ArrowRight size={16} /></Link></div>
          {!pending.length ? <p className="ops-empty">No pending leave requests for this selection.</p> : <ul className="ops-list">{pending.slice(0,5).map(request => <li className="ops-row" key={request.id}><div className="min-w-0"><strong>{request.employeeName}</strong><p>{formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.days} days</p><p className="ops-muted">{overlappingLeaveCount(request, data.leaves, data.employees)} colleagues on the same venue shift have overlapping approved leave.</p></div><button className="ops-button secondary shrink-0" onClick={() => { setReview(request); setComment(''); }}>Review</button></li>)}</ul>}
        </section> : <section className="ops-panel"><div className="ops-panel-heading"><div><h2>Workforce by venue</h2><p>Assigned staff and recorded check-ins for {formatDate(date)}.</p></div><Link className="ops-link" to="/admin/employees">Directory <ArrowRight size={16}/></Link></div><ul className="ops-list">{locationOptions.filter(location => venue === 'ALL' || venue === location).map(location => { const local = staff.filter(employee => employee.location === location); const localIds = new Set(local.map(employee => employee.id)); return <li className="ops-row" key={location}><div><strong>{location}</strong><p className="ops-muted">{local.length} assigned staff · {local.filter(employee => away.has(employee.id)).length} on leave</p></div><Link className="ops-link" to={`${root}/attendance?${new URLSearchParams({location,date,shift})}`}>{records.filter(record => localIds.has(record.employeeId) && record.checkIn).length} checked in <ArrowRight size={16}/></Link></li>; })}</ul><p className="ops-muted mt-3">Managers handle leave decisions for their assigned teams.</p></section>}
        <section className="ops-panel">
          <div className="ops-panel-heading"><div><h2>Shift coverage</h2><p>{formatDate(date)} · {staff.length} assigned staff</p></div><Clock size={20} /></div>
          <dl className="ops-definition"><dt>Expected staff</dt><dd className="font-semibold">{expected.length}</dd><dt>Checked in</dt><dd className="font-semibold">{checkedIn}</dd><dt>Not checked in</dt><dd className="font-semibold">{missing.length}</dd></dl>
          <p className="ops-muted mt-4">Not checked in includes upcoming shifts. It does not automatically mean absent.</p>
          {manager && missing.length > 0 && <ul className="ops-list mt-3">{missing.slice(0,4).map(employee => <li className="ops-row" key={employee.id}><span>{employee.fullName}<small className="block ops-muted text-sm">{getShiftDefinition(employee.shift).name}</small></span><span className="ops-muted">Not checked in</span></li>)}</ul>}
          <Link className="ops-link mt-3" to={link('attendance')}>Open attendance register <ArrowRight size={16} /></Link>
        </section>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading"><div><h2>Attendance needing attention</h2><p>Exceptions for {formatDate(date)}.</p></div><Link className="ops-link" to={link('attendance', { status: 'ISSUES' })}>Review issues <ArrowRight size={16} /></Link></div>
        {exceptions.length === 0 ? <p className="ops-empty">No recorded attendance issues for this date.</p> : <ul className="ops-list">{exceptions.slice(0,5).map(record => <li className="ops-row" key={record.id}><div><strong>{record.employeeName}</strong><p className="ops-muted">{record.regularizationStatus === 'PENDING' ? record.regularizationReason || 'Attendance correction requested' : record.notes || statusLabel(record.status)}</p></div><Link className="ops-link" to={link('attendance', { status: record.regularizationStatus === 'PENDING' ? 'REGULARIZATION_PENDING' : record.status })}>Review</Link></li>)}</ul>}
      </section>
      <section className="ops-panel">
        <div className="ops-panel-heading"><div><h2>Attendance register</h2><p>Recorded check-ins for the selected date.</p></div><Link className="ops-link" to={link('attendance')}>Full register <ArrowRight size={16} /></Link></div>
        {!records.length ? <p className="ops-empty">No attendance recorded for this date. Choose another date to review past records.</p> : <>
          <div className="ops-desktop-table"><table className="ops-table"><thead><tr><th>Staff member</th><th>Venue / shift</th><th>Status</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Correction</th></tr></thead><tbody>{records.slice(0,10).map(record => <tr key={record.id}><td className="font-semibold">{record.employeeName}</td><td>{data.employees.find(employee => employee.id === record.employeeId)?.location}<span className="block ops-muted">{getShiftDefinition(record.shift).name}</span></td><td>{statusLabel(record.status)}</td><td>{record.checkIn ? formatTime(record.checkIn) : '—'}</td><td>{record.checkOut ? formatTime(record.checkOut) : '—'}</td><td>{record.workHours || '—'}</td><td>{record.regularizationStatus === 'PENDING' ? 'Awaiting review' : record.regularizationStatus === 'APPROVED' ? 'Approved' : 'None'}</td></tr>)}</tbody></table></div>
          <ul className="ops-list ops-mobile-list">{records.slice(0,10).map(record => <li key={record.id} className="ops-row"><div><strong>{record.employeeName}</strong><p>{getShiftDefinition(record.shift).name}</p><p className="ops-muted">{record.checkIn ? formatTime(record.checkIn) : 'No check-in'}{record.checkOut && ` – ${formatTime(record.checkOut)}`}</p></div><span className="ops-status">{statusLabel(record.status)}</span></li>)}</ul>
        </>}
      </section>
      <div className="flex items-center justify-between gap-4 flex-wrap"><p className="ops-venue-hours"><MapPin size={17} />Visitor hours: 11 AM–9 PM. Employee shift times are shown separately.</p>{!manager && <Link className="ops-button secondary" to="/admin/employees">Open employee directory</Link>}</div>
    </>}
    <Modal isOpen={manager && !!review} onClose={() => { if (!saving) setReview(null); }} title="Review leave request" subtitle={review?.employeeName} size="md">
      {review && <div className="space-y-4"><p>{formatDate(review.startDate)} – {formatDate(review.endDate)} · {review.days} days</p><p>{review.reason}</p><p className="ops-muted">{overlappingLeaveCount(review, data.leaves, data.employees)} colleagues on the same venue shift have overlapping approved leave.</p><label className="block font-semibold" htmlFor="ops-decision-note">Decision note</label><textarea id="ops-decision-note" className="w-full border border-slate-300 rounded-lg p-3" rows={3} value={comment} onChange={event => setComment(event.target.value)} placeholder="Required when declining a request" /><div className="flex justify-end gap-2"><button className="ops-button secondary" disabled={saving || !comment.trim()} onClick={() => decide('REJECTED')}>Decline</button><button className="ops-button" disabled={saving} onClick={() => decide('APPROVED')}>{saving ? 'Saving…' : 'Approve leave'}</button></div></div>}
    </Modal>
  </div>;
};
