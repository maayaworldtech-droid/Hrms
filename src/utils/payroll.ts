import type { Payslip } from '@/types';

/**
 * Same rules as the server's PayrollCalculator, used only to preview an adjustment before saving.
 * The server recalculates on save, so its numbers are always the ones that count.
 */
const PF_WAGE_CEILING = 15000;


export interface PayslipFigures {
  paidDays: number;
  fullMonthlySalary: number;
  unpaidAmount: number;
  bonus: number;
  earned: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  other: number;
  totalDeductions: number;
  takeHome: number;
}

export const previewPayslip = (
  slip: Payslip,
  changes: { lossOfPayDays: number; bonus: number; tds: number; otherDeductions: number }
): PayslipFigures => {
  const daysInMonth = Math.max(1, slip.daysInMonth || 30);
  const employed = Math.max(0, Math.min(daysInMonth, slip.employedDays ?? daysInMonth));
  const lop = Math.max(0, Math.min(employed, Math.round(changes.lossOfPayDays || 0)));
  const paidDays = employed - lop;
  const c = slip.components;
  const full = (c.basic || 0) + (c.hra || 0) + (c.specialAllowance || 0) + (c.conveyanceAllowance || 0) + (c.medicalAllowance || 0);
  const earnedBase = Math.round((full * paidDays) / daysInMonth);
  const bonus = Math.max(0, Math.round(changes.bonus || 0)) + (c.incentives || 0);
  const earned = earnedBase + bonus;
  const pf = slip.pfApplicable ? Math.round(Math.min(((c.basic || 0) * paidDays) / daysInMonth, PF_WAGE_CEILING) * 0.12) : 0;
  const esi = slip.esiApplicable && earned > 0 ? Math.ceil(earned * 0.0075) : 0;
  // Only deductions added at onboarding apply; professional tax is the amount entered
  const pt = earned > 0 ? Math.max(0, slip.ptMonthly || 0) : 0;
  const tds = Math.max(0, Math.round(changes.tds || 0));
  const other = Math.max(0, Math.round(changes.otherDeductions || 0)) + (c.healthInsurance || 0);
  const totalDeductions = pf + esi + pt + tds + other;
  return {
    paidDays,
    fullMonthlySalary: full,
    unpaidAmount: full - earnedBase,
    bonus,
    earned,
    pf,
    esi,
    pt,
    tds,
    other,
    totalDeductions,
    takeHome: Math.max(0, earned - totalDeductions),
  };
};

/** The figures exactly as saved on the payslip. */
export const savedFigures = (slip: Payslip): PayslipFigures => {
  const c = slip.components;
  return {
    paidDays: slip.payableDays,
    fullMonthlySalary: slip.fullMonthlySalary,
    unpaidAmount: slip.unpaidAmount,
    bonus: (c.bonus || 0) + (c.incentives || 0),
    earned: c.grossMonthly,
    pf: c.epfEmployee || 0,
    esi: slip.esiEmployee || 0,
    pt: c.professionalTax || 0,
    tds: c.tds || 0,
    other: (slip.otherDeductions || 0) + (c.healthInsurance || 0),
    totalDeductions: c.totalDeductions,
    takeHome: c.netMonthly,
  };
};

/** Problems worth a look before paying this person. */
export const payslipWarnings = (slip: Payslip): string[] => {
  const notes: string[] = [];
  if (!slip.bankAccount?.trim() || !slip.bankName?.trim()) notes.push('No bank account');
  if (!(slip.fullMonthlySalary > 0)) notes.push('No salary on file');
  if (slip.noAttendance) notes.push('No check-ins this month');
  return notes;
};
