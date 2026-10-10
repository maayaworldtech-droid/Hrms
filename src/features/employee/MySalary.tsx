import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Payslip } from '@/types';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatINR, numberToIndianWords } from '@/utils/formatters';
import { calculateSalaryFromCTC } from '@/utils/salaryCalculator';
import {
  CreditCard,
  Printer,
  Download,
  Eye,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

export const MySalary: React.FC = () => {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const employeeId = 'emp-003'; // Priya Sharma (CTC: 18,00,000 INR)
  const ctcAnnual = 1800000;
  const currentStructure = calculateSalaryFromCTC(ctcAnnual);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.payroll.getPayslipsByEmployee(employeeId);
      setPayslips(data);
      if (data.length > 0) {
        setSelectedPayslip(data[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPayslipModal = (slip: Payslip) => {
    setSelectedPayslip(slip);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Salary & Payslips
        </h1>
        <p className="text-xs text-slate-500">
          Priya Sharma • Staff Code: MW-1003
        </p>
      </div>

      {/* Net Pay Hero Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Net Take-Home Pay
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Disbursed
          </span>
        </div>

        <div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight tabular-nums">
            {formatINR(currentStructure.netMonthly)}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Credited to HDFC Bank (A/C ending in 5827)
          </p>
        </div>

        {/* Breakdown Summary */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Monthly Gross</span>
            <span className="font-bold text-slate-800 font-mono text-sm">
              {formatINR(currentStructure.grossMonthly)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 block font-medium">Total Deductions</span>
            <span className="font-bold text-rose-600 font-mono text-sm">
              {formatINR(currentStructure.totalDeductions)}
            </span>
          </div>
        </div>

        {/* Annual CTC and PF Info */}
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-medium text-indigo-700 block">Annual CTC</span>
            <span className="font-bold text-slate-900 font-mono">{formatINR(ctcAnnual)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-indigo-700 block">EPFO UAN</span>
            <span className="font-mono text-slate-800">100928374653</span>
          </div>
        </div>
      </div>

      {/* Payslips History List (Mobile Cards - No wide table) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700">Statement History</span>
          <span>{payslips.length} statement(s)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading payslips...
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <FileText className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-700 mt-2">No payslips available</p>
          </div>
        ) : (
          payslips.map((slip) => (
            <div
              key={slip.id}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {slip.month} {slip.year}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ref: {slip.id}
                  </span>
                </div>

                <Badge
                  variant={slip.paymentStatus === 'PAID' ? 'success' : 'warning'}
                  size="sm"
                  dot
                >
                  {slip.paymentStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Net Credited</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {formatINR(slip.components.netMonthly)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Disbursed Via</span>
                  <span className="font-medium text-slate-700">
                    {slip.paymentMode || 'NEFT'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => openPayslipModal(slip)}
                  leftIcon={<Eye className="w-4 h-4" />}
                  className="w-full !py-2.5 !text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  View Payslip
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile-Optimized Printable Payslip Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Payslip: ${selectedPayslip.month} ${selectedPayslip.year}`}
          subtitle={`${selectedPayslip.employeeName} (${selectedPayslip.employeeCode})`}
          size="md"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Header Document Brand */}
            <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <img src={maayaLogo} alt="Maaya World" className="h-6 w-auto object-contain" />
                  <span className="text-sm font-bold text-slate-900">Maaya World</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hyderabad Center • Telangana
                </p>
              </div>
              <div className="text-right">
                <Badge variant="purple" size="sm">PAYSLIP</Badge>
                <div className="text-xs font-bold text-slate-900 mt-1">
                  {selectedPayslip.month} {selectedPayslip.year}
                </div>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Staff Name</span>
                <strong className="text-slate-800">{selectedPayslip.employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Staff Code</span>
                <strong className="font-mono text-slate-800">{selectedPayslip.employeeCode}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Bank Account</span>
                <span className="font-mono text-slate-700">{selectedPayslip.bankAccount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">PAN</span>
                <span className="font-mono text-slate-700">{selectedPayslip.panNumber}</span>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-900 flex justify-between text-xs">
                <span>Earnings</span>
                <span>Amount</span>
              </div>
              <div className="p-2.5 space-y-1.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Basic Salary</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.basic)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">House Rent Allowance</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.hra)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Special Allowance</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.specialAllowance)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                  <span>Gross Earnings</span>
                  <span className="font-mono">{formatINR(selectedPayslip.components.grossMonthly)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Breakdown */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-900 flex justify-between text-xs">
                <span>Deductions</span>
                <span>Amount</span>
              </div>
              <div className="p-2.5 space-y-1.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Provident Fund (EPF)</span>
                  <span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.epfEmployee)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Professional Tax (PT)</span>
                  <span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.professionalTax)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                  <span>Total Deductions</span>
                  <span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Amount Highlight */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Net Salary Credited
                </span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {formatINR(selectedPayslip.components.netMonthly)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {numberToIndianWords(selectedPayslip.components.netMonthly)}
                </p>
              </div>
              <Badge variant="success" size="sm">
                PAID
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
                className="w-1/2 !py-2.5 !text-xs font-semibold"
              >
                Print
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 !py-2.5 !text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
