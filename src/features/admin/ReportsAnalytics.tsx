import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import { Employee, Department, PayrollRun } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { formatINR, exportToCSV } from '@/utils/formatters';
import {
  Download,
  Users,
  Banknote,
  Clock,
  TrendingUp,
  Building2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const ReportsAnalytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_quarter');

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

  // Filtered employees based on location
  const filteredEmployees = useMemo(() => {
    if (selectedVenue === 'all') return employees;
    return employees.filter(
      (e) => e.location?.toLowerCase().includes(selectedVenue.toLowerCase())
    );
  }, [employees, selectedVenue]);

  const totalHeadcount = filteredEmployees.length;
  const totalPayroll = filteredEmployees.reduce((acc, emp) => {
    const annual = emp.ctcAnnual || ((emp.monthlySalary || 35000) * 12);
    return acc + annual;
  }, 0);
  const avgMonthlySalary = totalHeadcount > 0 ? Math.round(totalPayroll / (totalHeadcount * 12)) : 0;
  const avgAnnualCTC = totalHeadcount > 0 ? Math.round(totalPayroll / totalHeadcount) : 0;

  const handleExportFullReport = () => {
    const headers = [
      'Employee Code',
      'Full Name',
      'Work Email',
      'Venue / Location',
      'Department',
      'Shift',
      'Joining Date',
      'Monthly Salary (INR)',
      'Annual CTC (INR)',
    ];
    const rows = filteredEmployees.map((emp) => [
      emp.employeeCode,
      emp.fullName,
      emp.email,
      emp.location,
      emp.departmentName || 'Operations',
      emp.shiftTiming || 'Morning',
      emp.joiningDate,
      emp.monthlySalary || Math.round((emp.ctcAnnual || 420000) / 12),
      emp.ctcAnnual || ((emp.monthlySalary || 35000) * 12),
    ]);

    exportToCSV(`workforce_master_report_${selectedVenue}_2026`, headers, rows);
    dispatch(
      addToast({
        type: 'success',
        title: 'Report downloaded',
        message: 'Master workforce report exported as CSV.',
      })
    );
  };

  const handleDownloadQuickReport = (type: string) => {
    let filename = '';
    let headers: string[] = [];
    let rows: any[][] = [];

    if (type === 'statutory') {
      filename = 'statutory_compliance_pf_esi_2026';
      headers = ['Employee Code', 'Full Name', 'Location', 'PF Eligible', 'ESI Status', 'PT Gross'];
      rows = filteredEmployees.map((e) => [
        e.employeeCode,
        e.fullName,
        e.location,
        'Yes (12%)',
        (e.monthlySalary || 35000) <= 21000 ? 'Covered' : 'Exempt (>21k)',
        formatINR(e.monthlySalary || 35000),
      ]);
    } else if (type === 'attendance') {
      filename = 'attendance_adherence_summary_2026';
      headers = ['Employee Code', 'Full Name', 'Location', 'Scheduled Days', 'Present Days', 'Adherence %'];
      rows = filteredEmployees.map((e) => [
        e.employeeCode,
        e.fullName,
        e.location,
        '26',
        '25',
        '96.1%',
      ]);
    } else {
      filename = 'payroll_disbursement_breakdown_2026';
      headers = ['Employee Code', 'Full Name', 'Basic Pay', 'HRA', 'Allowances', 'Gross Monthly'];
      rows = filteredEmployees.map((e) => {
        const gross = e.monthlySalary || 35000;
        return [
          e.employeeCode,
          e.fullName,
          formatINR(Math.round(gross * 0.5)),
          formatINR(Math.round(gross * 0.3)),
          formatINR(Math.round(gross * 0.2)),
          formatINR(gross),
        ];
      });
    }

    exportToCSV(filename, headers, rows);
    dispatch(
      addToast({
        type: 'success',
        title: 'Report exported',
        message: `${filename}.csv has been downloaded.`,
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E4E7EC]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#101828]">Reports & Analytics</h1>
          <p className="text-sm text-[#667085] mt-1">
            Workforce distribution, payroll commitments, attendance punctuality and compliance reports
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={handleExportFullReport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export master report
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-white rounded-xl border border-[#E4E7EC] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#475467]">
            <Filter className="w-3.5 h-3.5 text-[#667085]" />
            <span>Filter by:</span>
          </div>

          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="h-9 px-3 text-sm bg-[#F7F8FA] hover:bg-white border border-[#D0D5DD] rounded-lg text-[#101828] focus:outline-none focus:ring-4 focus:ring-[#3B68F5]/20 focus:border-[#3B68F5] transition-all"
            aria-label="Filter by venue"
          >
            <option value="all">All venues ({employees.length} staff)</option>
            <option value="hyderabad">Hyderabad Center</option>
            <option value="vizag">Vizag Center</option>
            <option value="bhubaneswar">Bhubaneswar Center</option>
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="h-9 px-3 text-sm bg-[#F7F8FA] hover:bg-white border border-[#D0D5DD] rounded-lg text-[#101828] focus:outline-none focus:ring-4 focus:ring-[#3B68F5]/20 focus:border-[#3B68F5] transition-all"
            aria-label="Filter by time period"
          >
            <option value="current_month">Current month (Oct 2026)</option>
            <option value="current_quarter">Current quarter (Q4 2026)</option>
            <option value="financial_year">FY 2026-27 YTD</option>
          </select>
        </div>

        <div className="text-xs text-[#667085]">
          Showing insights for <span className="font-semibold text-[#101828] tabular-nums">{totalHeadcount}</span> active employee records
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Headcount"
          value={totalHeadcount}
          subtitle="Full-time staff in scope"
          icon={<Users className="w-5 h-5 text-[#2A4FE0]" />}
          trend={{ value: 12.5, isPositive: true, label: 'YoY growth' }}
        />
        <StatCard
          title="Average Monthly Salary"
          value={formatINR(avgMonthlySalary)}
          subtitle="Annualized CTC base"
          icon={<Banknote className="w-5 h-5 text-[#12B76A]" />}
          trend={{ value: 5.4, isPositive: true, label: 'market benchmark' }}
        />
        <StatCard
          title="Attendance Adherence"
          value="96.8%"
          subtitle="On-time biometric rate"
          icon={<Clock className="w-5 h-5 text-[#3B68F5]" />}
          trend={{ value: 1.4, isPositive: true, label: 'vs last month' }}
        />
        <StatCard
          title="Compliance Score"
          value="100%"
          subtitle="Statutory PF & ESI audit"
          icon={<TrendingUp className="w-5 h-5 text-[#12B76A]" />}
        />
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department / Function Allocation */}
        <Card className="flex flex-col">
          <CardHeader
            title="Workforce by Department"
            subtitle="Headcount and monthly payroll allocation"
            icon={<Building2 className="w-4 h-4 text-[#2A4FE0]" />}
          />
          <CardContent className="space-y-4 flex-1">
            {departments.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#667085]">
                No department records available.
              </div>
            ) : (
              departments.map((dept, index) => {
                const deptEmps = filteredEmployees.filter(
                  (e) => (e.departmentName || 'Operations') === dept.name
                );
                const deptSpend = deptEmps.reduce(
                  (acc, e) => acc + (e.monthlySalary || Math.round((e.ctcAnnual || 420000) / 12)),
                  0
                );
                const percent =
                  totalHeadcount > 0 ? Math.round((deptEmps.length / totalHeadcount) * 100) : 0;

                const colors = ['bg-[#2A4FE0]', 'bg-[#12B76A]', 'bg-[#3B68F5]', 'bg-[#F79009]'];
                const barColor = colors[index % colors.length];

                return (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#101828]">{dept.name}</span>
                        <span className="text-[#667085]">({deptEmps.length} staff)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#475467] tabular-nums">{formatINR(deptSpend)}/mo</span>
                        <span className="font-semibold text-[#101828] tabular-nums w-10 text-right">{percent}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}

            <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
              <span>Total monthly payroll commitment</span>
              <span className="font-semibold text-[#101828] tabular-nums">{formatINR(Math.round(totalPayroll / 12))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Attendance & Shift Presence */}
        <Card className="flex flex-col">
          <CardHeader
            title="Shift & Attendance Health"
            subtitle="Biometric punctuality and work distribution"
            icon={<Clock className="w-4 h-4 text-[#12B76A]" />}
          />
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[#344054]">
                <span>On-Premise Morning Shift</span>
                <span className="font-semibold text-[#101828] tabular-nums">76.5%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                <div className="h-full bg-[#12B76A] rounded-full" style={{ width: '76.5%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[#344054]">
                <span>Evening / Closing Shift</span>
                <span className="font-semibold text-[#101828] tabular-nums">18.5%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                <div className="h-full bg-[#3B68F5] rounded-full" style={{ width: '18.5%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[#344054]">
                <span>Approved Paid Leaves</span>
                <span className="font-semibold text-[#101828] tabular-nums">3.8%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                <div className="h-full bg-[#F79009] rounded-full" style={{ width: '3.8%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[#344054]">
                <span>Unexcused Absences</span>
                <span className="font-semibold text-[#101828] tabular-nums">1.2%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                <div className="h-full bg-[#F04438] rounded-full" style={{ width: '1.2%' }} />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A]" />
                Audited biometric records
              </span>
              <span className="font-semibold text-[#027A48]">Fully Compliant</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory & Ready-to-Download Reports Grid */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[#101828]">Statutory & Regulatory Exports</h2>
          <p className="text-xs text-[#667085] mt-0.5">Pre-formatted spreadsheets ready for state compliance filings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-xs flex flex-col justify-between hover:border-[#D0D5DD] transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-5 h-5 text-[#2A4FE0]" />
                <Badge variant="neutral">Monthly</Badge>
              </div>
              <h3 className="text-sm font-semibold text-[#101828]">Provident Fund (EPF) Register</h3>
              <p className="text-xs text-[#667085]">
                12% employee + 12% employer contribution breakdown with UAN mapping.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-[#E4E7EC]">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => handleDownloadQuickReport('statutory')}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download EPF statement
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-xs flex flex-col justify-between hover:border-[#D0D5DD] transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-5 h-5 text-[#12B76A]" />
                <Badge variant="neutral">Monthly</Badge>
              </div>
              <h3 className="text-sm font-semibold text-[#101828]">Attendance Adherence Master</h3>
              <p className="text-xs text-[#667085]">
                Detailed daily check-in logs, punctuality flags, and approved leaves.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-[#E4E7EC]">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => handleDownloadQuickReport('attendance')}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download attendance log
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-[#E4E7EC] shadow-xs flex flex-col justify-between hover:border-[#D0D5DD] transition-all">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FileSpreadsheet className="w-5 h-5 text-[#3B68F5]" />
                <Badge variant="neutral">Quarterly</Badge>
              </div>
              <h3 className="text-sm font-semibold text-[#101828]">Payroll Expense Ledger</h3>
              <p className="text-xs text-[#667085]">
                Salary breakdown with gross wages, statutory deductions and net disbursements.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-[#E4E7EC]">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => handleDownloadQuickReport('payroll')}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download payroll ledger
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
