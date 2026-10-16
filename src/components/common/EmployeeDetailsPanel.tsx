import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Employee, AttendanceRecord, Payslip } from '@/types';
import { api } from '@/services/api';
import { getReportingManager } from '@/services/mockData';
import { formatDate, formatTime, formatINR } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';

const sections = ['Personal', 'Employment', 'Attendance', 'Payroll'] as const;
export const EmployeeDetailsPanel = ({ employee, isOpen, onClose, onEdit }: { employee: Employee; isOpen: boolean; onClose: () => void; onEdit: () => void }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<typeof sections[number]>('Personal');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let active = true;
    Promise.all([api.attendance.getByEmployee(employee.id), api.payroll.getPayslipsByEmployee(employee.id)])
      .then(([records, slips]) => { if (active) { setAttendance(records.sort((a,b) => b.date.localeCompare(a.date))); setPayslips(slips.sort((a,b) => b.year - a.year || new Date(`${b.month} 1, ${b.year}`).getTime() - new Date(`${a.month} 1, ${a.year}`).getTime())); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; element?.close(); document.body.style.overflow = previousOverflow; };
  }, [isOpen, employee.id]);
  const details = (items: [string, string | number | undefined][]) => <dl className="ops-definition">{items.map(([label,value]) => <div key={label} className="contents"><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl>;
  return <dialog ref={dialog} className="ops-employee-panel" aria-labelledby="employee-detail-title" onCancel={onClose} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) onClose(); }}>
    <div className="flex items-start justify-between gap-4 pb-6">
      <div><h2 id="employee-detail-title">{employee.fullName}</h2><p className="ops-muted mt-1">{employee.employeeCode} · {employee.location}</p></div>
      <button className="workspace-icon" aria-label="Close employee details" onClick={onClose}><X size={20}/></button>
    </div>
    <div className="ops-detail-tabs" aria-label="Employee sections">{sections.map(item => <button key={item} aria-pressed={section === item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item}</button>)}</div>
    {section === 'Personal' && <>{details([['Email',employee.email],['Phone',employee.phone],['Residential address',employee.address],['Emergency contact',employee.emergencyContact?.name],['Relationship',employee.emergencyContact?.relationship],['Emergency phone',employee.emergencyContact?.phone]])}</>}
    {section === 'Employment' && details([['Venue',employee.location],['Designation',employee.designation],['Department',employee.departmentName],['Employee shift',getShiftDefinition(employee.shift).name],['Joined',formatDate(employee.joiningDate)],['Employment type',employee.employmentType?.replaceAll('_',' ')],['Status',employee.status],['Reports to',getReportingManager(employee).name],['Portal role',employee.role]])}
    {(section === 'Attendance' || section === 'Payroll') && loading && <p className="ops-empty" role="status">Loading employee records…</p>}
    {(section === 'Attendance' || section === 'Payroll') && error && <p className="ops-empty" role="alert">Unable to load records. Close and reopen this panel to try again.</p>}
    {section === 'Attendance' && !loading && !error && <><p className="ops-muted mb-4">Latest recorded shifts · {attendance.length} records</p><ul className="ops-list">{attendance.slice(0,15).map(record => <li key={record.id} className="ops-row"><div><strong>{formatDate(record.date)}</strong><p className="ops-muted">{record.checkIn ? formatTime(record.checkIn) : 'No check-in'} – {record.checkOut ? formatTime(record.checkOut) : 'No check-out'} · {record.workHours} hours</p></div><span>{record.status.replaceAll('_',' ')}</span></li>)}</ul>{!attendance.length && <p className="ops-empty">No attendance records for this employee.</p>}</>}
    {section === 'Payroll' && <><h3 className="mb-4">Salary and banking</h3>{details([['Monthly salary',employee.monthlySalary != null ? formatINR(employee.monthlySalary) : undefined],['Annual CTC',employee.ctcAnnual != null ? formatINR(employee.ctcAnnual) : undefined],['Bank',employee.bankDetails?.bankName],['Account number',employee.bankDetails?.accountNumber],['IFSC',employee.bankDetails?.ifscCode],['PAN',employee.bankDetails?.panNumber],['UAN',employee.bankDetails?.uanNumber]])}<h3 className="mt-6 mb-2">Payroll history</h3>{!loading && !error && <ul className="ops-list">{payslips.map(slip => <li className="ops-row" key={slip.id}><div><strong>{slip.month} {slip.year}</strong><p className="ops-muted">{slip.paymentStatus.toLowerCase()}</p></div><span>{formatINR(slip.components.netMonthly)}</span></li>)}{!payslips.length && <li className="ops-empty">No payslips recorded.</li>}</ul>}</>}
    <div className="flex justify-end mt-6 pt-5 border-t border-slate-200"><button className="ops-button" onClick={onEdit}><Pencil size={16}/>Edit employee</button></div>
  </dialog>;
};
