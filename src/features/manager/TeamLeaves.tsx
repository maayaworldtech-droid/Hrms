import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import { overlappingLeaveCount } from '@/utils/operations';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { LeaveRequest, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { formatDate, formatLabel } from '@/utils/formatters';
import { leaveStatusVariant } from '@/utils/status';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';

export const TeamLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const filters = useOperationsFilters();
  const [team, setTeam] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [comments, setComments] = useState('');
  const managerId = user?.id || '';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allEmps, allLeaves] = await Promise.all([api.employees.getAll(), api.leaves.getAll()]);
      const myTeam = allEmps.filter((e) => getReportingManager(e).id === managerId);
      setTeam(myTeam);
      const teamIds = new Set(myTeam.map((e) => e.id));
      setTeamLeaves(allLeaves.filter((l) => teamIds.has(l.employeeId)));
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load team leave' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, managerId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openReview = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setComments('');
  };

  const handleDecision = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave || saving || (status === 'REJECTED' && !comments.trim())) return;
    setSaving(true);
    try {
      await api.leaves.updateStatus(
        selectedLeave.id,
        status,
        comments.trim() || (status === 'APPROVED' ? 'Approved by center manager' : 'Declined: not enough staff at the center on these dates'),
        user?.name || 'Manager'
      );
      dispatch(addToast({ type: 'success', title: status === 'APPROVED' ? 'Leave approved' : 'Leave declined', message: `Decision saved for ${selectedLeave.employeeName}.` }));
      setSelectedLeave(null);
      setComments('');
      void loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not save decision', message: 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const filtered = teamLeaves
    .filter((request) => {
      const employee = team.find((person) => person.id === request.employeeId);
      return (
        (!filters.leaveDate || (request.startDate <= filters.leaveDate && request.endDate >= filters.leaveDate)) &&
        (filters.venue === 'ALL' || (request.location || employee?.location) === filters.venue) &&
        (filters.shift === 'ALL' || (employee?.shift || 'MORNING') === filters.shift) &&
        (filters.status === 'ALL' || request.status === filters.status)
      );
    })
    .sort((a, b) => Number(b.status === 'PENDING') - Number(a.status === 'PENDING') || b.appliedOn.localeCompare(a.appliedOn));

  const pendingCount = filtered.filter((l) => l.status === 'PENDING').length;

  const columns: Column<LeaveRequest>[] = [
    { key: 'employeeName', header: 'Teammate', sortable: true, render: (row) => <span className="font-medium text-slate-900">{row.employeeName}</span> },
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
      render: (row) =>
        row.status === 'PENDING' ? (
          <Button variant="outline" size="xs" onClick={() => openReview(row)}>
            Review
          </Button>
        ) : (
          <span className="text-xs text-slate-600">{row.reviewedBy ? `By ${row.reviewedBy}` : 'Decided'}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave approvals"
        description={pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting for your decision.` : 'Approve or decline leave requests from your team.'}
      />

      <OperationsFilters venues={[...new Set(team.map((employee) => employee.location))]} />

      <DataTable
        key={[filters.venue, filters.shift, filters.status, filters.leaveDate].join(':')}
        data={filtered}
        columns={columns}
        mobileRender={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{row.employeeName}</span>
              <Badge variant={leaveStatusVariant(row.status)} size="sm" dot>
                {formatLabel(row.status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-700">
              {formatLabel(row.leaveType)} · {formatDate(row.startDate)}
              {row.endDate !== row.startDate ? ` to ${formatDate(row.endDate)}` : ''} · {row.days} day{row.days > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-slate-600 line-clamp-2">{row.reason}</p>
            {row.status === 'PENDING' && (
              <Button variant="outline" size="sm" onClick={() => openReview(row)}>
                Review request
              </Button>
            )}
          </div>
        )}
        searchPlaceholder="Search by teammate or reason"
        exportFileName="maaya_team_leaves"
        isLoading={isLoading}
        emptyTitle={team.length === 0 ? 'No one reports to you yet' : 'No leave requests'}
        emptyDescription={team.length === 0 ? 'Ask an admin to assign staff to you from the Employees page.' : 'Nothing matches the current filters.'}
      />

      <Modal
        isOpen={Boolean(selectedLeave)}
        onClose={() => setSelectedLeave(null)}
        title="Review leave request"
        subtitle={selectedLeave?.employeeName}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedLeave(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={saving || !comments.trim()} onClick={() => handleDecision('REJECTED')}>
              Decline
            </Button>
            <Button isLoading={saving} onClick={() => handleDecision('APPROVED')}>
              Approve
            </Button>
          </>
        }
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
              <dt>Reason</dt>
              <dd className="font-normal">{selectedLeave.reason}</dd>
              <dt>Coverage</dt>
              <dd className="font-normal">
                {overlappingLeaveCount(selectedLeave, teamLeaves, team)} colleagues at the same center and shift have approved leave overlapping these dates.
              </dd>
            </dl>
            <Textarea
              label="Note to the employee"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Required when declining"
              helperText="Shown to the employee with your decision."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
