import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, LeaveRequest, PayrollRun, Payslip } from '@/types';
import { api } from '@/services/api';
import { formatDate, formatINR } from '@/utils/formatters';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Gift, PlusCircle, CheckCircle2 } from 'lucide-react';

const stages = ['Attendance', 'Adjustments', 'Payroll register', 'Finalize'];

interface PayrollReviewProps {
  run: PayrollRun;
  onView: (slip: Payslip) => void;
  onFinalize: () => void;
  saving: boolean;
  onRunUpdated?: () => void;
}

export const PayrollReview: React.FC<PayrollReviewProps> = ({
  run,
  onView,
  onFinalize,
  saving,
  onRunUpdated,
}) => {
  const [step, setStep] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>(run.payslips || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Bonus and Adjustment state
  const [adjustingSlip, setAdjustingSlip] = useState<Payslip | null>(null);
  const [bonusAmount, setBonusAmount] = useState<number>(0);
  const [incentivesAmount, setIncentivesAmount] = useState<number>(0);
  const [specialAmount, setSpecialAmount] = useState<number>(0);
  const [lossOfPayDays, setLossOfPayDays] = useState<number>(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState<boolean>(false);
  const [adjustmentSuccessMsg, setAdjustmentSuccessMsg] = useState<string | null>(null);

  const openAdjustmentModal = (slip: Payslip) => {
    setAdjustingSlip(slip);
    setBonusAmount(slip.components?.bonus || 0);
    setIncentivesAmount(slip.components?.incentives || 0);
    setSpecialAmount(slip.components?.specialAllowance || 0);
    setLossOfPayDays(slip.lossOfPayDays || 0);
    setAdjustmentNotes(slip.components?.adjustmentNotes || '');
    setAdjustmentSuccessMsg(null);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustingSlip) return;
    setIsSavingAdjustment(true);
    setAdjustmentSuccessMsg(null);
    try {
      const updated = await api.payroll.adjustPayslip(adjustingSlip.id, {
        bonus: Number(bonusAmount) || 0,
        incentives: Number(incentivesAmount) || 0,
        specialAllowance: Number(specialAmount) || 0,
        lossOfPayDays: Number(lossOfPayDays) || 0,
        notes: adjustmentNotes,
      });

      setPayslips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAdjustmentSuccessMsg('Adjustment saved successfully');
      setTimeout(() => {
        setAdjustingSlip(null);
        setAdjustmentSuccessMsg(null);
      }, 900);

      if (onRunUpdated) {
        onRunUpdated();
      }
    } catch (e: any) {
      alert('Failed to save adjustment: ' + (e.message || 'Server error'));
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
      run.payslips && run.payslips.length > 0
        ? Promise.resolve(run.payslips)
        : api.payroll.getPayslipsByRun(run.id).catch(() => []),
    ])
      .then(([records, requests, slips]) => {
        if (active) {
          setAttendance(Array.isArray(records) ? records : []);
          setLeaves(Array.isArray(requests) ? requests : []);
          if (Array.isArray(slips) && slips.length > 0) {
            setPayslips(slips);
          } else if (Array.isArray(run.payslips)) {
            setPayslips(run.payslips);
          }
        }
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
  const month = new Date(`${run.month} 1, ${run.year}`).getMonth();
  const start = `${run.year}-${String(month + 1).padStart(2, '0')}-01`;
  const end = `${run.year}-${String(month + 1).padStart(2, '0')}-${new Date(run.year, month + 1, 0).getDate()}`;

  const ids = new Set(effectivePayslips.map((slip) => String(slip.employeeId)));
  const records = (attendance || []).filter(
    (record) => ids.has(String(record.employeeId)) && record.date >= start && record.date <= end
  );
  const requests = (leaves || []).filter(
    (request) => ids.has(String(request.employeeId)) && request.startDate <= end && request.endDate >= start
  );
  const corrections = records.filter((record) => record.regularizationStatus === 'PENDING').length;
  const pending = requests.filter((request) => request.status === 'PENDING').length;
  const banking = effectivePayslips.filter((slip) => !slip.bankAccount?.trim() || !slip.bankName?.trim());
  const invalidPay = effectivePayslips.filter((slip) => {
    const net = slip.components?.netMonthly ?? 0;
    return !Number.isFinite(net) || net < 0;
  });
  const complete = run.status === 'DISBURSED';

  const field = (label: string, amount: string | number) => (
    <div>
      <dt className="ops-muted">{label}</dt>
      <dd className="font-semibold text-slate-900 mt-1">{amount}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <ol className="ops-stepper" aria-label="Payroll review stages">
        {stages.map((stage, index) => (
          <li className={step === index ? 'current' : ''} key={stage}>
            <button aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>
              {index + 1}. {stage}
            </button>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-slate-200">
        {field('Gross pay', formatINR(run.totalGrossPay || 0))}
        {field('Deductions', formatINR(run.totalDeductions || 0))}
        {field('Net payroll', formatINR(run.totalNetPay || 0))}
      </dl>

      {loading && <p role="status" className="text-sm text-slate-500 py-2">Loading review checks…</p>}
      {error && (
        <p role="alert" className="text-sm text-rose-600 py-2">
          Review checks could not load. Close and reopen the register to retry.
        </p>
      )}

      {step === 0 && !loading && !error && (
        <>
          <h3 className="font-semibold text-slate-900">Attendance for {run.month} {run.year}</h3>
          <dl className="ops-definition">
            <dt>Recorded shifts</dt>
            <dd>{records.length}</dd>
            <dt>Corrections to review</dt>
            <dd>{corrections}</dd>
            <dt>Awaiting manager decisions</dt>
            <dd>{pending}</dd>
          </dl>
          <p className="ops-muted">
            Check exceptions and leave dates before verifying payroll amounts. This draft does not automatically reconcile attendance or leave changes.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link className="ops-link" to="/admin/attendance?status=REGULARIZATION_PENDING">
              Review attendance corrections
            </Link>
            <Link className="ops-link" to="/admin/leaves?status=PENDING">
              View manager leave decisions
            </Link>
          </div>
          <p className="ops-muted">
            The registers open all pending items. Select the relevant dates for this pay cycle.
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="font-semibold text-slate-900">Review adjustments</h3>
          <p className="ops-muted">
            Verify payable days, loss of pay, bonuses and deductions for each employee. You can add bonuses or incentives directly below.
          </p>
          <div className="overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Payable days</th>
                  <th>Loss of pay days</th>
                  <th>Bonus / Incentive</th>
                  <th>Deductions</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {effectivePayslips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-500">
                      No payslips found for this pay run.
                    </td>
                  </tr>
                ) : (
                  effectivePayslips.map((slip) => {
                    const bonusTotal = (slip.components?.bonus || 0) + (slip.components?.incentives || 0);
                    return (
                      <tr key={slip.id}>
                        <td>
                          <strong>{slip.employeeName}</strong>
                          <p className="ops-muted">{slip.employeeCode}</p>
                        </td>
                        <td>{slip.payableDays}</td>
                        <td>{slip.lossOfPayDays}</td>
                        <td>
                          {bonusTotal > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              +{formatINR(bonusTotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">₹0</span>
                          )}
                        </td>
                        <td>{formatINR(slip.components?.totalDeductions ?? 0)}</td>
                        <td>
                          {!complete && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                              onClick={() => openAdjustmentModal(slip)}
                            >
                              Add Bonus / Adjust
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Link className="ops-link" to="/admin/employees">
            Open employee details
          </Link>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="font-semibold text-slate-900">Salary register</h3>
          <div className="overflow-x-auto">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Gross pay</th>
                  <th>Bonus / Incentive</th>
                  <th>EPF</th>
                  <th>PT</th>
                  <th>TDS</th>
                  <th>Net pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {effectivePayslips.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-slate-500">
                      No payslips found for this pay run.
                    </td>
                  </tr>
                ) : (
                  effectivePayslips.map((slip) => {
                    const bonusTotal = (slip.components?.bonus || 0) + (slip.components?.incentives || 0);
                    return (
                      <tr key={slip.id}>
                        <td>
                          <strong>{slip.employeeName}</strong>
                          <p className="ops-muted">{slip.employeeCode}</p>
                        </td>
                        <td>{formatINR(slip.components?.grossMonthly ?? 0)}</td>
                        <td>
                          {bonusTotal > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              +{formatINR(bonusTotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">₹0</span>
                          )}
                        </td>
                        <td>{formatINR(slip.components?.epfEmployee ?? 0)}</td>
                        <td>{formatINR(slip.components?.professionalTax ?? 0)}</td>
                        <td>{formatINR(slip.components?.tds ?? 0)}</td>
                        <td><strong>{formatINR(slip.components?.netMonthly ?? 0)}</strong></td>
                        <td>{(slip.paymentStatus || 'PAID').toLowerCase()}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="ops-link"
                              onClick={() => onView(slip)}
                              aria-label={`View payslip for ${slip.employeeName}`}
                            >
                              View
                            </button>
                            {!complete && (
                              <button
                                type="button"
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                onClick={() => openAdjustmentModal(slip)}
                              >
                                Adjust / Bonus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="font-semibold text-slate-900">{complete ? 'Payroll finalized' : 'Final review'}</h3>
          <p className="ops-muted">
            {run.totalEmployees} employees · {run.month} {run.year} · {formatINR(run.totalNetPay || 0)}
          </p>
          {complete ? (
            <p className="text-sm text-slate-700">
              Marked paid on {formatDate(run.disbursedAt)} by {run.disbursedBy || 'People operations'}.
            </p>
          ) : (
            <>
              <dl className="ops-definition">
                <dt>Missing bank details</dt>
                <dd>{banking.length}</dd>
                <dt>Invalid pay amounts</dt>
                <dd>{invalidPay.length}</dd>
                <dt>Pending corrections</dt>
                <dd>{loading ? 'Checking…' : corrections}</dd>
                <dt>Pending leave decisions</dt>
                <dd>{loading ? 'Checking…' : pending}</dd>
              </dl>
              {(banking.length > 0 || invalidPay.length > 0) && (
                <p role="alert" className="ops-status error">
                  Update employee details and regenerate the draft before finalizing:{' '}
                  {[...new Set([...banking, ...invalidPay].map((slip) => slip.employeeName))].join(', ')}.
                </p>
              )}
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                  className="mt-1 shrink-0"
                />
                I have reviewed attendance, leave decisions and salary adjustments.
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 shrink-0"
                />
                I confirm payments are complete and want to mark this payroll as paid.
              </label>
              <p className="ops-muted">
                This action records payment status and releases payslips. It does not send money to a bank.
              </p>
              <button
                type="button"
                className="ops-button"
                disabled={
                  saving ||
                  loading ||
                  error ||
                  !reviewed ||
                  !confirmed ||
                  banking.length > 0 ||
                  invalidPay.length > 0 ||
                  effectivePayslips.length === 0
                }
                onClick={onFinalize}
              >
                {saving ? 'Finalizing…' : 'Finalize and mark paid'}
              </button>
            </>
          )}
        </>
      )}

      <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          className="ops-button secondary"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>
        {step < 3 && (
          <button type="button" className="ops-button" onClick={() => setStep(step + 1)}>
            Continue to {stages[step + 1].toLowerCase()}
          </button>
        )}
      </div>

      {/* Bonus & Salary Adjustment Modal */}
      {adjustingSlip && (
        <Modal
          isOpen={Boolean(adjustingSlip)}
          onClose={() => setAdjustingSlip(null)}
          title={`Adjust Salary & Bonus: ${adjustingSlip.employeeName}`}
          subtitle={`${adjustingSlip.employeeCode} | ${adjustingSlip.designation || 'Staff'} | Pay Cycle: ${run.month} ${run.year}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {adjustmentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{adjustmentSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
              <div>
                <span className="text-[11px] text-slate-500 block">Base Basic Pay</span>
                <span className="font-semibold text-slate-900">{formatINR(adjustingSlip.components?.basic || 0)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Base HRA</span>
                <span className="font-semibold text-slate-900">{formatINR(adjustingSlip.components?.hra || 0)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Bonus Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(Math.max(0, Number(e.target.value)))}
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Festival bonus, performance bonus or one-time reward.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Incentive / Performance Pay (₹)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={incentivesAmount}
                onChange={(e) => setIncentivesAmount(Math.max(0, Number(e.target.value)))}
                placeholder="e.g. 2500"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Special Allowance (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={specialAmount}
                  onChange={(e) => setSpecialAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loss of Pay (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={lossOfPayDays}
                  onChange={(e) => setLossOfPayDays(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Adjustment Reason & Notes
              </label>
              <textarea
                rows={2}
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="e.g., Q3 Sales milestone bonus approved by management"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Live Calculation Summary */}
            {(() => {
              const basic = adjustingSlip.components?.basic || 0;
              const hra = adjustingSlip.components?.hra || 0;
              const conv = adjustingSlip.components?.conveyanceAllowance || 0;
              const med = adjustingSlip.components?.medicalAllowance || 0;
              const baseGross = basic + hra + conv + med + Number(specialAmount);
              const newGross = baseGross + Number(bonusAmount) + Number(incentivesAmount);
              const epf = adjustingSlip.components?.epfEmployee || 0;
              const pt = adjustingSlip.components?.professionalTax || 0;
              const tds = adjustingSlip.components?.tds || 0;
              const health = adjustingSlip.components?.healthInsurance || 0;
              const payableDays = Math.max(1, adjustingSlip.payableDays || 30);
              const lopDeduction = lossOfPayDays > 0 ? Math.round((baseGross / payableDays) * lossOfPayDays) : 0;
              const totalDed = epf + pt + tds + health + lopDeduction;
              const newNet = Math.max(0, newGross - totalDed);

              return (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>New Total Gross Pay:</span>
                    <span className="font-bold text-slate-900">{formatINR(newGross)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Deductions (Statutory + LOP):</span>
                    <span className="font-semibold text-slate-800">-{formatINR(totalDed)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-indigo-100 text-sm font-bold text-indigo-900">
                    <span>New Projected Net Pay:</span>
                    <span>{formatINR(newNet)}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustingSlip(null)}
                disabled={isSavingAdjustment}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAdjustment}
                isLoading={isSavingAdjustment}
              >
                Apply & Save Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
