import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { OnDutyRequest, OnDutyType } from '@/types';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { formatDate } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import {
  Plus,
  Search,
  Briefcase,
  Clock,
  Calendar,
  Receipt,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Building,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const DUTY_TYPES: { value: OnDutyType; label: string; description: string }[] = [
  { value: 'BANK_DEPOSIT', label: 'Bank Deposit / Cash Handling', description: 'Depositing cash, cheques, or bank transactions' },
  { value: 'PROCUREMENT', label: 'Procurement / Purchases', description: 'Purchasing office supplies, equipment, or materials' },
  { value: 'CLIENT_VISIT', label: 'Client / Site Visit', description: 'Meeting clients, partners, or off-site branch visits' },
  { value: 'DELIVERY', label: 'Delivery / Courier Handling', description: 'Dispatching or receiving urgent documents or goods' },
  { value: 'OFFICIAL_ERRAND', label: 'Official Outdoor Errand', description: 'Government office, statutory or administrative errands' },
  { value: 'OTHER', label: 'Other Outdoor Duty', description: 'Other authorized external company duty' },
];

const applyOnDutySchema = z.object({
  dutyDate: z.string().min(1, 'Duty date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  dutyType: z.enum([
    'BANK_DEPOSIT',
    'PROCUREMENT',
    'CLIENT_VISIT',
    'DELIVERY',
    'OFFICIAL_ERRAND',
    'OTHER',
  ]),
  reason: z.string().min(5, 'Please provide a clear reason (minimum 5 characters)'),
  hasExpense: z.boolean(),
  expenseAmount: z.number().optional(),
  expenseDescription: z.string().optional(),
});

type ApplyOnDutyFormValues = z.infer<typeof applyOnDutySchema>;

