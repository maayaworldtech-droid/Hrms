import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { CompanySettings, Payslip, Employee } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { MobileCard, MobileSectionHeading, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { PayslipView } from '@/components/payroll/PayslipView';
import { formatINR } from '@/utils/formatters';
import { useAppSelector } from '@/store';
import { Printer, FileText, ChevronRight, WifiOff } from 'lucide-react';

export const MySalary: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        api.payroll.getPayslipsByEmployee(employeeId),
        api.employees.getById(employeeId).catch(() => null),
      ]);
      // Staff only see a month once it has been marked as paid
      setPayslips((Array.isArray(data) ? data : []).filter((s) => s.paymentStatus === 'PAID'));
      setEmployee(person || null);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
    api.settings.get().then(setCompany).catch(() => setCompany(null));
  }, [loadData]);

  if (isLoading) return <MobileSkeleton heights={[150, 64, 64, 64]} />;

  const latest = payslips[0];

  return (
    <div className="space-y-4 pb-4">
      <MobileTitle title="Payslips" subtitle={latest ? `Latest: ${latest.month} ${latest.year}` : 'Your monthly salary statements'} />

      {loadError && <EmptyState tone="danger" compact icon={WifiOff} title="Could not load your payslips" actionLabel="Retry" onAction={loadData} />}

      {latest ? (
        <MobileCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-600">
              Take-home for {latest.month} {latest.year}
            </span>
            <Badge variant="success" dot>
              Paid
            </Badge>
          </div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatINR(latest.components.netMonthly)}</p>
          <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div>
              <dt className="text-xs text-slate-600">Paid days</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {latest.payableDays} of {latest.daysInMonth}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">Earned</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{formatINR(latest.components.grossMonthly)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">Deductions</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{formatINR(latest.components.totalDeductions)}</dd>
            </div>
          </dl>
          {latest.lossOfPayDays > 0 && (
            <p className="text-sm text-amber-800">
              {latest.lossOfPayDays} unpaid day{latest.lossOfPayDays === 1 ? '' : 's'} this month ({formatINR(latest.unpaidAmount)} less). Ask your manager if this looks wrong.
            </p>
          )}
        </MobileCard>
      ) : (
        employee &&
        employee.monthlySalary > 0 && (
          <MobileCard>
            <p className="text-sm text-slate-600">Monthly salary</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatINR(employee.monthlySalary)}</p>
            <p className="mt-1 text-sm text-slate-600">Your first payslip appears here once the month's salary is paid.</p>
          </MobileCard>
        )
      )}

      <section className="space-y-2" aria-labelledby="statements-heading">
        <MobileSectionHeading title="All payslips" action={<span className="text-xs tabular-nums text-slate-600">{payslips.length}</span>} />
        {payslips.length === 0 ? (
          <EmptyState icon={FileText} title="No payslips yet" description="They appear here after each month's salary is paid." />
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
                      <p className="mt-0.5 text-sm text-slate-600">
                        {slip.payableDays} of {slip.daysInMonth} days paid
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{formatINR(slip.components.netMonthly)}</span>
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
        title={selectedPayslip ? `${selectedPayslip.month} ${selectedPayslip.year}` : 'Payslip'}
        size="lg"
        printable
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
              Print or save
            </Button>
            <Button onClick={() => setSelectedPayslip(null)}>Done</Button>
          </>
        }
      >
        {selectedPayslip && <PayslipView slip={selectedPayslip} company={company} />}
      </Modal>
    </div>
  );
};
