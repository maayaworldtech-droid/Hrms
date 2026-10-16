import { Employee, LeaveRequest } from '@/types';

export const businessDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const locationOptions = ['Hyderabad', 'Vizag', 'Bhubaneswar'];
export const approvedAway = (leaves: LeaveRequest[], date: string) => new Set(leaves.filter(leave => leave.status === 'APPROVED' && leave.startDate <= date && leave.endDate >= date).map(leave => leave.employeeId));
export const overlappingLeaveCount = (request: LeaveRequest, leaves: LeaveRequest[], employees: Employee[]) => {
  const person = employees.find(employee => employee.id === request.employeeId);
  if (!person) return 0;
  const colleagues = new Set(employees.filter(employee => employee.id !== request.employeeId && employee.status !== 'TERMINATED' && employee.location === person.location && (employee.shift || 'MORNING') === (person.shift || 'MORNING')).map(employee => employee.id));
  return new Set(leaves.filter(leave => leave.status === 'APPROVED' && colleagues.has(leave.employeeId) && leave.startDate <= request.endDate && leave.endDate >= request.startDate).map(leave => leave.employeeId)).size;
};
