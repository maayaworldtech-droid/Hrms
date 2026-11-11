import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { EmployeeAttendanceHistoryModal } from '@/components/attendance/EmployeeAttendanceHistoryModal';
import { formatDate, formatTime } from '@/utils/formatters';
import { ShieldCheck } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const PAGE_SIZE = 20;

export const AttendanceManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState({ present: 0, onDuty: 0, late: 0, onLeave: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [historyEmployee, setHistoryEmployee] = useState<{
    employeeId: string;
    employeeName: string;
    location?: string;
    shift?: string;
  } | null>(null);
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<AttendanceRecord | null>(null);

  const filters = useOperationsFilters(true);
  const statusFilter = filters.status;
  const shiftFilter = filters.shift;
  const setStatusFilter = (value: string) => filters.set('status', value);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      try {
        const res = await api.attendance.getPaged({
          date: filters.date,
          location: filters.venue,
          shift: shiftFilter,
          status: statusFilter,
          search: searchQuery,
          page: targetPage,
          size: PAGE_SIZE,
        });
        const items = Array.isArray(res.items) ? res.items : [];
        setAttendance((prev) => {
          if (!append) return items;
          const merged = new Map<string, AttendanceRecord>();
          prev.forEach((r) => merged.set(String(r.id), r));
          items.forEach((r) => merged.set(String(r.id), r));
          return Array.from(merged.values());
        });
        setPage(res.page ?? targetPage);
        setHasMore(Boolean(res.hasMore));
        setTotalElements(res.totalElements ?? items.length);
        if (res.summary) {
          setSummary(res.summary);
        }
      } catch {
        dispatch(addToast({ type: 'error', title: 'Could not load attendance' }));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [dispatch, filters.date, filters.venue, shiftFilter, statusFilter, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPage(0, false);
    }, searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadPage, searchQuery]);

  const openEmployeeHistory = (row: AttendanceRecord) => {
    setHistoryEmployee({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      location: row.location,
      shift: row.shift,
    });
  };

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
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPhotoRecord(row);
              }}
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
            <div className="font-semibold text-slate-900 hover:text-indigo-700 flex items-center gap-1.5">
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Register</h1>
          <p className="text-xs text-slate-500 mt-1">
            Click any employee row to view their previous 1-month attendance records.
          </p>
        </div>
      </div>

      <OperationsFilters attendance />
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'PRESENT'
              ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.present}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ON_DUTY' ? 'ALL' : 'ON_DUTY')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ON_DUTY'
              ? 'border-sky-500 bg-sky-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-sky-600 uppercase">On Duty</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.onDuty}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'LATE' ? 'ALL' : 'LATE')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'LATE'
              ? 'border-amber-500 bg-amber-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Late Check-in</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.late}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'ON_LEAVE' ? 'ALL' : 'ON_LEAVE')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ON_LEAVE'
              ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] font-semibold text-indigo-600 uppercase">On Leave</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.onLeave}</p>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        data={attendance}
        columns={columns}
        searchPlaceholder="Search attendance by employee name..."
        onSearchChange={setSearchQuery}
        onRowClick={openEmployeeHistory}
        exportFileName="maaya_attendance_register"
        isLoading={isLoading}
        hidePagination
      />

      {/* Incremental Server Load More Bar */}
      {!isLoading && attendance.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
          <span className="tabular-nums">
            Showing <strong className="text-slate-900">{attendance.length}</strong> of{' '}
            <strong className="text-slate-900">{totalElements}</strong> records
          </span>
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadPage(page + 1, true)}
              isLoading={isLoadingMore}
            >
              Load More
            </Button>
          )}
        </div>
      )}

      {/* Employee 1-Month History Modal */}
      <EmployeeAttendanceHistoryModal
        employee={historyEmployee}
        onClose={() => setHistoryEmployee(null)}
      />

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
                {previewPhotoRecord.isBiometricVerified && (
                  <div className="absolute top-2.5 left-2.5 bg-emerald-950/80 backdrop-blur-xs border border-emerald-500/40 px-2 py-1 rounded-md text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Real Face Verified</span>
                  </div>
                )}
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
                  {previewPhotoRecord.biometricScore != null
                    ? `${previewPhotoRecord.biometricScore.toFixed(1)}%`
                    : 'Not recorded'}
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