export const MyOnDuty: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const employeeId = user?.id || '';

  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'EXPENSES'>(() =>
    searchParams.get('tab') === 'EXPENSES' ? 'EXPENSES' : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Bill preview state
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  // Post-duty expense claim modal state
  const [claimTarget, setClaimTarget] = useState<OnDutyRequest | null>(null);
  const [claimAmount, setClaimAmount] = useState<string>('');
  const [claimDesc, setClaimDesc] = useState<string>('');
  const [claimBillPhoto, setClaimBillPhoto] = useState<string | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Upfront form bill upload
  const [formBillPhoto, setFormBillPhoto] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
      setRequests(Array.isArray(list) ? list : []);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'FORM' | 'CLAIM') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      dispatch(addToast({ type: 'error', title: 'Invalid File', message: 'Please upload an image or receipt file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'FORM') {
        setFormBillPhoto(dataUrl);
      } else {
        setClaimBillPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const onApplySubmit = async (values: ApplyOnDutyFormValues) => {
    try {
      await api.onDuty.apply({
        employeeId,
        employeeName: user?.name || 'Shyam Sundar',
        departmentName: user?.department || 'Operations',
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

      dispatch(
        addToast({
          type: 'success',
          title: 'On Duty Request Submitted',
          message: 'Your outdoor duty request was submitted for manager review.',
        })
      );

      reset();
      setFormBillPhoto(null);
      setIsApplyModalOpen(false);
      void loadData();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Submission Failed',
          message: err?.message || 'Could not submit On Duty request.',
        })
      );
    }
  };

  const handlePostDutyClaimSubmit = async () => {
    if (!claimTarget) return;
    const amountNum = parseFloat(claimAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      dispatch(addToast({ type: 'error', title: 'Invalid Amount', message: 'Please enter a valid expense amount.' }));
      return;
    }
    if (!claimDesc.trim()) {
      dispatch(addToast({ type: 'error', title: 'Description Required', message: 'Please state what the expense was for.' }));
      return;
    }
    if (!claimBillPhoto) {
      dispatch(addToast({ type: 'error', title: 'Bill Required', message: 'Please attach a photo or scan of your receipt/bill.' }));
      return;
    }

    setIsSubmittingClaim(true);
    try {
      await api.onDuty.claimExpense(claimTarget.id, {
        expenseAmount: amountNum,
        expenseDescription: claimDesc.trim(),
        billPhoto: claimBillPhoto,
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Expense Claim Submitted',
          message: 'Your bill receipt and reimbursement request have been forwarded to your manager.',
        })
      );

      setClaimTarget(null);
      setClaimAmount('');
      setClaimDesc('');
      setClaimBillPhoto(null);
      void loadData();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Claim Failed',
          message: err?.message || 'Could not submit reimbursement claim.',
        })
      );
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === 'PENDING' && req.status !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && req.status !== 'APPROVED') return false;
      if (statusFilter === 'EXPENSES' && (!req.hasExpense || req.reimbursementStatus === 'NONE')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReason = req.reason?.toLowerCase().includes(q);
        const matchesType = req.dutyType?.toLowerCase().includes(q);
        const matchesDesc = req.expenseDescription?.toLowerCase().includes(q);
        if (!matchesReason && !matchesType && !matchesDesc) return false;
      }

      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  const formatDutyType = (type: OnDutyType) => {
    switch (type) {
      case 'BANK_DEPOSIT':
        return 'Bank Deposit';
      case 'PROCUREMENT':
        return 'Purchases';
      case 'CLIENT_VISIT':
        return 'Client Visit';
      case 'DELIVERY':
        return 'Delivery / Courier';
      case 'OFFICIAL_ERRAND':
        return 'Official Errand';
      default:
        return 'On Duty';
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">On Duty (OD)</h1>
          <p className="text-xs text-slate-500">Official outdoor work & expense reimbursements</p>
        </div>
        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-600)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-700)] transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Apply OD</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        {(['ALL', 'PENDING', 'APPROVED', 'EXPENSES'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              statusFilter === filter
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {filter === 'ALL' && 'All Requests'}
            {filter === 'PENDING' && 'Pending'}
            {filter === 'APPROVED' && 'Approved'}
            {filter === 'EXPENSES' && 'Expense Claims'}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by reason, type, or expense…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
        />
      </div>

      {/* List of Requests */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          Loading On Duty records…
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-800">No On Duty requests found</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Need to deposit money, run an official errand, or purchase supplies? Apply above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-colors"
            >
              {/* Row 1: Badges & Date */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                    {formatDutyType(req.dutyType)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(req.dutyDate)}
                  </span>
                </div>

                {/* Status Badge */}
                {req.status === 'PENDING' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Approval
                  </span>
                )}
                {req.status === 'APPROVED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Approved
                  </span>
                )}
                {req.status === 'REJECTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    Rejected
                  </span>
                )}
              </div>

              {/* Row 2: Time Window & Reason */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{req.startTime} – {req.endTime}</span>
                </div>
                <p className="text-xs text-slate-800 font-normal leading-relaxed">
                  {req.reason}
                </p>
              </div>

              {/* Row 3: Manager Review Notes (if any) */}
              {req.reviewerComments && (
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] space-y-0.5">
                  <span className="text-slate-500 font-medium">Manager Feedback ({req.reviewedBy || 'Reviewer'}):</span>
                  <p className="text-slate-700">{req.reviewerComments}</p>
                </div>
              )}

              {/* Row 4: Expense & Reimbursement Box */}
              {req.hasExpense && req.expenseAmount && req.expenseAmount > 0 ? (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Receipt className="w-3.5 h-3.5 text-slate-500" />
                      <span>Spent: ₹{req.expenseAmount.toLocaleString('en-IN')}</span>
                      {req.reimbursementStatus === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Reimbursement Pending
                        </span>
                      )}
                      {req.reimbursementStatus === 'REIMBURSED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Reimbursed
                        </span>
                      )}
                      {req.reimbursementStatus === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Claim Rejected
                        </span>
                      )}
                    </div>
                    {req.expenseDescription && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {req.expenseDescription}
                      </p>
                    )}
                  </div>

                  {req.billPhoto && (
                    <button
                      onClick={() => setPreviewBillUrl(req.billPhoto || null)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Bill</span>
                    </button>
                  )}
                </div>
              ) : (
                /* No expense yet: Offer Claim button if OD is approved */
                req.status === 'APPROVED' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Spent money during this duty?</span>
                    <button
                      onClick={() => {
                        setClaimTarget(req);
                        setClaimAmount('');
                        setClaimDesc('');
                        setClaimBillPhoto(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-600)] hover:bg-[var(--brand-50)] rounded transition-colors cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Upload Bill & Claim</span>
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply On Duty Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => {
          setIsApplyModalOpen(false);
          reset();
          setFormBillPhoto(null);
        }}
        title="Apply for On Duty"
        subtitle="Submit outdoor company assignment or errand for manager approval"
      >
        <form onSubmit={handleSubmit(onApplySubmit)} className="space-y-4 text-xs">
          {/* Duty Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Duty Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('dutyDate')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
            />
            {errors.dutyDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.dutyDate.message}</p>
            )}
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                {...register('startTime')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
              {errors.startTime && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.startTime.message}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                {...register('endTime')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
              {errors.endTime && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Work / Assignment Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Duty Category <span className="text-rose-500">*</span>
            </label>
            <select
              {...register('dutyType')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
            >
              {DUTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason / Purpose */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason & Destination Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Depositing ₹75,000 cash at HDFC Bank Madhapur branch for payroll reserve..."
              {...register('reason')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
            />
            {errors.reason && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.reason.message}</p>
            )}
          </div>

          {/* Expense Reimbursement Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('hasExpense')}
                className="w-4 h-4 rounded text-[var(--brand-600)] border-slate-300 focus:ring-0"
              />
              <span className="font-semibold text-slate-800">
                Incurred an expense? (Attach bill for reimbursement)
              </span>
            </label>

            {hasExpenseWatch && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 450"
                    onChange={(e) => setValue('expenseAmount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Expense Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Auto fare, courier charge, or stationery purchase"
                    {...register('expenseDescription')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Upload Bill / Receipt Photo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleBillUpload(e, 'FORM')}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                  />

                  {formBillPhoto && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-white border border-slate-200 rounded">
                      <img src={formBillPhoto} alt="Bill preview" className="w-10 h-10 object-cover rounded" />
                      <span className="text-[11px] text-emerald-700 font-medium">Receipt attached successfully</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsApplyModalOpen(false);
                reset();
                setFormBillPhoto(null);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[var(--brand-600)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-700)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting…' : 'Submit On Duty'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Post-Duty Expense Claim Modal */}
      {claimTarget && (
        <Modal
          isOpen={!!claimTarget}
          onClose={() => {
            setClaimTarget(null);
            setClaimAmount('');
            setClaimDesc('');
            setClaimBillPhoto(null);
          }}
          title="Claim Expense & Upload Bill"
          subtitle={`Duty: ${formatDutyType(claimTarget.dutyType)} on ${formatDate(claimTarget.dutyDate)}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expense Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 350.00"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expense Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Cab travel fare to bank & parking fee"
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Upload Bill / Receipt Photo <span className="text-rose-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleBillUpload(e, 'CLAIM')}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
              />

              {claimBillPhoto && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded">
                  <img src={claimBillPhoto} alt="Bill receipt" className="w-12 h-12 object-cover rounded" />
                  <span className="text-[11px] text-emerald-700 font-medium">Receipt ready for upload</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClaimTarget(null)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingClaim}
                onClick={handlePostDutyClaimSubmit}
                className="px-4 py-2 bg-[var(--brand-600)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-700)] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingClaim ? 'Submitting…' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bill Preview Modal */}
      {previewBillUrl && (
        <Modal
          isOpen={!!previewBillUrl}
          onClose={() => setPreviewBillUrl(null)}
          title="Bill Receipt Preview"
          subtitle="Attached expense document"
        >
          <div className="space-y-3">
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center p-2 bg-slate-950 rounded-lg">
              <img
                src={previewBillUrl}
                alt="Uploaded receipt"
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewBillUrl(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
