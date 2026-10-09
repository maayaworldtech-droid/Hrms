import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const MyAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regularizeReason, setRegularizeReason] = useState('');
  const [isPunching, setIsPunching] = useState(false);

  const employeeId = 'emp-003'; // Priya Sharma

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getByEmployee(employeeId);
      setAttendance(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayRec = attendance.find((a) => a.date === today);

  const handlePunchIn = async () => {
    setIsPunching(true);
    try {
      const rec = await api.attendance.checkIn(employeeId);
      dispatch(
        addToast({
          type: 'success',
          title: 'Clock-In Confirmed',
          message: `Logged at ${formatTime(rec.checkIn)}`,
        })
      );
      loadData();
    } finally {
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    setIsPunching(true);
    try {
      const rec = await api.attendance.checkOut(employeeId);
      dispatch(
        addToast({
          type: 'success',
          title: 'Clock-Out Confirmed',
          message: `Closed shift at ${formatTime(rec.checkOut)}. Total: ${rec.workHours} hrs.`,
        })
      );
      loadData();
    } finally {
      setIsPunching(false);
    }
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !regularizeReason.trim()) return;

    try {
      await api.attendance.regularize(selectedRecord.id, regularizeReason);
      dispatch(
        addToast({
          type: 'success',
          title: 'Regularization Submitted',
          message: 'Forwarded to your manager (Rajesh Kumar) for sign-off.',
        })
      );
      setIsModalOpen(false);
      setRegularizeReason('');
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed' }));
    }
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900">{formatDate(row.date)}</span>
      ),
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
      header: 'Effective Hours',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900">{row.workHours ? `${row.workHours} hrs` : '--'}</span>
      ),
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
      header: 'Regularization Status',
      render: (row) => {
        if (row.regularizationStatus === 'PENDING') {
          return <Badge variant="warning" size="sm">Pending Manager Approval</Badge>;
        }
        if (row.regularizationStatus === 'APPROVED') {
          return <Badge variant="success" size="sm">Regularized</Badge>;
        }
        if (row.status === 'LATE' || row.status === 'ABSENT') {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRecord(row);
                setRegularizeReason(row.regularizationReason || '');
                setIsModalOpen(true);
              }}
              className="!py-1 !px-2.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
            >
              Request Regularization
            </Button>
          );
        }
        return <span className="text-slate-400 text-xs">Regular</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Attendance & Logs</h1>
          <p className="text-xs text-slate-500 mt-1">
            Priya Sharma • Daily timesheets, effective hours, punch records & regularisation requests
          </p>
        </div>

        {/* Live Punch Quick Action */}
        <div>
          {!todayRec?.checkIn ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handlePunchIn}
              isLoading={isPunching}
              leftIcon={<LogIn className="w-4 h-4" />}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              Punch In Today
            </Button>
          ) : !todayRec.checkOut ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handlePunchOut}
              isLoading={isPunching}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Punch Out (Shift Active)
            </Button>
          ) : (
            <Badge variant="success" size="md">
              Punched Out ({todayRec.workHours} hrs)
            </Badge>
          )}
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={attendance}
        columns={columns}
        searchPlaceholder="Search your timesheet records..."
        exportFileName="my_attendance_logs_2026"
        isLoading={isLoading}
      />

      {/* Request Regularization Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Attendance Regularization Request"
          subtitle={`Log for ${formatDate(selectedRecord.date)}`}
          size="md"
        >
          <form onSubmit={handleRegularizeSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900">{formatDate(selectedRecord.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <Badge variant="warning" size="sm">{selectedRecord.status}</Badge>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Reason / Justification for Time Deviation *
              </label>
              <textarea
                value={regularizeReason}
                onChange={(e) => setRegularizeReason(e.target.value)}
                placeholder="e.g. Signal failure on purple metro line / Client on-site deployment"
                rows={4}
                required
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Submit for Manager Approval
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
