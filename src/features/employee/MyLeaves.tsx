import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { LeaveRequest, LeaveBalance } from '@/types';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { formatDate } from '@/utils/formatters';
import {
  Plus,
  Search,
  Calendar,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
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
  reason: z.string().min(5, 'Please provide a reason for your leave'),
});

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;

export const MyLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || 'emp-003';
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
  const computedDays = useMemo(() => {
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
        departmentName: 'Operations',
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
          message: `Requested ${computedDays} day(s) of leave. Your manager has been notified.`,
        })
      );
      setIsApplyModalOpen(false);
      reset();
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Application failed' }));
    }
  };

  // Calculate total number of leaves (no breakdown by types)
  const totalRemaining = balances
    ? (balances.casualLeave?.remaining ?? 0) +
      (balances.sickLeave?.remaining ?? 0) +
      (balances.earnedLeave?.remaining ?? 0) +
      (balances.compOff?.remaining ?? 0)
    : 33;

  const totalAllocated = balances
    ? (balances.casualLeave?.total ?? 0) +
      (balances.sickLeave?.total ?? 0) +
      (balances.earnedLeave?.total ?? 0) +
      (balances.compOff?.total ?? 0)
    : 42;

  const totalUsed = Math.max(0, totalAllocated - totalRemaining);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReason = req.reason.toLowerCase().includes(q);
        const matchesDate =
          req.startDate.includes(q) ||
          req.endDate.includes(q) ||
          formatDate(req.startDate).toLowerCase().includes(q);
        if (!matchesReason && !matchesDate) return false;
      }
      return true;
    });
  }, [leaves, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
            My leave
          </h1>
          <p className="text-[13px] text-slate-500">
            Priya Sharma • Staff Code: MW-1003
          </p>
        </div>
      </div>

      {/* Single Total Leave Number Hero Card (No types of leaves) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400">
              Available Leaves
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[24px] font-extrabold text-slate-900 tabular-nums">
                {totalRemaining}
              </span>
              <span className="text-[13px] font-medium text-slate-400">
                / {totalAllocated} Total Days
              </span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">
              {totalUsed} days used this year
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Annual balance
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <Button
            variant="primary"
            onClick={() => setIsApplyModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full !py-2.5 !text-[13px] font-semibold"
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search leave requests" placeholder="Search by reason or date..."
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[13px] no-scrollbar">
          {(
            [
              { key: 'ALL', label: 'All Requests' },
              { key: 'APPROVED', label: 'Approved' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'REJECTED', label: 'Rejected' },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* My leave Mobile Cards (No wide table) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[13px] text-slate-500 px-1">
          <span className="font-semibold text-slate-700">Leave History</span>
          <span>{filteredLeaves.length} record(s)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[13px] text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading leave records...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-[13px] font-semibold text-slate-700 mt-2">No leave requests found</p>
            <p className="text-[13px] text-slate-400 mt-0.5">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Click Apply for Leave above to submit a request'}
            </p>
          </div>
        ) : (
          filteredLeaves.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5"
            >
              {/* Header: Date Range & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">
                    {formatDate(req.startDate)} to {formatDate(req.endDate)}
                  </span>
                  <span className="text-[13px] text-slate-500 font-medium">
                    Duration: <strong className="text-slate-800">{req.days} day{req.days > 1 ? 's' : ''}</strong>
                  </span>
                </div>

                <Badge
                  variant={
                    req.status === 'APPROVED'
                      ? 'success'
                      : req.status === 'PENDING'
                      ? 'warning'
                      : 'error'
                  }
                  size="sm"
                  dot
                >
                  {req.status}
                </Badge>
              </div>

              {/* Reason */}
              <div className="py-2 text-[13px] text-slate-700">
                <span className="text-[13px] uppercase font-bold text-slate-400 block mb-0.5">
                  Reason
                </span>
                <p className="line-clamp-2">{req.reason}</p>
              </div>

              {/* Reviewer Feedback (if any) */}
              {req.reviewerComments && (
                <div className="text-[13px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100/80">
                  <span className="font-semibold text-amber-900 not-italic">Reviewer Note: </span>
                  {req.reviewerComments}
                </div>
              )}

              {/* Footer: Applied Date */}
              <div className="flex items-center justify-between text-[13px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Applied: {formatDate(req.appliedOn)}</span>
                <span className="font-mono text-[13px] text-slate-400">Ref: {req.id}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Apply Leave Modal / Bottom Sheet */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        subtitle="Submit a formal request for management approval"
        size="md"
      >
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-4 text-[13px]">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
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

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-indigo-950">
            <span className="font-medium">Total Days:</span>
            <span className="font-bold font-mono text-[13px]">{computedDays} day{computedDays > 1 ? 's' : ''}</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason for Leave *
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="State the reason for your time off..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            {errors.reason && (
              <p className="text-rose-600 text-[13px] mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsApplyModalOpen(false)}
              className="w-1/2 !py-2.5 !text-[13px] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="w-1/2 !py-2.5 !text-[13px] font-semibold"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
