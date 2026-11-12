import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { OnDutyRequest, OnDutyType } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';
import {
  Check,
  X,
  Eye,
  Receipt,
  Briefcase,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';
import { dutyTypeLabel } from '@/utils/dutyTypes';

export const TeamOnDuty: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_DUTY' | 'APPROVED' | 'PENDING_EXPENSE' | 'REIMBURSED'>('ALL');

  // Duty decision modal
  const [selectedDuty, setSelectedDuty] = useState<OnDutyRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [dutyComments, setDutyComments] = useState('');

  // Reimbursement decision modal
  const [reimburseTarget, setReimburseTarget] = useState<OnDutyRequest | null>(null);
  const [reimburseAction, setReimburseAction] = useState<'REIMBURSED' | 'REJECTED' | null>(null);
  const [reimburseComments, setReimburseComments] = useState('');

  // Bill preview modal
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  const managerId = user?.id || '';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, allEmps] = await Promise.all([
        api.onDuty.getAll().catch(() => []),
        api.employees.getAll().catch(() => []),
      ]);
      const myTeamIds = new Set(
        (Array.isArray(allEmps) ? allEmps : [])
          .filter((e) => getReportingManager(e).id === managerId)
          .map((e) => String(e.id))
      );
      const teamRequests = (Array.isArray(list) ? list : []).filter(
        (req) => myTeamIds.has(String(req.employeeId))
      );
      setRequests(teamRequests);
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load On Duty records' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, managerId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDutyDecision = async () => {
    if (!selectedDuty || !decisionAction || saving) return;
    setSaving(true);
    try {
      await api.onDuty.updateStatus(
        selectedDuty.id,
        decisionAction,
        dutyComments || (decisionAction === 'APPROVED' ? 'Approved for outdoor duty' : 'Declined duty request'),
        user?.name || 'Manager'
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
        reimburseComments || (reimburseAction === 'REIMBURSED' ? 'Reimbursement verified and approved' : 'Bill rejected'),
        user?.name || 'Manager'
      );

      dispatch(
        addToast({
          type: reimburseAction === 'REIMBURSED' ? 'success' : 'info',
          title: `Reimbursement ${reimburseAction === 'REIMBURSED' ? 'Approved' : 'Declined'}`,
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
    return dutyTypeLabel(type);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === 'PENDING_DUTY' && req.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && req.status !== 'APPROVED') return false;
      if (statusFilter === 'PENDING_EXPENSE' && req.reimbursementStatus !== 'PENDING') return false;
      if (statusFilter === 'REIMBURSED' && req.reimbursementStatus !== 'REIMBURSED') return false;

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

  // Statistics
  const pendingDutyCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingExpenseTotal = requests
    .filter((r) => r.reimbursementStatus === 'PENDING')
    .reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
  const pendingExpenseCount = requests.filter((r) => r.reimbursementStatus === 'PENDING').length;

  const columns: Column<OnDutyRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block text-xs">{row.employeeName}</span>
          <span className="text-xs text-slate-500">{row.location || ''}</span>
        </div>
      ),
    },
    {
      key: 'dutyDate',
      header: 'Date & time',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-medium text-slate-900">{formatDate(row.dutyDate)}</div>
          <div className="text-xs text-slate-500 tabular-nums">
            {row.startTime} – {row.endTime}
          </div>
        </div>
      ),
    },
    {
      key: 'dutyType',
      header: 'Duty category & purpose',
      render: (row) => (
        <div className="space-y-1 max-w-xs text-xs">
          <Badge variant="purple" size="sm">{formatDutyType(row.dutyType)}</Badge>
          <p className="text-slate-700 text-xs line-clamp-2 leading-relaxed">
            {row.reason}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Duty approval',
      sortable: true,
      render: (row) => (
        <div className="space-y-1.5">
          {row.status === 'PENDING' && (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
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
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Approved
            </span>
          )}
          {row.status === 'REJECTED' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Declined
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'expenseAmount',
      header: 'Expense & reimbursement',
      render: (row) => {
        if (!row.hasExpense || !row.expenseAmount || row.expenseAmount <= 0) {
          return <span className="text-xs text-slate-500">No expense</span>;
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
                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Bill</span>
                </button>
              )}
            </div>

            {row.reimbursementStatus === 'PENDING' && (
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Claim pending
                </span>
                <button
                  onClick={() => {
                    setReimburseTarget(row);
                    setReimburseAction('REIMBURSED');
                    setReimburseComments('');
                  }}
                  className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                  title="Approve Reimbursement"
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
                  title="Reject Reimbursement"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {row.reimbursementStatus === 'REIMBURSED' && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Reimbursed
              </span>
            )}

            {row.reimbursementStatus === 'REJECTED' && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                Claim rejected
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="On Duty approvals"
        description="Approve work trips outside the center and review expense bills from your team."
      />

      {/* Summary Stat Banners (Flat, clean, no nested cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Pending Duty approvals</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{pendingDutyCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Tasks awaiting manager sign-off</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Pending reimbursements</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{pendingExpenseTotal.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 mt-0.5">{pendingExpenseCount} claim(s) awaiting verification</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500">Total Duty logs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Overall outdoor duty assignments</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'PENDING_DUTY', label: `Pending Duty (${pendingDutyCount})` },
              { key: 'APPROVED', label: 'Approved Duty' },
              { key: 'PENDING_EXPENSE', label: `Expense Claims (${pendingExpenseCount})` },
              { key: 'REIMBURSED', label: 'Reimbursed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search employee or reason…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        emptyTitle="No On Duty records match your search or filter."
      />

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
              <div className="text-slate-600 tabular-nums text-xs">
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
          title={`${reimburseAction === 'REIMBURSED' ? 'Approve' : 'Decline'} Reimbursement Claim`}
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
                    className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View attached bill
                  </button>
                )}
              </div>
              <p className="text-slate-600 text-xs">{reimburseTarget.expenseDescription}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Accounts / Manager Comments
              </label>
              <textarea
                rows={3}
                placeholder={
                  reimburseAction === 'REIMBURSED'
                    ? 'e.g., Verified receipt against petty cash disbursement / bank transfer reference...'
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
                  ? 'Authorize & Reimburse'
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
                Close preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
