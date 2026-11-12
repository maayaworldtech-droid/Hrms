import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { useCenters } from '@/hooks/useCenters';
import { getShiftLabel } from '@/utils/shiftUtils';

const FIELD =
  'h-9 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
    {label}
    {children}
  </label>
);

/** Center, date, shift and status filters shared by the attendance and leave pages; state lives in the URL. */
export const OperationsFilters = ({ attendance = false, venues }: { attendance?: boolean; venues?: string[] }) => {
  const filters = useOperationsFilters(attendance);
  const { centerNames } = useCenters();
  const venueList = venues ?? centerNames;
  const statuses = attendance
    ? ['ALL', 'PRESENT', 'ON_DUTY', 'LATE', 'ON_LEAVE', 'REGULARIZATION_PENDING']
    : ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
  const label = (value: string) =>
    value === 'ALL'
      ? 'All statuses'
      : value === 'ON_DUTY'
      ? 'On Duty'
      : value === 'ON_LEAVE'
      ? 'On leave'
      : value === 'REGULARIZATION_PENDING'
      ? 'Corrections waiting'
      : value[0] + value.slice(1).toLowerCase().replaceAll('_', ' ');

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Center">
        <select className={FIELD} value={filters.venue} onChange={(event) => filters.set('location', event.target.value)}>
          <option value="ALL">All centers</option>
          {venueList.map((venue) => (
            <option key={venue}>{venue}</option>
          ))}
        </select>
      </Field>
      {attendance ? (
        <Field label="Date">
          <input className={FIELD} type="date" value={filters.date} onChange={(event) => event.target.value && filters.set('date', event.target.value)} />
        </Field>
      ) : (
        <Field label="On leave on">
          <input className={FIELD} type="date" value={filters.leaveDate} onChange={(event) => filters.set('onDate', event.target.value)} />
        </Field>
      )}
      <Field label="Shift">
        <select className={FIELD} value={filters.shift} onChange={(event) => filters.set('shift', event.target.value)}>
          <option value="ALL">All shifts</option>
          <option value="MORNING">{getShiftLabel('MORNING')}</option>
          <option value="EVENING">{getShiftLabel('EVENING')}</option>
        </select>
      </Field>
      <Field label="Status">
        <select
          className={FIELD}
          value={statuses.includes(filters.status) ? filters.status : 'ALL'}
          onChange={(event) => filters.set('status', event.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
};
