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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<{
    employeeId: string;
    employeeName: string;
    location?: string;
    shift?: string;
  } | null>(null);

  const managerId = user?.id || 'emp-002';

  useEffect(() => {
    let active = true;
    api.employees
      .getAll()
      .then((allEmps) => {
        if (!active) return;
        const myTeam = (allEmps || []).filter((e) => getReportingManager(e).id === managerId);
        setTeam(myTeam);
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
    async (targetPage: number, append: boolean) => {
      if (!teamLoaded) return;
      if (team.length === 0) {
        setAttendance([]);
        setHasMore(false);
        setTotalElements(0);
        setIsLoading(false);
        return;
      }

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
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
      } catch {
        dispatch(addToast({ type: 'error', title: 'Could not load team attendance' }));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [dispatch, teamLoaded, team, filters.date, filters.venue, filters.shift, filters.status, searchQuery]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPage(0, false);
    }, searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadPage, searchQuery]);

  const handleApproveRegularization = async (id: string) => {
    if (saving) return;
    setSaving(true);
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
      void loadPage(0, false);
    } catch {
      dispatch(addToast({ type: 'error', title: 'Approval failed' }));
    } finally {
      setSaving(false);
    }
  };

  const openEmployeeHistory = (row: AttendanceRecord) => {
    setHistoryEmployee({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      location: row.location || team.find((e) => e.id === row.employeeId)?.location,
      shift: row.shift,
    });
  };

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'employeeName',
      header: 'Teammate',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.facePhoto ? (
            <img
              src={row.facePhoto}
              alt={row.employeeName}
              title="Verified Face Snapshot"
              className="w-7 h-7 rounded-full object-cover border border-emerald-400 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
              {row.employeeName?.charAt(0) || 'E'}
            </div>
          )}
          <span className="font-semibold text-slate-900 hover:text-brand-700">{row.employeeName}</span>
        </div>
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
      header: 'Punch in',
      render: (row) => (
        <span className="tabular-nums text-slate-800">{row.checkIn ? formatTime(row.checkIn) : '--:--'}</span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Punch out',
      render: (row) => (
        <span className="tabular-nums text-slate-800">{row.checkOut ? formatTime(row.checkOut) : '--:--'}</span>
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
        <div className="flex items-center gap-2">
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
            {formatLabel(row.status)}
          </Badge>
          {row.regularizationStatus === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRecord(row);
                setIsModalOpen(true);
              }}
              className="!py-0.5 !px-2 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
            >
              Review correction
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team attendance"
        description="Check-ins for your team. Select a person to see their last month."
      />

      <OperationsFilters attendance venues={[...new Set(team.map((employee) => employee.location))]} />
      <DataTable
        data={attendance}
        mobileRender={(row) => (
          <div className="space-y-2" onClick={() => openEmployeeHistory(row)}>
            <div className="flex justify-between gap-3">
              <strong>{row.employeeName}</strong>
              <span>{formatLabel(row.status)}</span>
            </div>
            <p className="ops-muted">
              {formatDate(row.date)} · {row.location || team.find((employee) => employee.id === row.employeeId)?.location} ·{' '}
              {(row.shift || 'MORNING').toLowerCase()}
            </p>
            <p>
              In {row.checkIn ? formatTime(row.checkIn) : '—'} · Out {row.checkOut ? formatTime(row.checkOut) : '—'} ·{' '}
              {row.workHours} hours
            </p>
            {row.regularizationStatus === 'PENDING' && (
              <button
                className="ops-button secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecord(row);
                  setIsModalOpen(true);
                }}
              >
                Review correction
              </button>
            )}
          </div>
        )}
        columns={columns}
        searchPlaceholder="Filter team attendance..."
        onSearchChange={setSearchQuery}
        onRowClick={openEmployeeHistory}
        exportFileName="maaya_team_attendance"
        isLoading={isLoading}
        hidePagination
      />

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
              Load more
            </Button>
          )}
        </div>
      )}

      <EmployeeAttendanceHistoryModal
        employee={historyEmployee}
        onClose={() => setHistoryEmployee(null)}
      />

      {/* Review correction Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Review attendance correction"
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
                disabled={saving}
                onClick={() => handleApproveRegularization(selectedRecord.id)}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve & mark present
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
