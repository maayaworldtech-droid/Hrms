import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { OperationsFilters } from '@/components/common/OperationsFilters';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { getReportingManager } from '@/services/mockData';
import { AttendanceRecord, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import  { Check } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const TeamAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const filters = useOperationsFilters(true);
  const [team, setTeam] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const managerId = user?.id || 'emp-002';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allEmps, allAtt] = await Promise.all([
        api.employees.getAll(),
        api.attendance.getAll(),
      ]);
      const myTeam = allEmps.filter((e) => getReportingManager(e).id === managerId);
      setTeam(myTeam);
      const teamIds = new Set(myTeam.map((e) => e.id));
      setAttendance(allAtt.filter((a) => teamIds.has(a.employeeId)));
    } catch { dispatch(addToast({ type: 'error', title: 'Could not load team attendance' })); } finally {
      setIsLoading(false);
    }
  }, [dispatch,managerId]);

  useEffect(() => { void loadData(); }, [loadData]);

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
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Approval failed' }));
    } finally { setSaving(false); }
  };

  const filtered = attendance.filter(record => {
    const employee = team.find(person => person.id === record.employeeId);
    return (!filters.date || record.date === filters.date) && (filters.venue === 'ALL' || (record.location || employee?.location) === filters.venue) && (filters.shift === 'ALL' || (record.shift || employee?.shift || 'MORNING') === filters.shift) && (filters.status === 'ALL' || (filters.status === 'ISSUES' ? record.status === 'LATE' || record.status === 'ABSENT' || record.regularizationStatus === 'PENDING' : filters.status === 'REGULARIZATION_PENDING' ? record.regularizationStatus === 'PENDING' : record.status === filters.status));
  }).sort((a,b) => Number(b.regularizationStatus === 'PENDING') - Number(a.regularizationStatus === 'PENDING') || Number(b.status === 'ABSENT' || b.status === 'LATE') - Number(a.status === 'ABSENT' || a.status === 'LATE') || b.date.localeCompare(a.date));

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
              Review correction
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team attendance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Check shift attendance and review requested corrections.
          </p>
        </div>
      </div>

      <OperationsFilters attendance venues={[...new Set(team.map(employee => employee.location))]} />
      <p className="ops-muted">Attendance exceptions appear first. Choose All dates to review older corrections.</p>
      <DataTable
        key={[filters.date,filters.venue,filters.shift,filters.status].join(':')}
        data={filtered}
        mobileRender={row => <div className="space-y-2"><div className="flex justify-between gap-3"><strong>{row.employeeName}</strong><span>{row.status.replaceAll('_',' ')}</span></div><p className="ops-muted">{formatDate(row.date)} · {row.location || team.find(employee => employee.id === row.employeeId)?.location} · {(row.shift || 'MORNING').toLowerCase()}</p><p>In {row.checkIn ? formatTime(row.checkIn) : '—'} · Out {row.checkOut ? formatTime(row.checkOut) : '—'} · {row.workHours} hours</p>{row.regularizationStatus === 'PENDING' && <button className="ops-button secondary" onClick={() => { setSelectedRecord(row); setIsModalOpen(true); }}>Review correction</button>}</div>}
        columns={columns}
        searchPlaceholder="Filter team attendance..."
        exportFileName="maaya_team_attendance"
        isLoading={isLoading}
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
                Approve & Mark Present
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
