import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Employee, Department, PayrollRun } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { formatINR, exportToCSV } from '@/utils/formatters';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Banknote,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const ReportsAnalytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);

  useEffect(() => {
    Promise.all([
      api.employees.getAll(),
      api.departments.getAll(),
      api.payroll.getRuns(),
    ]).then(([e, d, p]) => {
      setEmployees(e);
      setDepartments(d);
      setPayrollRuns(p);
    });
  }, []);

  const totalHeadcount = employees.length;
  const totalPayroll = employees.reduce((acc, emp) => acc + emp.ctcAnnual, 0);
  const avgCTC = totalHeadcount > 0 ? Math.round(totalPayroll / totalHeadcount) : 0;

  const handleExportFullReport = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Email',
      'Location',
      'Joining Date',
      'Monthly Salary (INR)',
    ];
    const rows = employees.map((emp) => [
      emp.employeeCode,
      emp.fullName,
      emp.email,
      emp.location,
      emp.joiningDate,
      emp.monthlySalary || Math.round((emp.ctcAnnual || 360000) / 12),
    ]);

    exportToCSV('maaya_workforce_master_report', headers, rows);
    dispatch(
      addToast({
        type: 'success',
        title: 'Report Downloaded',
        message: 'Workforce master CSV export generated successfully.',
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Data insights, headcount distribution, attendance punctuality & salary expense breakdown
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleExportFullReport}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Master Report (CSV)
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Headcount"
          value={totalHeadcount}
          subtitle="Full-time staff"
          icon={<Users className="w-5 h-5" />}
          trend={{ value: 14.8, label: 'YoY Growth' }}
          variant="indigo"
        />
        <StatCard
          title="Average Employee CTC"
          value={formatINR(avgCTC)}
          subtitle="Across all seniority bands"
          icon={<Banknote className="w-5 h-5" />}
          trend={{ value: 6.2, label: 'market competitive' }}
          variant="emerald"
        />
        <StatCard
          title="Attendance Adherence"
          value="96.4%"
          subtitle="Average punctuality rate"
          icon={<Clock className="w-5 h-5" />}
          trend={{ value: 1.8, label: 'vs last month' }}
          variant="slate"
        />
        <StatCard
          title="Retention Ratio"
          value="98.2%"
          subtitle="Annualized staff retention"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="indigo"
        />
      </div>

      {/* Analytics Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Compensation Breakdown */}
        <Card>
          <CardHeader
            title="Departmental Expenditure Breakdown"
            subtitle="Annual salary investment by business function"
            icon={<Building2 className="w-4 h-4" />}
          />
          <CardContent className="space-y-4">
            {departments.map((dept) => {
              const deptEmps = employees.filter((e) => e.departmentName === dept.name);
              const deptSpend = deptEmps.reduce((acc, e) => acc + e.ctcAnnual, 0);
              const percent = totalPayroll > 0 ? Math.round((deptSpend / totalPayroll) * 100) : 0;

              return (
                <div key={dept.id} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{dept.name}</span>
                      <span className="text-slate-400 ml-1.5">({deptEmps.length} staff)</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatINR(deptSpend)} ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Attendance & Leave Analytics */}
        <Card>
          <CardHeader
            title="Workforce Time Distribution"
            subtitle="Quarterly attendance and remote work trends"
            icon={<Clock className="w-4 h-4" />}
          />
          <CardContent className="space-y-5 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>In-Office Presence</span>
                <span className="font-bold text-slate-900">72%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '72%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>Remote / Work From Home</span>
                <span className="font-bold text-slate-900">22%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: '22%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>Approved Planned Leaves</span>
                <span className="font-bold text-slate-900">4.5%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '4.5%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>Unplanned Absences</span>
                <span className="font-bold text-slate-900">1.5%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '1.5%' }} />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
              <span>Overall Compliance Score</span>
              <span className="font-bold text-emerald-600 font-mono">99.1% Audited</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
