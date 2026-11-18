import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DailyCollection } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { DataTable, Column } from '@/components/common/DataTable';
import { formatDate, formatINR } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const COLLECTIONS = [
  ['bookMyShow', 'BookMyShow'],
  ['cashDeposited', 'Cash deposited'],
  ['googlePay', 'Google Pay'],
  ['paytmMaayaWorld', 'Paytm / Maaya World'],
] as const;
const EXPENSES = [
  ['expenseCash', 'Cash'],
  ['expenseOnline', 'Online'],
] as const;

type AmountKey = (typeof COLLECTIONS)[number][0] | (typeof EXPENSES)[number][0];
type Amounts = Record<AmountKey, string>;
const EMPTY: Amounts = { bookMyShow: '', cashDeposited: '', googlePay: '', paytmMaayaWorld: '', expenseCash: '', expenseOnline: '' };
const KEYS = Object.keys(EMPTY) as AmountKey[];

/** How many days back a manager may fill in or correct (the server allows the same). */
const DAYS_BACK = 7;

const daysAgo = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-CA');
};

const toNumber = (v: string) => (v.trim() === '' ? 0 : Number(v));
const fromEntry = (e: DailyCollection): Amounts =>
  Object.fromEntries(KEYS.map((k) => [k, String(e[k] ?? 0)])) as Amounts;

/**
 * A center manager reports the day: money in by BookMyShow, cash deposited, Google Pay and
 * Paytm / Maaya World, less cash and online expenses. Every report goes to the admin.
 */
