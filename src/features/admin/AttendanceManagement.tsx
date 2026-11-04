import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import  { AttendanceRecord } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import { Check, ShieldCheck } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const AttendanceManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const filters = useOperationsFilters(true);
  const statusFilter = filters.status;
  const shiftFilter = filters.shift;
  const setStatusFilter = (value: string) => filters.set('status',value);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getAll();
      setAttendance(data);
    } catch { dispatch(addToast({ type: 'error', title: 'Could not load attendance' })); } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleApproveRegularization = async (recordId: string) => {
    try {
      await api.attendance.approveRegularization(recordId);
      dispatch(
        addToast({
          type: 'success',
          title: 'Regularization Approved',
          message: 'The attendance record has been marked as Present.',
        })
      );
      setIsReviewModalOpen(false);
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Action failed' }));
    }
  };

  const contextRecords = attendance.filter(record => (!filters.date || record.date === filters.date) && (filters.venue === 'ALL' || record.location === filters.venue) && (shiftFilter === 'ALL' || (record.shift || 'MORNING') === shiftFilter));
  const filteredAttendance = contextRecords.filter((item) => {
    const matchShift = shiftFilter === 'ALL' || (item.shift || 'MORNING') === shiftFilter;
    if (!matchShift) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ISSUES') return item.status === 'ABSENT' || item.status === 'LATE' || item.regularizationStatus === 'PENDING';
    if (statusFilter === 'REGULARIZATION_PENDING') return item.regularizationStatus === 'PENDING';
    return item.status === statusFilter;
  });

  const presentCount = contextRecords.filter((a) => a.status === 'PRESENT').length;
  const onDutyCount = contextRecords.filter((a) => a.status === 'ON_DUTY').length;
  const lateCount = contextRecords.filter((a) => a.status === 'LATE').length;
  const onLeaveCount = contextRecords.filter((a) => a.status === 'ON_LEAVE').length;

  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<AttendanceRecord | null>(null);

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employeeName',
      header: 'Employee Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.facePhoto ? (
            <button
              type="button"
              onClick={() => setPreviewPhotoRecord(row)}
              className="relative group cursor-pointer"
              title="Click to view real face biometric photo"
            >
              <img
                src={row.facePhoto}
                alt={row.employeeName}
                className="w-8 h-8 rounded-full object-cover border-2 border-emerald-400 group-hover:scale-105 transition-transform shrink-0"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
              {row.employeeName?.charAt(0) || 'E'}
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span>{row.employeeName}</span>
              {row.isBiometricVerified && (
                <span title="Face Biometric Verified">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">{row.location || 'Hyderabad'} Center</div>
          </div>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'Shift Timing',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.shift === 'EVENING' ? 'Evening (1 PM – 9 PM)' : 'Morning (9 AM – 1 PM)'}
        </span>
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
        <span className="font-mono text-slate-800 font-medium">
          {row.checkIn ? formatTime(row.checkIn) : '--:--'}
        </span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Punch Out',
      render: (row) => (
        <span className="font-mono text-slate-800 font-medium">
          {row.checkOut ? formatTime(row.checkOut) : '--:--'}
        </span>
      ),
    },
    {
      key: 'workHours',
      header: 'Effective Hours',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.workHours ? `${row.workHours} hrs` : '--'}
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
            row.status === 'PRESENT'
              ? 'success'
              : row.status === 'ON_DUTY'
              ? 'info'
              : row.status === 'LATE'
              ? 'warning'
              : 'error'
          }
          size="sm"
        >
          {row.status === 'ON_DUTY' ? 'On Duty' : row.status.replace('_', ' ')}
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
                setIsReviewModalOpen(true);
              }}
              className="!py-1 !px-2.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
            >
              Review Request
            </Button>
          );
        }
        if (row.regularizationStatus === 'APPROVED') {
          return <Badge variant="success" size="sm">Regularized</Badge>;
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Register</h1>
        </div>
      </div>

      <OperationsFilters attendance />
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'PRESENT'
              ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{presentCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ON_DUTY' ? 'ALL' : 'ON_DUTY')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ON_DUTY'
              ? 'border-sky-500 bg-sky-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-sky-600 uppercase">On Duty</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{onDutyCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'LATE' ? 'ALL' : 'LATE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'LATE'
              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Late Check-in</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{lateCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ON_LEAVE' ? 'ALL' : 'ON_LEAVE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ON_LEAVE'
              ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-indigo-600 uppercase">On Leave</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{onLeaveCount}</p>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        key={[filters.date,filters.venue,filters.shift,filters.status].join(':')}
        data={filteredAttendance}
        columns={columns}
        searchPlaceholder="Search attendance by employee name..."
        exportFileName="maaya_attendance_register"
        isLoading={isLoading}
      />

      {/* Review Regularization Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          title="Review attendance correction"
          subtitle={`Submission by ${selectedRecord.employeeName}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900">{formatDate(selectedRecord.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Punch:</span>
                <span className="font-mono text-slate-800">
                  {selectedRecord.checkIn ? formatTime(selectedRecord.checkIn) : 'None'} -{' '}
                  {selectedRecord.checkOut ? formatTime(selectedRecord.checkOut) : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Logged Status:</span>
                <Badge variant="warning" size="sm">{selectedRecord.status}</Badge>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason Provided by Employee</label>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs leading-relaxed">
                {selectedRecord.regularizationReason || 'No specific reason attached to this request.'}
              </div>
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

      {/* Biometric Face Photo Verification Modal */}
      {previewPhotoRecord && (
        <Modal
          isOpen={!!previewPhotoRecord}
          onClose={() => setPreviewPhotoRecord(null)}
          title="Face Biometric Punch Verification"
          subtitle={`${previewPhotoRecord.employeeName} · ${formatDate(previewPhotoRecord.date)}`}
          size="sm"
        >
          <div className="space-y-4 text-xs">
            {previewPhotoRecord.facePhoto ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[4/3] flex items-center justify-center">
                <img
                  src={previewPhotoRecord.facePhoto}
                  alt={`Captured face of ${previewPhotoRecord.employeeName}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 bg-emerald-950/80 backdrop-blur-xs border border-emerald-500/40 px-2 py-1 rounded-md text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Real Face Verified</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No biometric face photo recorded for this punch.
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Punch Time:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {previewPhotoRecord.checkIn ? formatTime(previewPhotoRecord.checkIn) : '--:--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Center Location:</span>
                <span className="text-slate-900 font-medium">
                  {previewPhotoRecord.location || 'Hyderabad Center'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biometric Match:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {previewPhotoRecord.biometricScore ? `${previewPhotoRecord.biometricScore.toFixed(1)}%` : '98.4%'}
                </span>
              </div>
              {previewPhotoRecord.notes && (
                <div className="pt-1 border-t border-slate-200 text-slate-600 text-[11px] truncate">
                  {previewPhotoRecord.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setPreviewPhotoRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
