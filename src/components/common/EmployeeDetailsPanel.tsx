import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { Employee } from '@/types';
import { getReportingManager } from '@/utils/reportingManager';
import { formatDate, formatINR } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { accessLabel } from '@/utils/access';
import { Button } from './Button';
import { Badge } from './Badge';

const sections = ['Personal', 'Employment', 'Payroll'] as const;

/** Right-hand slide-over with the full employee record, opened from the Employees table. */
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
  const [section, setSection] = useState<(typeof sections)[number]>('Personal');

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (isOpen && !element.open) element.showModal();
    else if (!isOpen && element.open) element.close();
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

  const emergency = employee.emergencyContact?.name
    ? `${employee.emergencyContact.name} (${employee.emergencyContact.relationship || 'Emergency'}${employee.emergencyContact.phone ? `, ${employee.emergencyContact.phone}` : ''})`
    : employee.emergencyContactName
    ? `${employee.emergencyContactName} (${employee.emergencyContactRelationship || 'Emergency'}${employee.emergencyContactPhone ? `, ${employee.emergencyContactPhone}` : ''})`
    : undefined;

  let customComponents: any[] = [];
  if (employee.salaryStructureJson) {
    try {
      const parsed = JSON.parse(employee.salaryStructureJson);
      if (Array.isArray(parsed)) customComponents = parsed;
    } catch {
      customComponents = [];
    }
  }

  return (
    <dialog
      ref={dialog}
      className="app-slideover"
      aria-labelledby="employee-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 id="employee-detail-title" className="truncate text-lg font-semibold text-slate-900">
              {employee.fullName}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {employee.employeeCode || employee.id} · {accessLabel(employee.role)} · {employee.location || 'No center'}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close employee details" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="ops-detail-tabs" role="tablist" aria-label="Employee sections">
            {sections.map((item) => (
              <button key={item} type="button" role="tab" aria-selected={section === item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>
                {item}
              </button>
            ))}
          </div>

          {section === 'Personal' && (
            <>
              {employee.enrolledFacePhoto && (
                <div className="mb-5 flex items-center gap-3">
                  <img src={employee.enrolledFacePhoto} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Face saved for check-in</p>
                    <p className="text-xs text-slate-600">Used to verify daily attendance.</p>
                  </div>
                </div>
              )}
              {details([
                ['Employee ID', employee.employeeCode || employee.id],
                ['Email', employee.email],
                ['Phone', employee.phone],
                ['Blood group', employee.bloodGroup],
                ['Address', employee.address],
                ['Emergency contact', emergency],
                ['Face for check-in', employee.enrolledFacePhoto ? 'Saved' : 'Not saved yet'],
              ])}
            </>
          )}

          {section === 'Employment' &&
            details([
              ['Center', employee.location],
              ['Shift', getShiftDefinition(employee.shift).name],
              ['Joined', formatDate(employee.joiningDate)],
              ['Status', employee.status === 'TERMINATED' ? 'Deactivated' : employee.status ? employee.status[0] + employee.status.slice(1).toLowerCase().replaceAll('_', ' ') : undefined],
              ['Reports to', getReportingManager(employee).name],
              ['Access', employee.role === 'ADMIN' ? 'Admin, all centers' : employee.role === 'MANAGER' ? 'Center manager' : 'Staff'],
            ])}

          {section === 'Payroll' && (
            <>
              {details([
                ['Monthly salary', employee.monthlySalary != null ? formatINR(employee.monthlySalary) : undefined],
                ['Yearly salary', employee.ctcAnnual != null ? formatINR(employee.ctcAnnual) : undefined],
                ['Bank', employee.bankDetails?.bankName],
                ['Account number', employee.bankDetails?.accountNumber],
                ['IFSC', employee.bankDetails?.ifscCode],
                ['PAN', employee.bankDetails?.panNumber],
                ['EPFO UAN', employee.bankDetails?.uanNumber || 'Not applicable'],
              ])}

              {customComponents.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Salary components</h3>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {customComponents.map((c, idx) => (
                      <li key={c.id || idx} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="flex items-center gap-2 text-slate-800">
                          <Badge variant={c.type === 'EARNING' ? 'success' : 'neutral'} size="sm">
                            {c.type === 'EARNING' ? 'Earning' : 'Deduction'}
                          </Badge>
                          {c.name}
                        </span>
                        <span className="font-medium tabular-nums text-slate-900">{formatINR(c.amount || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-3">
          <Button onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>
            Edit employee
          </Button>
        </div>
      </div>
    </dialog>
  );
};
