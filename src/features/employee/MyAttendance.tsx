import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { formatDate, formatTime } from '@/utils/formatters';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';

export const MyAttendance: React.FC = () => {
  const dispatch = useAppDispatch();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regularizeReason, setRegularizeReason] = useState('');
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');

  // Mobile filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE'>('ALL');

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

  const handleOpenBiometricLogin = () => {
    setBiometricMode('LOGIN');
    setBiometricModalOpen(true);
  };

  const handleOpenBiometricLogout = () => {
    setBiometricMode('LOGOUT');
    setBiometricModalOpen(true);
  };

  const handleBiometricSuccess = () => {
    loadData();
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
          message: 'Forwarded to your venue manager for approval.',
        })
      );
      setIsModalOpen(false);
      setRegularizeReason('');
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed' }));
    }
  };

  // Filtered records
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
    <div className="space-y-4 pb-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Attendance</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Your daily check-ins and shift history
        </p>
      </div>

      {/* Hero Attendance Action Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-[13px]">
          <div>
            <span className="text-[13px] font-semibold text-indigo-600 uppercase tracking-wider block">
              Today's Status
            </span>
            <span className="text-[13px] font-bold text-slate-900">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>

          <div>
            {todayRec?.checkIn && !todayRec.checkOut ? (
              <span className="text-[13px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Active Shift
              </span>
            ) : todayRec?.checkOut ? (
              <span className="text-[13px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Completed ({todayRec.workHours} hrs)
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Not checked in
              </span>
            )}
          </div>
        </div>

        {/* Timestamps Row */}
        <div className="grid grid-cols-2 gap-2 text-[13px] py-3 border-y border-slate-100">
          <div>
            <span className="text-slate-400 text-[13px] block">Punch In</span>
            <span className="font-mono font-bold text-slate-800">
              {todayRec?.checkIn ? formatTime(todayRec.checkIn) : '--:--'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[13px] block">Punch Out</span>
            <span className="font-mono font-bold text-slate-800">
              {todayRec?.checkOut ? formatTime(todayRec.checkOut) : '--:--'}
            </span>
          </div>
        </div>

        {/* One clear action for the current shift. */}
        <Button variant="primary" onClick={todayRec?.checkIn ? handleOpenBiometricLogout : handleOpenBiometricLogin} disabled={!!todayRec?.checkOut || isLoading} className="w-full !bg-slate-800 disabled:!bg-slate-200 disabled:!text-slate-600 !py-3">
          {todayRec?.checkOut ? 'Shift complete' : todayRec?.checkIn ? 'Check out' : 'Check in'}
        </Button>
      </div>

      {/* Filter and Search Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            aria-label="Search attendance" placeholder="Search dates or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[13px] overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => setStatusFilter('PRESENT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              statusFilter === 'PRESENT'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            On Time
          </button>
          <button
            onClick={() => setStatusFilter('LATE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
              statusFilter === 'LATE'
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Late Logs
          </button>
        </div>
      </div>

      {/* Mobile Timesheet Cards Feed (Replaces Wide Table) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[13px] text-slate-500 px-0.5">
          <span className="font-semibold text-slate-700">Attendance history</span>
          <span>{filteredRecords.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[13px] text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading attendance records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-slate-400 bg-white rounded-xl border border-slate-200">
            No attendance logs found matching filters.
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isPresent = record.status === 'PRESENT';
            const isLate = record.status === 'LATE';

            return (
              <div
                key={record.id}
                className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs space-y-2"
              >
                {/* Card Top: Date & Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[13px] text-slate-900 block">
                      {formatDate(record.date)}
                    </span>
                    <span className="text-[13px] text-slate-400">
                      {record.shift === 'EVENING'
                        ? 'Evening Shift (01:00 PM - 09:00 PM)'
                        : 'Morning Shift (09:00 AM - 01:00 PM)'}
                    </span>
                  </div>

                  <span
                    className={`text-[13px] font-semibold px-2 py-0.5 rounded-md ${
                      isPresent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isLate
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                {/* Card Middle: Punch Times & Effective Hours */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-[13px]">
                  <div>
                    <span className="text-[13px] text-slate-400 block">In</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {record.checkIn ? formatTime(record.checkIn) : '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[13px] text-slate-400 block">Out</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[13px] text-slate-400 block">Duration</span>
                    <span className="font-mono font-bold text-slate-900">
                      {record.workHours ? `${record.workHours} hrs` : '--'}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Regularization Action if Late or Absent */}
                <div className="flex items-center justify-between pt-0.5 text-[13px]">
                  <span className="text-[13px] text-slate-400 truncate max-w-[200px]">
                    {record.notes || 'Biometric Face Verified'}
                  </span>

                  {record.regularizationStatus === 'PENDING' ? (
                    <span className="text-[13px] text-amber-600 font-medium">
                      Regularization Pending
                    </span>
                  ) : record.regularizationStatus === 'APPROVED' ? (
                    <span className="text-[13px] text-emerald-600 font-medium">
                      Regularized
                    </span>
                  ) : isLate || record.status === 'ABSENT' ? (
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setRegularizeReason(record.regularizationReason || '');
                        setIsModalOpen(true);
                      }}
                      className="text-[13px] text-indigo-600 hover:text-indigo-700 font-semibold underline"
                    >
                      Correct attendance
                    </button>
                  ) : null}
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
          title="Correct attendance"
          subtitle={`Log for ${formatDate(selectedRecord.date)}`}
          size="sm"
        >
          <form onSubmit={handleRegularizeSubmit} className="space-y-3.5 text-[13px]">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900">{formatDate(selectedRecord.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recorded Status:</span>
                <span className="font-semibold text-amber-700">{selectedRecord.status}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                What needs correcting? *
              </label>
              <textarea
                value={regularizeReason}
                onChange={(e) => setRegularizeReason(e.target.value)}
                placeholder="e.g. Venue deployment / Metro signal interruption"
                rows={3}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Biometric Attendance Face & Location Modal */}
      <BiometricAttendanceModal
        isOpen={biometricModalOpen}
        onClose={() => setBiometricModalOpen(false)}
        mode={biometricMode}
        employee={{
          id: employeeId,
          fullName: 'Priya Sharma',
          employeeCode: 'MW-1003',
          location: 'Hyderabad',
          shift: 'MORNING',
        }}
        onSuccess={handleBiometricSuccess}
      />
    </div>
  );
};
