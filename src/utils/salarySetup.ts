import type { DynamicSalaryItem, Employee } from '@/types';

/**
 * How a person is paid, as set up at onboarding and in the edit form. There are two ways, and only
 * one is used at a time:
 *
 * - Yearly salary: one amount a year; the month's pay is that divided by 12.
 * - Salary breakdown: basic pay, HRA and allowances; the month's pay is their total.
 *
 * Deductions (PF, ESI, professional tax, TDS, anything else) are one list used with either way.
 * Payroll takes only what is listed for that person: nothing listed means nothing deducted.
 *
 * Saved as salaryStructureJson: the deductions, plus the earnings when a breakdown is used.
 */
export type SalaryMode = 'YEARLY' | 'BREAKDOWN';

export interface SalarySetupValue {
  mode: SalaryMode;
  /** Yearly salary as typed (used in YEARLY mode). */
  yearly: string;
  /** Earnings (BREAKDOWN mode only) and deductions (both modes). */
  items: DynamicSalaryItem[];
}

export type ItemDef = { code: string; name: string; type: 'EARNING' | 'DEDUCTION'; repeatable?: boolean; defaultAmount?: number };

export const EARNINGS: ItemDef[] = [
  { code: 'BASIC', name: 'Basic pay', type: 'EARNING' },
  { code: 'HRA', name: 'House rent allowance (HRA)', type: 'EARNING' },
  { code: 'CONVEYANCE', name: 'Travel allowance', type: 'EARNING' },
  { code: 'MEDICAL', name: 'Medical allowance', type: 'EARNING' },
  { code: 'SPECIAL', name: 'Special allowance', type: 'EARNING' },
  { code: 'OTHER_EARNING', name: 'Other allowance', type: 'EARNING', repeatable: true },
];

export const DEDUCTIONS: ItemDef[] = [
  { code: 'PF', name: 'Provident fund (PF)', type: 'DEDUCTION' },
  { code: 'ESI', name: 'State insurance (ESI)', type: 'DEDUCTION' },
  { code: 'PT', name: 'Professional tax', type: 'DEDUCTION', defaultAmount: 200 },
  { code: 'TDS', name: 'Income tax (TDS)', type: 'DEDUCTION' },
  { code: 'HEALTH_INS', name: 'Health insurance', type: 'DEDUCTION' },
  { code: 'OTHER_DEDUCTION', name: 'Other deduction', type: 'DEDUCTION', repeatable: true },
];

/** PF and ESI are worked out by payroll each month, so they have no amount to type. */
export const RULE_BASED = new Set(['PF', 'ESI']);
export const PF_WAGE_CEILING = 15000;

export const newId = () => `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const money = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

export const isPf = (item: Pick<DynamicSalaryItem, 'code' | 'name' | 'type'>) =>
  item.type === 'DEDUCTION' && (item.code === 'PF' || /PROVIDENT|\bEPF\b/i.test(item.name));
export const isEsi = (item: Pick<DynamicSalaryItem, 'code' | 'name' | 'type'>) =>
  item.type === 'DEDUCTION' && (item.code === 'ESI' || /STATE INSURANCE/i.test(item.name));

export const emptySalarySetup = (): SalarySetupValue => ({ mode: 'YEARLY', yearly: '', items: [] });

/** Reads what is saved on an employee back into the form. */
export const salarySetupFromEmployee = (emp: Pick<Employee, 'salaryStructureJson' | 'ctcAnnual' | 'monthlySalary'>): SalarySetupValue => {
  let items: DynamicSalaryItem[] = [];
  try {
    const parsed = emp.salaryStructureJson ? JSON.parse(emp.salaryStructureJson) : [];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((x) => x && (x.type === 'EARNING' || x.type === 'DEDUCTION'))
        .map((x) => ({ id: String(x.id || newId()), code: x.code, name: String(x.name || ''), type: x.type, amount: money(Number(x.amount)) }));
    }
  } catch {
    items = [];
  }
  const hasEarnings = items.some((i) => i.type === 'EARNING' && i.amount > 0);
  const yearly = emp.ctcAnnual || (emp.monthlySalary ? emp.monthlySalary * 12 : 0);
  return hasEarnings
    ? { mode: 'BREAKDOWN', yearly: yearly ? String(Math.round(yearly)) : '', items }
    : { mode: 'YEARLY', yearly: yearly ? String(Math.round(yearly)) : '', items: items.filter((i) => i.type === 'DEDUCTION') };
};

export interface SalarySummary {
  monthly: number;
  yearly: number;
  basic: number;
  deductions: number;
  takeHome: number;
  hasPf: boolean;
  /** What to save as salaryStructureJson (an empty list when nothing is set up). */
  json: string;
}

/** The figures for a full month with no unpaid days, the same way payroll works them out. */
export const summarizeSalary = (value: SalarySetupValue): SalarySummary => {
  const earnings = value.items.filter((i) => i.type === 'EARNING');
  const deductions = value.items.filter((i) => i.type === 'DEDUCTION');
  const breakdown = value.mode === 'BREAKDOWN';
  const monthly = breakdown ? earnings.reduce((sum, i) => sum + money(i.amount), 0) : Math.round((Number(value.yearly) || 0) / 12);
  const yearly = breakdown ? monthly * 12 : money(Number(value.yearly) || 0);
  const basic = breakdown ? earnings.filter((i) => i.code === 'BASIC' || /BASIC/i.test(i.name)).reduce((s, i) => s + money(i.amount), 0) : monthly;

  let total = 0;
  for (const d of deductions) {
    if (isPf(d)) total += Math.round(Math.min(basic, PF_WAGE_CEILING) * 0.12);
    else if (isEsi(d)) total += Math.ceil(monthly * 0.0075);
    else total += money(d.amount);
  }
  const saved = breakdown ? [...earnings, ...deductions] : deductions;
  return {
    monthly,
    yearly,
    basic,
    deductions: total,
    takeHome: Math.max(0, monthly - total),
    hasPf: deductions.some(isPf),
    json: JSON.stringify(saved.map(({ id, code, name, type, amount }) => ({ id, code, name, type, amount: money(amount) }))),
  };
};

/** A sentence describing what is wrong, or null when the setup can be saved. */
export const salaryProblem = (value: SalarySetupValue): string | null => {
  const s = summarizeSalary(value);
  if (value.mode === 'YEARLY') {
    if (!value.yearly.trim()) return 'Enter the yearly salary.';
    if (!(Number(value.yearly) > 0)) return 'Yearly salary must be more than zero.';
  } else {
    if (s.monthly <= 0) return 'Add at least one earning with an amount, or switch to yearly salary.';
    if (s.hasPf && s.basic <= 0) return 'PF is worked out on basic pay. Add basic pay, or remove PF.';
  }
  const unnamed = value.items.find((i) => i.code?.startsWith('OTHER') && !i.name.trim());
  if (unnamed) return 'Give every "other" line a name.';
  if (s.deductions > s.monthly) return 'Deductions are more than the monthly pay. Check the amounts.';
  return null;
};
