import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { api } from '@/services/api';
import { Center, Employee } from '@/types';
import { businessDate } from '@/utils/operations';

interface CenterManagersModalProps {
  center: Center | null;
  onClose: () => void;
  /** Called after any change so the page can reload centers and staff */
  onChanged: () => void;
  onError: (title: string, message: string) => void;
  onSuccess: (title: string, message: string) => void;
}

type AddMode = 'existing' | 'new';
type PendingRemoval = { managerId: string; action: 'demote' | 'deactivate' } | null;

const emptyNewManager = { firstName: '', lastName: '', email: '', phone: '', monthlySalary: '' };

export const CenterManagersModal: React.FC<CenterManagersModalProps> = ({
  center,
  onClose,
  onChanged,
  onError,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('existing');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [newManager, setNewManager] = useState(emptyNewManager);
  const [newErrors, setNewErrors] = useState<Partial<Record<keyof typeof emptyNewManager, string>>>({});
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval>(null);
  const [busy, setBusy] = useState(false);
  const [createdLogin, setCreatedLogin] = useState<{ name: string; email: string; password?: string } | null>(null);

  // Reset only when a different center is opened, not when this center's data refreshes
  // (a refresh after creating a manager must not wipe the one-time password notice)
  const centerId = center?.id;
  useEffect(() => {
    if (!centerId) return;
    setAddMode('existing');
    setSelectedEmployeeId('');
    setNewManager(emptyNewManager);
    setNewErrors({});
    setPendingRemoval(null);
    setCreatedLogin(null);
    setLoadingStaff(true);
    api.employees
      .getAll()
      .then((list) => setEmployees(list))
      .catch(() => setEmployees([]))
      .finally(() => setLoadingStaff(false));
  }, [centerId]);

  // Active staff who could become this center's manager: own center first, then everyone else
  const candidates = useMemo(() => {
    if (!center) return [];
    const managerIds = new Set(center.managers.map((m) => m.id));
    return employees
      .filter((e) => e.status !== 'TERMINATED' && e.role !== 'ADMIN' && !managerIds.has(e.id))
      .sort((a, b) => {
        const aHere = a.location === center.name ? 0 : 1;
        const bHere = b.location === center.name ? 0 : 1;
        return aHere - bHere || a.fullName.localeCompare(b.fullName);
      });
  }, [employees, center]);

  if (!center) return null;

  const selected = candidates.find((e) => e.id === selectedEmployeeId);

  const assignExisting = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.centers.addManager(center.id, selected.id);
      onSuccess('Manager added', `${selected.fullName} is now a manager of ${center.name}.`);
      setSelectedEmployeeId('');
      onChanged();
      void api.employees.getAll().then(setEmployees).catch(() => undefined);
    } catch (err: any) {
      onError('Could not add manager', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const createNew = async () => {
    const errors: typeof newErrors = {};
    if (!newManager.firstName.trim()) errors.firstName = 'Enter the first name';
    if (!/^\S+@\S+\.\S+$/.test(newManager.email.trim())) errors.email = 'Enter a valid email address';
    if (newManager.phone.trim() && !/^[6-9]\d{9}$/.test(newManager.phone.trim())) {
      errors.phone = 'Enter a 10-digit mobile number';
    }
    const salary = Number(newManager.monthlySalary);
    if (!Number.isFinite(salary) || salary < 10000) errors.monthlySalary = 'Enter a monthly salary of at least 10,000';
    setNewErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    try {
      const created = await api.employees.onboard({
        firstName: newManager.firstName.trim(),
        lastName: newManager.lastName.trim(),
        email: newManager.email.trim().toLowerCase(),
        phone: newManager.phone.trim(),
        designation: center.centerType === 'GAMING_ZONE' ? 'Gaming Zone Manager' : 'Center Manager',
        location: center.name,
        role: 'MANAGER',
        shift: 'MORNING',
        monthlySalary: salary,
        ctcAnnual: salary * 12,
        joiningDate: businessDate(),
        employmentType: 'FULL_TIME',
      });
      setCreatedLogin({
        name: created.fullName,
        email: created.email,
        password: (created as any).temporaryPassword,
      });
      setNewManager(emptyNewManager);
      onSuccess('Manager login created', `Login details were emailed to ${created.email}.`);
      onChanged();
    } catch (err: any) {
      onError('Could not create manager', err?.message || 'Please check the details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    const manager = center.managers.find((m) => m.id === pendingRemoval.managerId);
    setBusy(true);
    try {
      await api.centers.removeManager(center.id, pendingRemoval.managerId, pendingRemoval.action);
      onSuccess(
        pendingRemoval.action === 'deactivate' ? 'Manager removed and login deactivated' : 'Manager changed to staff',
        manager ? `${manager.fullName} is no longer a manager of ${center.name}.` : ''
      );
      setPendingRemoval(null);
      onChanged();
    } catch (err: any) {
      onError('Could not remove manager', err?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={!!center}
      onClose={onClose}
      title={`Managers of ${center.name}`}
      subtitle="Managers approve leave, On Duty requests and attendance corrections."
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-6">
        {createdLogin && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
            <p className="font-medium">Login created for {createdLogin.name}</p>
            <p className="text-xs mt-1">
              Sign-in details were emailed to {createdLogin.email}.
              {createdLogin.password && (
                <>
                  {' '}If the email does not arrive, share this temporary password once:{' '}
                  <span className="font-mono font-semibold">{createdLogin.password}</span>. They will be asked to change it.
                </>
              )}
            </p>
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Current managers</h3>
          {center.managers.length === 0 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              This center has no manager yet. Requests from its staff can only be approved by an admin.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {center.managers.map((m) => {
                const isPending = pendingRemoval?.managerId === m.id;
                return (
                  <li key={m.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{m.fullName}</p>
                        <p className="text-xs text-slate-600 truncate">
                          {[m.email, m.phone].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {!isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingRemoval({ managerId: m.id, action: 'demote' })}
                          >
                            Change to staff
                          </Button>
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => setPendingRemoval({ managerId: m.id, action: 'deactivate' })}
                          >
                            Remove and deactivate
                          </Button>
                        </div>
                      )}
                    </div>
                    {isPending && (
                      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                        <p className="text-sm text-slate-900">
                          {pendingRemoval?.action === 'deactivate'
                            ? `${m.fullName} will lose manager access and will no longer be able to sign in. Their attendance and salary history is kept, and you can reactivate them from Employees.`
                            : `${m.fullName} will stay at ${center.name} as regular staff and lose manager access.`}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant={pendingRemoval?.action === 'deactivate' ? 'danger' : 'primary'}
                            size="sm"
                            isLoading={busy}
                            onClick={confirmRemoval}
                          >
                            {pendingRemoval?.action === 'deactivate' ? 'Yes, remove and deactivate' : 'Yes, change to staff'}
                          </Button>
                          <Button variant="ghost" size="sm" disabled={busy} onClick={() => setPendingRemoval(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pt-5 border-t border-slate-200">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Add a manager</h3>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 mb-3" role="tablist">
            {(
              [
                ['existing', 'Choose from staff'],
                ['new', 'Create a new login'],
              ] as [AddMode, string][]
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={addMode === mode}
                onClick={() => setAddMode(mode)}
                className={`h-8 cursor-pointer rounded-md px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                  addMode === mode ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {addMode === 'existing' ? (
            <div className="space-y-3">
              <Select
                id="manager-candidate"
                label="Staff member"
                value={selectedEmployeeId}
                disabled={loadingStaff}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                placeholder={loadingStaff ? 'Loading staff...' : 'Select a person'}
                options={candidates.map((e) => ({ value: e.id, label: `${e.fullName} · ${e.employeeCode} · ${e.location || 'No center'}` }))}
              />
              {selected && selected.location !== center.name && (
                <p className="text-xs text-amber-800">
                  {selected.fullName} currently works at {selected.location || 'no center'} and will be moved to {center.name}.
                </p>
              )}
              <Button variant="primary" onClick={assignExisting} disabled={!selected} isLoading={busy}>
                Make manager
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="First name"
                  required
                  value={newManager.firstName}
                  error={newErrors.firstName}
                  onChange={(e) => setNewManager({ ...newManager, firstName: e.target.value })}
                />
                <Input
                  label="Last name"
                  value={newManager.lastName}
                  onChange={(e) => setNewManager({ ...newManager, lastName: e.target.value })}
                />
                <Input
                  label="Email (used to sign in)"
                  required
                  type="email"
                  value={newManager.email}
                  error={newErrors.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                />
                <Input
                  label="Mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  value={newManager.phone}
                  error={newErrors.phone}
                  onChange={(e) => setNewManager({ ...newManager, phone: e.target.value.replace(/\D/g, '') })}
                />
                <Input
                  label="Monthly salary (₹)"
                  required
                  type="number"
                  min={10000}
                  value={newManager.monthlySalary}
                  error={newErrors.monthlySalary}
                  helperText="Used for payroll. Bank and other details can be added later in Employees."
                  onChange={(e) => setNewManager({ ...newManager, monthlySalary: e.target.value })}
                />
              </div>
              <Button variant="primary" onClick={createNew} isLoading={busy}>
                Create manager login
              </Button>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
};
