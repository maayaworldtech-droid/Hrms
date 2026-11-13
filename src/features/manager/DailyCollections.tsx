import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import type { DailyCollection } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { DataTable, Column } from '@/components/common/DataTable';
import { formatDate, formatINR } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

type Amounts = { bookMyShow: string; website: string; cashCounter: string };
const EMPTY: Amounts = { bookMyShow: '', website: '', cashCounter: '' };

/** How many days back a manager may fill in or correct (the server allows the same). */
const DAYS_BACK = 7;

const daysAgo = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-CA');
};

const toNumber = (v: string) => (v.trim() === '' ? 0 : Number(v));

/** A center manager reports the day's sales: BookMyShow, the Maaya World website and the cash counter. */
export const DailyCollections: React.FC = () => {
  const dispatch = useAppDispatch();
  const center = useAppSelector((state) => state.auth.user?.location) || 'your center';
  const today = businessDate();
  const [date, setDate] = useState(today);
  const [amounts, setAmounts] = useState<Amounts>(EMPTY);
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
      if (sentToday) setAmounts({ bookMyShow: String(sentToday.bookMyShow), website: String(sentToday.website), cashCounter: String(sentToday.cashCounter) });
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
    setAmounts(found ? { bookMyShow: String(found.bookMyShow), website: String(found.website), cashCounter: String(found.cashCounter) } : EMPTY);
  };

  const total = toNumber(amounts.bookMyShow) + toNumber(amounts.website) + toNumber(amounts.cashCounter);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = [amounts.bookMyShow, amounts.website, amounts.cashCounter];
    if (values.every((v) => v.trim() === '')) {
      setError('Enter at least one amount. Use 0 where there were no sales.');
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
        website: toNumber(amounts.website),
        cashCounter: toNumber(amounts.cashCounter),
      });
      setEntries((list) => [saved, ...list.filter((e) => e.date !== saved.date)].sort((a, b) => b.date.localeCompare(a.date)));
      dispatch(
        addToast({
          type: 'success',
          title: existing ? 'Sales updated' : 'Sales sent',
          message: `${formatINR(saved.total)} for ${formatDate(saved.date)}.`,
        })
      );
    } catch (err: any) {
      setError(err?.message || 'Could not send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(today.slice(0, 7))), [entries, today]);
  const monthTotal = monthEntries.reduce((sum, e) => sum + e.total, 0);

  const money = (v: number) => <span className="whitespace-nowrap tabular-nums">{formatINR(v)}</span>;
  const columns: Column<DailyCollection>[] = [
    { key: 'date', header: 'Date', sortable: true, render: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span> },
    { key: 'bookMyShow', header: 'BookMyShow', align: 'right', render: (e) => money(e.bookMyShow) },
    { key: 'website', header: 'Website', align: 'right', render: (e) => money(e.website) },
    { key: 'cashCounter', header: 'Cash counter', align: 'right', render: (e) => money(e.cashCounter) },
    { key: 'total', header: 'Total', sortable: true, align: 'right', render: (e) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatINR(e.total)}</span> },
  ];

  const field = (key: keyof Amounts, label: string) => (
    <Input
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

  return (
    <div className="space-y-6">
      <PageHeader title="Daily sales" description={`Send each day's sales for ${center}. The admin sees them in Reports.`} />

      <form onSubmit={submit} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-5" noValidate>
        <Input
          label="Date"
          type="date"
          value={date}
          max={today}
          min={daysAgo(today, DAYS_BACK)}
          onChange={(e) => e.target.value && pickDate(e.target.value)}
          helperText={existing ? 'Already sent for this day. Saving again replaces those figures.' : undefined}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {field('bookMyShow', 'BookMyShow')}
          {field('website', 'Maaya World website')}
          {field('cashCounter', 'Cash counter')}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-700">
            Total <span className="ml-1 text-base font-semibold tabular-nums text-slate-900">{formatINR(total)}</span>
          </p>
          <Button type="submit" isLoading={saving}>
            {existing ? 'Update' : 'Send'}
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
            Total <span className="font-semibold tabular-nums text-slate-900">{formatINR(monthTotal)}</span>
          </p>
        </div>
        <DataTable
          data={monthEntries}
          columns={columns}
          isLoading={loading}
          pageSize={31}
          onRowClick={(e) => (e.date >= daysAgo(today, DAYS_BACK) ? pickDate(e.date) : undefined)}
          emptyTitle="Nothing sent this month yet"
          emptyDescription="Send today's sales using the form above."
        />
      </div>
    </div>
  );
};
