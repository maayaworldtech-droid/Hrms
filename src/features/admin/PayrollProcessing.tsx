import { PayrollReview } from '@/components/common/PayrollReview';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { CompanySettings, PayrollRun, Payslip } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';
import { PageHeader } from '@/components/common/PageHeader';
import { formatINR, formatDate, numberToIndianWords, formatLabel } from '@/utils/formatters';
import { Banknote, Printer } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const runVariant = (status: string) => (status === 'DISBURSED' ? 'success' : status === 'APPROVED' ? 'info' : 'warning');

const SlipRow: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
    <span>{label}</span>
    <span className="tabular-nums">{formatINR(value)}</span>
  </div>
);

export const PayrollProcessing: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  // Company name, address and tax ID on payslips come from Settings, never hardcoded
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(() => new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Kolkata' }));
  const [newRunYear, setNewRunYear] = useState(() => Number(new Date().toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' })));

  useEffect(() => {
    api.settings.get().then(setCompany).catch(() => setCompany(null));
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.payroll.getRuns();
      setRuns(data);
      setSelectedRun((prev) => (prev ? data.find((r) => r.id === prev.id) || prev : null));
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load payroll' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const yearValid = Number.isInteger(newRunYear) && newRunYear >= 2000 && newRunYear <= 2100;
  const finalizedAlready = runs.some((run) => run.month === newRunMonth && run.year === newRunYear && run.status === 'DISBURSED');
  const draftExists = runs.some((run) => run.month === newRunMonth && run.year === newRunYear && run.status !== 'DISBURSED');

  const handleCreateRun = async () => {
    if (saving || !yearValid || finalizedAlready) return;
    setSaving(true);
    try {
      const run = await api.payroll.createRun(newRunMonth, newRunYear);
      dispatch(addToast({ type: 'success', title: 'Payroll draft ready', message: `${newRunMonth} ${newRunYear} for ${run.totalEmployees} employees.` }));
      setIsRunModalOpen(false);
      setSelectedRun(run);
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not generate payroll', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDisburse = async (runId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.payroll.disburseRun(runId, user?.name || 'People operations');
      dispatch(addToast({ type: 'success', title: 'Payroll finalized', message: 'Payslips are now visible to employees.' }));
      setSelectedRun(null);
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not finalize payroll', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<PayrollRun>[] = [
    {
      key: 'month',
      header: 'Pay month',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">
            {row.month} {row.year}
          </div>
          <div className="text-xs text-slate-600">Generated {formatDate(row.processedAt)}</div>
        </div>
      ),
    },
    { key: 'totalEmployees', header: 'Employees', sortable: true, align: 'right', render: (row) => row.totalEmployees },
    { key: 'totalGrossPay', header: 'Gross', sortable: true, align: 'right', render: (row) => formatINR(row.totalGrossPay) },
    { key: 'totalDeductions', header: 'Deductions', sortable: true, align: 'right', render: (row) => formatINR(row.totalDeductions) },
    { key: 'totalNetPay', header: 'Net pay', sortable: true, align: 'right', render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.totalNetPay)}</span> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={runVariant(row.status)} size="sm" dot>
          {row.status === 'DISBURSED' ? 'Paid' : formatLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant={row.status === 'DISBURSED' ? 'ghost' : 'outline'} size="xs" onClick={() => setSelectedRun(row)}>
          {row.status === 'DISBURSED' ? 'View' : 'Review'}
        </Button>
      ),
    },
  ];

  const slip = selectedPayslip;
  const companyName = company?.legalEntityName || company?.companyName || 'Maaya World';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Generate the monthly draft, review adjustments, then mark the month as paid."
        actions={
          <Button onClick={() => setIsRunModalOpen(true)} leftIcon={<Banknote className="h-4 w-4" />}>
            Run payroll
          </Button>
        }
      />

      <DataTable
        data={runs}
        columns={columns}
        searchPlaceholder="Search by month or year"
        exportFileName="maaya_payroll_cycles"
        isLoading={isLoading}
        onRowClick={setSelectedRun}
        emptyTitle="No payroll runs yet"
        emptyDescription="Run payroll to generate the first monthly draft."
      />

      <Modal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        title="Run payroll"
        subtitle="Creates a draft from salary records. Nothing is paid until you finalize."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={saving} disabled={!yearValid || finalizedAlready} onClick={handleCreateRun}>
              {draftExists ? 'Regenerate draft' : 'Generate draft'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={newRunMonth} onChange={(e) => setNewRunMonth(e.target.value)} options={MONTHS.map((m) => ({ value: m, label: m }))} />
            <Input
              label="Year"
              type="number"
              min={2000}
              max={2100}
              value={newRunYear}
              onChange={(e) => setNewRunYear(Number(e.target.value))}
              error={yearValid ? undefined : 'Enter a year between 2000 and 2100'}
            />
          </div>
          {finalizedAlready ? (
            <p className="text-sm text-rose-700">
              {newRunMonth} {newRunYear} is already paid and cannot be regenerated.
            </p>
          ) : draftExists ? (
            <p className="text-sm text-amber-800">
              A draft for {newRunMonth} {newRunYear} exists. Generating again replaces it, including any adjustments.
            </p>
          ) : (
            <p className="text-sm text-slate-600">Review attendance, loss of pay and adjustments before you finalize.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(selectedRun)}
        onClose={() => setSelectedRun(null)}
        title={selectedRun ? `Payroll · ${selectedRun.month} ${selectedRun.year}` : 'Payroll'}
        subtitle={selectedRun ? `${selectedRun.totalEmployees} employees · ${selectedRun.status === 'DISBURSED' ? 'Paid' : formatLabel(selectedRun.status)}` : undefined}
        size="2xl"
      >
        {selectedRun && (
          <PayrollReview
            key={selectedRun.id}
            run={selectedRun}
            saving={saving}
            onFinalize={() => handleDisburse(selectedRun.id)}
            onView={setSelectedPayslip}
            onRunUpdated={() => void loadData()}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(slip)}
        onClose={() => setSelectedPayslip(null)}
        title={slip ? `Payslip · ${slip.month} ${slip.year}` : 'Payslip'}
        subtitle={slip ? `${slip.employeeName} · ${slip.employeeCode}` : undefined}
        size="lg"
        printable
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
              Print or save PDF
            </Button>
            <Button onClick={() => setSelectedPayslip(null)}>Done</Button>
          </>
        }
      >
        {slip && (
          <div className="space-y-5 text-sm text-slate-800">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <img src={maayaLogo} alt="" className="h-7 w-auto object-contain" />
                <p className="mt-2 font-semibold text-slate-900">{companyName}</p>
                {company?.registeredAddress && <p className="mt-0.5 max-w-sm text-xs text-slate-600">{company.registeredAddress}</p>}
                {company?.corporateTaxId && <p className="mt-0.5 text-xs tabular-nums text-slate-600">GSTIN / PAN {company.corporateTaxId}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {slip.month} {slip.year}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-slate-600">Ref {slip.id}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {(
                [
                  ['Employee', slip.employeeName],
                  ['Employee ID', slip.employeeCode],
                  ['Center', slip.location || 'Not recorded'],
                  ['Payable days', String(slip.payableDays ?? '--')],
                  ['Bank', slip.bankName],
                  ['Account', slip.bankAccount],
                  ['PAN', slip.panNumber],
                  ['UAN', slip.uanNumber || 'Not applicable'],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-medium tabular-nums text-slate-900">{value || 'Not provided'}</dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="border-b border-slate-200 pb-1.5 font-semibold text-slate-900">Earnings</h3>
                <div className="divide-y divide-slate-100">
                  <SlipRow label="Basic salary" value={slip.components?.basic || 0} />
                  <SlipRow label="House rent allowance" value={slip.components?.hra || 0} />
                  <SlipRow label="Special allowance" value={slip.components?.specialAllowance || 0} />
                  {(slip.components?.conveyanceAllowance || 0) > 0 && <SlipRow label="Conveyance allowance" value={slip.components.conveyanceAllowance} />}
                  {(slip.components?.medicalAllowance || 0) > 0 && <SlipRow label="Medical allowance" value={slip.components.medicalAllowance} />}
                  {(slip.components?.bonus || 0) > 0 && <SlipRow label="Bonus" value={slip.components.bonus || 0} />}
                  {(slip.components?.incentives || 0) > 0 && <SlipRow label="Incentives" value={slip.components.incentives || 0} />}
                  <SlipRow label="Gross earnings" value={slip.components?.grossMonthly || 0} strong />
                </div>
              </div>
              <div>
                <h3 className="border-b border-slate-200 pb-1.5 font-semibold text-slate-900">Deductions</h3>
                <div className="divide-y divide-slate-100">
                  <SlipRow label="Provident fund" value={slip.components?.epfEmployee || 0} />
                  <SlipRow label="Professional tax" value={slip.components?.professionalTax || 0} />
                  {(slip.components?.healthInsurance || 0) > 0 && <SlipRow label="Health insurance" value={slip.components.healthInsurance} />}
                  {(slip.components?.tds || 0) > 0 && <SlipRow label="Income tax (TDS)" value={slip.components.tds} />}
                  <SlipRow label="Total deductions" value={slip.components?.totalDeductions || 0} strong />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-slate-600">Net pay</p>
                <p className="text-xl font-semibold tabular-nums text-slate-900">{formatINR(slip.components?.netMonthly || 0)}</p>
                <p className="mt-0.5 text-xs text-slate-600">{numberToIndianWords(slip.components?.netMonthly || 0)}</p>
              </div>
              <Badge variant={slip.paymentStatus === 'PAID' ? 'success' : 'warning'} dot>
                {slip.paymentStatus === 'PAID' ? 'Paid' : formatLabel(slip.paymentStatus)}
                {slip.paymentMode ? ` · ${slip.paymentMode}` : ''}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
