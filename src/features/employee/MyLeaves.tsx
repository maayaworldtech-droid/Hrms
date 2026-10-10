import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { LeaveRequest, LeaveBalance, LeaveType } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { formatDate } from '@/utils/formatters';
import { CalendarDays, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const applyLeaveSchema = z.object({
  leaveType: z.enum([
    'CASUAL_LEAVE',
    'SICK_LEAVE',
    'EARNED_LEAVE',
    'MATERNITY_LEAVE',
    'PATERNITY_LEAVE',
    'LOSS_OF_PAY',
  ]),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  reason: z.string().min(5, 'Please provide a clear reason for your leave'),
});

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;

export const MyLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const employeeId = 'emp-003'; // Priya Sharma

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      leaveType: 'CASUAL_LEAVE',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
    },
  });

  const startDateWatch = watch('startDate');
  const endDateWatch = watch('endDate');

  // Compute days
  const computedDays = React.useMemo(() => {
    if (!startDateWatch || !endDateWatch) return 1;
    const start = new Date(startDateWatch).getTime();
    const end = new Date(endDateWatch).getTime();
    if (end < start) return 1;
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [startDateWatch, endDateWatch]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [list, bal] = await Promise.all([
        api.leaves.getByEmployee(employeeId),
        api.leaves.getBalances(employeeId),
      ]);
      setLeaves(list);
      setBalances(bal);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onApplySubmit = async (values: ApplyLeaveFormValues) => {
    try {
      await api.leaves.apply({
        employeeId,
        employeeName: 'Priya Sharma',
        departmentName: 'Engineering',
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        days: computedDays,
        reason: values.reason,
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Leave Application Submitted',
          message: `Requested ${computedDays} day(s) of ${values.leaveType.replace('_', ' ')}. Notified Rajesh Kumar.`,
        })
      );
      setIsApplyModalOpen(false);
      reset();
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Application failed' }));
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'leaveType',
      header: 'Leave Type',
      sortable: true,
      render: (row) => (
        <Badge variant="purple" size="sm">
          {row.leaveType.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Dates Requested',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">
            {formatDate(row.startDate)} to {formatDate(row.endDate)}
          </span>
          <div className="text-[11px] text-slate-500">{row.days} day{row.days > 1 ? 's' : ''}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="text-slate-600 line-clamp-1 max-w-sm" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      key: 'appliedOn',
      header: 'Applied On',
      sortable: true,
      render: (row) => formatDate(row.appliedOn),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === 'APPROVED'
              ? 'success'
              : row.status === 'PENDING'
              ? 'warning'
              : 'error'
          }
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'reviewerComments',
      header: 'Reviewer Feedback',
      render: (row) => (
        <span className="text-slate-500 text-xs italic">
          {row.reviewerComments || (row.status === 'PENDING' ? 'Awaiting manager response' : '-')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Priya Sharma - View annual time-off balance, submit applications & monitor approvals
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsApplyModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Balances Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Casual Leave (CL)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {balances?.casualLeave.remaining ?? 8}
            <span className="text-xs font-normal text-slate-400"> / {balances?.casualLeave.total ?? 12}</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-medium">Available balance</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Sick Leave (SL)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {balances?.sickLeave.remaining ?? 8}
            <span className="text-xs font-normal text-slate-400"> / {balances?.sickLeave.total ?? 10}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Available balance</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Earned / Privilege (EL)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {balances?.earnedLeave.remaining ?? 13}
            <span className="text-xs font-normal text-slate-400"> / {balances?.earnedLeave.total ?? 18}</span>
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Encashable balance</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Compensatory Off</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {balances?.compOff.remaining ?? 2}
            <span className="text-xs font-normal text-slate-400"> / {balances?.compOff.total ?? 3}</span>
          </div>
          <span className="text-[10px] text-purple-600 font-medium">Expires end of quarter</span>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={leaves}
        columns={columns}
        searchPlaceholder="Search your leave requests..."
        exportFileName="my_leave_history"
        isLoading={isLoading}
      />

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Time Off"
        subtitle="Submit a formal leave request for management approval"
        size="md"
      >
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-4 text-xs">
          <Select
            label="Leave Category"
            options={[
              { value: 'CASUAL_LEAVE', label: 'Casual Leave (CL)' },
              { value: 'SICK_LEAVE', label: 'Sick Leave (SL)' },
              { value: 'EARNED_LEAVE', label: 'Earned / Privilege Leave (EL)' },
              { value: 'MATERNITY_LEAVE', label: 'Maternity Leave (26 weeks statutory)' },
              { value: 'PATERNITY_LEAVE', label: 'Paternity Leave (15 days)' },
              { value: 'LOSS_OF_PAY', label: 'Loss of Pay / Unpaid' },
            ]}
            error={errors.leaveType?.message}
            {...register('leaveType')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <Input
              label="End Date"
              type="date"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between text-indigo-900">
            <span className="font-medium">Total Days Calculated:</span>
            <span className="font-bold font-mono text-base">{computedDays} day{computedDays > 1 ? 's' : ''}</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="State the reason for your time off..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            {errors.reason && <p className="text-rose-600 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
