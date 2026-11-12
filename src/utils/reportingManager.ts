import { Employee } from '@/types';

/** The manager recorded on an employee's profile (no demo fallbacks). */
export const getReportingManager = (employee: Employee): { id?: string; name?: string } => ({
  id: employee.managerId,
  name: employee.managerName,
});
