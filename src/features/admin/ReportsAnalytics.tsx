import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import type { AttendanceSummaryRow, DailyCollection, Payslip } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { Badge } from '@/components/common/Badge';
import { formatDate, formatINR } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import { useCenters } from '@/hooks/useCenters';

type Tab = 'salary' | 'sales' | 'attendance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'salary', label: 'Salary' },
  { id: 'sales', label: 'Daily sales' },
  { id: 'attendance', label: 'Attendance' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const lastDay = (monthKey: string) => {
  const [y, m] = monthKey.split('-').map(Number);
  return `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

const money = (v: number) => <span className="whitespace-nowrap tabular-nums">{formatINR(v)}</span>;

type SalaryRow = Payslip & { paid: boolean };

/** Three plain reports for the owner: who was paid what, what each center sold, and who came to work. */
export const ReportsAnalytics: React.FC = () => {
  const today = businessDate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'salary';
  const monthKey = /^\d{4}-\d{2}$/.test(params.get('month') || '') ? (params.get('month') as string) : today.slice(0, 7);
  const center = params.get('center') || 'ALL';
  const { centers } = useCenters();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const [salary, setSalary] = useState<SalaryRow[] | null>(null);
  const [unpaidCenters, setUnpaidCenters] = useState<string[]>([]);
  const [sales, setSales] = useState<DailyCollection[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummaryRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      if (tab === 'salary') {
        setSalary(null);
        const [y, m] = monthKey.split('-').map(Number);
        const runs = (await api.payroll.getRuns()).filter(
          (r) => r.month.toLowerCase() === MONTHS[m - 1].toLowerCase() && Number(r.year) === y && (center === 'ALL' || r.center === center)
        );
        const slips = (await Promise.all(runs.map((r) => api.payroll.getPayslipsByRun(r.id).then((list) => list.map((s) => ({ ...s, paid: r.status === 'DISBURSED' })))))).flat();
        setSalary(slips.sort((a, b) => (a.location || '').localeCompare(b.location || '') || a.employeeName.localeCompare(b.employeeName)));
        const withRun = new Set(runs.map((r) => r.center));
        setUnpaidCenters(center === 'ALL' ? centers.map((c) => c.name).filter((n) => !withRun.has(n)) : withRun.size ? [] : [center]);
      } else if (tab === 'sales') {
        setSales(null);
        const to = lastDay(monthKey) < today ? lastDay(monthKey) : today;
        setSales(await api.collections.list({ from: `${monthKey}-01`, to, center }));
      } else {
        setAttendance(null);
        setAttendance(await api.reports.attendance(monthKey, center));
      }
    } catch {
      setFailed(true);
    }
  }, [tab, monthKey, center, centers, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthLabel = `${MONTHS[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;
  const scope = center === 'ALL' ? 'All centers' : center;

  // ---------------------------------------------------------------- salary
  const salaryView = () => {
    if (!salary) return null;
    const takeHome = salary.reduce((s, r) => s + (r.components.netMonthly || 0), 0);
    const notPaid = salary.filter((r) => !r.paid).reduce((s, r) => s + (r.components.netMonthly || 0), 0);
    const columns: Column<SalaryRow>[] = [
      { key: 'employeeCode', header: 'Emp ID', sortable: true, render: (r) => <span className="whitespace-nowrap tabular-nums">{r.employeeCode}</span> },
      { key: 'employeeName', header: 'Name', sortable: true, render: (r) => <span className="whitespace-nowrap font-medium text-slate-900">{r.employeeName}</span> },
      { key: 'location', header: 'Center', sortable: true, render: (r) => <span className="whitespace-nowrap">{r.location || 'No center'}</span> },
      { key: 'payableDays', header: 'Paid days', sortable: true, align: 'right', render: (r) => r.payableDays },
      { key: 'grossMonthly', header: 'Earned', align: 'right', render: (r) => money(r.components.grossMonthly || 0) },
      { key: 'totalDeductions', header: 'Deductions', align: 'right', render: (r) => money(r.components.totalDeductions || 0) },
      { key: 'netMonthly', header: 'Take-home', align: 'right', render: (r) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatINR(r.components.netMonthly || 0)}</span> },
      { key: 'paid', header: 'Status', render: (r) => <Badge variant={r.paid ? 'success' : 'warning'} size="sm">{r.paid ? 'Paid' : 'Not paid'}</Badge> },
    ];
    return (
      <>
        <StatTiles columns={3} aria-label="Salary totals">
          <StatTile label="People" value={salary.length} />
          <StatTile label="Take-home" value={formatINR(takeHome)} tone="brand" />
          <StatTile label="Not paid yet" value={formatINR(notPaid)} tone={notPaid > 0 ? 'warning' : 'neutral'} />
        </StatTiles>
        {unpaidCenters.length > 0 && <p className="text-sm text-amber-800">No payroll worked out yet for: {unpaidCenters.join(', ')}.</p>}
        <DataTable
          data={salary}
          columns={columns}
          pageSize={50}
          searchPlaceholder="Search by name or ID"
          exportFileName={`salary-${monthKey}`}
          emptyTitle="No payroll for this month"
          emptyDescription="Work out payroll from the Payroll page first."
        />
      </>
    );
  };

  // ---------------------------------------------------------------- daily sales
  const salesView = () => {
    if (!sales) return null;
    const sum = (k: 'bookMyShow' | 'website' | 'cashCounter' | 'total') => sales.reduce((s, r) => s + (r[k] || 0), 0);
    const reportedToday = new Set(sales.filter((r) => r.date === today).map((r) => r.center));
    const missingToday = monthKey === today.slice(0, 7) && center === 'ALL' ? centers.map((c) => c.name).filter((n) => !reportedToday.has(n)) : [];
    const columns: Column<DailyCollection>[] = [
      { key: 'date', header: 'Date', sortable: true, render: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
      { key: 'center', header: 'Center', sortable: true, render: (r) => <span className="whitespace-nowrap">{r.center}</span> },
      { key: 'bookMyShow', header: 'BookMyShow', sortable: true, align: 'right', render: (r) => money(r.bookMyShow) },
      { key: 'website', header: 'Website', sortable: true, align: 'right', render: (r) => money(r.website) },
      { key: 'cashCounter', header: 'Cash counter', sortable: true, align: 'right', render: (r) => money(r.cashCounter) },
      { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r) => <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatINR(r.total)}</span> },
      { key: 'submittedByName', header: 'Sent by', render: (r) => <span className="whitespace-nowrap">{r.submittedByName || '-'}</span> },
    ];
    return (
      <>
        <StatTiles columns={4} aria-label="Sales totals">
          <StatTile label="BookMyShow" value={formatINR(sum('bookMyShow'))} />
          <StatTile label="Website" value={formatINR(sum('website'))} />
          <StatTile label="Cash counter" value={formatINR(sum('cashCounter'))} />
          <StatTile label="Total" value={formatINR(sum('total'))} tone="brand" />
        </StatTiles>
        {missingToday.length > 0 && <p className="text-sm text-amber-800">Not sent today: {missingToday.join(', ')}.</p>}
        <DataTable
          data={sales}
          columns={columns}
          pageSize={50}
          searchPlaceholder="Search by center"
          exportFileName={`daily-sales-${monthKey}`}
          emptyTitle="No sales sent for this month"
          emptyDescription="Center managers send them from Daily sales."
        />
      </>
    );
  };

  // ---------------------------------------------------------------- attendance
  const attendanceView = () => {
    if (!attendance) return null;
    const columns: Column<AttendanceSummaryRow>[] = [
      { key: 'employeeCode', header: 'Emp ID', sortable: true, render: (r) => <span className="whitespace-nowrap tabular-nums">{r.employeeCode}</span> },
      { key: 'name', header: 'Name', sortable: true, render: (r) => <span className="whitespace-nowrap font-medium text-slate-900">{r.name}</span> },
      { key: 'center', header: 'Center', sortable: true, render: (r) => <span className="whitespace-nowrap">{r.center || 'No center'}</span> },
      { key: 'worked', header: 'Days worked', sortable: true, align: 'right', render: (r) => r.worked },
      { key: 'late', header: 'Late', sortable: true, align: 'right', render: (r) => r.late },
      { key: 'leave', header: 'Leave', sortable: true, align: 'right', render: (r) => r.leave },
      { key: 'absent', header: 'Absent', sortable: true, align: 'right', render: (r) => (r.absent > 0 ? <span className="font-semibold text-rose-700">{r.absent}</span> : 0) },
    ];
    return (
      <>
        <StatTiles columns={3} aria-label="Attendance totals">
          <StatTile label="People" value={attendance.length} />
          <StatTile label="Late arrivals" value={attendance.reduce((s, r) => s + r.late, 0)} />
          <StatTile label="Absent days" value={attendance.reduce((s, r) => s + r.absent, 0)} tone={attendance.some((r) => r.absent > 0) ? 'warning' : 'neutral'} />
        </StatTiles>
        <DataTable
          data={attendance}
          columns={columns}
          pageSize={50}
          searchPlaceholder="Search by name or ID"
          exportFileName={`attendance-${monthKey}`}
          emptyTitle="No staff for this month"
          emptyDescription="Try another month or center."
        />
      </>
    );
  };

  const ready = tab === 'salary' ? salary : tab === 'sales' ? sales : attendance;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description={`${monthLabel} · ${scope}`}
        actions={
          <>
            <input
              type="month"
              aria-label="Month"
              value={monthKey}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && setParam('month', e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />
            <select
              aria-label="Center"
              value={center}
              onChange={(e) => setParam('center', e.target.value)}
              className="h-9 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            >
              <option value="ALL">All centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="ops-detail-tabs" role="tablist" aria-label="Report">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setParam('tab', t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {failed ? (
        <EmptyState tone="danger" title="Could not load the report" description="Check your connection and try again." actionLabel="Try again" onAction={() => void load()} />
      ) : !ready ? (
        <div className="space-y-4" role="status" aria-label="Loading the report">
          <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : tab === 'salary' ? (
        salaryView()
      ) : tab === 'sales' ? (
        salesView()
      ) : (
        attendanceView()
      )}
    </div>
  );
};
