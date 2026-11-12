import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { getReportingManager } from '@/utils/reportingManager';
import { OnDutyRequest } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { StatTile, StatTiles } from '@/components/common/StatTile';
import { formatDate, formatINR } from '@/utils/formatters';
import { onDutyStatusVariant, reimbursementStatusLabel, reimbursementStatusVariant } from '@/utils/status';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { PageHeader } from '@/components/common/PageHeader';
import { dutyTypeLabel } from '@/utils/dutyTypes';

type Filter = 'ALL' | 'PENDING_DUTY' | 'APPROVED' | 'PENDING_EXPENSE' | 'REIMBURSED';

export const TeamOnDuty: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [requests, setRequests] = useState<OnDutyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Filter>('ALL');

  const [selectedDuty, setSelectedDuty] = useState<OnDutyRequest | null>(null);
  const [dutyComments, setDutyComments] = useState('');
  const [reimburseTarget, setReimburseTarget] = useState<OnDutyRequest | null>(null);
  const [reimburseComments, setReimburseComments] = useState('');
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);
  const managerId = user?.id || '';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, allEmps] = await Promise.all([api.onDuty.getAll().catch(() => []), api.employees.getAll().catch(() => [])]);
      const myTeamIds = new Set((Array.isArray(allEmps) ? allEmps : []).filter((e) => getReportingManager(e).id === managerId).map((e) => String(e.id)));
      setRequests((Array.isArray(list) ? list : []).filter((req) => myTeamIds.has(String(req.employeeId))));
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not load On Duty records' }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, managerId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDutyDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedDuty || saving) return;
    if (decision === 'REJECTED' && !dutyComments.trim()) return;
    setSaving(true);
    try {
      await api.onDuty.updateStatus(
        selectedDuty.id,
        decision,
        dutyComments.trim() || (decision === 'APPROVED' ? 'Approved for outdoor duty' : 'Declined duty request'),
        user?.name || 'Manager'
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
        reimburseComments.trim() || (decision === 'REIMBURSED' ? 'Reimbursement verified and approved' : 'Bill rejected'),
        user?.name || 'Manager'
      );
      dispatch(
        addToast({
          type: 'success',
          title: decision === 'REIMBURSED' ? 'Reimbursement approved' : 'Claim declined',
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
        if (statusFilter === 'PENDING_DUTY') return req.status === 'PENDING';
        if (statusFilter === 'APPROVED') return req.status === 'APPROVED';
        if (statusFilter === 'PENDING_EXPENSE') return req.reimbursementStatus === 'PENDING';
        if (statusFilter === 'REIMBURSED') return req.reimbursementStatus === 'REIMBURSED';
        return true;
      }),
    [requests, statusFilter]
  );

  const pendingDutyCount = requests.filter((r) => r.status === 'PENDING').length;
  const pendingExpenses = requests.filter((r) => r.reimbursementStatus === 'PENDING');
  const pendingExpenseTotal = pendingExpenses.reduce((sum, r) => sum + (r.expenseAmount || 0), 0);
  const reimbursedCount = requests.filter((r) => r.reimbursementStatus === 'REIMBURSED').length;
  const toggle = (value: Filter) => setStatusFilter(statusFilter === value ? 'ALL' : value);

  const columns: Column<OnDutyRequest>[] = [
    {
      key: 'employeeName',
      header: 'Teammate',
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
            {row.status === 'PENDING' ? 'Pending' : row.status[0] + row.status.slice(1).toLowerCase()}
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
      <PageHeader title="On Duty approvals" description="Approve work outside the center and review expense bills from your team." />

      <StatTiles columns={4} aria-label="On Duty summary">
        <StatTile label="Duty approvals waiting" value={pendingDutyCount} tone={pendingDutyCount > 0 ? 'warning' : 'neutral'} active={statusFilter === 'PENDING_DUTY'} onClick={() => toggle('PENDING_DUTY')} />
        <StatTile
          label="Claims to verify"
          value={pendingExpenses.length}
          tone={pendingExpenses.length > 0 ? 'warning' : 'neutral'}
          hint={pendingExpenses.length ? `${formatINR(pendingExpenseTotal)} in total` : undefined}
          active={statusFilter === 'PENDING_EXPENSE'}
          onClick={() => toggle('PENDING_EXPENSE')}
        />
        <StatTile label="Approved duties" value={requests.filter((r) => r.status === 'APPROVED').length} active={statusFilter === 'APPROVED'} onClick={() => toggle('APPROVED')} />
        <StatTile label="Reimbursed" value={reimbursedCount} tone="success" active={statusFilter === 'REIMBURSED'} onClick={() => toggle('REIMBURSED')} />
      </StatTiles>

      <DataTable
        columns={columns}
        data={filteredRequests}
        isLoading={isLoading}
        searchPlaceholder="Search by teammate, duty or reason"
        defaultSortKey="dutyDate"
        defaultSortOrder="desc"
        mobileRender={(row) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{row.employeeName}</span>
              <Badge variant={onDutyStatusVariant(row.status)} size="sm" dot>
                {row.status[0] + row.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            <p className="text-sm text-slate-700">
              {dutyTypeLabel(row.dutyType)} · {formatDate(row.dutyDate)} · {row.startTime} to {row.endTime}
            </p>
            <p className="text-sm text-slate-600 line-clamp-2">{row.reason}</p>
            {row.hasExpense && (row.expenseAmount ?? 0) > 0 && (
              <p className="text-sm text-slate-700">
                Spent {formatINR(row.expenseAmount!)} · {reimbursementStatusLabel(row.reimbursementStatus)}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {row.status === 'PENDING' && (
                <Button variant="outline" size="sm" onClick={() => setSelectedDuty(row)}>
                  Review duty
                </Button>
              )}
              {row.reimbursementStatus === 'PENDING' && (
                <Button variant="outline" size="sm" onClick={() => setReimburseTarget(row)}>
                  Review claim
                </Button>
              )}
            </div>
          </div>
        )}
        emptyTitle="No On Duty requests"
        emptyDescription="Nothing matches the current filter."
      />

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
              {selectedDuty.hasExpense && (selectedDuty.expenseAmount ?? 0) > 0 && (
                <>
                  <dt>Expected expense</dt>
                  <dd className="tabular-nums">{formatINR(selectedDuty.expenseAmount!)}</dd>
                </>
              )}
            </dl>
            <Textarea
              label="Note to the employee"
              rows={3}
              value={dutyComments}
              onChange={(e) => setDutyComments(e.target.value)}
              placeholder="Required when declining"
            />
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
              Approve reimbursement
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
              <button type="button" onClick={() => setPreviewBillUrl(reimburseTarget.billPhoto || null)} className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60">
                <img src={reimburseTarget.billPhoto} alt="Attached bill" className="mx-auto max-h-56 object-contain" />
              </button>
            ) : (
              <p className="text-sm text-amber-800">No bill was attached to this claim.</p>
            )}
            <Textarea
              label="Note"
              rows={2}
              value={reimburseComments}
              onChange={(e) => setReimburseComments(e.target.value)}
              placeholder="Payment reference, or the reason for declining"
            />
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
