import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import { Search, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const MyAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || 'emp-003';
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regularizeReason, setRegularizeReason] = useState('');
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE'>('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getByEmployee(employeeId).catch(() => []);
      setAttendance(Array.isArray(data) ? data : []);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const [today] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayFormatted] = useState(() =>
    new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );
  const todayRec = attendance.find((a) => a.date === today);

  const handleOpenBiometricLogin = () => {
    setBiometricMode('LOGIN');
    setBiometricModalOpen(true);
  };

  const handleOpenBiometricLogout = () => {
    setBiometricMode('LOGOUT');
    setBiometricModalOpen(true);
  };

  const handleBiometricSuccess = () => {
    void loadData();
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !regularizeReason.trim()) return;

    try {
      await api.attendance.regularize(selectedRecord.id, regularizeReason);
      dispatch(
        addToast({
          type: 'success',
          title: 'Submitted',
          message: 'Correction sent to manager.',
        })
      );
      setIsModalOpen(false);
      setRegularizeReason('');
      void loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed' }));
    }
  };

  const counts = useMemo(() => {
    const present = attendance.filter((r) => r.status === 'PRESENT').length;
    const late = attendance.filter((r) => r.status === 'LATE').length;
    return {
      ALL: attendance.length,
      PRESENT: present,
      LATE: late,
    };
  }, [attendance]);

  const filteredRecords = attendance.filter((rec) => {
    const matchesSearch =
      rec.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PRESENT'
        ? rec.status === 'PRESENT'
        : rec.status === 'LATE';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3 pb-4">
      {/* Today Punch Card */}
      <section className="employee-card space-y-3">
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Today</span>
            <span className="font-semibold text-slate-900 text-sm">{todayFormatted}</span>
          </div>

          <span
            className={`employee-badge ${
              todayRec?.checkIn && !todayRec.checkOut
                ? 'badge-success'
                : todayRec?.checkOut
                ? 'badge-brand'
                : 'badge-neutral'
            }`}
          >
            {todayRec?.checkIn && !todayRec.checkOut
              ? 'Active shift'
              : todayRec?.checkOut
              ? `Done (${todayRec.workHours}h)`
              : 'Not checked in'}
          </span>
        </div>

        <div className="employee-metric-grid cols-2">
          <div className="employee-metric-tile">
            <span className="metric-label">Punch In</span>
            <strong className="metric-value">
              {todayRec?.checkIn ? formatTime(todayRec.checkIn) : '—'}
            </strong>
          </div>
          <div className="employee-metric-tile">
            <span className="metric-label">Punch Out</span>
            <strong className="metric-value">
              {todayRec?.checkOut ? formatTime(todayRec.checkOut) : '—'}
            </strong>
          </div>
        </div>

        <button
          onClick={todayRec?.checkIn ? handleOpenBiometricLogout : handleOpenBiometricLogin}
          disabled={!!todayRec?.checkOut || isLoading}
          className="employee-primary-btn"
        >
          {todayRec?.checkOut ? 'Shift complete for today' : todayRec?.checkIn ? 'Check out' : 'Check in'}
        </button>
      </section>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="employee-search-box">
          <Search size={15} />
          <input
            type="text"
            aria-label="Search attendance"
            placeholder="Search dates or notes…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="employee-filter-bar">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`employee-filter-pill ${statusFilter === 'ALL' ? 'is-active' : ''}`}
          >
            All <span className="pill-count">{counts.ALL}</span>
          </button>
          <button
            onClick={() => setStatusFilter('PRESENT')}
            className={`employee-filter-pill ${statusFilter === 'PRESENT' ? 'is-active' : ''}`}
          >
            On time <span className="pill-count">{counts.PRESENT}</span>
          </button>
          <button
            onClick={() => setStatusFilter('LATE')}
            className={`employee-filter-pill ${statusFilter === 'LATE' ? 'is-active' : ''}`}
          >
            Late <span className="pill-count">{counts.LATE}</span>
          </button>
        </div>
      </div>

      {/* Timesheet List */}
      <div>
        {isLoading ? (
          <div className="employee-skeleton-group">
            <div className="employee-skeleton" />
            <div className="employee-skeleton" />
            <div className="employee-skeleton" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="employee-empty">
            <Clock size={32} />
            <h3>No attendance records</h3>
            <p>Punch logs will appear here after checking in.</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isPresent = record.status === 'PRESENT';
            const isLate = record.status === 'LATE';

            return (
              <div key={record.id} className="employee-record-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">
                    {formatDate(record.date)}
                  </span>

                  <span
                    className={`employee-badge ${
                      isPresent
                        ? 'badge-success'
                        : isLate
                        ? 'badge-warning'
                        : 'badge-neutral'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-y border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Clock size={13} className="text-slate-400" />
                    <span className="font-mono tabular-nums">
                      {record.checkIn ? formatTime(record.checkIn) : '—'} – {record.checkOut ? formatTime(record.checkOut) : '—'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {record.workHours ? `${record.workHours}h` : 'Live'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-500">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>Face & GPS verified</span>
                  </div>

                  {(isLate || record.status === 'ABSENT' || record.regularizationStatus === 'PENDING') && (
                    <div>
                      {record.regularizationStatus === 'PENDING' ? (
                        <span className="text-amber-700 font-medium">Correction pending</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRecord(record);
                            setRegularizeReason(record.regularizationReason || '');
                            setIsModalOpen(true);
                          }}
                          className="text-[var(--brand-600)] font-semibold hover:underline"
                        >
                          Request correction →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Regularize Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Attendance Correction"
          subtitle={formatDate(selectedRecord.date)}
          size="sm"
        >
          <form onSubmit={handleRegularizeSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Reason for exception *
              </label>
              <textarea
                value={regularizeReason}
                onChange={(e) => setRegularizeReason(e.target.value)}
                placeholder="Reason for delay or missed punch"
                rows={2}
                required
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 outline-none focus:border-[var(--brand-400)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="employee-secondary-btn"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="employee-primary-btn"
                style={{ width: 'auto', minHeight: '36px', padding: '0 16px' }}
              >
                Submit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Biometric Attendance Modal */}
      <BiometricAttendanceModal
        isOpen={biometricModalOpen}
        onClose={() => setBiometricModalOpen(false)}
        mode={biometricMode}
        employee={{
          id: employeeId,
          fullName: user?.name || 'Shyam Sundar',
          employeeCode: user?.employeeId || 'MW-1000',
          location: user?.location || 'Hyderabad',
          shift: user?.shift || 'MORNING',
        }}
        onSuccess={handleBiometricSuccess}
      />
    </div>
  );
};
