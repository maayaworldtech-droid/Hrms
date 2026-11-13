import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { CompanySettings, PayrollRun, Payslip } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { PayslipView } from '@/components/payroll/PayslipView';
import { formatINR, formatDate } from '@/utils/formatters';
import { payslipWarnings, previewPayslip } from '@/utils/payroll';
import { ArrowLeft, Banknote, Printer, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { useCenters } from '@/hooks/useCenters';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** One row of the month table: the payslip plus the totals the columns sort by. */
type PayRow = Payslip & { monthlySalary: number; leaveDays: number; leaveDeduction: number; pf: number; otherDeductions: number; takeHome: number };

const toRow = (s: Payslip): PayRow => ({
  ...s,
  monthlySalary: s.fullMonthlySalary || 0,
  leaveDays: (s.paidLeaveDays || 0) + (s.unpaidLeaveDays || 0),
  // One day's salary for each unpaid leave or absent day only. Days before joining are not a
  // deduction: they simply are not paid, which "Paid days" shows.
  leaveDeduction: s.daysInMonth > 0 ? Math.round(((s.fullMonthlySalary || 0) * (s.lossOfPayDays || 0)) / s.daysInMonth) : 0,
  pf: s.components.epfEmployee || 0,
  // ESI, professional tax, income tax and anything else; PF has its own column
  otherDeductions: Math.max(0, (s.components.totalDeductions || 0) - (s.components.epfEmployee || 0)),
  takeHome: s.components.netMonthly || 0,
});

const EVERY_CENTER = '__every__';

const runStatus = (status: string) => (status === 'DISBURSED' ? { label: 'Paid', variant: 'success' as const } : { label: 'Draft', variant: 'warning' as const });

/** Last month by default: payroll is usually run after the month ends. */
const defaultPayMonth = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { month: MONTHS[d.getMonth()], year: d.getFullYear() };
};

