import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, LeaveRequest, PayrollRun, Payslip } from '@/types';
import { api } from '@/services/api';
import { formatDate, formatINR } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { MONTH_NAMES } from '@/features/admin/reports/reportUtils';
import { Check } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const stages = ['Attendance', 'Adjustments', 'Salary register', 'Finalize'];

interface PayrollReviewProps {
  run: PayrollRun;
  onView: (slip: Payslip) => void;
  onFinalize: () => void;
  saving: boolean;
  onRunUpdated?: () => void;
}

/** Resolves "October", "Oct" or "2026-10" to a 0-based month index; -1 when unknown. */
const monthIndex = (month: string) => {
  const m = (month || '').trim().toLowerCase();
  const numeric = m.match(/^\d{4}-(\d{1,2})$/);
  if (numeric) return Number(numeric[1]) - 1;
  return MONTH_NAMES.findIndex((name) => name.toLowerCase() === m || (m.length >= 3 && name.toLowerCase().startsWith(m)));
};

export const PayrollReview: React.FC<PayrollReviewProps> = ({ run, onView, onFinalize, saving, onRunUpdated }) => {
  const dispatch = useAppDispatch();
  const complete = run.status === 'DISBURSED';
  const [step, setStep] = useState(complete ? 2 : 0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>(run.payslips || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [adjustingSlip, setAdjustingSlip] = useState<Payslip | null>(null);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [incentivesAmount, setIncentivesAmount] = useState(0);
  const [specialAmount, setSpecialAmount] = useState(0);
  const [lossOfPayDays, setLossOfPayDays] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  const openAdjustmentModal = (slip: Payslip) => {
    setAdjustingSlip(slip);
    setBonusAmount(slip.components?.bonus || 0);
    setIncentivesAmount(slip.components?.incentives || 0);
    setSpecialAmount(slip.components?.specialAllowance || 0);
    setLossOfPayDays(slip.lossOfPayDays || 0);
    setAdjustmentNotes(slip.components?.adjustmentNotes || '');
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingSlip) return;
    setIsSavingAdjustment(true);
    try {
      const updated = await api.payroll.adjustPayslip(adjustingSlip.id, {
        bonus: Number(bonusAmount) || 0,
        incentives: Number(incentivesAmount) || 0,
        specialAllowance: Number(specialAmount) || 0,
        lossOfPayDays: Number(lossOfPayDays) || 0,
        notes: adjustmentNotes,
      });
      setPayslips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      dispatch(addToast({ type: 'success', title: 'Adjustment saved', message: `${adjustingSlip.employeeName}'s payslip was updated.` }));
      setAdjustingSlip(null);
      onRunUpdated?.();
    } catch (e: any) {
      dispatch(addToast({ type: 'error', title: 'Could not save adjustment', message: e?.message || 'Please try again.' }));
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([
      api.attendance.getAll().catch(() => []),
      api.leaves.getAll().catch(() => []),
      run.payslips && run.payslips.length > 0 ? Promise.resolve(run.payslips) : api.payroll.getPayslipsByRun(run.id).catch(() => []),
    ])
      .then(([records, requests, slips]) => {
        if (!active) return;
        setAttendance(Array.isArray(records) ? records : []);
        setLeaves(Array.isArray(requests) ? requests : []);
        if (Array.isArray(slips) && slips.length > 0) setPayslips(slips);
        else if (Array.isArray(run.payslips)) setPayslips(run.payslips);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run.id, run.payslips]);

  const effectivePayslips = (payslips && payslips.length > 0 ? payslips : run.payslips) || [];
  const month = monthIndex(run.month);
  const knownMonth = month >= 0;
  const mm = String(month + 1).padStart(2, '0');
  const start = knownMonth ? `${run.year}-${mm}-01` : '';
  const end = knownMonth ? `${run.year}-${mm}-${String(new Date(run.year, month + 1, 0).getDate()).padStart(2, '0')}` : '';

  const ids = new Set(effectivePayslips.map((slip) => String(slip.employeeId)));
  const records = knownMonth ? attendance.filter((r) => ids.has(String(r.employeeId)) && r.date >= start && r.date <= end) : [];
  const requests = knownMonth ? leaves.filter((r) => ids.has(String(r.employeeId)) && r.startDate <= end && r.endDate >= start) : [];
  const corrections = records.filter((r) => r.regularizationStatus === 'PENDING').length;
  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const banking = effectivePayslips.filter((slip) => !slip.bankAccount?.trim() || !slip.bankName?.trim());
  const invalidPay = effectivePayslips.filter((slip) => {
    const net = slip.components?.netMonthly ?? 0;
    return !Number.isFinite(net) || net < 0;
  });
  const blockers = [...new Set([...banking, ...invalidPay].map((slip) => slip.employeeName))];
  const canFinalize = !saving && !loading && !error && reviewed && confirmed && blockers.length === 0 && effectivePayslips.length > 0;

  const adjustButton = (slip: Payslip) =>
    !complete && (
      <Button variant="ghost" size="xs" onClick={() => openAdjustmentModal(slip)}>
        Adjust
      </Button>
    );

  // Mirrors PayrollController.adjustPayslip: stored gross is authoritative, only the change in special
  // allowance moves the base, and non-statutory custom deductions carry over.
  const preview = (() => {
    if (!adjustingSlip) return null;
    const c = adjustingSlip.components;
    const payableDays = Math.max(1, adjustingSlip.payableDays || 30);
    const prevBaseGross = Math.max(0, (c?.grossMonthly || 0) - (c?.bonus || 0) - (c?.incentives || 0));
    const prevLopDays = adjustingSlip.lossOfPayDays || 0;
    const prevLop = prevLopDays > 0 ? Math.round((prevBaseGross / payableDays) * prevLopDays) : 0;
    const statutory = (c?.epfEmployee || 0) + (c?.professionalTax || 0) + (c?.tds || 0) + (c?.healthInsurance || 0);
    const otherDeductions = Math.max(0, (c?.totalDeductions || 0) - statutory - prevLop);
    const baseGross = Math.max(0, prevBaseGross + (Number(specialAmount) - (c?.specialAllowance || 0)));
    const gross = baseGross + Number(bonusAmount) + Number(incentivesAmount);
    const lop = lossOfPayDays > 0 ? Math.round((baseGross / payableDays) * lossOfPayDays) : 0;
    const deductions = statutory + otherDeductions + lop;
    return { gross, deductions, net: Math.max(0, gross - deductions) };
  })();

  return (
    <div className="space-y-5">
      <ol className="ops-stepper" aria-label="Payroll review stages">
        {stages.map((stage, index) => (
          <li className={step === index ? 'current' : index < step ? 'done' : ''} key={stage}>
            <button type="button" className="w-full text-left focus:outline-none focus-visible:underline" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>
              {index + 1}. {stage}
            </button>
          </li>
        ))}
      </ol>

      <StatTiles columns={3}>
        <StatTile label="Gross pay" value={formatINR(run.totalGrossPay || 0)} />
        <StatTile label="Deductions" value={formatINR(run.totalDeductions || 0)} />
        <StatTile label="Net payroll" value={formatINR(run.totalNetPay || 0)} />
      </StatTiles>

      {loading && (
        <p role="status" className="text-sm text-slate-600">
          Loading review checks...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          Review checks could not load. Close and reopen the payroll to retry.
        </p>
      )}

      {step === 0 && !loading && !error && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">
            Attendance for {run.month} {run.year}
          </h3>
          {!knownMonth && <p className="text-sm text-amber-800">This run's month could not be read, so attendance checks are skipped.</p>}
          <dl className="ops-definition max-w-md">
            <dt>Recorded shifts</dt>
            <dd className="tabular-nums">{records.length}</dd>
            <dt>Corrections to review</dt>
            <dd className={`tabular-nums ${corrections ? 'text-amber-800' : ''}`}>{corrections}</dd>
            <dt>Leave awaiting decision</dt>
            <dd className={`tabular-nums ${pending ? 'text-amber-800' : ''}`}>{pending}</dd>
          </dl>
          <p className="ops-muted">Clear exceptions first. The draft does not pick up attendance or leave changes until you regenerate it.</p>
          <div className="flex flex-wrap gap-4">
            <Link className="ops-link" to="/admin/attendance?status=REGULARIZATION_PENDING">
              Review attendance corrections
            </Link>
            <Link className="ops-link" to="/admin/leaves?status=PENDING">
              View pending leave
            </Link>
          </div>
        </section>
      )}

      {(step === 1 || step === 2) && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-900">{step === 1 ? 'Days, bonus and loss of pay' : 'Salary register'}</h3>
          {step === 1 && <p className="ops-muted">Check payable days and loss of pay, and add any bonus or incentive.</p>}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="ops-table text-sm">
              <thead>
                {step === 1 ? (
                  <tr>
                    <th>Employee</th>
                    <th className="text-right">Payable days</th>
                    <th className="text-right">Loss of pay days</th>
                    <th className="text-right">Bonus and incentive</th>
                    <th className="text-right">Deductions</th>
                    <th />
                  </tr>
                ) : (
                  <tr>
                    <th>Employee</th>
                    <th className="text-right">Gross</th>
                    <th className="text-right">Bonus</th>
                    <th className="text-right">EPF</th>
                    <th className="text-right">PT</th>
                    <th className="text-right">TDS</th>
                    <th className="text-right">Net pay</th>
                    <th />
                  </tr>
                )}
              </thead>
              <tbody>
                {effectivePayslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-600">
                      No payslips in this run.
                    </td>
                  </tr>
                ) : (
                  effectivePayslips.map((slip) => {
                    const bonusTotal = (slip.components?.bonus || 0) + (slip.components?.incentives || 0);
                    return (
                      <tr key={slip.id}>
                        <td>
                          <span className="font-medium text-slate-900">{slip.employeeName}</span>
                          <span className="block text-xs text-slate-600">{slip.employeeCode}</span>
                        </td>
                        {step === 1 ? (
                          <>
                            <td className="text-right tabular-nums">{slip.payableDays}</td>
                            <td className={`text-right tabular-nums ${slip.lossOfPayDays ? 'text-amber-800' : ''}`}>{slip.lossOfPayDays}</td>
                            <td className="text-right tabular-nums">{bonusTotal > 0 ? formatINR(bonusTotal) : '--'}</td>
                            <td className="text-right tabular-nums">{formatINR(slip.components?.totalDeductions ?? 0)}</td>
                            <td className="text-right">{adjustButton(slip)}</td>
                          </>
                        ) : (
                          <>
                            <td className="text-right tabular-nums">{formatINR(slip.components?.grossMonthly ?? 0)}</td>
                            <td className="text-right tabular-nums">{bonusTotal > 0 ? formatINR(bonusTotal) : '--'}</td>
                            <td className="text-right tabular-nums">{formatINR(slip.components?.epfEmployee ?? 0)}</td>
                            <td className="text-right tabular-nums">{formatINR(slip.components?.professionalTax ?? 0)}</td>
                            <td className="text-right tabular-nums">{formatINR(slip.components?.tds ?? 0)}</td>
                            <td className="text-right font-semibold tabular-nums text-slate-900">{formatINR(slip.components?.netMonthly ?? 0)}</td>
                            <td className="whitespace-nowrap text-right">
                              <Button variant="ghost" size="xs" onClick={() => onView(slip)} aria-label={`View payslip for ${slip.employeeName}`}>
                                View
                              </Button>
                              {adjustButton(slip)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900">{complete ? 'Payroll paid' : 'Finalize payroll'}</h3>
          {complete ? (
            <p className="text-sm text-slate-700">
              Marked paid on {formatDate(run.disbursedAt)} by {run.disbursedBy || 'People operations'}.
            </p>
          ) : (
            <>
              <dl className="ops-definition max-w-md">
                <dt>Missing bank details</dt>
                <dd className={banking.length ? 'text-rose-700' : ''}>{banking.length}</dd>
                <dt>Invalid pay amounts</dt>
                <dd className={invalidPay.length ? 'text-rose-700' : ''}>{invalidPay.length}</dd>
                <dt>Pending corrections</dt>
                <dd>{loading ? 'Checking...' : corrections}</dd>
                <dt>Pending leave decisions</dt>
                <dd>{loading ? 'Checking...' : pending}</dd>
              </dl>
              {blockers.length > 0 && (
                <p role="alert" className="text-sm text-rose-700">
                  Fix these employees' details and regenerate the draft before finalizing: {blockers.join(', ')}.
                </p>
              )}
              <label className="flex items-start gap-3 text-sm text-slate-800">
                <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 shrink-0" />
                I have reviewed attendance, leave decisions and salary adjustments.
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-800">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 shrink-0" />
                Payments are complete and this month can be marked as paid.
              </label>
              <p className="ops-muted">This records payment status and releases payslips to employees. It does not move money.</p>
              <Button disabled={!canFinalize} isLoading={saving} onClick={onFinalize} leftIcon={<Check className="h-4 w-4" />}>
                Finalize and mark paid
              </Button>
            </>
          )}
        </section>
      )}

      <div className="flex justify-between gap-3 border-t border-slate-200 pt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        {step < 3 && <Button variant="secondary" onClick={() => setStep(step + 1)}>Next: {stages[step + 1].toLowerCase()}</Button>}
      </div>

      <Modal
        isOpen={Boolean(adjustingSlip)}
        onClose={() => setAdjustingSlip(null)}
        title={adjustingSlip ? `Adjust pay · ${adjustingSlip.employeeName}` : 'Adjust pay'}
        subtitle={adjustingSlip ? `${adjustingSlip.employeeCode} · ${run.month} ${run.year}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustingSlip(null)} disabled={isSavingAdjustment}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment} isLoading={isSavingAdjustment}>
              Save adjustment
            </Button>
          </>
        }
      >
        {adjustingSlip && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bonus" type="number" min={0} step={500} value={bonusAmount} onChange={(e) => setBonusAmount(Math.max(0, Number(e.target.value)))} helperText="Festival or one-time reward" />
              <Input label="Incentive" type="number" min={0} step={500} value={incentivesAmount} onChange={(e) => setIncentivesAmount(Math.max(0, Number(e.target.value)))} />
              <Input label="Special allowance" type="number" min={0} step={500} value={specialAmount} onChange={(e) => setSpecialAmount(Math.max(0, Number(e.target.value)))} />
              <Input
                label="Loss of pay days"
                type="number"
                min={0}
                max={adjustingSlip.payableDays || 31}
                value={lossOfPayDays}
                onChange={(e) => setLossOfPayDays(Math.min(adjustingSlip.payableDays || 31, Math.max(0, Number(e.target.value))))}
              />
            </div>
            <Textarea label="Reason" rows={2} value={adjustmentNotes} onChange={(e) => setAdjustmentNotes(e.target.value)} placeholder="Q3 sales milestone bonus approved by management" />
            <dl className="divide-y divide-slate-100 rounded-lg bg-slate-50 px-4 py-1 text-sm">
              <div className="flex justify-between py-2">
                <dt className="text-slate-600">New gross</dt>
                <dd className="tabular-nums text-slate-900">{formatINR(preview.gross)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-slate-600">Deductions, including loss of pay</dt>
                <dd className="tabular-nums text-slate-900">{formatINR(preview.deductions)}</dd>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <dt className="text-slate-900">New net pay</dt>
                <dd className="tabular-nums text-slate-900">{formatINR(preview.net)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
};
