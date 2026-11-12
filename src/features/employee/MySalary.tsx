import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Payslip, Employee } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileCard, MobileSectionHeading, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { formatINR, formatLabel } from '@/utils/formatters';
import { paymentStatusVariant } from '@/utils/status';
import { useAppSelector } from '@/store';
import { Printer, FileText, ChevronRight, WifiOff } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

const Row: React.FC<{ label: string; value: number; strong?: boolean; negative?: boolean }> = ({ label, value, strong, negative }) => (
  <div className={`flex justify-between gap-4 py-1.5 text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
    <span>{label}</span>
    <span className={`tabular-nums ${negative ? 'text-rose-700' : ''}`}>{formatINR(value)}</span>
  </div>
);

export const MySalary: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
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
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const latest = payslips[0];
  // Mirrors the backend salary split so new staff without a payslip still see their structure
  const currentStructure =
    latest?.components ||
    (employee
      ? (() => {
          const gross = employee.monthlySalary || 0;
          const basic = Math.round(gross * 0.5);
          const epfEmployee = Math.round(basic * 0.12);
          const professionalTax = 200;
          const tds = Math.round(gross * 0.05);
          const healthInsurance = 500;
          const totalDeductions = epfEmployee + professionalTax + tds + healthInsurance;
          return { grossMonthly: gross, totalDeductions, netMonthly: Math.max(0, gross - totalDeductions) };
        })()
      : null);

  if (isLoading) return <MobileSkeleton heights={[150, 64, 64, 64]} />;

  return (
    <div className="space-y-4 pb-4">
      <MobileTitle title="Payslips" subtitle={latest ? `Latest: ${latest.month} ${latest.year}` : 'Monthly salary statements'} />

      {loadError && (
        <EmptyState tone="danger" compact icon={WifiOff} title="Could not load salary details" actionLabel="Retry" onAction={loadData} />
      )}

      <MobileCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">{latest ? 'Net pay, latest month' : 'Expected monthly net pay'}</span>
          {latest && <Badge variant={paymentStatusVariant(latest.paymentStatus)} dot>{latest.paymentStatus === 'PAID' ? 'Paid' : formatLabel(latest.paymentStatus)}</Badge>}
        </div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
          {currentStructure ? formatINR(currentStructure.netMonthly) : '--'}
        </p>
        <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
          <div>
            <dt className="text-xs text-slate-600">Gross</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{currentStructure ? formatINR(currentStructure.grossMonthly) : '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Deductions</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{currentStructure ? formatINR(currentStructure.totalDeductions) : '--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Yearly salary</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{employee ? formatINR(employee.ctcAnnual) : '--'}</dd>
          </div>
        </dl>
      </MobileCard>

      <section className="space-y-2" aria-labelledby="statements-heading">
        <MobileSectionHeading title="Statements" action={<span className="text-xs text-slate-600 tabular-nums">{payslips.length} available</span>} />
        {payslips.length === 0 ? (
          <EmptyState icon={FileText} title="No payslips yet" description="Statements appear here once payroll for the month is processed." />
        ) : (
          <MobileCard className="p-0">
            <ul className="divide-y divide-slate-100">
              {payslips.map((slip) => (
                <li key={slip.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(slip)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {slip.month} {slip.year}
                      </p>
                      <p className="mt-0.5 text-sm tabular-nums text-slate-600">Net {formatINR(slip.components.netMonthly)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={paymentStatusVariant(slip.paymentStatus)} size="sm">
                        {slip.paymentStatus === 'PAID' ? 'Paid' : formatLabel(slip.paymentStatus)}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </MobileCard>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedPayslip)}
        onClose={() => setSelectedPayslip(null)}
        title={selectedPayslip ? `Payslip · ${selectedPayslip.month} ${selectedPayslip.year}` : 'Payslip'}
        subtitle={selectedPayslip ? `${selectedPayslip.employeeName} · ${selectedPayslip.employeeCode}` : undefined}
        size="md"
        printable
        footer={
          selectedPayslip && (
            <>
              <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
                Print
              </Button>
              <Button onClick={() => setSelectedPayslip(null)}>Done</Button>
            </>
          )
        }
      >
        {selectedPayslip && (
          <div className="space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <img src={maayaLogo} alt="Maaya World" className="h-6 w-auto object-contain" />
              <span className="text-sm font-medium text-slate-700">
                {selectedPayslip.month} {selectedPayslip.year}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Earnings</h3>
              <div className="mt-1 divide-y divide-slate-100">
                <Row label="Basic" value={selectedPayslip.components.basic} />
                <Row label="House rent allowance" value={selectedPayslip.components.hra} />
                <Row label="Special allowance" value={selectedPayslip.components.specialAllowance} />
                {selectedPayslip.components.conveyanceAllowance > 0 && <Row label="Conveyance allowance" value={selectedPayslip.components.conveyanceAllowance} />}
                {selectedPayslip.components.medicalAllowance > 0 && <Row label="Medical allowance" value={selectedPayslip.components.medicalAllowance} />}
                {(selectedPayslip.components.bonus ?? 0) > 0 && <Row label="Bonus" value={selectedPayslip.components.bonus ?? 0} />}
                {(selectedPayslip.components.incentives ?? 0) > 0 && <Row label="Incentives" value={selectedPayslip.components.incentives ?? 0} />}
                <Row label="Gross total" value={selectedPayslip.components.grossMonthly} strong />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Deductions</h3>
              <div className="mt-1 divide-y divide-slate-100">
                <Row label="EPF, employee share" value={selectedPayslip.components.epfEmployee} negative />
                <Row label="Professional tax" value={selectedPayslip.components.professionalTax} negative />
                {selectedPayslip.components.tds > 0 && <Row label="Income tax (TDS)" value={selectedPayslip.components.tds} negative />}
                {selectedPayslip.components.healthInsurance > 0 && <Row label="Health insurance" value={selectedPayslip.components.healthInsurance} negative />}
                <Row label="Total deductions" value={selectedPayslip.components.totalDeductions} strong negative />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Net pay</span>
              <span className="text-lg font-semibold tabular-nums text-slate-900">{formatINR(selectedPayslip.components.netMonthly)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
