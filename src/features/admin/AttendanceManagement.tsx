import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { EmployeeAttendanceHistoryModal } from '@/components/attendance/EmployeeAttendanceHistoryModal';
import { formatDate, formatTime, formatLabel } from '@/utils/formatters';
import { attendanceStatusVariant } from '@/utils/status';
import { ShieldCheck } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';
import { getShiftLabel } from '@/utils/shiftUtils';

const PAGE_SIZE = 20;

export const AttendanceManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState({ present: 0, onDuty: 0, late: 0, onLeave: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [historyEmployee, setHistoryEmployee] = useState<{ employeeId: string; employeeName: string; location?: string; shift?: string } | null>(null);
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<AttendanceRecord | null>(null);

  const filters = useOperationsFilters(true);
  const statusFilter = filters.status;
  const shiftFilter = filters.shift;
  const setStatusFilter = (value: string) => filters.set('status', value);

  const loadPage = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
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
        setAttendance(items);
        setPage(res.page ?? targetPage);
        setTotalElements(res.totalElements ?? items.length);
        if (res.summary) setSummary(res.summary);
      } catch {
        dispatch(addToast({ type: 'error', title: 'Could not load attendance' }));
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, filters.date, filters.venue, shiftFilter, statusFilter, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => void loadPage(0), searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadPage, searchQuery]);

  const openEmployeeHistory = (row: AttendanceRecord) =>
    setHistoryEmployee({ employeeId: row.employeeId, employeeName: row.employeeName, location: row.location, shift: row.shift });

  const toggleStatus = (value: string) => setStatusFilter(statusFilter === value ? 'ALL' : value);

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
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
              className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
              aria-label={`View check-in photo of ${row.employeeName}`}
            >
              <img src={row.facePhoto} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" />
            </button>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700" aria-hidden="true">
              {row.employeeName?.charAt(0) || 'E'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <span className="truncate">{row.employeeName}</span>
              {row.isBiometricVerified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Face checked" />}
            </div>
            <div className="text-xs text-slate-600">{row.location || 'No center'}</div>
          </div>
        </div>
      ),
    },
    { key: 'shift', header: 'Shift', sortable: true, render: (row) => getShiftLabel(row.shift) },
    { key: 'date', header: 'Date', sortable: true, render: (row) => formatDate(row.date) },
    { key: 'checkIn', header: 'In', render: (row) => <span className="tabular-nums">{row.checkIn ? formatTime(row.checkIn) : '--:--'}</span> },
    { key: 'checkOut', header: 'Out', render: (row) => <span className="tabular-nums">{row.checkOut ? formatTime(row.checkOut) : '--:--'}</span> },
    {
      key: 'workHours',
      header: 'Hours',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-medium text-slate-900">{row.workHours ? `${row.workHours} h` : '--'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={attendanceStatusVariant(row.status)} size="sm" dot>
            {formatLabel(row.status)}
          </Badge>
          {row.regularizationStatus === 'PENDING' && (
            <Badge variant="warning" size="sm">
              Correction pending
            </Badge>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Daily check-ins across all centers. Select a person to see their last month." />

      <OperationsFilters attendance />

      <StatTiles columns={4} aria-label="Attendance summary for the selected day">
        <StatTile label="Present" value={summary.present} tone="success" active={statusFilter === 'PRESENT'} onClick={() => toggleStatus('PRESENT')} />
        <StatTile label="On Duty" value={summary.onDuty} active={statusFilter === 'ON_DUTY'} onClick={() => toggleStatus('ON_DUTY')} />
        <StatTile label="Late" value={summary.late} tone={summary.late > 0 ? 'warning' : 'neutral'} active={statusFilter === 'LATE'} onClick={() => toggleStatus('LATE')} />
        <StatTile label="On leave" value={summary.onLeave} active={statusFilter === 'ON_LEAVE'} onClick={() => toggleStatus('ON_LEAVE')} />
      </StatTiles>

      <DataTable
        data={attendance}
        columns={columns}
        searchPlaceholder="Search by employee name"
        onSearchChange={setSearchQuery}
        onRowClick={openEmployeeHistory}
        exportFileName="maaya_attendance_register"
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        pagination={{
          page: page + 1,
          totalPages: Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
          totalElements,
          onPageChange: (next) => void loadPage(next - 1),
        }}
        emptyTitle="No attendance for this day"
        emptyDescription="Try another date, center or status."
      />

      <EmployeeAttendanceHistoryModal employee={historyEmployee} onClose={() => setHistoryEmployee(null)} />

      <Modal
        isOpen={Boolean(previewPhotoRecord)}
        onClose={() => setPreviewPhotoRecord(null)}
        title="Check-in photo"
        subtitle={previewPhotoRecord ? `${previewPhotoRecord.employeeName} · ${formatDate(previewPhotoRecord.date)}` : undefined}
        size="sm"
      >
        {previewPhotoRecord && (
          <div className="space-y-4">
            {previewPhotoRecord.facePhoto ? (
              <div className="overflow-hidden rounded-lg bg-slate-950 aspect-[4/3]">
                <img src={previewPhotoRecord.facePhoto} alt={`Face captured for ${previewPhotoRecord.employeeName}`} className="h-full w-full object-cover" />
              </div>
            ) : (
              <p className="text-sm text-slate-600">No photo was recorded for this check-in.</p>
            )}
            <dl className="ops-definition">
              <dt>Check-in time</dt>
              <dd className="tabular-nums">{previewPhotoRecord.checkIn ? formatTime(previewPhotoRecord.checkIn) : '--:--'}</dd>
              <dt>Center</dt>
              <dd>{previewPhotoRecord.location || 'No center'}</dd>
              <dt>Face check</dt>
              <dd className={previewPhotoRecord.isBiometricVerified ? 'text-emerald-700' : ''}>
                {previewPhotoRecord.isBiometricVerified ? 'Matched' : previewPhotoRecord.biometricScore != null ? 'Not matched' : 'Not recorded'}
              </dd>
              {previewPhotoRecord.notes && (
                <>
                  <dt>Notes</dt>
                  <dd className="font-normal">{previewPhotoRecord.notes}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
};
