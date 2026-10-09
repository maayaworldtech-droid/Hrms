import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import { Clock, Check, X, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const TeamAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const managerId = 'emp-002'; // Rajesh Kumar

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allEmps, allAtt] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getAll(),
      ]);
      const myTeam = allEmps.filter((e) => e.managerId === managerId || e.departmentName === 'Engineering');
      const teamIds = new Set(myTeam.map((e) => e.id));
      setAttendance(allAtt.filter((a) => teamIds.has(a.employeeId)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveRegularization = async (id: string) => {
    try {
      await api.attendance.approveRegularization(id);
      dispatch(
        addToast({
          type: 'success',
          title: 'Regularization Approved',
          message: 'The team member attendance log has been marked Present.',
        })
      );
      setIsModalOpen(false);
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Approval failed' }));
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employeeName',
      header: 'Teammate',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900">{row.employeeName}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'checkIn',
      header: 'Punch In',
      render: (row) => (
        <span className="font-mono text-slate-800">{row.checkIn ? formatTime(row.checkIn) : '--:--'}</span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Punch Out',
      render: (row) => (
        <span className="font-mono text-slate-800">{row.checkOut ? formatTime(row.checkOut) : '--:--'}</span>
      ),
    },
    {
      key: 'workHours',
      header: 'Hours',
      sortable: true,
      render: (row) => `${row.workHours} hrs`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === 'PRESENT'
              ? 'success'
              : row.status === 'WORK_FROM_HOME'
              ? 'info'
              : row.status === 'LATE'
              ? 'warning'
              : 'error'
          }
          size="sm"
          dot
        >
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'regularizationStatus',
      header: 'Regularization',
      render: (row) => {
        if (row.regularizationStatus === 'PENDING') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRecord(row);
                setIsModalOpen(true);
              }}
              className="!py-1 !px-2.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
            >
              Review Excuse
            </Button>
          );
        }
        if (row.regularizationStatus === 'APPROVED') {
          return <Badge variant="success" size="sm">Regularized</Badge>;
        }
        return <span className="text-slate-400 text-xs">Standard</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Attendance & Timesheets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track daily clock-ins, shift adherence & approve attendance regularisation requests
          </p>
        </div>
      </div>

      <DataTable
        data={attendance}
        columns={columns}
        searchPlaceholder="Filter team attendance..."
        exportFileName="pulse_team_attendance"
        isLoading={isLoading}
      />

      {/* Review Excuse Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Approve Team Regularization"
          subtitle={`${selectedRecord.employeeName} on ${formatDate(selectedRecord.date)}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500">Explanation given:</span>
              <p className="text-slate-800 font-medium mt-1">
                {selectedRecord.regularizationReason || 'No specific explanation submitted.'}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApproveRegularization(selectedRecord.id)}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve & Mark Present
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
