import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Payslip } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { formatINR, formatDate, numberToIndianWords } from '@/utils/formatters';
import { calculateSalaryFromCTC } from '@/utils/salaryCalculator';
import {
  CreditCard,
  Printer,
  Download,
  Eye,
  Banknote,
  Building2,
  ShieldCheck,
  Layers,
  CheckCircle2,
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

  const columns: Column<Payslip>[] = [
    {
      key: 'month',
      header: 'Pay Period',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-slate-900">{row.month} {row.year}</span>
      ),
    },
    {
      key: 'grossMonthly',
      header: 'Gross Earnings',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">{formatINR(row.components.grossMonthly)}</span>
      ),
    },
    {
      key: 'totalDeductions',
      header: 'Total Deductions',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-rose-600 font-semibold">{formatINR(row.components.totalDeductions)}</span>
      ),
    },
    {
      key: 'netMonthly',
      header: 'Net Take-Home',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-emerald-700 font-mono">{formatINR(row.components.netMonthly)}</span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Disbursal Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.paymentStatus === 'PAID' ? 'success' : 'warning'} size="sm" dot>
          {row.paymentStatus}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedPayslip(row);
            setIsModalOpen(true);
          }}
          className="!py-1 !px-2.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          View Payslip
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Salary & Payslips</h1>
          <p className="text-xs text-slate-500 mt-1">
            Priya Sharma • CTC structure, statutory deductions breakdown & monthly electronic payslips
          </p>
        </div>
      </div>

      {/* Salary Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold text-indigo-200 tracking-wider">
              Annual Cost to Company (CTC)
            </span>
            <div className="text-3xl font-black font-mono mt-1 text-white">
              {formatINR(ctcAnnual)}
            </div>
            <p className="text-xs text-indigo-200 mt-1">Senior Frontend Engineer Level</p>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-800 flex justify-between text-xs">
            <span className="text-indigo-300">Monthly Gross Budget:</span>
            <span className="font-bold text-white font-mono">{formatINR(Math.round(ctcAnnual / 12))}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
              Net Monthly Take-Home Pay
            </span>
            <div className="text-3xl font-black font-mono mt-1 text-emerald-600">
              {formatINR(currentStructure.netMonthly)}
            </div>
            <p className="text-xs text-slate-500 mt-1">After EPF, PT, Group Health & TDS</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-500">Credited into:</span>
            <span className="font-semibold text-slate-800">HDFC Bank (•••• 5827)</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
              Statutory Provident Fund
            </span>
            <div className="text-2xl font-bold font-mono mt-1 text-slate-900">
              {formatINR(currentStructure.epfEmployee + currentStructure.epfEmployer)}
              <span className="text-xs font-normal text-slate-400"> / mo</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ₹{formatINR(currentStructure.epfEmployee)} (Employee) + ₹{formatINR(currentStructure.epfEmployer)} (Employer)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-500">EPFO UAN:</span>
            <span className="font-mono text-slate-800">100928374653</span>
          </div>
        </div>
      </div>

      {/* Historical Payslips Table */}
      <DataTable
        data={payslips}
        columns={columns}
        searchPlaceholder="Search payslips..."
        exportFileName="my_payslips_statement"
        isLoading={isLoading}
      />

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Electronic Payslip: ${selectedPayslip.month} ${selectedPayslip.year}`}
          subtitle={`Employee: ${selectedPayslip.employeeName} (${selectedPayslip.employeeCode})`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-800 p-2">
            {/* Header Document Brand */}
            <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-auto flex items-center justify-center">
                    <img src={maayaLogo} alt="Maaya World" className="h-7 w-auto object-contain" />
                  </div>
                  <span className="text-base font-bold text-slate-900">Maaya World Pvt. Ltd.</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Maaya World Towers, Level 8, Outer Ring Road, Bellandur, Bangalore, Karnataka - 560103
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Corporate Tax ID: 29AABCM9876F1Z2</p>
              </div>
              <div className="text-right">
                <Badge variant="purple" size="md">PAYSLIP</Badge>
                <div className="text-xs font-bold text-slate-900 mt-1.5">{selectedPayslip.month} {selectedPayslip.year}</div>
                <span className="text-[10px] text-slate-500 font-mono">Ref: {selectedPayslip.id}</span>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div><span className="text-slate-500">Employee Name:</span> <strong className="text-slate-900">{selectedPayslip.employeeName}</strong></div>
              <div><span className="text-slate-500">Employee ID:</span> <strong className="font-mono text-slate-900">{selectedPayslip.employeeCode}</strong></div>
              <div><span className="text-slate-500">Center Location:</span> <strong className="text-slate-900">{selectedPayslip.location || 'Hyderabad Center'}</strong></div>
              <div><span className="text-slate-500">Company:</span> <span className="text-slate-800">Maaya World</span></div>
              <div><span className="text-slate-500">Bank Account:</span> <span className="font-mono text-slate-800">{selectedPayslip.bankAccount}</span></div>
              <div><span className="text-slate-500">Bank Name:</span> <span className="text-slate-800">{selectedPayslip.bankName}</span></div>
              <div><span className="text-slate-500">PAN Number:</span> <span className="font-mono text-slate-800">{selectedPayslip.panNumber}</span></div>
              <div><span className="text-slate-500">UAN (EPFO):</span> <span className="font-mono text-slate-800">{selectedPayslip.uanNumber}</span></div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Earnings Component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Basic Salary</span><span className="font-mono">{formatINR(selectedPayslip.components.basic)}</span></div>
                  <div className="flex justify-between pt-1"><span>House Rent Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.hra)}</span></div>
                  <div className="flex justify-between pt-1"><span>Special Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.specialAllowance)}</span></div>
                  <div className="flex justify-between pt-1"><span>Conveyance Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.conveyanceAllowance)}</span></div>
                  <div className="flex justify-between pt-1"><span>Medical Allowance</span><span className="font-mono">{formatINR(selectedPayslip.components.medicalAllowance)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Gross Earnings (A)</span>
                    <span className="font-mono">{formatINR(selectedPayslip.components.grossMonthly)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>Deductions Component</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-3 space-y-2 divide-y divide-slate-100">
                  <div className="flex justify-between pt-1"><span>Provident Fund (EPF)</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.epfEmployee)}</span></div>
                  <div className="flex justify-between pt-1"><span>Professional Tax (PT)</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.professionalTax)}</span></div>
                  <div className="flex justify-between pt-1"><span>Health Insurance</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.healthInsurance)}</span></div>
                  <div className="flex justify-between pt-1"><span>TDS / Income Tax</span><span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.tds)}</span></div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                    <span>Total Deductions (B)</span>
                    <span className="font-mono text-rose-600">{formatINR(selectedPayslip.components.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Amount Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-xs uppercase tracking-wider">Net Salary Credited</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {formatINR(selectedPayslip.components.netMonthly)}
                </p>
                <p className="text-[11px] text-slate-300 italic mt-1">
                  {numberToIndianWords(selectedPayslip.components.netMonthly)}
                </p>
              </div>
              <Badge variant="success" size="md">
                Status: {selectedPayslip.paymentStatus} via {selectedPayslip.paymentMode}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
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
