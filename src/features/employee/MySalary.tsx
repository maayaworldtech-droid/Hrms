import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Payslip, Employee } from '@/types';
import { Modal } from '@/components/common/Modal';
import { formatINR } from '@/utils/formatters';
import { useAppSelector } from '@/store';
import { Printer, Eye, FileText, Download } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

export const MySalary: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || 'emp-003';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [data, person] = await Promise.all([
        api.payroll.getPayslipsByEmployee(employeeId).catch(() => []),
        api.employees.getById(employeeId).catch(() => null),
      ]);
      setEmployee(person || null);
      setPayslips(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setSelectedPayslip(data[0]);
      }
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openPayslipModal = (slip: Payslip) => {
    setSelectedPayslip(slip);
    setIsModalOpen(true);
  };

  // Compute structure from current payslip or employee record
  const currentStructure = payslips[0]?.components || (employee ? {
    basic: Math.round(employee.monthlySalary * 0.5),
    hra: Math.round(employee.monthlySalary * 0.3),
    specialAllowance: Math.round(employee.monthlySalary * 0.2),
    grossMonthly: employee.monthlySalary,
    epfEmployee: Math.min(1800, Math.round(employee.monthlySalary * 0.12)),
    professionalTax: 200,
    tdsMonthly: 0,
    totalDeductions: Math.min(1800, Math.round(employee.monthlySalary * 0.12)) + 200,
    netMonthly: employee.monthlySalary - (Math.min(1800, Math.round(employee.monthlySalary * 0.12)) + 200),
  } : null);

  return (
    <div className="space-y-3 pb-4">
      {loadError && (
        <div role="alert" className="p-3 rounded-xl bg-[var(--accent-50)] border border-[var(--accent-200)] text-xs text-[var(--accent-700)] flex items-center justify-between">
          <span>Failed to load salary statements.</span>
          <button className="underline font-bold ml-1 cursor-pointer" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Net Pay Executive Card */}
      <section className="employee-card space-y-3">
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Net Take-Home Pay</span>
          <span
            className={`employee-badge ${
              payslips[0]?.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'
            }`}
          >
            {payslips[0]?.paymentStatus === 'PAID' ? 'Disbursed' : 'In process'}
          </span>
        </div>

        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums leading-tight">
          {currentStructure ? formatINR(currentStructure.netMonthly) : '₹45,000'}
        </div>

        {/* 3 Inline Telemetry Metrics */}
        <div className="employee-metric-grid">
          <div className="employee-metric-tile">
            <span className="metric-label">Gross</span>
            <strong className="metric-value">
              {currentStructure ? formatINR(currentStructure.grossMonthly) : '₹50,000'}
            </strong>
          </div>

          <div className="employee-metric-tile">
            <span className="metric-label">Deductions</span>
            <strong className="metric-value text-[var(--accent-600)]">
              {currentStructure ? formatINR(currentStructure.totalDeductions) : '₹5,000'}
            </strong>
          </div>

          <div className="employee-metric-tile">
            <span className="metric-label">Annual CTC</span>
            <strong className="metric-value">
              {employee ? formatINR(employee.ctcAnnual) : '₹6,00,000'}
            </strong>
          </div>
        </div>
      </section>

      {/* Payslips History List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-800">Statements</span>
          <span className="text-[11px] text-slate-500">{payslips.length} available</span>
        </div>

        {isLoading ? (
          <div className="employee-skeleton-group">
            <div className="employee-skeleton" />
            <div className="employee-skeleton" />
          </div>
        ) : payslips.length === 0 ? (
          <div className="employee-empty">
            <FileText size={32} />
            <h3>No salary statements yet</h3>
            <p>Monthly statements will appear here after payroll processing and disbursement.</p>
          </div>
        ) : (
          payslips.map((slip) => (
            <div
              key={slip.id}
              className="employee-record-card flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {slip.month} {slip.year}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                  {formatINR(slip.components.netMonthly)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`employee-badge ${
                    slip.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'
                  }`}
                >
                  {slip.paymentStatus}
                </span>

                <button
                  onClick={() => openPayslipModal(slip)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="View Statement"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Payslip: ${selectedPayslip.month} ${selectedPayslip.year}`}
          subtitle={`${selectedPayslip.employeeName} (${selectedPayslip.employeeCode})`}
          size="md"
        >
          <div className="space-y-3.5 text-xs text-slate-800">
            <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={maayaLogo} alt="Maaya World" className="h-5 w-auto object-contain" />
                <span className="text-xs font-bold text-slate-900">Maaya World</span>
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {selectedPayslip.month} {selectedPayslip.year}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Staff</span>
                <strong className="text-slate-900">{selectedPayslip.employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Employee ID</span>
                <strong className="font-mono text-slate-900">{selectedPayslip.employeeCode}</strong>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex justify-between border-b border-slate-200">
                <span>Earnings</span>
                <span>Amount</span>
              </div>
              <div className="p-2 space-y-1 divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Basic</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.basic)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">HRA</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.hra)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Special Allowance</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.specialAllowance)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900">
                  <span>Gross Total</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.grossMonthly)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 flex justify-between border-b border-slate-200">
                <span>Deductions</span>
                <span>Amount</span>
              </div>
              <div className="p-2 space-y-1 divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">EPF (Employee)</span>
                  <span className="font-mono text-[var(--accent-600)]">{formatINR(selectedPayslip.components.epfEmployee)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Professional Tax (PT)</span>
                  <span className="font-mono text-[var(--accent-600)]">{formatINR(selectedPayslip.components.professionalTax)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900">
                  <span>Total Deductions</span>
                  <span className="font-mono text-[var(--accent-600)]">{formatINR(selectedPayslip.components.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Amount Highlight */}
            <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">
                  Net Disbursed Salary
                </span>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  {formatINR(selectedPayslip.components.netMonthly)}
                </p>
              </div>
              <span className="employee-badge badge-success">
                PAID
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 employee-secondary-btn"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 employee-primary-btn"
                style={{ minHeight: '36px' }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
