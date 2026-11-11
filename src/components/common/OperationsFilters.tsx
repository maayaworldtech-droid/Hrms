import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { locationOptions } from '@/utils/operations';

export const OperationsFilters = ({ attendance = false, venues = locationOptions }: { attendance?: boolean; venues?: string[] }) => {
  const filters = useOperationsFilters(attendance);
  const statuses = attendance ? ['ALL','PRESENT','ON_DUTY','LATE','ON_LEAVE'] : ['ALL','PENDING','APPROVED','REJECTED','CANCELLED'];
  const label = (value: string) => value === 'ALL' ? 'All statuses' : value === 'ON_DUTY' ? 'On Duty' : value === 'ON_LEAVE' ? 'On leave' : value[0] + value.slice(1).toLowerCase().replaceAll('_',' ');
  return <div className="ops-context">
    <label>Location<select aria-label="Filter location" value={filters.venue} onChange={event => filters.set('location', event.target.value)}><option value="ALL">All locations</option>{venues.map(venue => <option key={venue}>{venue}</option>)}</select></label>
    {attendance && <label>Date<input aria-label="Filter attendance date" type="date" value={filters.date} onChange={event => filters.set('date', event.target.value)} /></label>}
    {!attendance && <label>Leave on date<input aria-label="Filter leave date" type="date" value={filters.leaveDate} onChange={event => filters.set('onDate', event.target.value)} /></label>}
    <label>Employee shift<select aria-label="Filter employee shift" value={filters.shift} onChange={event => filters.set('shift', event.target.value)}><option value="ALL">All shifts</option><option value="MORNING">Morning · 9 AM–1 PM</option><option value="EVENING">Evening · 1 PM–9 PM</option></select></label>
    <label>Status<select aria-label="Filter status" value={statuses.includes(filters.status) ? filters.status : 'ALL'} onChange={event => filters.set('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
  </div>;
};
