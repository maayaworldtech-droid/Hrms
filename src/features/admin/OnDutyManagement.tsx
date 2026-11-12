import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { OnDutyRequest, OnDutyType, Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { PageHeader } from '@/components/common/PageHeader';
import { formatDate, formatINR } from '@/utils/formatters';
import { businessDate } from '@/utils/operations';
import { onDutyStatusVariant, reimbursementStatusLabel, reimbursementStatusVariant } from '@/utils/status';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { DUTY_TYPES, dutyTypeLabel } from '@/utils/dutyTypes';

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'EXPENSES' | 'CLAIMS_PENDING';

export const OnDutyManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Filter>('ALL');

  // Admin assigns a duty directly (already approved)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignDate, setAssignDate] = useState(() => businessDate());
  const [assignStartTime, setAssignStartTime] = useState('10:00');
  const [assignEndTime, setAssignEndTime] = useState('14:00');
  const [assignType, setAssignType] = useState<OnDutyType>('BANK_DEPOSIT');
  const [assignReason, setAssignReason] = useState('');
  const [assignErrors, setAssignErrors] = useState<{ employee?: string; time?: string; reason?: string }>({});

  const [selectedDuty, setSelectedDuty] = useState<OnDutyRequest | null>(null);
  const [dutyComments, setDutyComments] = useState('');
  const [reimburseTarget, setReimburseTarget] = useState<OnDutyRequest | null>(null);
  const [reimburseComments, setReimburseComments] = useState('');
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dutyList, empList] = await Promise.all([api.onDuty.getAll().catch(() => []), api.employees.getAll().catch(() => [])]);
      setRequests(Array.isArray(dutyList) ? dutyList : []);
      setEmployees(Array.isArray(empList) ? empList : []);
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load On Duty records' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Only people who can actually be sent out: active staff, not admins
  const assignable = useMemo(
    () => employees.filter((e) => e.status !== 'TERMINATED' && e.role !== 'ADMIN').sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [employees]
  );

  const openAssign = () => {
    setAssignEmpId('');
    setAssignDate(businessDate());
    setAssignStartTime('10:00');
    setAssignEndTime('14:00');
    setAssignType('BANK_DEPOSIT');
    setAssignReason('');
    setAssignErrors({});
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof assignErrors = {};
    if (!assignEmpId) errors.employee = 'Choose who is going';
    if (!assignStartTime || !assignEndTime || assignEndTime <= assignStartTime) errors.time = 'End time must be after the start time';
    if (assignReason.trim().length < 5) errors.reason = 'Describe the task and destination';
    setAssignErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const emp = employees.find((x) => String(x.id) === assignEmpId);
      await api.onDuty.apply({
        employeeId: assignEmpId,
        employeeName: emp?.fullName || 'Assigned employee',
        departmentName: '',
        location: emp?.location || '',
        dutyDate: assignDate,
        startTime: assignStartTime,
        endTime: assignEndTime,
        dutyType: assignType,
        reason: assignReason.trim(),
        status: 'APPROVED',
        reviewedBy: currentUser?.name || 'Administrator',
        reviewedOn: businessDate(),
        reviewerComments: 'Assigned directly by administrator',
      });
      dispatch(addToast({ type: 'success', title: 'On Duty assigned', message: `${emp?.fullName || 'The employee'} can see it in their portal.` }));
      setIsAssignModalOpen(false);
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not assign', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDutyDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedDuty || saving) return;
    if (decision === 'REJECTED' && !dutyComments.trim()) return;
    setSaving(true);
    try {
      await api.onDuty.updateStatus(
        selectedDuty.id,
        decision,
        dutyComments.trim() || (decision === 'APPROVED' ? 'Approved by admin' : 'Declined by admin'),
        currentUser?.name || 'Administrator'
      );
      dispatch(addToast({ type: 'success', title: decision === 'APPROVED' ? 'Duty approved' : 'Duty declined', message: `Decision saved for ${selectedDuty.employeeName}.` }));
      setSelectedDuty(null);
      setDutyComments('');
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not save decision', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleReimbursementDecision = async (decision: 'REIMBURSED' | 'REJECTED') => {
    if (!reimburseTarget || saving) return;
    if (decision === 'REJECTED' && !reimburseComments.trim()) return;
    setSaving(true);
    try {
      await api.onDuty.updateReimbursement(
        reimburseTarget.id,
        decision,
        reimburseComments.trim() || (decision === 'REIMBURSED' ? 'Approved by admin' : 'Bill claim rejected'),
        currentUser?.name || 'Administrator'
      );
      dispatch(
        addToast({
          type: 'success',
          title: decision === 'REIMBURSED' ? 'Marked as reimbursed' : 'Claim declined',
          message: `${formatINR(reimburseTarget.expenseAmount || 0)} for ${reimburseTarget.employeeName}.`,
        })
      );
      setReimburseTarget(null);
      setReimburseComments('');
      void loadData();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not save decision', message: err?.message || 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const filteredRequests = useMemo(
    () =>
      requests.filter((req) => {
        if (statusFilter === 'PENDING') return req.status === 'PENDING';
        if (statusFilter === 'APPROVED') return req.status === 'APPROVED';
        if (statusFilter === 'EXPENSES') return req.hasExpense && req.reimbursementStatus !== 'NONE';
        if (statusFilter === 'CLAIMS_PENDING') return req.reimbursementStatus === 'PENDING';
        return true;
      }),
    [requests, statusFilter]
  );

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingClaims = requests.filter((r) => r.reimbursementStatus === 'PENDING');
  const pendingReimbursements = pendingClaims.reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
  const totalReimbursed = requests.filter((r) => r.reimbursementStatus === 'REIMBURSED').reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
  const toggle = (value: Filter) => setStatusFilter(statusFilter === value ? 'ALL' : value);

  const columns: Column<OnDutyRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.employeeName}</div>
          <div className="text-xs text-slate-600">{row.location || ''}</div>
        </div>
      ),
    },
    {
      key: 'dutyDate',
      header: 'When',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-900">{formatDate(row.dutyDate)}</div>
          <div className="text-xs tabular-nums text-slate-600">
            {row.startTime} to {row.endTime}
          </div>
        </div>
      ),
    },
    {
      key: 'dutyType',
      header: 'Duty',
      render: (row) => (
        <div className="max-w-xs">
          <div className="text-slate-900">{dutyTypeLabel(row.dutyType)}</div>
          <p className="line-clamp-2 text-xs text-slate-600">{row.reason}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Approval',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={onDutyStatusVariant(row.status)} size="sm" dot>
            {row.status[0] + row.status.slice(1).toLowerCase()}
          </Badge>
          {row.status === 'PENDING' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setSelectedDuty(row);
                setDutyComments('');
              }}
            >
              Review
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'expenseAmount',
      header: 'Expense',
      render: (row) => {
        if (!row.hasExpense || !row.expenseAmount || row.expenseAmount <= 0) return <span className="text-xs text-slate-600">None</span>;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium tabular-nums text-slate-900">{formatINR(row.expenseAmount)}</span>
              {row.billPhoto && (
                <Button variant="ghost" size="xs" onClick={() => setPreviewBillUrl(row.billPhoto || null)}>
                  Bill
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={reimbursementStatusVariant(row.reimbursementStatus)} size="sm">
                {reimbursementStatusLabel(row.reimbursementStatus)}
              </Badge>
              {row.reimbursementStatus === 'PENDING' && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setReimburseTarget(row);
                    setReimburseComments('');
                  }}
                >
                  Review
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="On Duty and claims"
        description="Work outside the center, such as bank deposits and purchases, and the expenses claimed for it."
        actions={
          <Button onClick={openAssign} leftIcon={<Plus className="h-4 w-4" />}>
            Assign On Duty
          </Button>
        }
      />

      <StatTiles columns={4} aria-label="On Duty summary">
        <StatTile label="Awaiting approval" value={pendingCount} tone={pendingCount > 0 ? 'warning' : 'neutral'} active={statusFilter === 'PENDING'} onClick={() => toggle('PENDING')} />
        <StatTile
          label="Claims to verify"
          value={formatINR(pendingReimbursements)}
          tone={pendingClaims.length > 0 ? 'warning' : 'neutral'}
          hint={`${pendingClaims.length} claim${pendingClaims.length === 1 ? '' : 's'}`}
          active={statusFilter === 'CLAIMS_PENDING'}
          onClick={() => toggle('CLAIMS_PENDING')}
        />
        <StatTile label="Approved duties" value={requests.filter((r) => r.status === 'APPROVED').length} active={statusFilter === 'APPROVED'} onClick={() => toggle('APPROVED')} />
        <StatTile label="Total reimbursed" value={formatINR(totalReimbursed)} tone="success" active={statusFilter === 'EXPENSES'} onClick={() => toggle('EXPENSES')} />
      </StatTiles>

      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        searchPlaceholder="Search by employee, duty or reason"
        defaultSortKey="dutyDate"
        defaultSortOrder="desc"
        exportFileName="maaya_on_duty"
        emptyTitle="No On Duty records"
        emptyDescription="Nothing matches the current filter."
      />

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign On Duty"
        subtitle="The duty is approved as soon as you assign it."
        size="md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4" noValidate>
          <Select
            label="Employee"
            required
            placeholder="Choose an employee"
            value={assignEmpId}
            onChange={(e) => setAssignEmpId(e.target.value)}
            error={assignErrors.employee}
            options={assignable.map((emp) => ({ value: emp.id, label: `${emp.fullName} · ${emp.employeeCode} · ${emp.location || 'No center'}` }))}
          />
          <Input label="Date" type="date" required value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time" type="time" required value={assignStartTime} onChange={(e) => setAssignStartTime(e.target.value)} />
            <Input label="End time" type="time" required value={assignEndTime} onChange={(e) => setAssignEndTime(e.target.value)} error={assignErrors.time} />
          </div>
          <Select label="Duty type" value={assignType} onChange={(e) => setAssignType(e.target.value as OnDutyType)} options={DUTY_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          <Textarea
            label="Instructions and destination"
            required
            rows={3}
            placeholder="Deposit yesterday's ticket cash at the bank and bring back the slip."
            value={assignReason}
            onChange={(e) => setAssignReason(e.target.value)}
            error={assignErrors.reason}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Assign duty
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedDuty)}
        onClose={() => setSelectedDuty(null)}
        title="Review On Duty request"
        subtitle={selectedDuty ? `${selectedDuty.employeeName} · ${formatDate(selectedDuty.dutyDate)}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedDuty(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={saving || !dutyComments.trim()} onClick={() => handleDutyDecision('REJECTED')}>
              Decline
            </Button>
            <Button isLoading={saving} onClick={() => handleDutyDecision('APPROVED')}>
              Approve
            </Button>
          </>
        }
      >
        {selectedDuty && (
          <div className="space-y-4">
            <dl className="ops-definition">
              <dt>Duty</dt>
              <dd>{dutyTypeLabel(selectedDuty.dutyType)}</dd>
              <dt>Time</dt>
              <dd className="tabular-nums">
                {selectedDuty.startTime} to {selectedDuty.endTime}
              </dd>
              <dt>Reason</dt>
              <dd className="font-normal">{selectedDuty.reason}</dd>
            </dl>
            <Textarea label="Note to the employee" rows={3} value={dutyComments} onChange={(e) => setDutyComments(e.target.value)} placeholder="Required when declining" />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(reimburseTarget)}
        onClose={() => setReimburseTarget(null)}
        title="Review expense claim"
        subtitle={reimburseTarget ? `${reimburseTarget.employeeName} · ${formatINR(reimburseTarget.expenseAmount || 0)}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setReimburseTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger-ghost" disabled={saving || !reimburseComments.trim()} onClick={() => handleReimbursementDecision('REJECTED')}>
              Decline claim
            </Button>
            <Button isLoading={saving} onClick={() => handleReimbursementDecision('REIMBURSED')}>
              Mark reimbursed
            </Button>
          </>
        }
      >
        {reimburseTarget && (
          <div className="space-y-4">
            <dl className="ops-definition">
              <dt>Amount</dt>
              <dd className="tabular-nums">{formatINR(reimburseTarget.expenseAmount || 0)}</dd>
              <dt>For</dt>
              <dd className="font-normal">{reimburseTarget.expenseDescription || 'No description'}</dd>
              <dt>Duty</dt>
              <dd>
                {dutyTypeLabel(reimburseTarget.dutyType)} on {formatDate(reimburseTarget.dutyDate)}
              </dd>
            </dl>
            {reimburseTarget.billPhoto ? (
              <button
                type="button"
                onClick={() => setPreviewBillUrl(reimburseTarget.billPhoto || null)}
                className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
              >
                <img src={reimburseTarget.billPhoto} alt="Attached bill" className="mx-auto max-h-56 object-contain" />
              </button>
            ) : (
              <p className="text-sm text-amber-800">No bill was attached to this claim.</p>
            )}
            <Textarea label="Note" rows={2} value={reimburseComments} onChange={(e) => setReimburseComments(e.target.value)} placeholder="Payment reference, or the reason for declining" />
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(previewBillUrl)} onClose={() => setPreviewBillUrl(null)} title="Bill" size="lg">
        {previewBillUrl && (
          <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg bg-slate-950 p-2">
            <img src={previewBillUrl} alt="Uploaded bill" className="max-h-[65vh] max-w-full rounded object-contain" />
          </div>
        )}
      </Modal>
    </div>
  );
};
