import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Textarea } from '@/components/common/Textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterPills, MobileCard, MobileSearch, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { formatDate, formatTime, formatLabel } from '@/utils/formatters';
import { attendanceStatusVariant } from '@/utils/status';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import { businessDate } from '@/utils/operations';
import { Clock, ShieldCheck, ScanFace } from 'lucide-react';

type Filter = 'ALL' | 'PRESENT' | 'LATE' | 'OTHER';

export const MyAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [regularizeReason, setRegularizeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Filter>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [todayText] = useState(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getByEmployee(employeeId).catch(() => []);
      setAttendance(Array.isArray(data) ? [...data].sort((a, b) => b.date.localeCompare(a.date)) : []);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const today = businessDate();
  const todayRec = attendance.find((a) => a.date === today);
  const completed = Boolean(todayRec?.checkOut);
  const working = Boolean(todayRec?.checkIn) && !completed;

  const openBiometric = (mode: 'LOGIN' | 'LOGOUT') => {
    setBiometricMode(mode);
    setBiometricModalOpen(true);
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !regularizeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await api.attendance.regularize(selectedRecord.id, regularizeReason.trim());
      dispatch(addToast({ type: 'success', title: 'Correction submitted', message: 'Your manager will review it.' }));
      setSelectedRecord(null);
      setRegularizeReason('');
      void loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed', message: 'Please try again.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const counts = useMemo(
    () => ({
      ALL: attendance.length,
      PRESENT: attendance.filter((r) => r.status === 'PRESENT').length,
      LATE: attendance.filter((r) => r.status === 'LATE').length,
      OTHER: attendance.filter((r) => r.status !== 'PRESENT' && r.status !== 'LATE').length,
    }),
    [attendance]
  );

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return attendance.filter((rec) => {
      const matchesSearch =
        !q || rec.date.includes(q) || formatDate(rec.date).toLowerCase().includes(q) || rec.notes?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'OTHER'
          ? rec.status !== 'PRESENT' && rec.status !== 'LATE'
          : rec.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [attendance, searchTerm, statusFilter]);

  return (
    <div className="space-y-4 pb-4">
      <MobileTitle title="Attendance" subtitle={todayText} />

      <MobileCard className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Today</h2>
          <Badge variant={completed ? 'success' : working ? 'info' : 'neutral'} dot>
            {completed ? `Done · ${todayRec?.workHours ?? 0} h` : working ? 'On shift' : 'Not checked in'}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-slate-600">Check in</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{todayRec?.checkIn ? formatTime(todayRec.checkIn) : '--:--'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Check out</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{todayRec?.checkOut ? formatTime(todayRec.checkOut) : '--:--'}</dd>
          </div>
        </dl>
        {!completed && (
          <Button
            size="lg"
            className="w-full"
            disabled={isLoading}
            onClick={() => openBiometric(working ? 'LOGOUT' : 'LOGIN')}
            leftIcon={working ? <Clock className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}
          >
            {working ? 'Check out' : 'Check in with face ID'}
          </Button>
        )}
      </MobileCard>

      <div className="space-y-2">
        <MobileSearch value={searchTerm} onChange={setSearchTerm} label="Search attendance" placeholder="Search by date or note" />
        <FilterPills<Filter>
          label="Filter attendance"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'ALL', label: 'All', count: counts.ALL },
            { key: 'PRESENT', label: 'On time', count: counts.PRESENT },
            { key: 'LATE', label: 'Late', count: counts.LATE },
            { key: 'OTHER', label: 'Other', count: counts.OTHER },
          ]}
        />
      </div>

      {isLoading ? (
        <MobileSkeleton />
      ) : filteredRecords.length === 0 ? (
        <EmptyState icon={Clock} title="No attendance records" description="Days you check in will appear here." />
      ) : (
        <ul className="space-y-2.5">
          {filteredRecords.map((record) => {
            const canCorrect = record.status === 'LATE' || record.status === 'ABSENT' || record.status === 'HALF_DAY';
            return (
              <li key={record.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{formatDate(record.date)}</span>
                  <Badge variant={attendanceStatusVariant(record.status)} size="sm">
                    {formatLabel(record.status)}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="tabular-nums text-slate-700">
                    {record.checkIn ? formatTime(record.checkIn) : '--:--'} to {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{record.workHours ? `${record.workHours} h` : working && record.date === today ? 'Live' : '--'}</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs">
                  {record.facePhoto ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(record.facePhoto!)}
                      className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Face verified · view photo
                    </button>
                  ) : record.isBiometricVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Face and location verified
                    </span>
                  ) : (
                    <span className="text-slate-600">Recorded attendance</span>
                  )}

                  {record.regularizationStatus === 'PENDING' ? (
                    <span className="font-medium text-amber-800">Correction pending</span>
                  ) : record.regularizationStatus === 'APPROVED' ? (
                    <span className="font-medium text-emerald-700">Correction approved</span>
                  ) : canCorrect ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(record);
                        setRegularizeReason(record.regularizationReason || '');
                      }}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Request correction
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Request attendance correction"
        subtitle={selectedRecord ? formatDate(selectedRecord.date) : undefined}
        size="sm"
      >
        <form onSubmit={handleRegularizeSubmit} className="space-y-4">
          <Textarea
            label="What happened?"
            required
            value={regularizeReason}
            onChange={(e) => setRegularizeReason(e.target.value)}
            placeholder="For example: came in late because the bus was delayed"
            helperText="Your manager sees this note when reviewing the correction."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSelectedRecord(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={!regularizeReason.trim()}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>

      <BiometricAttendanceModal
        isOpen={biometricModalOpen}
        onClose={() => setBiometricModalOpen(false)}
        mode={biometricMode}
        employee={{
          id: String(user?.id || employeeId).replace('emp-', ''),
          fullName: user?.name || 'Employee',
          employeeCode: user?.employeeId || '',
          location: user?.location || '',
          shift: user?.shift || 'MORNING',
          enrolledFacePhoto: user?.enrolledFacePhoto,
          enrolledFaceBiometrics: user?.enrolledFaceBiometrics,
        }}
        onSuccess={() => void loadData()}
      />

      <Modal isOpen={Boolean(previewPhoto)} onClose={() => setPreviewPhoto(null)} title="Check-in photo" size="sm">
        {previewPhoto && (
          <div className="overflow-hidden rounded-lg bg-slate-950 aspect-[4/3]">
            <img src={previewPhoto} alt="Face captured at check-in" className="h-full w-full object-cover" />
          </div>
        )}
      </Modal>
    </div>
  );
};
