import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { OnDutyRequest, OnDutyType, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import {
  Check,
  X,
  Eye,
  Receipt,
  Briefcase,
  Search,
  Clock,
  Calendar,
  Plus,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const DUTY_TYPES: { value: OnDutyType; label: string }[] = [
  { value: 'BANK_DEPOSIT', label: 'Bank Deposit / Cash Handling' },
  { value: 'PROCUREMENT', label: 'Procurement / Purchases' },
  { value: 'CLIENT_VISIT', label: 'Client / Site Visit' },
  { value: 'DELIVERY', label: 'Delivery / Courier Handling' },
  { value: 'OFFICIAL_ERRAND', label: 'Official Outdoor Errand' },
  { value: 'OTHER', label: 'Other Outdoor Duty' },
];

export const OnDutyManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'EXPENSES'>('ALL');

  // Assign On Duty Modal (Admin can assign task to an employee)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignDate, setAssignDate] = useState(() => businessDate());
  const [assignStartTime, setAssignStartTime] = useState('10:00');
  const [assignEndTime, setAssignEndTime] = useState('14:00');
  const [assignType, setAssignType] = useState<OnDutyType>('BANK_DEPOSIT');
  const [assignReason, setAssignReason] = useState('');

  // Decision Modal
  const [selectedDuty, setSelectedDuty] = useState<OnDutyRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [dutyComments, setDutyComments] = useState('');

  // Reimbursement Modal
  const [reimburseTarget, setReimburseTarget] = useState<OnDutyRequest | null>(null);
  const [reimburseAction, setReimburseAction] = useState<'REIMBURSED' | 'REJECTED' | null>(null);
  const [reimburseComments, setReimburseComments] = useState('');

  // Bill preview modal
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dutyList, empList] = await Promise.all([
        api.onDuty.getAll().catch(() => []),
        api.employees.getAll().catch(() => []),
      ]);
      setRequests(Array.isArray(dutyList) ? dutyList : []);
      setEmployees(Array.isArray(empList) ? empList : []);
      if (empList.length > 0 && !assignEmpId) {
        setAssignEmpId(String(empList[0].id));
      }
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load On Duty records' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmpId || !assignReason.trim()) {
      dispatch(addToast({ type: 'error', title: 'Incomplete', message: 'Please select an employee and state the duty purpose.' }));
      return;
    }

    setSaving(true);
    try {
      const emp = employees.find((x) => String(x.id) === assignEmpId);
      await api.onDuty.apply({
        employeeId: assignEmpId,
        employeeName: emp?.fullName || 'Assigned Employee',
        departmentName: emp?.designation || 'Operations',
        location: emp?.location || 'Hyderabad',
        dutyDate: assignDate,
        startTime: assignStartTime,
        endTime: assignEndTime,
        dutyType: assignType,
        reason: assignReason.trim(),
        status: 'APPROVED', // Admin directly approves assigned task
        reviewedBy: currentUser?.name || 'Administrator',
        reviewedOn: new Date().toISOString().split('T')[0],
        reviewerComments: 'Assigned directly by Administrator',
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'On Duty Task Assigned',
          message: `Outdoor duty assigned to ${emp?.fullName || 'employee'}.`,
        })
      );

      setIsAssignModalOpen(false);
      setAssignReason('');
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Assignment Failed', message: err?.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDutyDecision = async () => {
    if (!selectedDuty || !decisionAction || saving) return;
    setSaving(true);
    try {
      await api.onDuty.updateStatus(
        selectedDuty.id,
        decisionAction,
        dutyComments || (decisionAction === 'APPROVED' ? 'Approved by Admin' : 'Declined by Admin'),
        currentUser?.name || 'Administrator'
      );

      dispatch(
        addToast({
          type: decisionAction === 'APPROVED' ? 'success' : 'info',
          title: `Duty ${decisionAction === 'APPROVED' ? 'Approved' : 'Declined'}`,
          message: `Decision recorded for ${selectedDuty.employeeName}`,
        })
      );

      setSelectedDuty(null);
      setDecisionAction(null);
      setDutyComments('');
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Action failed', message: err?.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleReimbursementDecision = async () => {
    if (!reimburseTarget || !reimburseAction || saving) return;
    setSaving(true);
    try {
      await api.onDuty.updateReimbursement(
        reimburseTarget.id,
        reimburseAction,
        reimburseComments || (reimburseAction === 'REIMBURSED' ? 'Reimbursement authorized by Admin' : 'Bill claim rejected'),
        currentUser?.name || 'Administrator'
      );

      dispatch(
        addToast({
          type: reimburseAction === 'REIMBURSED' ? 'success' : 'info',
          title: `Reimbursement ${reimburseAction === 'REIMBURSED' ? 'Disbursed' : 'Declined'}`,
          message: `${reimburseAction === 'REIMBURSED' ? '₹' + reimburseTarget.expenseAmount : 'Claim'} updated for ${reimburseTarget.employeeName}`,
        })
      );

      setReimburseTarget(null);
      setReimburseAction(null);
      setReimburseComments('');
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Action failed', message: err?.message }));
    } finally {
      setSaving(false);
    }
  };

  const formatDutyType = (type: OnDutyType) => {
    switch (type) {
      case 'BANK_DEPOSIT':
        return 'Bank Deposit';
      case 'PROCUREMENT':
        return 'Purchases';
      case 'CLIENT_VISIT':
        return 'Client Visit';
      case 'DELIVERY':
        return 'Delivery / Courier';
      case 'OFFICIAL_ERRAND':
        return 'Official Errand';
      default:
        return 'On Duty';
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === 'PENDING' && req.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && req.status !== 'APPROVED') return false;
      if (statusFilter === 'EXPENSES' && (!req.hasExpense || req.reimbursementStatus === 'NONE')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = req.employeeName?.toLowerCase().includes(q);
        const matchesReason = req.reason?.toLowerCase().includes(q);
        const matchesType = req.dutyType?.toLowerCase().includes(q);
        if (!matchesName && !matchesReason && !matchesType) return false;
      }

      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  // Totals
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const totalReimbursed = requests
    .filter((r) => r.reimbursementStatus === 'REIMBURSED')
    .reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
  const pendingReimbursements = requests
    .filter((r) => r.reimbursementStatus === 'PENDING')
    .reduce((sum, r) => sum + (r.expenseAmount || 0), 0);

  const columns: Column<OnDutyRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">{row.employeeName}</span>
          <span className="text-[11px] text-slate-500">{row.departmentName || 'Operations'}</span>
        </div>
      ),
    },
    {
      key: 'dutyDate',
      header: 'Date & Time',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-medium text-slate-900">{formatDate(row.dutyDate)}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {row.startTime} – {row.endTime}
          </div>
        </div>
      ),
    },
    {
      key: 'dutyType',
      header: 'Duty Purpose',
      render: (row) => (
        <div className="space-y-1 max-w-xs text-xs">
          <Badge variant="purple" size="sm">{formatDutyType(row.dutyType)}</Badge>
          <p className="text-slate-700 text-[11px] line-clamp-2 leading-relaxed">
            {row.reason}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Approval',
      sortable: true,
      render: (row) => (
        <div className="space-y-1.5">
          {row.status === 'PENDING' && (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Pending
              </span>
              <button
                onClick={() => {
                  setSelectedDuty(row);
                  setDecisionAction('APPROVED');
                  setDutyComments('');
                }}
                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                title="Approve Duty"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedDuty(row);
                  setDecisionAction('REJECTED');
                  setDutyComments('');
                }}
                className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                title="Decline Duty"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {row.status === 'APPROVED' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Approved
            </span>
          )}
          {row.status === 'REJECTED' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Declined
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'expenseAmount',
      header: 'Expenses & Claims',
      render: (row) => {
        if (!row.hasExpense || !row.expenseAmount || row.expenseAmount <= 0) {
          return <span className="text-[11px] text-slate-400">None</span>;
        }

        return (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                ₹{row.expenseAmount.toLocaleString('en-IN')}
              </span>
              {row.billPhoto && (
                <button
                  onClick={() => setPreviewBillUrl(row.billPhoto || null)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Bill</span>
                </button>
              )}
            </div>

            {row.reimbursementStatus === 'PENDING' && (
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Claim Pending
                </span>
                <button
                  onClick={() => {
                    setReimburseTarget(row);
                    setReimburseAction('REIMBURSED');
                    setReimburseComments('');
                  }}
                  className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                  title="Disburse Reimbursement"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setReimburseTarget(row);
                    setReimburseAction('REJECTED');
                    setReimburseComments('');
                  }}
                  className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                  title="Decline Reimbursement"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {row.reimbursementStatus === 'REIMBURSED' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Reimbursed
              </span>
            )}

            {row.reimbursementStatus === 'REJECTED' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Claim Rejected
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">On Duty (OD) Management</h1>
          <p className="text-xs text-slate-500">Track company outdoor assignments, bank runs, site errands, and employee bill reimbursements</p>
        </div>
        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--brand-600)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-700)] transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Assign On Duty</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Pending Duty Approvals</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting manager authorization</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Pending Reimbursements</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{pendingReimbursements.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Submitted receipts awaiting verification</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Total Reimbursed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{totalReimbursed.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Disbursed for official company tasks</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(
            [
              { key: 'ALL', label: 'All Assignments' },
              { key: 'PENDING', label: `Pending Approvals (${pendingCount})` },
              { key: 'APPROVED', label: 'Approved Duties' },
              { key: 'EXPENSES', label: 'Expense Claims' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, task or reason…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        emptyTitle="No On Duty records found."
      />

      {/* Assign On Duty Modal */}
      {isAssignModalOpen && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Assign On Duty to Employee"
          subtitle="Assign an outdoor duty task (bank deposit, purchases, errands, site visit)"
        >
          <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignEmpId}
                onChange={(e) => setAssignEmpId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode} - {emp.designation || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Duty Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Start Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={assignStartTime}
                  onChange={(e) => setAssignStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  End Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={assignEndTime}
                  onChange={(e) => setAssignEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Duty Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={assignType}
                onChange={(e) => setAssignType(e.target.value as OnDutyType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              >
                {DUTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Task Instructions & Destination <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Deposit cash at HDFC Bank Madhapur branch. Collect deposit slip."
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--brand-600)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-700)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Assigning…' : 'Assign Duty'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Duty Decision Modal */}
      {selectedDuty && decisionAction && (
        <Modal
          isOpen={!!selectedDuty}
          onClose={() => {
            setSelectedDuty(null);
            setDecisionAction(null);
            setDutyComments('');
          }}
          title={`${decisionAction === 'APPROVED' ? 'Approve' : 'Decline'} On Duty Request`}
          subtitle={`Employee: ${selectedDuty.employeeName} • ${formatDate(selectedDuty.dutyDate)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-slate-900">{formatDutyType(selectedDuty.dutyType)}</div>
              <div className="text-slate-600 font-mono text-[11px]">
                {selectedDuty.startTime} – {selectedDuty.endTime}
              </div>
              <p className="text-slate-700 pt-1">{selectedDuty.reason}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reviewer Comments / Instructions
              </label>
              <textarea
                rows={3}
                placeholder={
                  decisionAction === 'APPROVED'
                    ? 'Add instructions or approval remarks...'
                    : 'Provide justification for declining this request...'
                }
                value={dutyComments}
                onChange={(e) => setDutyComments(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedDuty(null);
                  setDecisionAction(null);
                  setDutyComments('');
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDutyDecision}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                  decisionAction === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {saving
                  ? 'Saving…'
                  : decisionAction === 'APPROVED'
                  ? 'Confirm Approval'
                  : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reimbursement Decision Modal */}
      {reimburseTarget && reimburseAction && (
        <Modal
          isOpen={!!reimburseTarget}
          onClose={() => {
            setReimburseTarget(null);
            setReimburseAction(null);
            setReimburseComments('');
          }}
          title={`${reimburseAction === 'REIMBURSED' ? 'Approve & Disburse' : 'Decline'} Reimbursement Claim`}
          subtitle={`Claim: ₹${reimburseTarget.expenseAmount?.toLocaleString('en-IN')} for ${reimburseTarget.employeeName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  Amount: ₹{reimburseTarget.expenseAmount?.toLocaleString('en-IN')}
                </span>
                {reimburseTarget.billPhoto && (
                  <button
                    onClick={() => setPreviewBillUrl(reimburseTarget.billPhoto || null)}
                    className="text-[11px] font-semibold text-[var(--brand-600)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Attached Bill
                  </button>
                )}
              </div>
              <p className="text-slate-600 text-[11px]">{reimburseTarget.expenseDescription}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Admin Comments
              </label>
              <textarea
                rows={3}
                placeholder={
                  reimburseAction === 'REIMBURSED'
                    ? 'e.g., Verified receipt against bank transfer / petty cash reference...'
                    : 'State reason for rejecting receipt / expense claim...'
                }
                value={reimburseComments}
                onChange={(e) => setReimburseComments(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReimburseTarget(null);
                  setReimburseAction(null);
                  setReimburseComments('');
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleReimbursementDecision}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                  reimburseAction === 'REIMBURSED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {saving
                  ? 'Saving…'
                  : reimburseAction === 'REIMBURSED'
                  ? 'Disburse Reimbursement'
                  : 'Decline Reimbursement'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bill Preview Modal */}
      {previewBillUrl && (
        <Modal
          isOpen={!!previewBillUrl}
          onClose={() => setPreviewBillUrl(null)}
          title="Uploaded Bill Receipt"
          subtitle="Expense verification document"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center p-2 bg-slate-950 rounded-lg">
              <img
                src={previewBillUrl}
                alt="Uploaded receipt"
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewBillUrl(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
