import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Employee } from '@/types';
import { getReportingManager } from '@/services/mockData';
import { formatDate, formatINR } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';

const sections = ['Personal', 'Employment', 'Payroll'] as const;

export const EmployeeDetailsPanel = ({
  employee,
  isOpen,
  onClose,
  onEdit,
}: {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<typeof sections[number]>('Personal');

  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const details = (items: [string, string | number | undefined][]) => (
    <dl className="ops-definition">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt>{label}</dt>
          <dd>{value || 'Not provided'}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <dialog
      ref={dialog}
      className="ops-employee-panel"
      aria-labelledby="employee-detail-title"
      onCancel={onClose}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <h2 id="employee-detail-title">{employee.fullName}</h2>
        </div>
        <button className="workspace-icon" aria-label="Close employee details" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="ops-detail-tabs" aria-label="Employee sections">
        {sections.map((item) => (
          <button
            key={item}
            aria-pressed={section === item}
            className={section === item ? 'active' : ''}
            onClick={() => setSection(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {section === 'Personal' && (
        <>
          {employee.enrolledFacePhoto && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <img
                src={employee.enrolledFacePhoto}
                alt="Enrolled Face"
                className="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Registered Face ID</span>
                <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                  Biometrics Enrolled for Attendance Verification
                </span>
              </div>
            </div>
          )}
          {details([
            ['Employee ID', employee.employeeCode || employee.id],
            ['Joining date', formatDate(employee.joiningDate)],
            ['Email', employee.email],
            ['Phone', employee.phone],
            ['Residential address', employee.address],
            ['Facial Attendance Profile', employee.enrolledFacePhoto ? 'Enrolled & Verified' : 'Not Registered'],
          ])}
        </>
      )}

      {section === 'Employment' &&
        details([
          ['Location', employee.location],
          ['Employee shift', getShiftDefinition(employee.shift).name],
          ['Date of joining', formatDate(employee.joiningDate)],
          ['Employment type', employee.employmentType?.replaceAll('_', ' ')],
          ['Status', employee.status],
          ['Reports to', getReportingManager(employee).name],
          ['Portal role', employee.role],
        ])}

      {section === 'Payroll' && (
        <>
          <h3 className="mb-4">Salary and banking</h3>
          {details([
            ['Monthly salary', employee.monthlySalary != null ? formatINR(employee.monthlySalary) : undefined],
            ['Annual CTC', employee.ctcAnnual != null ? formatINR(employee.ctcAnnual) : undefined],
            ['Bank', employee.bankDetails?.bankName],
            ['Account number', employee.bankDetails?.accountNumber],
            ['IFSC', employee.bankDetails?.ifscCode],
            ['PAN', employee.bankDetails?.panNumber],
            ['UAN', employee.bankDetails?.uanNumber],
          ])}
        </>
      )}

      <div className="flex justify-end mt-6 pt-5 border-t border-slate-200">
        <button className="ops-button" onClick={onEdit}>
          <Pencil size={16} />
          Edit employee
        </button>
      </div>
    </dialog>
  );
};
