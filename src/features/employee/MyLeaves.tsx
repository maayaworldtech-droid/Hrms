import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { LeaveRequest, LeaveBalance } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterPills, MobileSearch, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { formatDate, formatLabel } from '@/utils/formatters';
import { leaveStatusVariant } from '@/utils/status';
import { businessDate } from '@/utils/operations';
import { Plus, CalendarDays } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const applyLeaveSchema = z
  .object({
    leaveType: z.enum(['CASUAL_LEAVE', 'SICK_LEAVE', 'EARNED_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'LOSS_OF_PAY']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z.string().trim().min(5, 'Please give a short reason (at least 5 characters)'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  });

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;
type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const LEAVE_TYPES = [
  { value: 'CASUAL_LEAVE', label: 'Casual leave' },
  { value: 'SICK_LEAVE', label: 'Sick leave' },
  { value: 'EARNED_LEAVE', label: 'Earned leave' },
  { value: 'MATERNITY_LEAVE', label: 'Maternity leave' },
  { value: 'PATERNITY_LEAVE', label: 'Paternity leave' },
  { value: 'LOSS_OF_PAY', label: 'Loss of pay' },
];

export const MyLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(() => searchParams.get('apply') === 'true');
  const [statusFilter, setStatusFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const todayIst = businessDate();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: { leaveType: 'CASUAL_LEAVE', startDate: todayIst, endDate: todayIst, reason: '' },
  });

  const startDateWatch = watch('startDate');
  const endDateWatch = watch('endDate');

  const computedDays = useMemo(() => {
    if (!startDateWatch || !endDateWatch) return 1;
    const start = new Date(startDateWatch).getTime();
    const end = new Date(endDateWatch).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
    return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  }, [startDateWatch, endDateWatch]);

  const loadData = useCallback(async () => {
    if (!employeeId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [list, bal] = await Promise.all([
        api.leaves.getByEmployee(employeeId).catch(() => []),
        api.leaves.getBalances(employeeId).catch(() => null),
      ]);
      setLeaves(Array.isArray(list) ? [...list].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)) : []);
      setBalances(bal);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const closeApply = () => {
    setIsApplyModalOpen(false);
    if (searchParams.has('apply')) {
      const next = new URLSearchParams(searchParams);
      next.delete('apply');
      setSearchParams(next, { replace: true });
    }
  };

  const onApplySubmit = async (values: ApplyLeaveFormValues) => {
    try {
      await api.leaves.apply({
        employeeId,
        employeeName: user?.name || '',
        departmentName: '',
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        days: computedDays,
        reason: values.reason,
      });
      dispatch(
        addToast({
          type: 'success',
          title: 'Leave request submitted',
          message: `${computedDays} day${computedDays > 1 ? 's' : ''} sent to your manager for review.`,
        })
      );
      closeApply();
      reset();
      void loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed', message: 'Please try again.' }));
    }
  };

  const totalRemaining = balances
    ? (balances.casualLeave?.remaining ?? 0) +
      (balances.sickLeave?.remaining ?? 0) +
      (balances.earnedLeave?.remaining ?? 0) +
      (balances.compOff?.remaining ?? 0)
    : null;

  const counts = useMemo(
    () => ({
      ALL: leaves.length,
      PENDING: leaves.filter((r) => r.status === 'PENDING').length,
      APPROVED: leaves.filter((r) => r.status === 'APPROVED').length,
      REJECTED: leaves.filter((r) => r.status === 'REJECTED').length,
    }),
    [leaves]
  );

  const filteredLeaves = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leaves.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (!q) return true;
      return (
        req.reason.toLowerCase().includes(q) ||
        req.startDate.includes(q) ||
        req.endDate.includes(q) ||
        formatDate(req.startDate).toLowerCase().includes(q) ||
        formatLabel(req.leaveType).toLowerCase().includes(q)
      );
    });
  }, [leaves, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-4">
      <MobileTitle
        title="Leave"
        subtitle={
          totalRemaining !== null ? (
            <>
              <span className="font-semibold tabular-nums text-slate-900">{totalRemaining}</span> days available this year
            </>
          ) : (
            'Leave balance unavailable'
          )
        }
        action={
          <Button size="md" onClick={() => setIsApplyModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Apply
          </Button>
        }
      />

      <div className="space-y-2">
        <MobileSearch value={searchQuery} onChange={setSearchQuery} label="Search leave requests" placeholder="Search by date, type or reason" />
        <FilterPills<Filter>
          label="Filter leave requests"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'ALL', label: 'All', count: counts.ALL },
            { key: 'PENDING', label: 'Pending', count: counts.PENDING },
            { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { key: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
          ]}
        />
      </div>

      {isLoading ? (
        <MobileSkeleton />
      ) : filteredLeaves.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={leaves.length === 0 ? 'No leave requests yet' : 'Nothing matches this filter'}
          description={leaves.length === 0 ? 'Requests you submit will appear here with their approval status.' : undefined}
          actionLabel={leaves.length === 0 ? 'Apply for leave' : undefined}
          onAction={leaves.length === 0 ? () => setIsApplyModalOpen(true) : undefined}
        />
      ) : (
        <ul className="space-y-2.5">
          {filteredLeaves.map((req) => (
            <li key={req.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{formatLabel(req.leaveType)}</span>
                <Badge variant={leaveStatusVariant(req.status)} size="sm" dot>
                  {formatLabel(req.status)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {formatDate(req.startDate)}
                {req.endDate !== req.startDate ? ` to ${formatDate(req.endDate)}` : ''}
                <span className="text-slate-600">
                  {' '}
                  · {req.days} day{req.days > 1 ? 's' : ''}
                </span>
              </p>
              <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{req.reason}</p>
              {req.reviewerComments && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Manager note: </span>
                  {req.reviewerComments}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={isApplyModalOpen} onClose={closeApply} title="Apply for leave" size="md">
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-4">
          <Select label="Leave type" options={LEAVE_TYPES} {...register('leaveType')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" required error={errors.startDate?.message} {...register('startDate')} />
            <Input label="To" type="date" required min={startDateWatch} error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <p className="text-sm text-slate-700">
            Duration: <span className="font-semibold tabular-nums text-slate-900">{computedDays} day{computedDays > 1 ? 's' : ''}</span>
            {totalRemaining !== null && computedDays > totalRemaining && (
              <span className="block mt-1 text-amber-800">This exceeds your {totalRemaining} remaining days; the extra days may be treated as loss of pay.</span>
            )}
          </p>
          <Textarea label="Reason" required rows={3} placeholder="Briefly explain the reason for leave" error={errors.reason?.message} {...register('reason')} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeApply}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Submit request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
