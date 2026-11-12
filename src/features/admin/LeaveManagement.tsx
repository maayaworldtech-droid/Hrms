import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import { overlappingLeaveCount } from '@/utils/operations';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { LeaveRequest, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { formatDate, formatLabel } from '@/utils/formatters';
import { leaveStatusVariant } from '@/utils/status';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';

export const LeaveManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const filters = useOperationsFilters();
  const statusFilter = filters.status;
  const setStatusFilter = (value: string) => filters.set('status', value);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, people] = await Promise.all([api.leaves.getAll(), api.employees.getAll()]);
      setLeaves(data);
      setEmployees(people);
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load leave requests' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const contextLeaves = leaves.filter((request) => {
    const employee = employees.find((person) => person.id === request.employeeId);
    return (
      (!filters.leaveDate || (request.startDate <= filters.leaveDate && request.endDate >= filters.leaveDate)) &&
      (filters.venue === 'ALL' || (request.location || employee?.location) === filters.venue) &&
      (filters.shift === 'ALL' || (employee?.shift || 'MORNING') === filters.shift)
    );
  });
  const filteredLeaves = contextLeaves.filter((item) => statusFilter === 'ALL' || item.status === statusFilter);
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
          <div className="font-medium text-slate-900">{row.employeeName}</div>
          <div className="text-xs text-slate-600">{row.location || 'No center'}</div>
        </div>
      ),
    },
    { key: 'leaveType', header: 'Type', sortable: true, render: (row) => formatLabel(row.leaveType) },
    {
      key: 'startDate',
      header: 'Dates',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-900">
            {formatDate(row.startDate)}
            {row.endDate !== row.startDate ? ` to ${formatDate(row.endDate)}` : ''}
          </div>
          <div className="text-xs text-slate-600">
            {row.days} day{row.days > 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="line-clamp-1 max-w-xs text-slate-700" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    { key: 'appliedOn', header: 'Applied', sortable: true, render: (row) => formatDate(row.appliedOn) },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={leaveStatusVariant(row.status)} size="sm" dot>
          {formatLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="xs" onClick={() => setSelectedLeave(row)}>
          View
        </Button>
      ),
    },
  ];

  const centerOf = (leave: LeaveRequest) => leave.location || employees.find((employee) => employee.id === leave.employeeId)?.location || 'Center not set';

  return (
    <div className="space-y-6">
      <PageHeader title="Leave" description="Leave requests from every center, with their approval status. Managers make the decisions." />

      <OperationsFilters />

      <StatTiles columns={4} aria-label="Leave summary">
        <StatTile label="All requests" value={contextLeaves.length} active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
        <StatTile label="Awaiting manager" value={pendingCount} tone={pendingCount > 0 ? 'warning' : 'neutral'} active={statusFilter === 'PENDING'} onClick={() => setStatusFilter('PENDING')} />
        <StatTile label="Approved" value={approvedCount} tone="success" active={statusFilter === 'APPROVED'} onClick={() => setStatusFilter('APPROVED')} />
        <StatTile label="Declined" value={rejectedCount} active={statusFilter === 'REJECTED'} onClick={() => setStatusFilter('REJECTED')} />
      </StatTiles>

      <DataTable
        key={[filters.venue, filters.shift, filters.status, filters.leaveDate].join(':')}
        data={filteredLeaves}
        columns={columns}
        searchPlaceholder="Search by employee or reason"
        exportFileName="maaya_leave_requests"
        isLoading={isLoading}
        onRowClick={setSelectedLeave}
        defaultSortKey="appliedOn"
        defaultSortOrder="desc"
        emptyTitle="No leave requests"
        emptyDescription="Nothing matches the current filters."
      />

      <Modal
        isOpen={Boolean(selectedLeave)}
        onClose={() => setSelectedLeave(null)}
        title="Leave request"
        subtitle={selectedLeave ? `${selectedLeave.employeeName} · ${centerOf(selectedLeave)}` : undefined}
        size="md"
        footer={<Button variant="outline" onClick={() => setSelectedLeave(null)}>Close</Button>}
      >
        {selectedLeave && (
          <div className="space-y-4">
            <dl className="ops-definition">
              <dt>Type</dt>
              <dd>{formatLabel(selectedLeave.leaveType)}</dd>
              <dt>Dates</dt>
              <dd>
                {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)} · {selectedLeave.days} day{selectedLeave.days > 1 ? 's' : ''}
              </dd>
              <dt>Applied on</dt>
              <dd>{formatDate(selectedLeave.appliedOn)}</dd>
              <dt>Reason</dt>
              <dd className="font-normal">{selectedLeave.reason}</dd>
              <dt>Status</dt>
              <dd>
                <Badge variant={leaveStatusVariant(selectedLeave.status)} size="sm" dot>
                  {formatLabel(selectedLeave.status)}
                </Badge>
              </dd>
              <dt>Reviewed by</dt>
              <dd>{selectedLeave.reviewedBy || 'Awaiting manager decision'}</dd>
              <dt>Decision note</dt>
              <dd className="font-normal">{selectedLeave.reviewerComments || 'No note recorded'}</dd>
            </dl>
            <p className="ops-muted">
              {overlappingLeaveCount(selectedLeave, leaves, employees)} colleagues at the same center and shift have approved leave overlapping these dates.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
