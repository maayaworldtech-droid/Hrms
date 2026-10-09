import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { LeaveRequest, LeaveStatus } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const LeaveManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewerComments, setReviewerComments] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.leaves.getAll();
      setLeaves(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return;
    try {
      await api.leaves.updateStatus(
        selectedLeave.id,
        status,
        'Sarah Jenkins (Admin)',
        reviewerComments || (status === 'APPROVED' ? 'Approved by People Ops' : 'Rejected due to business constraints')
      );
      dispatch(
        addToast({
          type: status === 'APPROVED' ? 'success' : 'info',
          title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
          message: `Updated status for ${selectedLeave.employeeName}`,
        })
      );
      setIsReviewModalOpen(false);
      setReviewerComments('');
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Action failed' }));
    }
  };

  const filteredLeaves = leaves.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter((l) => l.status === 'REJECTED').length;

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.employeeName}</div>
          <div className="text-[11px] text-slate-500">{row.departmentName}</div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Category',
      sortable: true,
      render: (row) => (
        <Badge variant="purple" size="sm">
          {row.leaveType.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Schedule',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-800 font-medium">
            {formatDate(row.startDate)} to {formatDate(row.endDate)}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.days} day{row.days > 1 ? 's' : ''} total
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-slate-600 line-clamp-1 max-w-xs" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: 'appliedOn',
      header: 'Applied On',
      sortable: true,
      render: (row) => formatDate(row.appliedOn),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED'
              ? 'success'
              : row.status === 'PENDING'
              ? 'warning'
              : 'error'
          }
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === 'PENDING' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedLeave(row);
                setReviewerComments('');
                setIsReviewModalOpen(true);
              }}
              className="!py-1 !px-2.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
            >
              Review Request
            </Button>
          ) : (
            <span className="text-slate-400 text-xs">
              {row.reviewedBy ? `Reviewed by ${row.reviewedBy.split(' ')[0]}` : 'Decided'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review time-off requests, statutory maternity/paternity tracking, and balances
          </p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase">All Applications</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{leaves.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Pending Review</span>
          <p className="text-xl font-bold text-amber-700 mt-1">{pendingCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Approved</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{approvedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-rose-500 bg-rose-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-600 uppercase">Declined</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{rejectedCount}</p>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredLeaves}
        columns={columns}
        searchPlaceholder="Search leave requests by employee or reason..."
        exportFileName="pulse_leave_requests"
        isLoading={isLoading}
      />

      {/* Leave Decision Modal */}
      {selectedLeave && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title="Review Leave Application"
          subtitle={`Requested by ${selectedLeave.employeeName} (${selectedLeave.departmentName})`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Type:</span>
                <span className="font-semibold text-slate-900">{selectedLeave.leaveType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date Range:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)} ({selectedLeave.days} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Applied On:</span>
                <span className="text-slate-700">{formatDate(selectedLeave.appliedOn)}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason Provided</label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed">
                {selectedLeave.reason}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reviewer Note / Feedback</label>
              <textarea
                value={reviewerComments}
                onChange={(e) => setReviewerComments(e.target.value)}
                placeholder="Optional feedback for applicant..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleUpdateStatus('REJECTED')}
                leftIcon={<X className="w-4 h-4" />}
              >
                Reject Request
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleUpdateStatus('APPROVED')}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
