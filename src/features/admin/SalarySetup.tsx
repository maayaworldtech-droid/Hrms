import React, { useState } from 'react';
import { calculateSalaryFromCTC } from '@/utils/salaryCalculator';
import { formatINR } from '@/utils/formatters';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import {
  FileSpreadsheet,
  Calculator,
  ShieldCheck,
  Check,
  Building2,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const SalarySetup: React.FC = () => {
  const dispatch = useAppDispatch();
  const [annualCTC, setAnnualCTC] = useState<number>(1800000);
  const [templateName, setTemplateName] = useState<string>('Standard Enterprise SDE-II');

  const components = calculateSalaryFromCTC(annualCTC);

  const presets = [
    { name: 'Associate Level (L1)', ctc: 800000 },
    { name: 'Mid-Senior Level (L2)', ctc: 1800000 },
    { name: 'Lead Architect (L3)', ctc: 3000000 },
    { name: 'Executive Director (L4)', ctc: 4800000 },
  ];

  const handleSavePolicy = () => {
    dispatch(
      addToast({
        type: 'success',
        title: 'Salary Structure Saved',
        message: `Updated formula parameters for ${templateName} template.`,
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salary Structure & CTC Builder</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Indian statutory earnings, EPF/EPS compliance, professional tax and take-home rules
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSavePolicy}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Save Structure Template
        </Button>
      </div>

      {/* Preset Bands */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              setAnnualCTC(preset.ctc);
              setTemplateName(preset.name);
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              annualCTC === preset.ctc
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500 uppercase">{preset.name}</div>
            <div className="text-base font-bold text-slate-900 mt-1">{formatINR(preset.ctc)}</div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Click to simulate</div>
          </button>
        ))}
      </div>

      {/* Simulator Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: CTC Input & Component Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="CTC Computation Engine"
              subtitle="Real-time Indian statutory payroll disaggregation"
              icon={<Calculator className="w-4 h-4" />}
            />
            <CardContent className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Simulated Annual Cost to Company (CTC)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="400000"
                    max="6000000"
                    step="50000"
                    value={annualCTC}
                    onChange={(e) => setAnnualCTC(Number(e.target.value))}
                    className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="w-44">
                    <Input
                      type="number"
                      value={annualCTC}
                      onChange={(e) => setAnnualCTC(Number(e.target.value))}
                      className="!py-1.5 font-bold font-mono text-indigo-700"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-emerald-50/60 p-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Monthly Earnings (A)
                    </span>
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      {formatINR(components.grossMonthly)}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Basic Salary (45%)</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.basic)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>House Rent Allowance (HRA 50%)</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.hra)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Special Allowance</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.specialAllowance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Conveyance Allowance</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.conveyanceAllowance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Medical Allowance</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.medicalAllowance)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-rose-50/60 p-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                      Monthly Deductions (B)
                    </span>
                    <span className="text-xs font-bold text-rose-700 font-mono">
                      {formatINR(components.totalDeductions)}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Employee Provident Fund (12%)</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.epfEmployee)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Professional Tax (State PT)</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.professionalTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Group Health Insurance</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.healthInsurance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>TDS / Income Tax (Estimated)</span>
                      <span className="font-semibold text-slate-900 font-mono">{formatINR(components.tds)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
                      <span>Employer PF Contribution (In CTC)</span>
                      <span className="font-mono">{formatINR(components.epfEmployer)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                    Net Take-Home Pay (A - B)
                  </span>
                  <div className="text-2xl font-black mt-0.5 tracking-tight text-white">
                    {formatINR(components.netMonthly)} <span className="text-xs font-normal text-slate-300">/ month</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300">Annual Net Take-Home</span>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    {formatINR(components.netMonthly * 12)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Statutory Rules & Compliance */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Statutory Standards"
              subtitle="Indian regulatory guidelines"
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <CardContent className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="font-semibold text-slate-900 mb-1">EPFO Guidelines</div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Employee contribution is mandatory at 12% of Basic salary. Matching 12% employer contribution is deposited to EPF & EPS.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="font-semibold text-slate-900 mb-1">HRA Exemption (Sec 10(13A))</div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Configured at 50% of Basic for metro corporate locations (Bangalore, Mumbai, Delhi, Chennai, Kolkata).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="font-semibold text-slate-900 mb-1">Professional Tax Act</div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Flat ₹200 deducted monthly according to standard state professional tax schedules.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="font-semibold text-slate-900 mb-1">Income Tax New Regime</div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Standard deduction of ₹75,000 applies automatically. Slabs calculated with marginal tax relief.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
