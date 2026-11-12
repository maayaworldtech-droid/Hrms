import { PayrollReview } from '@/components/common/PayrollReview';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { CompanySettings, PayrollRun, Payslip } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatINR, formatDate, numberToIndianWords, formatLabel } from '@/utils/formatters';
import  { Banknote, Printer, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';
import { PageHeader } from '@/components/common/PageHeader';

export const PayrollProcessing: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [saving, setSaving] = useState(false);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  // Company name, address and tax ID on payslips come from Settings, never hardcoded
  const [company, setCompany] = useState<CompanySettings | null>(null);
  useEffect(() => {
    api.settings.get().then(setCompany).catch(() => setCompany(null));
  }, []);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(() => new Date().toLocaleDateString('en-US', {month: 'long', timeZone: 'Asia/Kolkata'}));
  const [newRunYear, setNewRunYear] = useState(() => Number(new Date().toLocaleDateString('en-US', {year: 'numeric', timeZone: 'Asia/Kolkata'})));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.payroll.getRuns();
      setRuns(data);
      setSelectedRun((prev) => (prev ? data.find((r) => r.id === prev.id) || prev : null));
    } catch { dispatch(addToast({ type: 'error', title: 'Could not load payroll' })); } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleCreateRun = async () => {
    if (saving || !Number.isInteger(newRunYear) || newRunYear < 2000 || newRunYear > 2100) return;
    if (runs.some(run => run.month === newRunMonth && run.year === newRunYear && run.status === 'DISBURSED')) {
      dispatch(addToast({ type: 'error', title: 'This pay cycle is already finalized', message: 'Choose another month or year.' })); return;
    }
    setSaving(true);
    try {
      const run = await api.payroll.createRun(newRunMonth, newRunYear);
      dispatch(
        addToast({
          type: 'success',
          title: 'Payroll Register Generated',
          message: `Created salary draft for ${newRunMonth} ${newRunYear} (${run.totalEmployees} employees)`,
        })
      );
      setIsRunModalOpen(false);
      setSelectedRun(run); setIsRegisterModalOpen(true);
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Generation failed' }));
    } finally { setSaving(false); }
  };

  const handleDisburse = async (runId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.payroll.disburseRun(runId, user?.name || 'People operations');
      dispatch(
        addToast({
          type: 'success',
          title: 'Payroll finalized',
          message: 'Payment status recorded. Employee payslips are now available.',
        })
      );
      setIsRegisterModalOpen(false);
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Finalization failed' }));
    } finally { setSaving(false); }
  };

  const columns: Column<PayrollRun>[] = [
    {
      key: 'month',
      header: 'Pay cycle',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">{row.month} {row.year}</span>
            <div className="text-xs text-slate-500">Processed: {formatDate(row.processedAt)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'totalEmployees',
      header: 'Employees',
      sortable: true,
      render: (row) => `${row.totalEmployees} staff`,
    },
    {
      key: 'totalGrossPay',
      header: 'Total gross pay',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">{formatINR(row.totalGrossPay)}</span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Total deductions',
      sortable: true,
      render: (row) => (
        <span className="text-slate-700 tabular-nums">{formatINR(row.totalDeductions)}</span>
      ),
    },
    {
      key: 'totalNetPay',
      header: 'Net payout',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900 tabular-nums">{formatINR(row.totalNetPay)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === 'DISBURSED'
              ? 'success'
              : row.status === 'APPROVED'
              ? 'info'
              : 'warning'
          }
          size="sm"
          dot
        >
          {formatLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRun(row);
              setIsRegisterModalOpen(true);
            }}
            className="!py-1 !px-2.5 text-xs text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200"
          >
            Review register
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Work out monthly salaries, review payslips, then mark the month as paid."
        actions={
          <Button variant="primary" onClick={() => setIsRunModalOpen(true)} leftIcon={<Banknote className="w-4 h-4" />}>
            Run payroll
          </Button>
        }
      />

      {/* Main Runs Table */}
      <DataTable
        data={runs}
        columns={columns}
        searchPlaceholder="Search payroll by month or year..."
        exportFileName="maaya_payroll_cycles"
        isLoading={isLoading}
      />

      {/* Run New Payroll Modal */}
      <Modal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        title="Initialize New Payroll Run"
        subtitle="Generate a draft from employee salary records, then review attendance and payroll amounts."
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pay cycle month</label>
            <select
              value={newRunMonth}
              onChange={(e) => setNewRunMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-600"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
                (m) => (
                  <option key={m} value={m}>{m}</option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fiscal year</label>
            <input
              type="number"
              value={newRunYear}
              onChange={(e) => setNewRunYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-brand-600"
            />
          </div>

          <p className="ops-muted">Generate a draft first. Review attendance, loss of pay, salary components and banking before finalizing. Generating again replaces an existing unfinalized draft for the selected month.</p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={saving || !Number.isInteger(newRunYear) || newRunYear < 2000 || newRunYear > 2100} onClick={handleCreateRun}>
              Generate payroll draft
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Register Modal */}
      {selectedRun && (
        <Modal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          title={`Salary Register: ${selectedRun.month} ${selectedRun.year}`}
          subtitle={`${selectedRun.totalEmployees} employees | Status: ${formatLabel(selectedRun.status)}`}
          size="2xl"
        >
          <PayrollReview
            key={selectedRun.id}
            run={selectedRun}
            saving={saving}
            onFinalize={() => handleDisburse(selectedRun.id)}
            onView={(slip) => {
              setSelectedPayslip(slip);
              setIsPayslipModalOpen(true);
            }}
            onRunUpdated={() => {
              void loadData();
            }}
          />
        </Modal>
      )}

      {/* Individual Payslip Viewer / Printable Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          title={`Payslip: ${selectedPayslip.month} ${selectedPayslip.year}`}
          subtitle={`${selectedPayslip.employeeName} (${selectedPayslip.employeeCode})`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-800 p-2">
            {/* Header Document Brand */}
            <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-auto flex items-center justify-center">
                    <img src={maayaLogo} alt="Maaya World" className="h-7 w-auto object-contain" />
                  </div>
                  <span className="text-base font-bold text-slate-900">{company?.legalEntityName || company?.companyName || 'Maaya World'}</span>
                </div>
                {company?.registeredAddress && (
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">{company.registeredAddress}</p>
                )}
                {company?.corporateTaxId && (
                  <p className="text-xs text-slate-500 tabular-nums mt-0.5">GSTIN / PAN: {company.corporateTaxId}</p>
                )}
              </div>
              <div className="text-right">
                <Badge variant="neutral" size="md">Payslip</Badge>
                <div className="text-xs font-bold text-slate-900 mt-1.5">{selectedPayslip.month} {selectedPayslip.year}</div>
                <span className="text-xs text-slate-500 tabular-nums">Ref: {selectedPayslip.id}</span>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="text-slate-500">Employee Name:</span> <strong className="text-slate-900">{selectedPayslip.employeeName}</strong></div>
              <div><span className="text-slate-500">Employee ID:</span> <strong className="tabular-nums text-slate-900">{selectedPayslip.employeeCode}</strong></div>
              <div><span className="text-slate-500">Center:</span> <strong className="text-slate-900">{selectedPayslip.location || 'Not recorded'}</strong></div>
              <div><span className="text-slate-500">Company:</span> <span className="text-slate-800">Maaya World</span></div>
              <div><span className="text-slate-500">Bank Account:</span> <span className="tabular-nums text-slate-800">{selectedPayslip.bankAccount}</span></div>
              <div><span className="text-slate-500">Bank Name:</span> <span className="text-slate-800">{selectedPayslip.bankName}</span></div>
              <div><span className="text-slate-500">PAN Number:</span> <span className="tabular-nums text-slate-800">{selectedPayslip.panNumber}</span></div>
              <div><span className="text-slate-500">UAN (EPFO):</span> <span className="tabular-nums text-slate-800">{selectedPayslip.uanNumber}</span></div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Earnings component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Basic salary</span><span className="tabular-nums">{formatINR(selectedPayslip.components?.basic || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>House rent allowance</span><span className="tabular-nums">{formatINR(selectedPayslip.components?.hra || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>Special allowance</span><span className="tabular-nums">{formatINR(selectedPayslip.components?.specialAllowance || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>Conveyance allowance</span><span className="tabular-nums">{formatINR(selectedPayslip.components?.conveyanceAllowance || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>Medical allowance</span><span className="tabular-nums">{formatINR(selectedPayslip.components?.medicalAllowance || 0)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Gross Earnings (A)</span>
                    <span className="tabular-nums">{formatINR(selectedPayslip.components?.grossMonthly || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Deductions component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Provident Fund (EPF)</span><span className="tabular-nums text-slate-700">{formatINR(selectedPayslip.components?.epfEmployee || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>Professional Tax (PT)</span><span className="tabular-nums text-slate-700">{formatINR(selectedPayslip.components?.professionalTax || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>Health insurance</span><span className="tabular-nums text-slate-700">{formatINR(selectedPayslip.components?.healthInsurance || 0)}</span></div>
                  <div className="flex justify-between pt-1"><span>TDS / Income Tax</span><span className="tabular-nums text-slate-700">{formatINR(selectedPayslip.components?.tds || 0)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Total Deductions (B)</span>
                    <span className="tabular-nums text-slate-700">{formatINR(selectedPayslip.components?.totalDeductions || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Payable */}
            <div className="p-4 rounded-xl bg-brand-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs">Net amount credited</span>
                <p className="text-xl font-bold tabular-nums text-white mt-0.5">
                  {formatINR(selectedPayslip.components?.netMonthly || 0)}
                </p>
                <p className="text-xs text-slate-300 italic mt-1">
                  {numberToIndianWords(selectedPayslip.components?.netMonthly || 0)}
                </p>
              </div>
              <Badge variant="success" size="md">
                Status: {formatLabel(selectedPayslip.paymentStatus)} via {selectedPayslip.paymentMode}
              </Badge>
            </div>

            {/* Footer Print Trigger */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPayslipModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
