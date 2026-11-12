import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { AttendanceRecord, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmployeeAttendanceHistoryModal } from '@/components/attendance/EmployeeAttendanceHistoryModal';
import { formatDate, formatTime, formatLabel } from '@/utils/formatters';
import { attendanceStatusVariant } from '@/utils/status';
import { Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';

const PAGE_SIZE = 20;

export const TeamAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const filters = useOperationsFilters(true);
  const [team, setTeam] = useState<Employee[]>([]);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<{ employeeId: string; employeeName: string; location?: string; shift?: string } | null>(null);

  const managerId = user?.id || '';

  useEffect(() => {
    let active = true;
    api.employees
      .getAll()
      .then((allEmps) => {
        if (!active) return;
        setTeam((allEmps || []).filter((e) => getReportingManager(e).id === managerId));
        setTeamLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        dispatch(addToast({ type: 'error', title: 'Could not load team directory' }));
        setTeamLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [dispatch, managerId]);

  const loadPage = useCallback(
    async (targetPage: number) => {
      if (!teamLoaded) return;
      if (team.length === 0) {
        setAttendance([]);
        setTotalElements(0);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.attendance.getPaged({
          employeeIds: team.map((e) => e.id),
          date: filters.date,
          location: filters.venue,
          shift: filters.shift,
          status: filters.status,
          search: searchQuery,
          page: targetPage,
          size: PAGE_SIZE,
        });
        const items = Array.isArray(res.items) ? res.items : [];
        setAttendance(items);
        setPage(res.page ?? targetPage);
        setTotalElements(res.totalElements ?? items.length);
      } catch {
        dispatch(addToast({ type: 'error', title: 'Could not load team attendance' }));
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, teamLoaded, team, filters.date, filters.venue, filters.shift, filters.status, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => void loadPage(0), searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadPage, searchQuery]);

  const handleApproveRegularization = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.attendance.approveRegularization(id);
      dispatch(addToast({ type: 'success', title: 'Correction approved', message: 'The day is now marked present.' }));
      setSelectedRecord(null);
      void loadPage(page);
    } catch {
      dispatch(addToast({ type: 'error', title: 'Approval failed', message: 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const openEmployeeHistory = (row: AttendanceRecord) =>
    setHistoryEmployee({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      location: row.location || team.find((e) => e.id === row.employeeId)?.location,
      shift: row.shift,
    });

  const reviewButton = (row: AttendanceRecord, size: 'xs' | 'sm' = 'xs') =>
    row.regularizationStatus === 'PENDING' ? (
      <Button
        variant="outline"
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedRecord(row);
        }}
      >
        Review correction
      </Button>
    ) : null;

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employeeName',
      header: 'Teammate',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.facePhoto ? (
            <img src={row.facePhoto} alt="" className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700" aria-hidden="true">
              {row.employeeName?.charAt(0) || 'E'}
            </div>
          )}
          <span className="font-medium text-slate-900">{row.employeeName}</span>
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortable: true, render: (row) => formatDate(row.date) },
    { key: 'checkIn', header: 'In', render: (row) => <span className="tabular-nums">{row.checkIn ? formatTime(row.checkIn) : '--:--'}</span> },
    { key: 'checkOut', header: 'Out', render: (row) => <span className="tabular-nums">{row.checkOut ? formatTime(row.checkOut) : '--:--'}</span> },
    { key: 'workHours', header: 'Hours', sortable: true, align: 'right', render: (row) => (row.workHours ? `${row.workHours} h` : '--') },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={attendanceStatusVariant(row.status)} size="sm" dot>
            {formatLabel(row.status)}
          </Badge>
          {reviewButton(row)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Team attendance" description="Check-ins for your team. Select a person to see their last month." />

      <OperationsFilters attendance venues={[...new Set(team.map((employee) => employee.location))]} />

      <DataTable
        data={attendance}
        columns={columns}
        mobileRender={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <button type="button" className="text-left text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline" onClick={() => openEmployeeHistory(row)}>
                {row.employeeName}
              </button>
              <Badge variant={attendanceStatusVariant(row.status)} size="sm" dot>
                {formatLabel(row.status)}
              </Badge>
            </div>
            <p className="text-sm text-slate-700 tabular-nums">
              {formatDate(row.date)} · {row.checkIn ? formatTime(row.checkIn) : '--:--'} to {row.checkOut ? formatTime(row.checkOut) : '--:--'}
              {row.workHours ? ` · ${row.workHours} h` : ''}
            </p>
            <p className="ops-muted">{row.location || team.find((employee) => employee.id === row.employeeId)?.location}</p>
            {reviewButton(row, 'sm')}
          </div>
        )}
        searchPlaceholder="Search by teammate name"
        onSearchChange={setSearchQuery}
        onRowClick={openEmployeeHistory}
        exportFileName="maaya_team_attendance"
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        pagination={{
          page: page + 1,
          totalPages: Math.max(1, Math.ceil(totalElements / PAGE_SIZE)),
          totalElements,
          onPageChange: (next) => void loadPage(next - 1),
        }}
        emptyTitle={team.length === 0 ? 'No one reports to you yet' : 'No attendance for this day'}
        emptyDescription={team.length === 0 ? 'Ask an admin to assign staff to you from the Employees page.' : 'Try another date, center or status.'}
      />

      <EmployeeAttendanceHistoryModal employee={historyEmployee} onClose={() => setHistoryEmployee(null)} />

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Review attendance correction"
        subtitle={selectedRecord ? `${selectedRecord.employeeName} · ${formatDate(selectedRecord.date)}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
              Cancel
            </Button>
            <Button isLoading={saving} onClick={() => selectedRecord && handleApproveRegularization(selectedRecord.id)} leftIcon={<Check className="h-4 w-4" />}>
              Approve and mark present
            </Button>
          </>
        }
      >
        {selectedRecord && (
          <dl className="ops-definition">
            <dt>Recorded</dt>
            <dd className="tabular-nums">
              {selectedRecord.checkIn ? formatTime(selectedRecord.checkIn) : '--:--'} to {selectedRecord.checkOut ? formatTime(selectedRecord.checkOut) : '--:--'} · {formatLabel(selectedRecord.status)}
            </dd>
            <dt>Explanation</dt>
            <dd className="font-normal">{selectedRecord.regularizationReason || 'No explanation submitted.'}</dd>
          </dl>
        )}
      </Modal>
    </div>
  );
};
