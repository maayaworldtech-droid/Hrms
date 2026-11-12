import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Payslip, Employee } from '@/types';
import { Modal } from '@/components/common/Modal';
import { formatINR, formatLabel } from '@/utils/formatters';
import { useAppSelector } from '@/store';
import { Printer, Eye, FileText } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

export const MySalary: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    if (!employeeId) {
      setLoadError(true);
      setIsLoading(false);
      return;
    }
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

  // Compute structure from current payslip or employee record matching backend PayrollController rules
  const currentStructure = payslips[0]?.components || (employee ? (() => {
    const gross = employee.monthlySalary || 0;
    const basic = Math.round(gross * 0.50);
    const hra = Math.round(gross * 0.30);
    const specialAllowance = Math.round(gross * 0.10);
    const conveyanceAllowance = 1600;
    const medicalAllowance = 1250;
    const epfEmployee = Math.round(basic * 0.12);
    const professionalTax = 200;
    const tds = Math.round(gross * 0.05);
    const healthInsurance = 500;
    const totalDeductions = epfEmployee + professionalTax + tds + healthInsurance;
    return {
      basic,
      hra,
      specialAllowance,
      conveyanceAllowance,
      medicalAllowance,
      bonus: 0,
      incentives: 0,
      grossMonthly: gross,
      epfEmployee,
      professionalTax,
      tds,
      healthInsurance,
      totalDeductions,
      netMonthly: Math.max(0, gross - totalDeductions),
    };
  })() : null);

  return (
    <div className="space-y-3 pb-4">
      {loadError && (
        <div role="alert" className="p-3 rounded-xl bg-accent-50 border border-accent-200 text-xs text-accent-700 flex items-center justify-between">
          <span>Failed to load salary statements.</span>
          <button className="underline font-bold ml-1 cursor-pointer" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Net Pay Executive Card */}
      <section className="employee-card space-y-3">
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-slate-600 font-medium text-xs">Net take-home pay</span>
          <span
            className={`employee-badge ${
              payslips[0]?.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'
            }`}
          >
            {payslips[0]?.paymentStatus === 'PAID' ? 'Disbursed' : 'In process'}
          </span>
        </div>

        <div className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
          {currentStructure ? formatINR(currentStructure.netMonthly) : '—'}
        </div>

        {/* Gross, deductions and annual pay */}
        <div className="employee-metric-grid">
          <div className="employee-metric-tile">
            <span className="metric-label">Gross</span>
            <strong className="metric-value">
              {currentStructure ? formatINR(currentStructure.grossMonthly) : '—'}
            </strong>
          </div>

          <div className="employee-metric-tile">
            <span className="metric-label">Deductions</span>
            <strong className="metric-value text-accent-600">
              {currentStructure ? formatINR(currentStructure.totalDeductions) : '—'}
            </strong>
          </div>

          <div className="employee-metric-tile">
            <span className="metric-label">Annual CTC</span>
            <strong className="metric-value">
              {employee ? formatINR(employee.ctcAnnual) : '—'}
            </strong>
          </div>
        </div>
      </section>

      {/* Payslips History List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-800">Statements</span>
          <span className="text-xs text-slate-500">{payslips.length} available</span>
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
                <span className="text-xs tabular-nums font-semibold text-slate-900">
                  {formatINR(slip.components.netMonthly)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`employee-badge ${
                    slip.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'
                  }`}
                >
                  {formatLabel(slip.paymentStatus)}
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
                <span className="text-slate-500 block text-xs">Staff</span>
                <strong className="text-slate-900">{selectedPayslip.employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Employee ID</span>
                <strong className="tabular-nums text-slate-900">{selectedPayslip.employeeCode}</strong>
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
                  <span className="tabular-nums">{formatINR(selectedPayslip.components.basic)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">HRA</span>
                  <span className="tabular-nums">{formatINR(selectedPayslip.components.hra)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Special allowance</span>
                  <span className="tabular-nums">{formatINR(selectedPayslip.components.specialAllowance)}</span>
                </div>
                {selectedPayslip.components.conveyanceAllowance > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Conveyance allowance</span>
                    <span className="tabular-nums">{formatINR(selectedPayslip.components.conveyanceAllowance)}</span>
                  </div>
                )}
                {selectedPayslip.components.medicalAllowance > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Medical allowance</span>
                    <span className="tabular-nums">{formatINR(selectedPayslip.components.medicalAllowance)}</span>
                  </div>
                )}
                {(selectedPayslip.components.bonus ?? 0) > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Bonus</span>
                    <span className="tabular-nums">{formatINR(selectedPayslip.components.bonus ?? 0)}</span>
                  </div>
                )}
                {(selectedPayslip.components.incentives ?? 0) > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Incentives</span>
                    <span className="tabular-nums">{formatINR(selectedPayslip.components.incentives ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-bold text-slate-900">
                  <span>Gross total</span>
                  <span className="tabular-nums">{formatINR(selectedPayslip.components.grossMonthly)}</span>
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
                  <span className="tabular-nums text-accent-600">{formatINR(selectedPayslip.components.epfEmployee)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Professional Tax (PT)</span>
                  <span className="tabular-nums text-accent-600">{formatINR(selectedPayslip.components.professionalTax)}</span>
                </div>
                {selectedPayslip.components.tds > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">TDS / Income Tax</span>
                    <span className="tabular-nums text-accent-600">{formatINR(selectedPayslip.components.tds)}</span>
                  </div>
                )}
                {selectedPayslip.components.healthInsurance > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">Health insurance</span>
                    <span className="tabular-nums text-accent-600">{formatINR(selectedPayslip.components.healthInsurance)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-bold text-slate-900">
                  <span>Total deductions</span>
                  <span className="tabular-nums text-accent-600">{formatINR(selectedPayslip.components.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Amount Highlight */}
            <div className="p-3 rounded-lg bg-brand-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs font-bold">
                  Net disbursed salary
                </span>
                <p className="text-lg font-bold tabular-nums text-white">
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
