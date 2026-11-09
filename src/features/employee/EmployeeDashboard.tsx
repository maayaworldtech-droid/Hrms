import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Employee } from '@/types';
import { useAppSelector } from '@/store';
import { formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import {
  ScanFace,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  ShieldCheck,
  Briefcase,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      let [person, records, leaves] = await Promise.all([
        api.employees.getById(employeeId),
        api.attendance.getByEmployee(employeeId).catch(() => []),
        api.leaves.getBalances(employeeId).catch(() => ({
          casualLeave: { total: 12, used: 0, remaining: 12 },
          sickLeave: { total: 10, used: 0, remaining: 10 },
          earnedLeave: { total: 18, used: 0, remaining: 18 },
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
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="employee-skeleton-group py-2" role="status">
        <div className="employee-skeleton" style={{ height: '70px' }} />
        <div className="employee-skeleton" style={{ height: '180px' }} />
        <div className="employee-skeleton" style={{ height: '70px' }} />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-empty" role="alert">
        <ShieldCheck className="w-10 h-10 text-[var(--accent-500)]" />
        <h3 className="text-sm font-semibold text-slate-900 mt-2">Unable to connect</h3>
        <p className="text-xs text-slate-500 mt-1">Please check connection and retry.</p>
        <button className="employee-secondary-btn mt-3" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const shift = getShiftDefinition(employee.shift || 'MORNING');

  const completed = !!attendance?.checkOut;
  const working = !!attendance?.checkIn && !completed;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-3 pb-2">
      {/* High-Contrast Executive Greeting Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-xs text-slate-500 font-medium">{greeting},</span>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {employee.firstName || employee.fullName}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {employee.departmentName || 'Executive'} — {employee.employeeCode}
          </p>
        </div>
        <span className="employee-badge badge-brand">
          {shift.name}
        </span>
      </div>

      {/* Primary Shift & Punch Card */}
      <section className="employee-card space-y-3">
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Today's Shift</span>
            <span className="font-semibold text-slate-900 text-sm">{shift.timing}</span>
          </div>
          {/* Status badge with NO dot */}
          <span
            className={`employee-badge ${
              completed
                ? 'badge-brand'
                : working
                ? 'badge-success'
                : 'badge-neutral'
            }`}
          >
            {completed ? 'Shift complete' : working ? 'Checked in' : 'Not checked in'}
          </span>
        </div>

        {/* 3 Structured Telemetry Tiles */}
        <div className="employee-metric-grid">
          <div className="employee-metric-tile">
            <span className="metric-label">In</span>
            <strong className="metric-value">
              {attendance?.checkIn ? formatTime(attendance.checkIn) : '—'}
            </strong>
          </div>
          <div className="employee-metric-tile">
            <span className="metric-label">Out</span>
            <strong className="metric-value">
              {attendance?.checkOut ? formatTime(attendance.checkOut) : '—'}
            </strong>
          </div>
          <div className="employee-metric-tile">
            <span className="metric-label">Hours</span>
            <strong className="metric-value">
              {attendance?.workHours ? `${attendance.workHours}h` : working ? 'Live' : '—'}
            </strong>
          </div>
        </div>

        {/* Primary Biometric CTA */}
        <button
          className="employee-primary-btn"
          disabled={completed}
          onClick={() => setScanOpen(true)}
        >
          {completed ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift completed for today</span>
            </>
          ) : working ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Check out</span>
            </>
          ) : (
            <>
              <ScanFace className="w-4 h-4" />
              <span>Check in with Face Biometrics</span>
            </>
          )}
        </button>
      </section>

      {/* On Duty & Errand Claims Touch Target */}
      <Link
        to="/employee/on-duty"
        className="employee-card flex items-center justify-between hover:border-slate-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block leading-tight">
              On Duty (OD) & Errand Claims
            </span>
            <span className="text-[11px] text-slate-500">Bank runs, official tasks & bill reimbursement</span>
          </div>
        </div>
        <span className="text-xs text-[var(--brand-600)] font-semibold flex items-center gap-1">
          Apply <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </Link>

      {/* Quick Navigation Rows */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to="/employee/attendance"
          className="employee-card flex flex-col justify-between p-3.5 mb-0 hover:border-slate-300 transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Attendance</span>
            <span className="text-[10px] text-slate-500">View punch history</span>
          </div>
        </Link>

        <Link
          to="/employee/salary"
          className="employee-card flex flex-col justify-between p-3.5 mb-0 hover:border-slate-300 transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-900 block">Payslips</span>
            <span className="text-[10px] text-slate-500">View salary slips</span>
          </div>
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
          enrolledFacePhoto: employee.enrolledFacePhoto,
          enrolledFaceBiometrics: employee.enrolledFaceBiometrics,
        }}
        onSuccess={() => {
          setScanOpen(false);
          void load();
        }}
      />
    </div>
  );
};
