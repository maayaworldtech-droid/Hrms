import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, Employee, LeaveRequest, OnDutyRequest, PayrollRun, Payslip } from '@/types';
import { Button } from '@/components/common/Button';
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Salary, attendance, leave, expenses and staff, month by month.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-700">
            <span className="block mb-1">Month</span>
            <input
              type="month"
              value={monthKey}
              max={today.slice(0, 7)}
              onChange={(e) => e.target.value && setParam('month', e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="block mb-1">Center</span>
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
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParam('tab', t.id)}
            className={`h-10 px-3 -mb-px text-sm whitespace-nowrap border-b-2 cursor-pointer ${
              tab === t.id ? 'border-brand-600 text-brand-700 font-semibold' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-center justify-between gap-3">
          <span>Could not load report data. Check your connection and try again.</span>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      ) : !report || centersLoading || waitingForSlips ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
          Preparing the report...
        </div>
      ) : (
        <ReportViewLayout data={report} selectedCenter={centerKnown ? centerFilter : 'ALL'} />
      )}
    </div>
  );
};
