import React from 'react';
import type { CompanySettings, Payslip } from '@/types';
import { formatINR, numberToIndianWords } from '@/utils/formatters';
import { savedFigures } from '@/utils/payroll';
import maayaLogo from '@/assets/logo-new.png';

const Line: React.FC<{ label: React.ReactNode; amount: number; sign?: '-' | '+'; strong?: boolean; muted?: boolean }> = ({ label, amount, sign, strong, muted }) => (
  <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'font-semibold text-slate-900' : muted ? 'text-slate-600' : 'text-slate-800'}`}>
    <dt>{label}</dt>
    <dd className="tabular-nums">
      {sign === '-' && amount > 0 ? '− ' : sign === '+' && amount > 0 ? '+ ' : ''}
      {formatINR(amount)}
    </dd>
  </div>
);

/**
 * One payslip, laid out the way staff read it: what the salary is, what was not paid for unpaid
 * days, what was earned, what was deducted, and what reaches the bank. Used by the admin and in the
 * employee portal, and printable.
 */
export const PayslipView: React.FC<{ slip: Payslip; company?: CompanySettings | null }> = ({ slip, company }) => {
  const f = savedFigures(slip);
  const c = slip.components;
  const companyName = company?.legalEntityName || company?.companyName || 'Maaya World';
  const unpaidDays = slip.daysInMonth - slip.payableDays;
  const beforeJoining = slip.daysInMonth - slip.employedDays;

  const earningLines = [
    ['Basic pay', c.basic],
    ['House rent allowance', c.hra],
    ['Special allowance', c.specialAllowance],
    ['Conveyance allowance', c.conveyanceAllowance],
    ['Medical allowance', c.medicalAllowance],
  ].filter(([, v]) => Number(v) > 0) as [string, number][];

  const deductionLines = [
    ['Provident fund (PF)', f.pf],
    ['State insurance (ESI)', f.esi],
    ['Professional tax', f.pt],
    ['Income tax (TDS)', f.tds],
    ['Other deductions', f.other],
  ].filter(([, v]) => Number(v) > 0) as [string, number][];

  return (
    <article className="space-y-5 text-sm text-slate-800">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <img src={maayaLogo} alt="" className="h-7 w-auto object-contain" />
          <p className="mt-2 font-semibold text-slate-900">{companyName}</p>
          {company?.registeredAddress && <p className="mt-0.5 max-w-sm text-xs text-slate-600">{company.registeredAddress}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">
            Payslip · {slip.month} {slip.year}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{slip.paymentStatus === 'PAID' ? `Paid${slip.paymentDate ? ` on ${slip.paymentDate}` : ''}` : 'Not paid yet'}</p>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        {(
          [
            ['Name', slip.employeeName],
            ['Employee ID', slip.employeeCode],
            ['Center', slip.location || 'Not recorded'],
            ['Bank account', slip.bankAccount ? `${slip.bankName || 'Bank'} · ending ${slip.bankAccount.slice(-4)}` : 'Not provided'],
            ['PAN', slip.panNumber || 'Not provided'],
            ...(slip.uanNumber ? [['PF number (UAN)', slip.uanNumber]] : []),
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-slate-600">{label}</dt>
            <dd className="text-right font-medium tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Days" className="rounded-lg bg-slate-50 px-4 py-3">
        <p className="font-semibold text-slate-900">
          Paid for {slip.payableDays} of {slip.daysInMonth} days
        </p>
        <p className="mt-0.5 text-slate-600">
          {[
            slip.workedDays > 0 ? `${slip.workedDays} worked` : null,
            slip.paidLeaveDays > 0 ? `${slip.paidLeaveDays} paid leave` : null,
            slip.lossOfPayDays > 0 ? `${slip.lossOfPayDays} unpaid` : null,
            beforeJoining > 0 ? `${beforeJoining} before joining` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Full month'}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section aria-labelledby="earn-h">
          <h3 id="earn-h" className="border-b border-slate-200 pb-1.5 font-semibold text-slate-900">
            Earnings
          </h3>
          <dl className="divide-y divide-slate-100">
            {earningLines.map(([label, v]) => (
              <Line key={label} label={label} amount={v} />
            ))}
            <Line label="Monthly salary" amount={f.fullMonthlySalary} strong />
            {f.unpaidAmount > 0 && <Line label={`Not paid for ${unpaidDays} day${unpaidDays === 1 ? '' : 's'}`} amount={f.unpaidAmount} sign="-" muted />}
            {f.bonus > 0 && <Line label="Bonus" amount={f.bonus} sign="+" />}
            <Line label="Earned this month" amount={f.earned} strong />
          </dl>
        </section>

        <section aria-labelledby="ded-h">
          <h3 id="ded-h" className="border-b border-slate-200 pb-1.5 font-semibold text-slate-900">
            Deductions
          </h3>
          <dl className="divide-y divide-slate-100">
            {deductionLines.length === 0 ? (
              <p className="py-1.5 text-slate-600">No deductions this month.</p>
            ) : (
              deductionLines.map(([label, v]) => <Line key={label} label={label} amount={v} />)
            )}
            <Line label="Total deductions" amount={f.totalDeductions} strong />
          </dl>
        </section>
      </div>

      <section className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
        <div>
          <p className="text-slate-600">Take-home pay</p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">{formatINR(f.takeHome)}</p>
          <p className="mt-0.5 text-xs text-slate-600">{numberToIndianWords(f.takeHome)}</p>
        </div>
        <p className="text-xs text-slate-600 tabular-nums">
          {formatINR(f.earned)} earned {'−'} {formatINR(f.totalDeductions)} deductions
        </p>
      </section>

      {c.adjustmentNotes && <p className="text-xs text-slate-600">Note: {c.adjustmentNotes}</p>}
    </article>
  );
};
