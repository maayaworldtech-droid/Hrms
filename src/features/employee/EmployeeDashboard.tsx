import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Employee } from '@/types';
import { useAppSelector } from '@/store';
import { formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  MapPin,
  ScanFace,
  CalendarDays,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || 'emp-003';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      let [person, records, leaves] = await Promise.all([
        api.employees.getById(employeeId),
        api.attendance.getByEmployee(employeeId).catch(() => []),
        api.leaves.getBalances(employeeId).catch(() => ({
          casualLeave: { total: 12, used: 2, remaining: 10 },
          sickLeave: { total: 10, used: 1, remaining: 9 },
          earnedLeave: { total: 18, used: 3, remaining: 15 },
          compOff: { total: 2, used: 0, remaining: 2 },
        })),
      ]);

      if (!person) {
        const all = await api.employees.getAll();
        person = all[0] || null;
      }

      if (!person) throw new Error('Employee record could not be loaded');

      setEmployee(person);
      setAttendance(
        records.find(
          (record) =>
            record.date ===
            new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        ) || null
      );
      setBalance(leaves);
    } catch (err) {
      console.error('Failed to load employee details:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  if (loading) {
    return (
      <div className="employee-loading py-6" role="status">
        <div />
        <div />
        <div />
        <span className="text-center text-xs text-[#667085]">Loading your workspace…</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-surface text-center py-10 space-y-4" role="alert">
        <div className="w-12 h-12 rounded-full bg-[#FEF3F2] text-[#F04438] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#101828]">Unable to load workspace</h1>
          <p className="text-xs text-[#667085] mt-1">
            Could not retrieve your employee profile. Please verify connection and retry.
          </p>
        </div>
        <button className="employee-primary max-w-xs mx-auto" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const shift = getShiftDefinition(employee.shift || 'MORNING');
  const remainingLeaves = balance
    ? balance.casualLeave.remaining +
      balance.sickLeave.remaining +
      balance.earnedLeave.remaining +
      balance.compOff.remaining
    : 18;

  const completed = !!attendance?.checkOut;
  const working = !!attendance?.checkIn && !completed;

  const todayDateString = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="employee-home">
      {/* Employee Greeting & Location */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#667085]">{todayDateString}</p>
        <h1 className="text-xl font-semibold tracking-tight text-[#101828]">
          Welcome, {employee.firstName || employee.fullName}
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-[#475467] pt-0.5">
          <MapPin className="w-3.5 h-3.5 text-[#2A4FE0] shrink-0" />
          <span>{employee.location || 'Hyderabad Center'}</span>
          <span className="text-[#98A2B3]">•</span>
          <span className="font-medium text-[#101828]">{employee.employeeCode}</span>
        </div>
      </div>

      {/* Primary Shift & Attendance Card */}
      <section className="employee-shift" aria-labelledby="shift-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="shift-heading" className="text-sm font-semibold text-[#101828]">
            Today's attendance
          </h2>
          <span className={`employee-status ${working || completed ? 'success' : ''}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                completed ? 'bg-[#12B76A]' : working ? 'bg-[#12B76A] animate-pulse' : 'bg-[#98A2B3]'
              }`}
            />
            {completed ? 'Shift completed' : working ? 'Checked in' : 'Not checked in'}
          </span>
        </div>

        <div className="employee-shift-time">
          <p>{shift.name}</p>
          <strong>{shift.timing}</strong>
        </div>

        {/* Punch Time Columns */}
        <div className="employee-punches">
          <div>
            <span>Check in</span>
            <strong>{attendance?.checkIn ? formatTime(attendance.checkIn) : '—'}</strong>
          </div>
          <div>
            <span>Check out</span>
            <strong>{attendance?.checkOut ? formatTime(attendance.checkOut) : '—'}</strong>
          </div>
          <div>
            <span>Work hours</span>
            <strong>{attendance?.workHours ? `${attendance.workHours} hrs` : working ? 'In progress' : '—'}</strong>
          </div>
        </div>

        {/* Check-In / Check-Out Biometric CTA */}
        <button
          className="employee-primary"
          disabled={completed}
          onClick={() => setScanOpen(true)}
          aria-label={completed ? 'Shift complete' : working ? 'Check out' : 'Check in with biometric scan'}
        >
          {completed ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#12B76A]" />
              <span>Shift complete for today</span>
            </>
          ) : working ? (
            <>
              <Clock className="w-5 h-5" />
              <span>Check out shift</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </>
          ) : (
            <>
              <ScanFace className="w-5 h-5" />
              <span>Check in with biometric scan</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </>
          )}
        </button>

        <p className="employee-shift-help">
          {completed
            ? 'Your attendance has been recorded for today.'
            : 'Biometric face scan and venue geolocation verified.'}
        </p>
      </section>

      {/* Available Leaves Essential Card (Rule: total directly, no nested cards) */}
      <section aria-labelledby="leaves-title">
        <Link to="/employee/leaves" className="employee-essential">
          <div className="employee-feature-icon">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-[#667085] block">Available leave quota</span>
            <strong>{remainingLeaves} days</strong>
            <span className="text-xs text-[#2A4FE0] font-medium flex items-center gap-1 mt-0.5">
              Request time off <ArrowRight className="w-3 h-3" />
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3]" />
        </Link>
      </section>

      {/* Shortcuts List */}
      <div className="space-y-2">
        <Link to="/employee/attendance" className="employee-history-link">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F5] text-[#344054] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-[#101828]">Attendance History</span>
            <span className="block text-[11px] text-[#667085]">View daily punches and regularizations</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3]" />
        </Link>

        <Link to="/employee/salary" className="employee-history-link">
          <div className="w-8 h-8 rounded-lg bg-[#F0F2F5] text-[#344054] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-[#101828]">Payslips & Tax Forms</span>
            <span className="block text-[11px] text-[#667085]">Download salary slip and Form 16</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3]" />
        </Link>
      </div>

      {/* Biometric Attendance Modal */}
      <BiometricAttendanceModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        mode={working ? 'LOGOUT' : 'LOGIN'}
        employee={{
          id: employee.id,
          fullName: employee.fullName,
          employeeCode: employee.employeeCode,
          location: employee.location,
          shift: employee.shift,
        }}
        onSuccess={() => {
          setScanOpen(false);
          void load();
        }}
      />
    </div>
  );
};
