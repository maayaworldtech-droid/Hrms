import { useOperationsFilters } from '@/hooks/useOperationsFilters';
import { businessDate, locationOptions } from '@/utils/operations';

export const OperationsFilters = ({ attendance = false, venues = locationOptions }: { attendance?: boolean; venues?: string[] }) => {
  const filters = useOperationsFilters(attendance);
  const statuses = attendance ? ['ALL','ISSUES','PRESENT','LATE','ABSENT','HALF_DAY','ON_LEAVE','WORK_FROM_HOME','REGULARIZATION_PENDING'] : ['ALL','PENDING','APPROVED','REJECTED','CANCELLED'];
  const label = (value: string) => value === 'ALL' ? 'All statuses' : value === 'ISSUES' ? 'Attendance issues' : value === 'REGULARIZATION_PENDING' ? 'Corrections to review' : value[0] + value.slice(1).toLowerCase().replaceAll('_',' ');
  return <div className="ops-context">
    <label>Venue<select aria-label="Filter venue" value={filters.venue} onChange={event => filters.set('location', event.target.value)}><option value="ALL">All locations</option>{venues.map(venue => <option key={venue}>{venue}</option>)}</select></label>
    {attendance && <label>Date<input aria-label="Filter attendance date" type="date" value={filters.date} onChange={event => filters.set('date', event.target.value)} /></label>}
    {!attendance && <label>Leave on date<input aria-label="Filter leave date" type="date" value={filters.leaveDate} onChange={event => filters.set('onDate', event.target.value)} /></label>}
    <label>Employee shift<select aria-label="Filter employee shift" value={filters.shift} onChange={event => filters.set('shift', event.target.value)}><option value="ALL">All shifts</option><option value="MORNING">Morning · 9 AM–1 PM</option><option value="EVENING">Evening · 1 PM–9 PM</option></select></label>
    <label>Status<select aria-label="Filter status" value={statuses.includes(filters.status) ? filters.status : 'ALL'} onChange={event => filters.set('status', event.target.value)}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
    {attendance && <button className="ops-button secondary" onClick={() => filters.set('date', filters.date ? '' : businessDate())}>{filters.date ? 'All dates' : 'Today'}</button>}
    {!attendance && filters.leaveDate && <button className="ops-button secondary" onClick={() => filters.set('onDate','')}>All dates</button>}
  </div>;
};
