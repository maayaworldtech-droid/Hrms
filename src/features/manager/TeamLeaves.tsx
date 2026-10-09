import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { LeaveRequest } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';
import { CalendarDays, Check, X } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const TeamLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const [teamLeaves, setTeamLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [comments, setComments] = useState('');

  const managerId = 'emp-002'; // Rajesh Kumar

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allEmps, allLeaves] = await Promise.all([
        api.employees.getAll(),
        api.leaves.getAll(),
      ]);
      const myTeam = allEmps.filter((e) => e.managerId === managerId || e.departmentName === 'Engineering');
      const teamIds = new Set(myTeam.map((e) => e.id));
      setTeamLeaves(allLeaves.filter((l) => teamIds.has(l.employeeId)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDecision = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return;
    try {
      await api.leaves.updateStatus(
        selectedLeave.id,
        status,
        'Rajesh Kumar (Team Lead)',
        comments || (status === 'APPROVED' ? 'Approved by Team Lead' : 'Declined for project schedule')
      );
      dispatch(
        addToast({
          type: status === 'APPROVED' ? 'success' : 'info',
          title: `Leave ${status === 'APPROVED' ? 'Approved' : 'Declined'}`,
          message: `Decision recorded for ${selectedLeave.employeeName}`,
        })
      );
      setIsDecisionModalOpen(false);
      setComments('');
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Decision recording failed' }));
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employeeName',
      header: 'Teammate',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900">{row.employeeName}</span>
      ),
    },
    {
      key: 'leaveType',
      header: 'Category',
      sortable: true,
      render: (row) => (
        <Badge variant="purple" size="sm">{row.leaveType.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Duration',
      sortable: true,
      render: (row) => (
        <div>
          <span className="text-slate-800 font-medium">{formatDate(row.startDate)} - {formatDate(row.endDate)}</span>
          <div className="text-[11px] text-slate-500">{row.days} day{row.days > 1 ? 's' : ''}</div>
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
                setComments('');
                setIsDecisionModalOpen(true);
              }}
              className="!py-1 !px-2.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
            >
              Review Request
            </Button>
          ) : (
            <span className="text-slate-400 text-xs">Decided</span>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Leave Approvals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, authorize or decline leave applications submitted by engineering direct reports
          </p>
        </div>
      </div>

      <DataTable
        data={teamLeaves}
        columns={columns}
        searchPlaceholder="Filter team leave applications..."
        exportFileName="pulse_team_leaves"
        isLoading={isLoading}
      />

      {/* Decision Modal */}
      {selectedLeave && (
        <Modal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          title="Team Leave Request"
          subtitle={`Submitted by ${selectedLeave.employeeName}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Category:</span>
                <span className="font-semibold text-slate-900">{selectedLeave.leaveType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Period:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)} ({selectedLeave.days} days)
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason Provided</label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed">
                {selectedLeave.reason}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Manager Note / Feedback</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional notes to the team member..."
                rows={3}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsDecisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDecision('REJECTED')}
                leftIcon={<X className="w-4 h-4" />}
              >
                Decline
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleDecision('APPROVED')}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
