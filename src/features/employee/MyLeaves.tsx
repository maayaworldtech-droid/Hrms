import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { LeaveRequest, LeaveBalance } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { formatDate, formatLabel } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import { Plus, Search, Calendar, CalendarDays } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const applyLeaveSchema = z
  .object({
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
    reason: z.string().min(5, 'Reason required'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  });

type ApplyLeaveFormValues = z.infer<typeof applyLeaveSchema>;

export const MyLeaves: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [searchParams] = useSearchParams();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(() => searchParams.get('apply') === 'true');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
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
    defaultValues: {
      leaveType: 'CASUAL_LEAVE',
      startDate: todayIst,
      endDate: todayIst,
      reason: '',
    },
  });

  const startDateWatch = watch('startDate');
  const endDateWatch = watch('endDate');

  const computedDays = useMemo(() => {
    if (!startDateWatch || !endDateWatch) return 1;
    const start = new Date(startDateWatch).getTime();
    const end = new Date(endDateWatch).getTime();
    if (end < start) return 1;
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
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
      setLeaves(Array.isArray(list) ? list : []);
      setBalances(bal);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
          message: `${computedDays} day(s) requested for manager review.`,
        })
      );
      setIsApplyModalOpen(false);
      reset();
      void loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Submission failed' }));
    }
  };

  const totalRemaining = balances
    ? (balances.casualLeave?.remaining ?? 0) +
      (balances.sickLeave?.remaining ?? 0) +
      (balances.earnedLeave?.remaining ?? 0) +
      (balances.compOff?.remaining ?? 0)
    : null;

  const counts = useMemo(() => {
    return {
      ALL: leaves.length,
      APPROVED: leaves.filter((r) => r.status === 'APPROVED').length,
      PENDING: leaves.filter((r) => r.status === 'PENDING').length,
      REJECTED: leaves.filter((r) => r.status === 'REJECTED').length,
    };
  }, [leaves]);

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
    <div className="space-y-3 pb-4">
      {/* Leave Balance Header Card (Direct Quota Rule) */}
      <section className="employee-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-200">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {totalRemaining !== null ? totalRemaining : '—'}
              </span>
              <span className="text-xs font-semibold text-slate-600">days available</span>
            </div>
            <span className="text-xs text-slate-500 block">Annual leave entitlement 2026</span>
          </div>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="employee-primary-btn"
          style={{ width: 'auto', minHeight: '38px', padding: '0 14px' }}
        >
          <Plus className="w-4 h-4" />
          <span>Apply</span>
        </button>
      </section>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="employee-search-box">
          <Search size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search leaves"
            placeholder="Search dates or reasons…"
          />
        </div>

        {/* Filter Pills with real counts */}
        <div className="employee-filter-bar">
          {(
            [
              { key: 'ALL', label: 'All' },
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
                className={`employee-filter-pill ${isActive ? 'is-active' : ''}`}
              >
                <span>{tab.label}</span>
                <span className="pill-count">{counts[tab.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leave List */}
      <div>
        {isLoading ? (
          <div className="employee-skeleton-group">
            <div className="employee-skeleton" />
            <div className="employee-skeleton" />
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="employee-empty">
            <Calendar size={32} />
            <h3>No leave requests found</h3>
            <p>Your submitted requests will appear here with live manager review status.</p>
          </div>
        ) : (
          filteredLeaves.map((req) => (
            <div key={req.id} className="employee-record-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {formatLabel(req.leaveType)}
                </span>
                <span
                  className={`employee-badge ${
                    req.status === 'APPROVED'
                      ? 'badge-success'
                      : req.status === 'PENDING'
                      ? 'badge-warning'
                      : 'badge-danger'
                  }`}
                >
                  {formatLabel(req.status)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100">
                <span className="font-semibold text-slate-800">
                  {formatDate(req.startDate)} – {formatDate(req.endDate)}
                </span>
                <span className="tabular-nums font-bold text-slate-900 tabular-nums">
                  {req.days} day{req.days > 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 italic">
                "{req.reason}"
              </p>

              {req.reviewerComments && (
                <div className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="font-semibold block">Manager note:</span>
                  {req.reviewerComments}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        size="md"
      >
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Leave Category *
            </label>
            <select
              {...register('leaveType')}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 bg-white outline-none focus:border-brand-400"
            >
              <option value="CASUAL_LEAVE">Casual Leave (CL)</option>
              <option value="SICK_LEAVE">Sick Leave (SL)</option>
              <option value="EARNED_LEAVE">Earned Leave (EL)</option>
              <option value="MATERNITY_LEAVE">Maternity leave</option>
              <option value="PATERNITY_LEAVE">Paternity leave</option>
              <option value="LOSS_OF_PAY">Loss of Pay (LOP)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Computed duration</span>
            <span className="font-bold text-slate-900 tabular-nums text-sm">{computedDays} day{computedDays > 1 ? 's' : ''}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Absence *
            </label>
            <textarea
              {...register('reason')}
              rows={2}
              placeholder="Please provide details for leave application"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 outline-none focus:border-brand-400"
            />
            {errors.reason && (
              <p className="text-accent-600 text-xs mt-0.5">{errors.reason.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="w-1/2 employee-secondary-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 employee-primary-btn"
              style={{ minHeight: '38px' }}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
