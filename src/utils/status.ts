import type { BadgeVariant } from '@/components/common/Badge';
import type { AttendanceStatus, LeaveStatus, OnDutyStatus, ReimbursementStatus } from '@/types';

/**
 * One place that maps business statuses to badge colours, so green always means done,
 * amber always means waiting and rose always means a problem, on every screen.
 */
export const leaveStatusVariant = (status: LeaveStatus | string): BadgeVariant =>
  status === 'APPROVED' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'error' : 'neutral';

export const onDutyStatusVariant = (status: OnDutyStatus | string): BadgeVariant =>
  status === 'APPROVED' || status === 'COMPLETED'
    ? 'success'
    : status === 'PENDING'
    ? 'warning'
    : status === 'REJECTED'
    ? 'error'
    : 'neutral';

export const attendanceStatusVariant = (status: AttendanceStatus | string): BadgeVariant => {
  switch (status) {
    case 'PRESENT':
      return 'success';
    case 'LATE':
    case 'HALF_DAY':
      return 'warning';
    case 'ABSENT':
      return 'error';
    case 'ON_DUTY':
    case 'WORK_FROM_HOME':
      return 'info';
    default:
      return 'neutral';
  }
};

export const reimbursementStatusVariant = (status: ReimbursementStatus | string | undefined): BadgeVariant =>
  status === 'REIMBURSED' ? 'success' : status === 'PENDING' ? 'warning' : status === 'REJECTED' ? 'error' : 'neutral';

export const reimbursementStatusLabel = (status: ReimbursementStatus | string | undefined): string =>
  status === 'REIMBURSED'
    ? 'Reimbursed'
    : status === 'PENDING'
    ? 'Reimbursement pending'
    : status === 'REJECTED'
    ? 'Claim rejected'
    : 'No claim';
