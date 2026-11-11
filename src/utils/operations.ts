import { Employee, LeaveRequest } from '@/types';

export const businessDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** Returns YYYY-MM-DD shifted back by N calendar months, clamping end-of-month safely. */
export const subtractMonthsFromDate = (isoDate: string, months = 1): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const target = new Date(Date.UTC(y, m - 1 - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

/** Returns YYYY-MM-DD for the day immediately before the supplied ISO date. */
export const previousDayIso = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
};

export const locationOptions = ['Hyderabad', 'Vizag', 'Bhubaneswar'];
export const approvedAway = (leaves: LeaveRequest[], date: string) => new Set(leaves.filter(leave => leave.status === 'APPROVED' && leave.startDate <= date && leave.endDate >= date).map(leave => leave.employeeId));
export const overlappingLeaveCount = (request: LeaveRequest, leaves: LeaveRequest[], employees: Employee[]) => {
  const person = employees.find(employee => employee.id === request.employeeId);
  if (!person) return 0;
  const colleagues = new Set(employees.filter(employee => employee.id !== request.employeeId && employee.status !== 'TERMINATED' && employee.location === person.location && (employee.shift || 'MORNING') === (person.shift || 'MORNING')).map(employee => employee.id));
  return new Set(leaves.filter(leave => leave.status === 'APPROVED' && colleagues.has(leave.employeeId) && leave.startDate <= request.endDate && leave.endDate >= request.startDate).map(leave => leave.employeeId)).size;
};