export const DailyCollections: React.FC = () => {
  const dispatch = useAppDispatch();
  const center = useAppSelector((state) => state.auth.user?.location) || 'your center';
  const today = businessDate();
  const [date, setDate] = useState(today);
  const [amounts, setAmounts] = useState<Amounts>(EMPTY);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<DailyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // This month, plus the days that can still be corrected if the month just started
      const monthStart = `${today.slice(0, 8)}01`;
      const from = daysAgo(today, DAYS_BACK) < monthStart ? daysAgo(today, DAYS_BACK) : monthStart;
      const list = await api.collections.list({ from, to: today });
      setEntries(list);
      // Already sent today: show those figures so they can be corrected
      const sentToday = list.find((e) => e.date === today);
      if (sentToday) {
        setAmounts(fromEntry(sentToday));
        setNotes(sentToday.notes || '');
      }
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not load sales', message: err?.message || 'Please try again.' }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const existing = entries.find((e) => e.date === date);

  // Choosing a day that was already reported shows its figures so they can be corrected
  const pickDate = (next: string) => {
    setDate(next);
    setError(null);
    const found = entries.find((e) => e.date === next);
    setAmounts(found ? fromEntry(found) : EMPTY);
    setNotes(found?.notes || '');
  };

  const totalCollections = COLLECTIONS.reduce((sum, [k]) => sum + toNumber(amounts[k]), 0);
  const totalExpenses = EXPENSES.reduce((sum, [k]) => sum + toNumber(amounts[k]), 0);
  const finalAmount = totalCollections - totalExpenses;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = KEYS.map((k) => amounts[k]);
    if (values.every((v) => v.trim() === '')) {
      setError('Enter at least one amount. Use 0 where there was nothing.');
      return;
    }
    if (values.some((v) => v.trim() !== '' && !(Number(v) >= 0))) {
      setError('Amounts must be 0 or more.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const saved = await api.collections.submit({
        date,
        bookMyShow: toNumber(amounts.bookMyShow),
        cashDeposited: toNumber(amounts.cashDeposited),
        googlePay: toNumber(amounts.googlePay),
        paytmMaayaWorld: toNumber(amounts.paytmMaayaWorld),
        expenseCash: toNumber(amounts.expenseCash),
        expenseOnline: toNumber(amounts.expenseOnline),
        notes: notes.trim() || undefined,
      });
      setEntries((list) => [saved, ...list.filter((e) => e.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
      dispatch(
        addToast({
          type: 'success',
          title: existing ? 'Report updated and sent to the admin' : 'Report sent to the admin',
          message: `Final amount ${formatINR(saved.finalAmount)} for ${formatDate(saved.date)}.`,
        })
      );
    } catch (err: any) {
      setError(err?.message || 'Could not send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(today.slice(0, 7))), [entries, today]);
  const monthSum = (k: 'totalCollections' | 'totalExpenses' | 'finalAmount') => monthEntries.reduce((sum, e) => sum + (e[k] || 0), 0);

  const money = (v: number) => <span className="whitespace-nowrap tabular-nums">{formatINR(v)}</span>;
  const columns: Column<DailyCollection>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span> },
    { key: 'bookMyShow', header: 'BookMyShow', align: 'right', render: (e) => money(e.bookMyShow) },
    { key: 'cashDeposited', header: 'Cash deposited', align: 'right', render: (e) => money(e.cashDeposited) },
    { key: 'googlePay', header: 'Google Pay', align: 'right', render: (e) => money(e.googlePay) },
    { key: 'paytmMaayaWorld', header: 'Paytm / Maaya World', align: 'right', render: (e) => money(e.paytmMaayaWorld) },
    { key: 'totalExpenses', header: 'Expenses', align: 'right', render: (e) => money(e.totalExpenses) },
    {
      key: 'finalAmount',
      header: 'Final amount',
      sortable: true,
      align: 'right',
      render: (e) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatINR(e.finalAmount)}</span>,
    },
  ];

  const field = (key: AmountKey, label: string) => (
    <Input
      key={key}
      label={`${label} (₹)`}
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      placeholder="0"
      value={amounts[key]}
      onChange={(e) => setAmounts({ ...amounts, [key]: e.target.value })}
    />
  );

  const sumLine = (label: string, value: number, strong = false) => (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? 'font-semibold text-slate-900' : 'text-slate-700'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-base font-semibold text-slate-900' : 'font-medium text-slate-900'}`}>{formatINR(value)}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Daily sales report" description={`Send each day's report for ${center}. Every report goes to the admin.`} />

      <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-lg border border-slate-200 bg-white p-5" noValidate>
        <Input
          label="Date"
          type="date"
          value={date}
          max={today}
          min={daysAgo(today, DAYS_BACK)}
          onChange={(e) => e.target.value && pickDate(e.target.value)}
          helperText={existing ? 'Already sent for this day. Saving again replaces those figures and tells the admin.' : undefined}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Collections</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{COLLECTIONS.map(([k, label]) => field(k, label))}</div>
        </fieldset>

        <fieldset className="space-y-3 border-t border-slate-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-slate-900">Expenses</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{EXPENSES.map(([k, label]) => field(k, label))}</div>
          <Textarea label="Notes (optional)" rows={2} maxLength={500} placeholder="What the expenses were for, anything the admin should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </fieldset>

        <dl className="space-y-1.5 border-t border-slate-200 pt-4 text-sm">
          {sumLine('Total collections', totalCollections)}
          {sumLine('Total expenses', totalExpenses)}
          {sumLine('Final amount', finalAmount, true)}
        </dl>

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving}>
            {existing ? 'Update and send' : 'Send to admin'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
      </form>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">This month</h2>
          <p className="text-sm text-slate-700">
            Collections <span className="font-semibold tabular-nums text-slate-900">{formatINR(monthSum('totalCollections'))}</span>
            {' · '}Expenses <span className="font-semibold tabular-nums text-slate-900">{formatINR(monthSum('totalExpenses'))}</span>
            {' · '}Final <span className="font-semibold tabular-nums text-slate-900">{formatINR(monthSum('finalAmount'))}</span>
          </p>
        </div>
        <DataTable
          data={monthEntries}
          columns={columns}
          isLoading={loading}
          pageSize={31}
          onRowClick={(e) => (e.date >= daysAgo(today, DAYS_BACK) ? pickDate(e.date) : undefined)}
          emptyTitle="Nothing sent this month yet"
          emptyDescription="Send today's report using the form above."
        />
      </div>
    </div>
  );
};
