import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { OnDutyRequest } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterPills, MobileSearch, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { formatDate, formatINR } from '@/utils/formatters';
import { onDutyStatusVariant, reimbursementStatusLabel, reimbursementStatusVariant } from '@/utils/status';
import { businessDate } from '@/utils/operations';
import { Plus, Briefcase, Receipt, Paperclip } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { DUTY_TYPES, dutyTypeLabel } from '@/utils/dutyTypes';

const applyOnDutySchema = z
  .object({
    dutyDate: z.string().min(1, 'Duty date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    dutyType: z.enum(['BANK_DEPOSIT', 'PROCUREMENT', 'CLIENT_VISIT', 'DELIVERY', 'OFFICIAL_ERRAND', 'OTHER']),
    reason: z.string().trim().min(5, 'Describe the duty and destination (at least 5 characters)'),
    hasExpense: z.boolean(),
    expenseAmount: z.coerce.number().min(0).optional(),
    expenseDescription: z.string().optional(),
  })
  .refine((data) => data.endTime > data.startTime, { message: 'End time must be after the start time', path: ['endTime'] })
  .refine((data) => !data.hasExpense || (data.expenseAmount ?? 0) > 0, { message: 'Enter the amount spent', path: ['expenseAmount'] });

type ApplyOnDutyFormValues = z.infer<typeof applyOnDutySchema>;
type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'EXPENSES';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const MyOnDuty: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(() => searchParams.get('apply') === 'true');
  const [statusFilter, setStatusFilter] = useState<Filter>(() => (searchParams.get('tab') === 'EXPENSES' ? 'EXPENSES' : 'ALL'));
  const [searchQuery, setSearchQuery] = useState('');
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  // Claim raised after an approved duty
  const [claimTarget, setClaimTarget] = useState<OnDutyRequest | null>(null);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDesc, setClaimDesc] = useState('');
  const [claimBillPhoto, setClaimBillPhoto] = useState<string | null>(null);
  const [claimErrors, setClaimErrors] = useState<{ amount?: string; desc?: string; bill?: string }>({});
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Bill attached while applying
  const [formBillPhoto, setFormBillPhoto] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplyOnDutyFormValues>({
    resolver: zodResolver(applyOnDutySchema),
    defaultValues: {
      dutyDate: businessDate(),
      startTime: '10:00',
      endTime: '14:00',
      dutyType: 'BANK_DEPOSIT',
      reason: '',
      hasExpense: false,
      expenseAmount: 0,
      expenseDescription: '',
    },
  });
  const hasExpenseWatch = watch('hasExpense');

  const loadData = useCallback(async () => {
    if (!employeeId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await api.onDuty.getByEmployee(employeeId).catch(() => []);
      setRequests(Array.isArray(list) ? [...list].sort((a, b) => b.dutyDate.localeCompare(a.dutyDate)) : []);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'FORM' | 'CLAIM') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      dispatch(addToast({ type: 'error', title: 'Unsupported file', message: 'Attach a photo or PDF of the bill.' }));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dispatch(addToast({ type: 'error', title: 'File too large', message: 'Bills must be under 5 MB.' }));
      e.target.value = '';
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    if (target === 'FORM') setFormBillPhoto(dataUrl);
    else {
      setClaimBillPhoto(dataUrl);
      setClaimErrors((prev) => ({ ...prev, bill: undefined }));
    }
  };

  const closeApply = () => {
    setIsApplyModalOpen(false);
    reset();
    setFormBillPhoto(null);
    if (searchParams.has('apply')) {
      const next = new URLSearchParams(searchParams);
      next.delete('apply');
      setSearchParams(next, { replace: true });
    }
  };

  const onApplySubmit = async (values: ApplyOnDutyFormValues) => {
    try {
      await api.onDuty.apply({
        employeeId,
        employeeName: user?.name || '',
        departmentName: '',
        dutyDate: values.dutyDate,
        startTime: values.startTime,
        endTime: values.endTime,
        dutyType: values.dutyType,
        reason: values.reason,
        hasExpense: values.hasExpense,
        expenseAmount: values.hasExpense ? Number(values.expenseAmount || 0) : 0,
        expenseDescription: values.hasExpense ? values.expenseDescription : '',
        billPhoto: values.hasExpense ? formBillPhoto || undefined : undefined,
      });
      dispatch(addToast({ type: 'success', title: 'On Duty request submitted', message: 'Sent to your manager for approval.' }));
      closeApply();
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Submission failed', message: err?.message || 'Could not submit the request.' }));
    }
  };

  const closeClaim = () => {
    setClaimTarget(null);
    setClaimAmount('');
    setClaimDesc('');
    setClaimBillPhoto(null);
    setClaimErrors({});
  };

  const handlePostDutyClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTarget) return;
    const amountNum = parseFloat(claimAmount);
    const nextErrors: typeof claimErrors = {};
    if (Number.isNaN(amountNum) || amountNum <= 0) nextErrors.amount = 'Enter the amount spent';
    if (!claimDesc.trim()) nextErrors.desc = 'Say what the expense was for';
    if (!claimBillPhoto) nextErrors.bill = 'Attach the bill or receipt';
    setClaimErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmittingClaim(true);
    try {
      await api.onDuty.claimExpense(claimTarget.id, { expenseAmount: amountNum, expenseDescription: claimDesc.trim(), billPhoto: claimBillPhoto! });
      dispatch(addToast({ type: 'success', title: 'Expense claim submitted', message: 'Your manager will review the bill.' }));
      closeClaim();
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Claim failed', message: err?.message || 'Could not submit the claim.' }));
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const counts = useMemo(
    () => ({
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === 'PENDING').length,
      APPROVED: requests.filter((r) => r.status === 'APPROVED').length,
      EXPENSES: requests.filter((r) => r.hasExpense && r.reimbursementStatus !== 'NONE').length,
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (statusFilter === 'PENDING' && req.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && req.status !== 'APPROVED') return false;
      if (statusFilter === 'EXPENSES' && (!req.hasExpense || req.reimbursementStatus === 'NONE')) return false;
      if (!q) return true;
      return (
        req.reason?.toLowerCase().includes(q) ||
        dutyTypeLabel(req.dutyType).toLowerCase().includes(q) ||
        req.expenseDescription?.toLowerCase().includes(q) ||
        formatDate(req.dutyDate).toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const billField = (target: 'FORM' | 'CLAIM', attached: string | null, error?: string) => (
    <div>
      <label htmlFor={`bill-${target}`} className="block text-sm font-medium text-slate-800 mb-1.5">
        Bill or receipt {target === 'CLAIM' && <span className="text-rose-600">*</span>}
      </label>
      <input
        id={`bill-${target}`}
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => void handleBillUpload(e, target)}
        className="block w-full text-sm text-slate-700 file:mr-3 file:h-10 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
      />
      {attached ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-emerald-700">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Attached
        </p>
      ) : error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-700">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-600">Photo or PDF, up to 5 MB.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      <MobileTitle
        title="On Duty"
        subtitle="Outdoor work and expense claims"
        action={
          <Button onClick={() => setIsApplyModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Apply
          </Button>
        }
      />

      <div className="space-y-2">
        <MobileSearch value={searchQuery} onChange={setSearchQuery} label="Search On Duty requests" placeholder="Search by reason, type or date" />
        <FilterPills<Filter>
          label="Filter On Duty requests"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { key: 'ALL', label: 'All', count: counts.ALL },
            { key: 'PENDING', label: 'Pending', count: counts.PENDING },
            { key: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { key: 'EXPENSES', label: 'Expense claims', count: counts.EXPENSES },
          ]}
        />
      </div>

      {isLoading ? (
        <MobileSkeleton />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={requests.length === 0 ? 'No On Duty requests yet' : 'Nothing matches this filter'}
          description={requests.length === 0 ? 'Bank deposits, purchases and official errands outside the center are recorded here.' : undefined}
          actionLabel={requests.length === 0 ? 'Apply On Duty' : undefined}
          onAction={requests.length === 0 ? () => setIsApplyModalOpen(true) : undefined}
        />
      ) : (
        <ul className="space-y-2.5">
          {filteredRequests.map((req) => {
            const hasClaim = req.hasExpense && (req.expenseAmount ?? 0) > 0;
            return (
              <li key={req.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{dutyTypeLabel(req.dutyType)}</span>
                  <Badge variant={onDutyStatusVariant(req.status)} size="sm" dot>
                    {req.status === 'PENDING' ? 'Pending approval' : req.status[0] + req.status.slice(1).toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {formatDate(req.dutyDate)} <span className="text-slate-600">· {req.startTime} to {req.endTime}</span>
                </p>
                <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{req.reason}</p>

                {req.reviewerComments && (
                  <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{req.reviewedBy || 'Manager'}: </span>
                    {req.reviewerComments}
                  </p>
                )}

                {hasClaim ? (
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                    <div className="min-w-0 text-sm">
                      <p className="font-medium tabular-nums text-slate-900">
                        Spent {formatINR(req.expenseAmount!)}
                        {req.expenseDescription ? <span className="font-normal text-slate-600"> · {req.expenseDescription}</span> : null}
                      </p>
                      <Badge variant={reimbursementStatusVariant(req.reimbursementStatus)} size="sm" className="mt-1">
                        {reimbursementStatusLabel(req.reimbursementStatus)}
                      </Badge>
                    </div>
                    {req.billPhoto && (
                      <Button variant="ghost" size="sm" onClick={() => setPreviewBillUrl(req.billPhoto || null)}>
                        View bill
                      </Button>
                    )}
                  </div>
                ) : (
                  req.status === 'APPROVED' && (
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                      <span className="text-sm text-slate-600">Spent money on this duty?</span>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Receipt className="h-3.5 w-3.5" />}
                        onClick={() => {
                          closeClaim();
                          setClaimTarget(req);
                        }}
                      >
                        Claim expense
                      </Button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isApplyModalOpen} onClose={closeApply} title="Apply for On Duty" subtitle="Outdoor work needs your manager's approval" size="md">
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-4">
          <Input label="Duty date" type="date" required error={errors.dutyDate?.message} {...register('dutyDate')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" required error={errors.startTime?.message} {...register('startTime')} />
            <Input label="End time" type="time" required error={errors.endTime?.message} {...register('endTime')} />
          </div>
          <Select label="Duty type" options={DUTY_TYPES.map((t) => ({ value: t.value, label: t.label }))} {...register('dutyType')} />
          <Textarea
            label="Reason and destination"
            required
            rows={3}
            placeholder="For example: depositing yesterday's ticket cash at the bank"
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="border-t border-slate-200 pt-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600" {...register('hasExpense')} />
              I spent money on this duty and want to claim it
            </label>
            {hasExpenseWatch && (
              <div className="mt-3 space-y-4">
                <Input
                  label="Amount spent"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  leftIcon={<span className="text-sm">&#8377;</span>}
                  error={errors.expenseAmount?.message}
                  {...register('expenseAmount')}
                />
                <Input label="What was it for?" placeholder="Auto fare, courier charge, stationery" {...register('expenseDescription')} />
                {billField('FORM', formBillPhoto)}
              </div>
            )}
          </div>

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

      <Modal
        isOpen={Boolean(claimTarget)}
        onClose={closeClaim}
        title="Claim an expense"
        subtitle={claimTarget ? `${dutyTypeLabel(claimTarget.dutyType)} on ${formatDate(claimTarget.dutyDate)}` : undefined}
        size="md"
      >
        <form onSubmit={handlePostDutyClaimSubmit} className="space-y-4">
          <Input
            label="Amount spent"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            leftIcon={<span className="text-sm">&#8377;</span>}
            error={claimErrors.amount}
          />
          <Input
            label="What was it for?"
            required
            placeholder="Cab fare to the bank and parking"
            value={claimDesc}
            onChange={(e) => setClaimDesc(e.target.value)}
            error={claimErrors.desc}
          />
          {billField('CLAIM', claimBillPhoto, claimErrors.bill)}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeClaim}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmittingClaim}>
              Submit claim
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(previewBillUrl)} onClose={() => setPreviewBillUrl(null)} title="Bill" size="md">
        {previewBillUrl && (
          <div className="flex max-h-[65vh] items-center justify-center overflow-auto rounded-lg bg-slate-950 p-2">
            <img src={previewBillUrl} alt="Uploaded bill" className="max-h-[60vh] max-w-full rounded object-contain" />
          </div>
        )}
      </Modal>
    </div>
  );
};
