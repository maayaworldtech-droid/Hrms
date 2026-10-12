import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { AttendanceRecord, LeaveBalance, Employee } from '@/types';
import { useAppSelector } from '@/store';
import { formatTime } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { BiometricAttendanceModal } from '@/components/attendance/BiometricAttendanceModal';
import { ArrowUpRight, ChevronRight, MapPin, ScanFace, CalendarDays, CheckCircle2, Clock } from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const employeeId = user?.id || 'emp-003';
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    try {
      const [person, records, leaves] = await Promise.all([
        api.employees.getById(employeeId), api.attendance.getByEmployee(employeeId),
        api.leaves.getBalances(employeeId),
      ]);
      if (!person) throw new Error('Employee not found');
      setEmployee(person);
      setAttendance(records.find(record => record.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) || null);
      setBalance(leaves);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [employeeId]);
  if (loading) return <div className="employee-loading" role="status"><div /><div /><div /><span>Loading your workspace…</span></div>;
  if (error || !employee) return <div className="employee-surface" role="alert"><h1>Unable to load your workspace</h1><p>Please try again to see your latest details.</p><button className="employee-primary mt-4" onClick={load}>Try again</button></div>;
  const shift = getShiftDefinition(employee.shift || 'MORNING');
  const remaining = balance ? balance.casualLeave.remaining + balance.sickLeave.remaining + balance.earnedLeave.remaining + balance.compOff.remaining : null;
  const completed = !!attendance?.checkOut;
  const working = !!attendance?.checkIn && !completed;
  return (
    <div className="employee-home">
      <div className="employee-page-heading">
        <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</p>
        <h1>{employee.firstName}'s workspace</h1>
        <span className="employee-location"><MapPin size={15} />{employee.location} <span aria-hidden="true">·</span> {employee.employeeCode}</span>
      </div>
      <section className="employee-shift">
        <div className="flex items-center justify-between gap-3">
          <h2>Today’s attendance</h2><span className={`employee-status ${working || completed ? 'success' : ''}`}>{completed ? 'Completed' : working ? 'Checked in' : 'Not checked in'}</span>
        </div>
        <div className="employee-shift-time"><p>{shift.name}</p><strong>{shift.timing}</strong></div>
        <div className="employee-punches">
          <div><span>Check in</span><strong>{attendance?.checkIn ? formatTime(attendance.checkIn) : '—'}</strong></div>
          <div><span>Check out</span><strong>{attendance?.checkOut ? formatTime(attendance.checkOut) : '—'}</strong></div>
          <div><span>Hours worked</span><strong>{attendance?.workHours ? `${attendance.workHours} hrs` : '—'}</strong></div>
        </div>
        <button className="employee-primary" disabled={completed} onClick={() => setScanOpen(true)}>
          {completed ? <CheckCircle2 size={20} /> : <ScanFace size={20} />}{completed ? 'Shift complete' : working ? 'Check out' : 'Check in'}{!completed && <ChevronRight size={18} className="ml-auto" />}
        </button>
        <p className="employee-shift-help">{completed ? 'Your attendance has been recorded for today.' : 'Confirm your face and location at your venue.'}</p>
      </section>
      <section className="employee-overview" aria-labelledby="overview-title">
        <h2 id="overview-title">Your essentials</h2>
        <Link to="/employee/leaves" className="employee-essential">
          <span className="employee-feature-icon"><CalendarDays size={22} /></span>
          <span className="flex-1"><span className="block">Available leave</span><strong>{remaining === null ? 'Not available' : `${remaining} days`}</strong><span className="block employee-muted">Plan your time off</span></span><ArrowUpRight size={20} />
        </Link>
      </section>
      <Link to="/employee/attendance" className="employee-history-link"><Clock size={20} /><span>View attendance history</span><ChevronRight size={18} /></Link>
      <BiometricAttendanceModal isOpen={scanOpen} onClose={() => setScanOpen(false)} mode={working ? 'LOGOUT' : 'LOGIN'} employee={{ id: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode, location: employee.location, shift: employee.shift }} onSuccess={() => { setScanOpen(false); void load(); }} />
    </div>
  );
};
