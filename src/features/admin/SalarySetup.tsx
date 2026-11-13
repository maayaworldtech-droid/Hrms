import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DynamicSalaryItem } from '@/types';
import { formatINR } from '@/utils/formatters';
import {
  DEDUCTIONS,
  EARNINGS,
  ItemDef,
  PF_WAGE_CEILING,
  RULE_BASED,
  SalaryMode,
  SalarySetupValue,
  isEsi,
  isPf,
  money,
  newId,
  summarizeSalary,
} from '@/utils/salarySetup';

/** Yearly salary or salary breakdown, plus the deductions that apply. Rules in utils/salarySetup. */
const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

export const SalarySetup: React.FC<{
  value: SalarySetupValue;
  onChange: (next: SalarySetupValue) => void;
  /** Shown under the setup (from salaryProblem, once the admin tries to continue). */
  error?: string | null;
  idPrefix: string;
}> = ({ value, onChange, error, idPrefix }) => {
  const summary = summarizeSalary(value);
  const earnings = value.items.filter((i) => i.type === 'EARNING');
  const deductions = value.items.filter((i) => i.type === 'DEDUCTION');
  const breakdown = value.mode === 'BREAKDOWN';

  const setMode = (mode: SalaryMode) => {
    if (mode === value.mode) return;
    if (mode === 'BREAKDOWN') {
      // Start the breakdown from the salary already entered, all as basic pay
      const monthly = Math.round((Number(value.yearly) || 0) / 12);
      const startEarnings = earnings.length > 0 ? earnings : [{ id: newId(), code: 'BASIC', name: 'Basic pay', type: 'EARNING' as const, amount: monthly }];
      onChange({ ...value, mode, items: [...startEarnings, ...deductions] });
    } else {
      // Back to one yearly amount, carrying over what the breakdown added up to (no deductions)
      onChange({ mode, yearly: summary.monthly > 0 ? String(summary.monthly * 12) : value.yearly, items: [] });
    }
  };

  const add = (def: ItemDef) => {
    const item: DynamicSalaryItem = {
      id: newId(),
      code: def.code,
      name: def.repeatable ? '' : def.name,
      type: def.type,
      amount: def.defaultAmount ?? 0,
    };
    // Earnings are listed before deductions so the saved order reads naturally
    const items = def.type === 'EARNING' ? [...earnings, item, ...deductions] : [...value.items, item];
    onChange({ ...value, items });
  };

  const update = (id: string, patch: Partial<DynamicSalaryItem>) =>
    onChange({ ...value, items: value.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const remove = (id: string) => onChange({ ...value, items: value.items.filter((i) => i.id !== id) });

  const available = (defs: ItemDef[], list: DynamicSalaryItem[]) => defs.filter((d) => d.repeatable || !list.some((i) => i.code === d.code));

  const ruleText = (item: DynamicSalaryItem) => {
    if (isPf(item)) {
      const amount = Math.round(Math.min(summary.basic, PF_WAGE_CEILING) * 0.12);
      return `${formatINR(amount)} a month: 12% of ${breakdown ? 'basic pay' : 'salary'}, up to ₹15,000`;
    }
    return `${formatINR(Math.ceil(summary.monthly * 0.0075))} a month: 0.75% of pay earned`;
  };

  const row = (item: DynamicSalaryItem) => {
    const ruleBased = item.type === 'DEDUCTION' && (RULE_BASED.has(item.code || '') || isPf(item) || isEsi(item));
    const named = item.code?.startsWith('OTHER');
    return (
      <li key={item.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          {named ? (
            <input
              type="text"
              value={item.name}
              onChange={(e) => update(item.id, { name: e.target.value })}
              placeholder={item.type === 'EARNING' ? 'Name, for example Night shift allowance' : 'Name, for example Uniform'}
              aria-label="Name"
              className={inputClass}
            />
          ) : (
            <p className="text-sm font-medium text-slate-900">{item.name}</p>
          )}
          {ruleBased && <p className="mt-0.5 text-sm text-slate-600">{ruleText(item)}</p>}
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          {!ruleBased && (
            <label className="flex h-10 w-full items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-400/30 sm:w-36">
              <span className="mr-1 text-sm text-slate-600" aria-hidden="true">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={item.amount || ''}
                onChange={(e) => update(item.id, { amount: money(Number(e.target.value)) })}
                placeholder="0"
                aria-label={`${item.name || 'Amount'} a month`}
                className="w-full text-sm tabular-nums text-slate-900 focus:outline-none"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => remove(item.id)}
            aria-label={`Remove ${item.name || 'this line'}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  };

  const adders = (defs: ItemDef[], label: string) =>
    defs.length > 0 && (
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {defs.map((d) => (
          <button
            key={d.code}
            type="button"
            onClick={() => add(d)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {d.name}
          </button>
        ))}
      </div>
    );

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-900">How is this person paid?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['YEARLY', 'Yearly salary', 'One amount a year, paid monthly. Nothing is deducted.'],
              ['BREAKDOWN', 'Salary breakdown', 'Basic pay and allowances, with PF, tax or other deductions.'],
            ] as const
          ).map(([mode, title, hint]) => {
            const selected = value.mode === mode;
            return (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${selected ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}-salary-mode`}
                  value={mode}
                  checked={selected}
                  onChange={() => setMode(mode)}
                  className="mt-0.5 h-4 w-4 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{title}</span>
                  <span className="block text-sm text-slate-600">{hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!breakdown ? (
        <div className="max-w-sm">
          <label htmlFor={`${idPrefix}-yearly`} className="mb-1.5 block text-sm font-medium text-slate-900">
            Yearly salary (₹) <span className="text-rose-600">*</span>
          </label>
          <input
            id={`${idPrefix}-yearly`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            placeholder="For example 300000"
            value={value.yearly}
            onChange={(e) => onChange({ ...value, yearly: e.target.value })}
            className={inputClass}
          />
          <p className="mt-1.5 text-sm text-slate-600">
            {summary.monthly > 0 ? `${formatINR(summary.monthly)} a month.` : 'Monthly pay is the yearly salary divided by 12.'}
          </p>
        </div>
      ) : (
        <section aria-labelledby={`${idPrefix}-earnings-h`}>
          <h4 id={`${idPrefix}-earnings-h`} className="text-sm font-semibold text-slate-900">
            Earnings a month
          </h4>
          {earnings.length > 0 ? (
            <ul className="divide-y divide-slate-100">{earnings.map(row)}</ul>
          ) : (
            <p className="py-2 text-sm text-slate-600">No earnings yet. Add basic pay first.</p>
          )}
          <div className="mt-2">{adders(available(EARNINGS, earnings), 'Add an earning')}</div>
        </section>
      )}

      {breakdown && (
        <>
          <section aria-labelledby={`${idPrefix}-deductions-h`} className="border-t border-slate-200 pt-4">
            <h4 id={`${idPrefix}-deductions-h`} className="text-sm font-semibold text-slate-900">
              Deductions a month
            </h4>
            <p className="mt-0.5 text-sm text-slate-600">Only what you add here is taken from pay. Leave it empty if nothing applies.</p>
            {deductions.length > 0 && <ul className="mt-1 divide-y divide-slate-100">{deductions.map(row)}</ul>}
            <div className="mt-2">{adders(available(DEDUCTIONS, deductions), 'Add a deduction')}</div>
          </section>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4">
            {(
              [
                ['Pay a month', summary.monthly],
                ['Deductions', summary.deductions],
                ['Take-home a month', summary.takeHome],
                ['Pay a year', summary.yearly],
              ] as const
            ).map(([label, amount]) => (
              <div key={label} className="bg-white px-3 py-2.5">
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{formatINR(amount)}</dd>
              </div>
            ))}
          </dl>
          <p className="-mt-3 text-sm text-slate-600">For a full month. Payroll takes off unpaid days each month.</p>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
};
