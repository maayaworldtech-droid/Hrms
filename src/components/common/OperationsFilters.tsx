import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { useCenters } from '@/hooks/useCenters';
import { getShiftLabel } from '@/utils/shiftUtils';

export const OperationsFilters = ({ attendance = false, venues }: { attendance?: boolean; venues?: string[] }) => {
  const filters = useOperationsFilters(attendance);
  const { centerNames } = useCenters();
  const venueList = venues ?? centerNames;
  const statuses = attendance ? ['ALL','PRESENT','ON_DUTY','LATE','ON_LEAVE','REGULARIZATION_PENDING'] : ['ALL','PENDING','APPROVED','REJECTED','CANCELLED'];
  const label = (value: string) => value === 'ALL' ? 'All statuses' : value === 'ON_DUTY' ? 'On Duty' : value === 'ON_LEAVE' ? 'On leave' : value === 'REGULARIZATION_PENDING' ? 'Corrections waiting' : value[0] + value.slice(1).toLowerCase().replaceAll('_',' ');
  return <div className="ops-context">
    <label>Center<select aria-label="Filter center" value={filters.venue} onChange={event => filters.set('location', event.target.value)}><option value="ALL">All centers</option>{venueList.map(venue => <option key={venue}>{venue}</option>)}</select></label>
    {attendance && <label>Date<input aria-label="Filter attendance date" type="date" value={filters.date} onChange={event => filters.set('date', event.target.value)} /></label>}
    {!attendance && <label>Leave on date<input aria-label="Filter leave date" type="date" value={filters.leaveDate} onChange={event => filters.set('onDate', event.target.value)} /></label>}
    <label>Shift<select aria-label="Filter employee shift" value={filters.shift} onChange={event => filters.set('shift', event.target.value)}><option value="ALL">All shifts</option><option value="MORNING">{getShiftLabel('MORNING')}</option><option value="EVENING">{getShiftLabel('EVENING')}</option></select></label>
    <label>Status<select aria-label="Filter status" value={statuses.includes(filters.status) ? filters.status : 'ALL'} onChange={event => filters.set('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
  </div>;
};
