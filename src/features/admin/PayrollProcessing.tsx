import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '@/services/api';
import { PayrollRun, Payslip } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatINR, formatDate, numberToIndianWords } from '@/utils/formatters';
import {
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';

export const PayrollProcessing: React.FC = () => {
  const dispatch = useAppDispatch();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState('November');
  const [newRunYear, setNewRunYear] = useState(2026);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.payroll.getRuns();
      setRuns(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRun = async () => {
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
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Generation failed' }));
    }
  };

  const handleDisburse = async (runId: string) => {
    try {
      await api.payroll.disburseRun(runId, 'Sarah Jenkins (VP People)');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      dispatch(
        addToast({
          type: 'success',
          title: 'Salaries Disbursed Successfully',
          message: 'NEFT payment batches dispatched. Employee payslips are now downloadable.',
        })
      );
      setIsRegisterModalOpen(false);
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Disbursement failed' }));
    }
  };

  const columns: Column<PayrollRun>[] = [
    {
      key: 'month',
      header: 'Pay Cycle',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">{row.month} {row.year}</span>
            <div className="text-[11px] text-slate-500">Processed: {formatDate(row.processedAt)}</div>
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
      header: 'Total Gross Pay',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">{formatINR(row.totalGrossPay)}</span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Total Deductions',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-rose-600 font-mono">{formatINR(row.totalDeductions)}</span>
      ),
    },
    {
      key: 'totalNetPay',
      header: 'Net Payout',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-emerald-700 font-mono">{formatINR(row.totalNetPay)}</span>
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
          {row.status}
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
            className="!py-1 !px-2.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
          >
            Review Register
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll Processing & Disbursal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate monthly salary registers, review statutory deductions & disburse NEFT payout batches
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsRunModalOpen(true)}
          leftIcon={<Banknote className="w-4 h-4" />}
        >
          Run New Payroll Cycle
        </Button>
      </div>

      {/* Main Runs Table */}
      <DataTable
        data={runs}
        columns={columns}
        searchPlaceholder="Search payroll by month or year..."
        exportFileName="pulse_payroll_cycles"
        isLoading={isLoading}
      />

      {/* Run New Payroll Modal */}
      <Modal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        title="Initialize New Payroll Run"
        subtitle="Calculates gross earnings, attendance deductions, EPF, PT & TDS for all active employees"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pay Cycle Month</label>
            <select
              value={newRunMonth}
              onChange={(e) => setNewRunMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
                (m) => (
                  <option key={m} value={m}>{m}</option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fiscal Year</label>
            <input
              type="number"
              value={newRunYear}
              onChange={(e) => setNewRunYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
            <span className="font-bold">Automated Calculations:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-indigo-800">
              <li>Pulls approved leaves and checks loss-of-pay days</li>
              <li>Applies 12% EPFO and 200 INR PT state statutory rules</li>
              <li>Generates individual downloadable payslips</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRun}>
              Generate Payroll Draft
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
          subtitle={`${selectedRun.totalEmployees} employees • Status: ${selectedRun.status}`}
          size="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500">Gross Total</span>
                <p className="text-base font-bold text-slate-900">{formatINR(selectedRun.totalGrossPay)}</p>
              </div>
              <div>
                <span className="text-slate-500">Deductions Total</span>
                <p className="text-base font-bold text-rose-600">{formatINR(selectedRun.totalDeductions)}</p>
              </div>
              <div>
                <span className="text-slate-500">Net Disbursal Amount</span>
                <p className="text-base font-bold text-emerald-600">{formatINR(selectedRun.totalNetPay)}</p>
              </div>
            </div>

            {/* Payslips Table */}
            <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Gross Pay</th>
                    <th className="py-2.5 px-3">EPF (12%)</th>
                    <th className="py-2.5 px-3">PT</th>
                    <th className="py-2.5 px-3">TDS</th>
                    <th className="py-2.5 px-3">Net Pay</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRun.payslips.map((ps) => (
                    <tr key={ps.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {ps.employeeName}
                        <div className="text-[10px] text-slate-400 font-mono">{ps.employeeCode}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{formatINR(ps.components.grossMonthly)}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">{formatINR(ps.components.epfEmployee)}</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">₹200</td>
                      <td className="py-2.5 px-3 font-mono text-rose-600">{formatINR(ps.components.tds)}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{formatINR(ps.components.netMonthly)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={ps.paymentStatus === 'PAID' ? 'success' : 'warning'} size="sm">
                          {ps.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayslip(ps);
                            setIsPayslipModalOpen(true);
                          }}
                          className="!p-1 text-indigo-600"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-slate-500">
                {selectedRun.status === 'DISBURSED'
                  ? `Disbursed on ${formatDate(selectedRun.disbursedAt)} by ${selectedRun.disbursedBy}`
                  : 'Ready for bank clearance'}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsRegisterModalOpen(false)}>
                  Close
                </Button>
                {selectedRun.status !== 'DISBURSED' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleDisburse(selectedRun.id)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Authorize & Disburse Salaries
                  </Button>
                )}
              </div>
            </div>
          </div>
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
                  <span className="text-base font-bold text-slate-900">Maaya World Pvt. Ltd.</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Maaya World Towers, Level 8, Outer Ring Road, Bellandur, Bangalore, Karnataka - 560103
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Corporate Tax ID: 29AABCM9876F1Z2</p>
              </div>
              <div className="text-right">
                <Badge variant="purple" size="md">PAYSLIP</Badge>
                <div className="text-xs font-bold text-slate-900 mt-1.5">{selectedPayslip.month} {selectedPayslip.year}</div>
                <span className="text-[10px] text-slate-500 font-mono">Ref: {selectedPayslip.id}</span>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="text-slate-500">Employee Name:</span> <strong className="text-slate-900">{selectedPayslip.employeeName}</strong></div>
              <div><span className="text-slate-500">Employee ID:</span> <strong className="font-mono text-slate-900">{selectedPayslip.employeeCode}</strong></div>
              <div><span className="text-slate-500">Designation:</span> <span className="text-slate-800">{selectedPayslip.designation}</span></div>
              <div><span className="text-slate-500">Department:</span> <span className="text-slate-800">{selectedPayslip.department}</span></div>
              <div><span className="text-slate-500">Bank Account:</span> <span className="font-mono text-slate-800">{selectedPayslip.bankAccount}</span></div>
              <div><span className="text-slate-500">Bank Name:</span> <span className="text-slate-800">{selectedPayslip.bankName}</span></div>
              <div><span className="text-slate-500">PAN Number:</span> <span className="font-mono text-slate-800">{selectedPayslip.panNumber}</span></div>
              <div><span className="text-slate-500">UAN (EPFO):</span> <span className="font-mono text-slate-800">{selectedPayslip.uanNumber}</span></div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Earnings Component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Basic Salary</span><span className="font-mono">{formatINR(selectedPayslip.components.basic)}</span></div>
                  <div className="flex justify-between pt-1"><span>House Rent Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.hra)}</span></div>
                  <div className="flex justify-between pt-1"><span>Special Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.specialAllowance)}</span></div>
                  <div className="flex justify-between pt-1"><span>Conveyance Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.conveyanceAllowance)}</span></div>
                  <div className="flex justify-between pt-1"><span>Medical Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.medicalAllowance)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Gross Earnings (A)</span>
                    <span className="font-mono">{formatINR(selectedPayslip.components.grossMonthly)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Deductions Component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Provident Fund (EPF)</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.epfEmployee)}</span></div>
                  <div className="flex justify-between pt-1"><span>Professional Tax (PT)</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.professionalTax)}</span></div>
                  <div className="flex justify-between pt-1"><span>Health Insurance</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.healthInsurance)}</span></div>
                  <div className="flex justify-between pt-1"><span>TDS / Income Tax</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.tds)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Total Deductions (B)</span>
                    <span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Payable */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">Net Amount Credited</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {formatINR(selectedPayslip.components.netMonthly)}
                </p>
                <p className="text-[11px] text-slate-300 italic mt-1">
                  {numberToIndianWords(selectedPayslip.components.netMonthly)}
                </p>
              </div>
              <Badge variant="success" size="md">
                Status: {selectedPayslip.paymentStatus} via {selectedPayslip.paymentMode}
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