export const PayrollProcessing: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  // Admins pay every center; a manager works out payroll for their own center only
  const isAdmin = activeRole === 'ADMIN';
  const ownCenter = isAdmin ? '' : String(user?.location || '');
  const { centerNames } = useCenters();
  const [centerFilter, setCenterFilter] = useState('ALL');
  const [newCenter, setNewCenter] = useState('');
  const [params, setParams] = useSearchParams();
  const openRunId = params.get('run');

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  const [slips, setSlips] = useState<Payslip[]>([]);
  const [slipsLoading, setSlipsLoading] = useState(false);
  const [needsLookOnly, setNeedsLookOnly] = useState(false);

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(defaultPayMonth().month);
  const [newYear, setNewYear] = useState(defaultPayMonth().year);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<Payslip | null>(null);
  const [adjusting, setAdjusting] = useState<Payslip | null>(null);
  const [adjust, setAdjust] = useState({ lossOfPayDays: 0, bonus: 0, tds: 0, otherDeductions: 0, notes: '' });
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);

  useEffect(() => {
    api.settings.get().then(setCompany).catch(() => setCompany(null));
  }, []);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      setRuns(await api.payroll.getRuns());
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const run = runs.find((r) => r.id === openRunId) || null;
  const isPaid = run?.status === 'DISBURSED';

  const loadSlips = useCallback(async (runId: string) => {
    setSlipsLoading(true);
    try {
      const list = await api.payroll.getPayslipsByRun(runId);
      setSlips([...list].sort((a, b) => (a.location || '').localeCompare(b.location || '') || a.employeeName.localeCompare(b.employeeName)));
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load payslips' }));
    } finally {
      setSlipsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (openRunId) void loadSlips(openRunId);
    else setSlips([]);
  }, [openRunId, loadSlips]);

  const openRun = (id: string) => setParams({ run: id });
  const backToList = () => setParams({});

  // ---------------- run payroll
  const dialogCenter = isAdmin ? newCenter : ownCenter;
  const existing = dialogCenter && dialogCenter !== EVERY_CENTER ? runs.find((r) => r.month === newMonth && r.year === newYear && (r.center || '') === dialogCenter) : undefined;
  const yearValid = Number.isInteger(newYear) && newYear >= 2000 && newYear <= 2100;

  const generate = async (month: string, year: number, center: string) => {
    setSaving(true);
    try {
      if (center === EVERY_CENTER) {
        // One payroll per center, so each can be checked and paid on its own
        const paidAlready = new Set(runs.filter((r) => r.month === month && r.year === year && r.status === 'DISBURSED').map((r) => r.center));
        const done: string[] = [];
        const skipped: string[] = [];
        for (const name of centerNames) {
          if (paidAlready.has(name)) {
            skipped.push(`${name} (already paid)`);
            continue;
          }
          try {
            await api.payroll.createRun(month, year, name);
            done.push(name);
          } catch (err: any) {
            skipped.push(`${name} (${err?.message || 'failed'})`);
          }
        }
        dispatch(
          addToast({
            type: done.length ? 'success' : 'error',
            title: done.length ? `${month} ${year} worked out for ${done.length} center${done.length === 1 ? '' : 's'}` : 'Nothing was worked out',
            message: skipped.length ? `Skipped: ${skipped.join(', ')}.` : 'Open each center to check it.',
          })
        );
        setRunDialogOpen(false);
        await loadRuns();
        return;
      }
      const created = await api.payroll.createRun(month, year, center || undefined);
      dispatch(addToast({ type: 'success', title: `${created.center || center}: ${month} ${year} worked out`, message: `${created.totalEmployees} people. Check the leaves, then mark as paid.` }));
      setRunDialogOpen(false);
      await loadRuns();
      openRun(created.id);
      void loadSlips(created.id);
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not work out payroll', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- adjust one person
  const openAdjust = (slip: Payslip) => {
    setAdjusting(slip);
    setAdjust({
      lossOfPayDays: slip.lossOfPayDays,
      bonus: (slip.components.bonus || 0) + (slip.components.incentives || 0),
      tds: slip.components.tds || 0,
      otherDeductions: slip.otherDeductions || 0,
      notes: slip.components.adjustmentNotes || '',
    });
  };
  const preview = adjusting ? previewPayslip(adjusting, adjust) : null;

  const saveAdjust = async () => {
    if (!adjusting) return;
    setSaving(true);
    try {
      const updated = await api.payroll.adjustPayslip(adjusting.id, adjust);
      setSlips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setAdjusting(null);
      dispatch(addToast({ type: 'success', title: 'Saved', message: `${updated.employeeName} now takes home ${formatINR(updated.components.netMonthly)}.` }));
      void loadRuns();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not save', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- mark as paid
  const blockers = slips.filter((s) => (!s.bankAccount?.trim() || !s.bankName?.trim()) && s.components.netMonthly > 0);
  const markPaid = async () => {
    if (!run) return;
    setSaving(true);
    try {
      await api.payroll.disburseRun(run.id, user?.name || 'Admin');
      dispatch(addToast({ type: 'success', title: `${run.month} ${run.year} marked as paid`, message: 'Staff can now see their payslips.' }));
      setPayDialogOpen(false);
      setConfirmPaid(false);
      await loadRuns();
      void loadSlips(run.id);
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not mark as paid', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const flagged = useMemo(() => slips.filter((s) => payslipWarnings(s).length > 0 || s.lossOfPayDays > 0), [slips]);
  const totalUnpaidDays = slips.reduce((sum, s) => sum + s.lossOfPayDays, 0);
  const shownSlips = needsLookOnly ? flagged : slips;

  // =====================================================================================
  // One month
  // =====================================================================================
  if (openRunId) {
    const money = (v: number) => <span className="whitespace-nowrap tabular-nums">{formatINR(v)}</span>;
    const columns: Column<PayRow>[] = [
      { key: 'employeeCode', header: 'Emp ID', sortable: true, render: (s) => <span className="whitespace-nowrap tabular-nums text-slate-900">{s.employeeCode}</span> },
      { key: 'employeeName', header: 'Name', sortable: true, render: (s) => <span className="whitespace-nowrap font-medium text-slate-900">{s.employeeName}</span> },
      { key: 'monthlySalary', header: 'Monthly salary', sortable: true, align: 'right', render: (s) => money(s.monthlySalary) },
      { key: 'workedDays', header: 'Working days', sortable: true, align: 'right', render: (s) => s.workedDays },
      { key: 'leaveDays', header: 'Leaves', sortable: true, align: 'right', render: (s) => s.leaveDays },
      { key: 'payableDays', header: 'Paid days', sortable: true, align: 'right', render: (s) => s.payableDays },
      { key: 'leaveDeduction', header: 'Leave deduction', sortable: true, align: 'right', render: (s) => money(s.leaveDeduction) },
      { key: 'pf', header: 'PF', sortable: true, align: 'right', render: (s) => money(s.pf) },
      { key: 'otherDeductions', header: 'Other deductions', sortable: true, align: 'right', render: (s) => money(s.otherDeductions) },
      { key: 'takeHome', header: 'Take-home', sortable: true, align: 'right', render: (s) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatINR(s.takeHome)}</span> },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (s) => (
          <div className="flex justify-end gap-1">
            {!isPaid && (isAdmin || s.employeeId !== String(user?.id)) && (
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  openAdjust(s);
                }}
              >
                Adjust
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setViewing(s);
              }}
            >
              Payslip
            </Button>
          </div>
        ),
      },
    ];

    return (
      <div className="space-y-6">
        <PageHeader
          title={run ? `${run.center ? `${run.center} · ` : ''}${run.month} ${run.year}` : 'Payroll'}
          description={
            run ? (
              isPaid ? (
                `Paid on ${formatDate(run.disbursedAt)}${run.disbursedBy ? ` by ${run.disbursedBy}` : ''}. Staff can see their payslips.`
              ) : (
                isAdmin
                  ? 'Draft. Working days and leaves come from attendance. Check them, then mark the month as paid.'
                  : 'Draft. Working days and leaves come from attendance. Check them; the admin marks the month as paid.'
              )
            ) : undefined
          }
          actions={
            <>
              <Button variant="ghost" onClick={backToList} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                All months
              </Button>
              {run && !isPaid && (
                <>
                  <Button variant="outline" isLoading={saving && !payDialogOpen} onClick={() => generate(run.month, run.year, run.center || '')}>
                    Recalculate
                  </Button>
                  {isAdmin && (
                    <Button onClick={() => setPayDialogOpen(true)} disabled={slips.length === 0}>
                      Mark as paid
                    </Button>
                  )}
                </>
              )}
            </>
          }
        />

        {run && (
          <StatTiles columns={4} aria-label="Month totals">
            <StatTile label="People" value={run.totalEmployees} />
            <StatTile label="Earned" value={formatINR(run.totalGrossPay)} hint={totalUnpaidDays > 0 ? `After ${totalUnpaidDays} unpaid day${totalUnpaidDays === 1 ? '' : 's'}` : 'No unpaid days'} />
            <StatTile label="Deductions" value={formatINR(run.totalDeductions)} hint="PF, ESI, professional tax and others" />
            <StatTile label="Take-home to pay" value={formatINR(run.totalNetPay)} tone="brand" />
          </StatTiles>
        )}

        {!isPaid && slips.some((s) => s.legacyCalculation) && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-sm text-rose-800">
              This draft was made with the old calculation, which ignored attendance and leave. Recalculate it before paying.
            </p>
            <Button size="sm" isLoading={saving} onClick={() => run && generate(run.month, run.year, run.center || '')}>
              Recalculate now
            </Button>
          </div>
        )}

        {!isPaid && flagged.length > 0 && !slips.some((s) => s.legacyCalculation) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {flagged.length} {flagged.length === 1 ? 'person needs' : 'people need'} a look: unpaid days, no check-ins or missing bank details.
            </p>
            <Button variant="outline" size="sm" onClick={() => setNeedsLookOnly((v) => !v)}>
              {needsLookOnly ? 'Show everyone' : 'Show only these'}
            </Button>
          </div>
        )}

        <DataTable
          key={`${openRunId}:${needsLookOnly}`}
          data={shownSlips.map(toRow)}
          columns={columns}
          isLoading={slipsLoading || (isLoading && !run)}
          searchPlaceholder="Search by name, ID or center"
          pageSize={25}
          exportFileName={run ? `salary-${run.month}-${run.year}` : 'salary'}
          onRowClick={setViewing}
          mobileRender={(s) => (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  {s.employeeName} <span className="font-normal text-slate-600">· {s.employeeCode}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{formatINR(s.takeHome)}</span>
              </div>
              <p className="text-sm text-slate-700 tabular-nums">
                {s.payableDays} of {s.daysInMonth} days paid · {s.leaveDays} leaves · {formatINR(s.leaveDeduction)} leave deduction · {formatINR(s.pf)} PF
              </p>
              {payslipWarnings(s).length > 0 && <p className="text-xs font-medium text-amber-800">{payslipWarnings(s).join(' · ')}</p>}
              <div className="flex gap-2 pt-1">
                {!isPaid && (isAdmin || s.employeeId !== String(user?.id)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdjust(s);
                    }}
                  >
                    Adjust
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewing(s);
                  }}
                >
                  Payslip
                </Button>
              </div>
            </div>
          )}
          emptyTitle={needsLookOnly ? 'Nothing needs a look' : 'No payslips in this month'}
          emptyDescription={needsLookOnly ? 'Everyone has full pay and complete details.' : 'Recalculate to include current staff.'}
        />

        {/* Adjust one person */}
        <Modal
          isOpen={Boolean(adjusting)}
          onClose={() => setAdjusting(null)}
          title={adjusting ? adjusting.employeeName : 'Adjust'}
          subtitle={adjusting ? `${adjusting.employeeCode} · ${run?.month} ${run?.year}` : undefined}
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setAdjusting(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveAdjust} isLoading={saving}>
                Save
              </Button>
            </>
          }
        >
          {adjusting && preview && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                From attendance: {adjusting.workedDays} worked · {adjusting.paidLeaveDays + adjusting.unpaidLeaveDays} leave · {adjusting.absentDays} absent
                {adjusting.employedDays < adjusting.daysInMonth ? ` · joined ${adjusting.daysInMonth - adjusting.employedDays} days into the month` : ''}
              </p>
              {adjusting.noAttendance && <p className="text-sm font-medium text-amber-800">No check-ins this month. Confirm unpaid days with their manager.</p>}

              <Input
                label="Unpaid days"
                type="number"
                inputMode="numeric"
                min={0}
                max={adjusting.employedDays}
                step={1}
                value={adjust.lossOfPayDays}
                onChange={(e) => setAdjust({ ...adjust, lossOfPayDays: Math.max(0, Math.min(adjusting.employedDays, Math.round(Number(e.target.value) || 0))) })}
                helperText={
                  adjust.lossOfPayDays === adjusting.suggestedLopDays ? (
                    'As worked out from attendance.'
                  ) : (
                    <>
                      Attendance says {adjusting.suggestedLopDays}.{' '}
                      <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setAdjust({ ...adjust, lossOfPayDays: adjusting.suggestedLopDays })}>
                        Use that
                      </button>
                    </>
                  )
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bonus (₹)" type="number" inputMode="numeric" min={0} value={adjust.bonus} onChange={(e) => setAdjust({ ...adjust, bonus: Math.max(0, Number(e.target.value) || 0) })} />
                <Input
                  label="Advance or deduction (₹)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={adjust.otherDeductions}
                  onChange={(e) => setAdjust({ ...adjust, otherDeductions: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>

              <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-700">Take-home</span>
                <span className="text-right">
                  <span className="block text-base font-semibold tabular-nums text-slate-900">{formatINR(preview.takeHome)}</span>
                  {preview.takeHome !== (adjusting.components.netMonthly || 0) && (
                    <span className="block text-xs tabular-nums text-slate-600">was {formatINR(adjusting.components.netMonthly || 0)}</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </Modal>

        {/* Mark as paid */}
        <Modal
          isOpen={payDialogOpen}
          onClose={() => {
            setPayDialogOpen(false);
            setConfirmPaid(false);
          }}
          title={run ? `Mark ${run.center ? `${run.center}, ` : ''}${run.month} ${run.year} as paid?` : 'Mark as paid?'}
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={markPaid} isLoading={saving} disabled={!confirmPaid || blockers.length > 0}>
                Mark as paid
              </Button>
            </>
          }
        >
          {run && (
            <div className="space-y-4">
              <p>
                {formatINR(run.totalNetPay)} to {run.totalEmployees} people. Staff will see their payslips, and this month can no longer be changed.
              </p>
              {blockers.length > 0 ? (
                <p role="alert" className="text-rose-700">
                  Add bank details first for: {blockers.map((s) => s.employeeName).join(', ')}.
                </p>
              ) : (
                <label className="flex items-start gap-3 text-slate-800">
                  <input type="checkbox" className="mt-0.5" checked={confirmPaid} onChange={(e) => setConfirmPaid(e.target.checked)} />
                  The salaries have been sent from the bank.
                </label>
              )}
              <p className="text-xs text-slate-600">This app records the payment. It does not move money.</p>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={Boolean(viewing)}
          onClose={() => setViewing(null)}
          title={viewing ? viewing.employeeName : 'Payslip'}
          size="lg"
          printable
          footer={
            <>
              <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
                Print or save PDF
              </Button>
              <Button onClick={() => setViewing(null)}>Done</Button>
            </>
          }
        >
          {viewing && <PayslipView slip={viewing} company={company} />}
        </Modal>
      </div>
    );
  }

  // =====================================================================================
  // All months
  // =====================================================================================
  const visibleRuns = isAdmin && centerFilter !== 'ALL' ? runs.filter((r) => (r.center || '') === centerFilter) : runs;

  const runColumns: Column<PayrollRun>[] = [
    {
      key: 'month',
      header: 'Month',
      render: (r) => (
        <span className="font-medium text-slate-900">
          {r.month} {r.year}
        </span>
      ),
    },
    ...(isAdmin ? [{ key: 'center', header: 'Center', render: (r: PayrollRun) => r.center || <span className="text-slate-600">All centers (old)</span> } as Column<PayrollRun>] : []),
    { key: 'totalEmployees', header: 'People', align: 'right', render: (r) => r.totalEmployees },
    { key: 'totalNetPay', header: 'Take-home paid', align: 'right', render: (r) => <span className="font-medium text-slate-900">{formatINR(r.totalNetPay)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const st = runStatus(r.status);
        return (
          <Badge variant={st.variant} size="sm" dot>
            {st.label}
            {r.status === 'DISBURSED' && r.disbursedAt ? ` · ${formatDate(r.disbursedAt)}` : ''}
          </Badge>
        );
      },
    },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (r) => (
        <Button variant={r.status === 'DISBURSED' ? 'ghost' : 'outline'} size="xs" onClick={() => openRun(r.id)}>
          {r.status === 'DISBURSED' ? 'View' : 'Continue'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description={
          isAdmin
            ? "Each center's salary is worked out from attendance and leave, checked, then marked as paid."
            : `Salary for ${ownCenter || 'your center'}, worked out from attendance and leave. The admin marks each month as paid.`
        }
        actions={
          <>
            {isAdmin && (
              <select
                aria-label="Filter by center"
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              >
                <option value="ALL">All centers</option>
                {centerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <Button
              onClick={() => {
                if (isAdmin) setNewCenter(centerFilter !== 'ALL' ? centerFilter : '');
                setRunDialogOpen(true);
              }}
              leftIcon={<Banknote className="h-4 w-4" />}
              disabled={!isAdmin && !ownCenter}
            >
              Run payroll
            </Button>
          </>
        }
      />

      {loadError ? (
        <EmptyState tone="danger" title="Could not load payroll" actionLabel="Try again" onAction={loadRuns} />
      ) : (
        <DataTable
          key={centerFilter}
          data={visibleRuns}
          columns={runColumns}
          isLoading={isLoading}
          searchPlaceholder="Search by month or year"
          onRowClick={(r) => openRun(r.id)}
          emptyTitle="No payroll yet"
          emptyDescription="Run payroll for last month to get started."
        />
      )}

      <Modal
        isOpen={runDialogOpen}
        onClose={() => setRunDialogOpen(false)}
        title="Run payroll"
        subtitle="Works out pay from salary, attendance and leave for one center. Nothing is paid yet."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              Cancel
            </Button>
            {existing && existing.status !== 'DISBURSED' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setRunDialogOpen(false);
                  openRun(existing.id);
                }}
              >
                Open the draft
              </Button>
            ) : null}
            <Button isLoading={saving} disabled={!yearValid || !dialogCenter || existing?.status === 'DISBURSED'} onClick={() => generate(newMonth, newYear, dialogCenter)}>
              {existing && existing.status !== 'DISBURSED' ? 'Start again' : 'Work out pay'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isAdmin ? (
            <Select
              label="Center"
              required
              placeholder="Choose a center"
              value={newCenter}
              onChange={(e) => setNewCenter(e.target.value)}
              options={[...centerNames.map((name) => ({ value: name, label: name })), { value: EVERY_CENTER, label: 'Every center (one payroll each)' }]}
            />
          ) : (
            <p className="text-slate-700">
              Center: <span className="font-medium text-slate-900">{ownCenter || 'Not assigned'}</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} options={MONTHS.map((m) => ({ value: m, label: m }))} />
            <Input label="Year" type="number" min={2000} max={2100} value={newYear} onChange={(e) => setNewYear(Number(e.target.value))} error={yearValid ? undefined : 'Enter a valid year'} />
          </div>
          {existing?.status === 'DISBURSED' ? (
            <p className="text-rose-700">
              {newMonth} {newYear} is already paid.
            </p>
          ) : existing ? (
            <p className="text-amber-800">A draft for this month exists. Starting again recalculates everyone and removes changes made to it.</p>
          ) : (
            <p className="text-slate-600">Best run after the month ends, once managers have approved leave and attendance corrections.</p>
          )}
        </div>
      </Modal>
    </div>
  );
};
