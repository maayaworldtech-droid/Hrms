import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, LeaveRequest, PayrollRun, Payslip } from '@/types';
import { api } from '@/services/api';
import { formatDate, formatINR } from '@/utils/formatters';

const stages = ['Attendance', 'Adjustments', 'Payroll register', 'Finalize'];
export const PayrollReview = ({ run, onView, onFinalize, saving }: { run: PayrollRun; onView: (slip: Payslip) => void; onFinalize: () => void; saving: boolean }) => {
  const [step, setStep] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.attendance.getAll(),api.leaves.getAll()]).then(([records,requests]) => { if (active) { setAttendance(records); setLeaves(requests); } }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [run.id]);
  const month = new Date(`${run.month} 1, ${run.year}`).getMonth();
  const start = `${run.year}-${String(month+1).padStart(2,'0')}-01`;
  const end = `${run.year}-${String(month+1).padStart(2,'0')}-${new Date(run.year,month+1,0).getDate()}`;
  const ids = new Set(run.payslips.map(slip => slip.employeeId));
  const records = attendance.filter(record => ids.has(record.employeeId) && record.date >= start && record.date <= end);
  const requests = leaves.filter(request => ids.has(request.employeeId) && request.startDate <= end && request.endDate >= start);
  const corrections = records.filter(record => record.regularizationStatus === 'PENDING').length;
  const pending = requests.filter(request => request.status === 'PENDING').length;
  const banking = run.payslips.filter(slip => !slip.bankAccount?.trim() || !slip.bankName?.trim());
  const invalidPay = run.payslips.filter(slip => !Number.isFinite(slip.components.netMonthly) || slip.components.netMonthly < 0);
  const complete = run.status === 'DISBURSED';
  const field = (label: string, amount: string | number) => <div><dt className="ops-muted">{label}</dt><dd className="font-semibold mt-1">{amount}</dd></div>;
  return <div className="space-y-5">
    <ol className="ops-stepper" aria-label="Payroll review stages">{stages.map((stage,index) => <li className={step === index ? 'current' : ''} key={stage}><button aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>{index+1}. {stage}</button></li>)}</ol>
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-slate-200">{field('Gross pay',formatINR(run.totalGrossPay))}{field('Deductions',formatINR(run.totalDeductions))}{field('Net payroll',formatINR(run.totalNetPay))}</dl>
    {loading && <p role="status">Loading review checks…</p>}
    {error && <p role="alert">Review checks could not load. Close and reopen the register to retry.</p>}
    {step === 0 && !loading && !error && <><h3>Attendance for {run.month} {run.year}</h3><dl className="ops-definition"><dt>Recorded shifts</dt><dd>{records.length}</dd><dt>Corrections to review</dt><dd>{corrections}</dd><dt>Awaiting manager decisions</dt><dd>{pending}</dd></dl><p className="ops-muted">Check exceptions and leave dates before verifying payroll amounts. This draft does not automatically reconcile attendance or leave changes.</p><div className="flex gap-4 flex-wrap"><Link className="ops-link" to="/admin/attendance?date=&status=REGULARIZATION_PENDING">Review attendance corrections</Link><Link className="ops-link" to="/admin/leaves?status=PENDING">View manager leave decisions</Link></div><p className="ops-muted">The registers open all pending items. Select the relevant dates for this pay cycle.</p></>}
    {step === 1 && <><h3>Review adjustments</h3><p className="ops-muted">Verify payable days, loss of pay and deductions for each employee. Update employee details and regenerate the draft when salary changes are needed.</p><div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>Employee</th><th>Payable days</th><th>Loss of pay days</th><th>Deductions</th></tr></thead><tbody>{run.payslips.map(slip => <tr key={slip.id}><td>{slip.employeeName}</td><td>{slip.payableDays}</td><td>{slip.lossOfPayDays}</td><td>{formatINR(slip.components.totalDeductions)}</td></tr>)}</tbody></table></div><Link className="ops-link" to="/admin/employees">Open employee details</Link></>}
    {step === 2 && <><h3>Salary register</h3><div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>Employee</th><th>Gross pay</th><th>EPF</th><th>PT</th><th>TDS</th><th>Net pay</th><th>Status</th><th>Payslip</th></tr></thead><tbody>{run.payslips.map(slip => <tr key={slip.id}><td><strong>{slip.employeeName}</strong><p className="ops-muted">{slip.employeeCode}</p></td><td>{formatINR(slip.components.grossMonthly)}</td><td>{formatINR(slip.components.epfEmployee)}</td><td>{formatINR(slip.components.professionalTax)}</td><td>{formatINR(slip.components.tds)}</td><td>{formatINR(slip.components.netMonthly)}</td><td>{slip.paymentStatus.toLowerCase()}</td><td><button className="ops-link" onClick={() => onView(slip)} aria-label={`View payslip for ${slip.employeeName}`}>View</button></td></tr>)}</tbody></table></div></>}
    {step === 3 && <><h3>{complete ? 'Payroll finalized' : 'Final review'}</h3><p className="ops-muted">{run.totalEmployees} employees · {run.month} {run.year} · {formatINR(run.totalNetPay)}</p>{complete ? <p>Marked paid on {formatDate(run.disbursedAt)} by {run.disbursedBy || 'People operations'}.</p> : <><dl className="ops-definition"><dt>Missing bank details</dt><dd>{banking.length}</dd><dt>Invalid pay amounts</dt><dd>{invalidPay.length}</dd><dt>Pending corrections</dt><dd>{loading ? 'Checking…' : corrections}</dd><dt>Pending leave decisions</dt><dd>{loading ? 'Checking…' : pending}</dd></dl>{(banking.length > 0 || invalidPay.length > 0) && <p role="alert" className="ops-status error">Update employee details and regenerate the draft before finalizing: {[...new Set([...banking,...invalidPay].map(slip => slip.employeeName))].join(', ')}.</p>}<label className="flex items-start gap-3"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-1 shrink-0"/>I have reviewed attendance, leave decisions and salary adjustments.</label><label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 shrink-0"/>I confirm payments are complete and want to mark this payroll as paid.</label><p className="ops-muted">This action records payment status and releases payslips. It does not send money to a bank.</p><button className="ops-button" disabled={saving || loading || error || !reviewed || !confirmed || !!banking.length || !!invalidPay.length || !run.payslips.length} onClick={onFinalize}>{saving ? 'Finalizing…' : 'Finalize and mark paid'}</button></>}</>}
    <div className="flex justify-between gap-3 pt-4 border-t border-slate-200"><button className="ops-button secondary" disabled={step === 0} onClick={() => setStep(step-1)}>Back</button>{step < 3 && <button className="ops-button" onClick={() => setStep(step+1)}>Continue to {stages[step+1].toLowerCase()}</button>}</div>
  </div>;
};
