import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, Employee, LeaveRequest, OnDutyRequest, PayrollRun, Payslip } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { businessDate } from '@/utils/operations';
import { useCenters } from '@/hooks/useCenters';
import { ReportViewLayout, ReportData } from './reports/ReportView';
import { MONTH_NAMES, monthRange, previousMonthKey } from './reports/reportUtils';
import {
  ReportContext,
  buildAttendanceReport,
  buildExpenseReport,
  buildLeaveReport,
  buildSalaryReport,
  buildStaffReport,
} from './reports/buildReports';

type Tab = 'salary' | 'attendance' | 'leave' | 'expenses' | 'staff';

const TABS: { id: Tab; label: string; question: string }[] = [
  { id: 'salary', label: 'Salary', question: 'How much did we spend on salaries, and has everyone been paid?' },
  { id: 'attendance', label: 'Attendance', question: 'Are people coming to work on time?' },
  { id: 'leave', label: 'Leave', question: 'Who was on leave, and what is waiting for approval?' },
  { id: 'expenses', label: 'Expenses', question: 'How much was spent on On Duty trips, and what is still to be reimbursed?' },
  { id: 'staff', label: 'Staff', question: 'Who works where, and whose details are incomplete?' },
];

const BUILDERS: Record<Tab, (ctx: ReportContext) => ReportData> = {
  salary: buildSalaryReport,
  attendance: buildAttendanceReport,
  leave: buildLeaveReport,
  expenses: buildExpenseReport,
  staff: buildStaffReport,
};

const runMatches = (run: PayrollRun, year: number, monthName: string) => {
  const m = (run.month || '').trim().toLowerCase();
  const target = monthName.toLowerCase();
  const numeric = m.match(/^\d{4}-(\d{1,2})$/);
  const sameMonth = numeric ? MONTH_NAMES[Number(numeric[1]) - 1]?.toLowerCase() === target : m === target || (m.length >= 3 && target.startsWith(m));
  return sameMonth && Number(run.year) === year;
};

interface BaseData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  onDuty: OnDutyRequest[];
  runs: PayrollRun[];
}

export const ReportsAnalytics: React.FC = () => {
  const today = businessDate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'salary') as Tab;
  const monthKey = /^\d{4}-\d{2}$/.test(params.get('month') || '') ? (params.get('month') as string) : today.slice(0, 7);
  const centerFilter = params.get('center') || 'ALL';

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const { centers, isLoading: centersLoading } = useCenters();
  const [base, setBase] = useState<BaseData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [slipsByRun, setSlipsByRun] = useState<Record<string, Payslip[]>>({});
  const [slipsLoading, setSlipsLoading] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    setBase(null);
    Promise.all([
      api.employees.getAll(),
      api.attendance.getAll(),
      api.leaves.getAll(),
      api.onDuty.getAll(),
      api.payroll.getRuns(),
    ])
      .then(([employees, attendance, leaves, onDuty, runs]) =>
        setBase({ employees, attendance, leaves, onDuty, runs })
      )
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(load, [load]);

  const range = useMemo(() => monthRange(monthKey), [monthKey]);
  const prevRange = useMemo(() => monthRange(previousMonthKey(monthKey)), [monthKey]);
  const run = base?.runs.find((r) => runMatches(r, range.year, range.name));
  const prevRun = base?.runs.find((r) => runMatches(r, prevRange.year, prevRange.name));

  // Payslips are fetched per payroll run, only for the months being viewed
  useEffect(() => {
    const needed = [run?.id, prevRun?.id].filter((id): id is string => !!id && !(id in slipsByRun));
    if (needed.length === 0) return;
    let cancelled = false;
    setSlipsLoading(true);
    Promise.all(needed.map((id) => api.payroll.getPayslipsByRun(id).then((slips) => [id, slips] as const)))
      .then((entries) => {
        if (!cancelled) setSlipsByRun((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setSlipsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run?.id, prevRun?.id, slipsByRun]);

  const report = useMemo<ReportData | null>(() => {
    if (!base) return null;
    return BUILDERS[tab]({
      range,
      prevRange,
      centerFilter,
      centers,
      employees: base.employees,
      attendance: base.attendance,
      leaves: base.leaves,
      onDuty: base.onDuty,
      run,
      prevRun,
      slips: run ? slipsByRun[run.id] || [] : [],
      prevSlips: prevRun ? slipsByRun[prevRun.id] || [] : [],
      today,
    });
  }, [base, tab, range, prevRange, centerFilter, centers, run, prevRun, slipsByRun, today]);

  const activeTab = TABS.find((t) => t.id === tab)!;
  const waitingForSlips = tab === 'salary' && !!run && !(run.id in slipsByRun) && slipsLoading;
  const centerKnown = centerFilter === 'ALL' || centers.some((c) => c.name === centerFilter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Salary, attendance, leave, expenses and staff, month by month."
        actions={
        <>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Month
            <input
              type="month"
              value={monthKey}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && setParam('month', e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
            Center
            <select
              value={centerKnown ? centerFilter : 'ALL'}
              onChange={(e) => setParam('center', e.target.value)}
              disabled={centersLoading}
              className="h-9 min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
            >
              <option value="ALL">All centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
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

      <p className="text-sm text-slate-700">
        {activeTab.question}{' '}
        <span className="text-slate-600">
          {tab === 'staff' ? 'As of today' : range.label}
          {centerKnown && centerFilter !== 'ALL' ? ` · ${centerFilter}` : ' · All centers'}
        </span>
      </p>

      {loadFailed ? (
        <EmptyState tone="danger" title="Could not load report data" description="Check your connection and try again." actionLabel="Try again" onAction={load} />
      ) : !report || centersLoading || waitingForSlips ? (
        <div className="space-y-6" role="status" aria-label="Preparing the report">
          <div className="h-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
        </div>
      ) : (
        <ReportViewLayout data={report} selectedCenter={centerKnown ? centerFilter : 'ALL'} />
      )}
    </div>
  );
};
