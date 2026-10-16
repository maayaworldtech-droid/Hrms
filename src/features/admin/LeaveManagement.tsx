import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import { overlappingLeaveCount } from '@/utils/operations';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import  { LeaveRequest, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';

import  { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const LeaveManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filters = useOperationsFilters();
  const statusFilter = filters.status;
  const setStatusFilter = (value: string) => filters.set('status',value);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, people] = await Promise.all([api.leaves.getAll(), api.employees.getAll()]);
      setLeaves(data); setEmployees(people);
    } catch { dispatch(addToast({ type: 'error', title: 'Could not load leave requests' })); } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { void loadData(); }, [loadData]);

  const contextLeaves = leaves.filter(request => {
    const employee = employees.find(person => person.id === request.employeeId);
    return (!filters.leaveDate || (request.startDate <= filters.leaveDate && request.endDate >= filters.leaveDate)) && (filters.venue === 'ALL' || (request.location || employee?.location) === filters.venue) && (filters.shift === 'ALL' || (employee?.shift || 'MORNING') === filters.shift);
  });
  const filteredLeaves = contextLeaves.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  const pendingCount = contextLeaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = contextLeaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = contextLeaves.filter((l) => l.status === 'REJECTED').length;

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.employeeName}</div>
          <div className="text-[11px] text-slate-500">{row.location || 'Hyderabad'} Center</div>
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
    { key: 'actions', header: 'Details', align: 'right', render: row => <button className="ops-link" onClick={() => { setSelectedLeave(row); setIsReviewModalOpen(true); }}>View request</button> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave records</h1>
          <p className="text-xs text-slate-500 mt-1">
            View leave records for staffing and payroll. Managers approve or decline requests.
          </p>
        </div>
      </div>

      <OperationsFilters />
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
          <p className="text-xl font-bold text-slate-900 mt-1">{contextLeaves.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'PENDING'
              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Awaiting manager</span>
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
        key={[filters.venue,filters.shift,filters.status,filters.leaveDate].join(':')}
        data={filteredLeaves}
        columns={columns}
        searchPlaceholder="Search leave requests by employee or reason..."
        exportFileName="maaya_leave_requests"
        isLoading={isLoading}
      />

      {/* Leave Decision Modal */}
      {selectedLeave && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title="Leave request details"
          subtitle={`Requested by ${selectedLeave.employeeName} · ${selectedLeave.location || employees.find(employee => employee.id === selectedLeave.employeeId)?.location || 'Venue not specified'}`}
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

            <p className="ops-muted">{overlappingLeaveCount(selectedLeave, leaves, employees)} colleagues on the same venue shift have approved leave overlapping these dates.</p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason Provided</label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed">
                {selectedLeave.reason}
              </div>
            </div>

            <dl className="ops-definition"><dt>Status</dt><dd>{selectedLeave.status.toLowerCase()}</dd><dt>Reviewed by</dt><dd>{selectedLeave.reviewedBy || 'Awaiting manager decision'}</dd><dt>Decision note</dt><dd>{selectedLeave.reviewerComments || 'No note recorded'}</dd></dl>
            <p className="ops-muted">Leave decisions are managed by the employee’s assigned Manager.</p>
            <div className="flex justify-end"><Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>Close</Button></div>
          </div>
        </Modal>
      )}
    </div>
  );
};
