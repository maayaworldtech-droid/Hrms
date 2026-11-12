import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { api } from '@/services/api';
import { AuditLog, Center, CenterInput, CompanySettings as CompanySettingsType } from '@/types';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { useCenters, centerTypeLabel, refreshCenters } from '@/hooks/useCenters';
import { CenterFormModal } from './settings/CenterFormModal';
import { CenterManagersModal } from './settings/CenterManagersModal';
import { ShiftsPanel } from './settings/ShiftsPanel';
import { PageHeader } from '@/components/common/PageHeader';

type Tab = 'centers' | 'shifts' | 'company' | 'activity';

const TABS: { id: Tab; label: string }[] = [
  { id: 'centers', label: 'Centers & managers' },
  { id: 'shifts', label: 'Shifts' },
  { id: 'company', label: 'Company details' },
  { id: 'activity', label: 'Activity log' },
];

/** "CENTER_CREATED" -> "Center created" */
const humanizeAction = (action: string) =>
  action ? action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, ' ') : '';

export const CompanySettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'centers') as Tab;
  const setTab = (next: Tab) => setParams({ tab: next }, { replace: true });

  const toastError = (title: string, message: string) => dispatch(addToast({ type: 'error', title, message }));
  const toastSuccess = (title: string, message: string) => dispatch(addToast({ type: 'success', title, message }));

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Centers, managers, shift timings and company information." />

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 px-3 -mb-px text-sm border-b-2 cursor-pointer ${
              tab === t.id
                ? 'border-brand-600 text-brand-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'centers' && <CentersPanel onError={toastError} onSuccess={toastSuccess} />}
      {tab === 'shifts' && <ShiftsPanel onError={toastError} onSuccess={toastSuccess} />}
      {tab === 'company' && <CompanyPanel onError={toastError} onSuccess={toastSuccess} />}
      {tab === 'activity' && <ActivityPanel />}
    </div>
  );
};

interface PanelProps {
  onError: (title: string, message: string) => void;
  onSuccess: (title: string, message: string) => void;
}

// ----------------------------------------------------------------------------- Centers

const CentersPanel: React.FC<PanelProps> = ({ onError, onSuccess }) => {
  const { centers, isLoading, error } = useCenters();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Center | null>(null);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState<Center | null>(null);
  const [deleting, setDeleting] = useState<Center | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Keep the open managers dialog in step with refreshed center data
  useEffect(() => {
    if (managing) {
      const fresh = centers.find((c) => c.id === managing.id);
      if (fresh && fresh !== managing) setManaging(fresh);
    }
  }, [centers, managing]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (center: Center) => {
    setEditing(center);
    setFormOpen(true);
  };

  const submitCenter = async (input: CenterInput) => {
    setSaving(true);
    try {
      if (editing) {
        await api.centers.update(editing.id, input);
        onSuccess('Center updated', `${input.name} has been saved.`);
      } else {
        await api.centers.create(input);
        onSuccess('Center added', `${input.name} can now be assigned to staff.`);
      }
      setFormOpen(false);
      await refreshCenters();
    } catch (err: any) {
      onError('Could not save center', err?.message || 'Please check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.centers.delete(deleting.id);
      onSuccess('Center deleted', `${deleting.name} has been removed.`);
      setDeleting(null);
      await refreshCenters();
    } catch (err: any) {
      onError('Could not delete center', err?.message || 'Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const totalStaff = centers.reduce((sum, c) => sum + c.staffCount, 0);
  const withoutManager = centers.filter((c) => c.managers.length === 0).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Centers</h2>
          <p className="text-sm text-slate-600">
            {isLoading
              ? 'Loading centers...'
              : `${centers.length} center${centers.length === 1 ? '' : 's'} · ${totalStaff} active staff`}
            {!isLoading && withoutManager > 0 && (
              <span className="text-amber-800">
                {' '}· {withoutManager} without a manager
              </span>
            )}
          </p>
        </div>
        <Button variant="primary" onClick={openAdd} leftIcon={<Plus className="w-4 h-4" />}>
          Add center
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-center justify-between gap-3">
          <span>Could not load centers. {error}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshCenters()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          Loading centers...
        </div>
      ) : centers.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-slate-900 font-medium">No centers yet</p>
          <p className="text-sm text-slate-600 mt-1">Add your first center to start assigning staff and managers.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Center</th>
                <th className="px-4 py-2.5 font-medium">Managers</th>
                <th className="px-4 py-2.5 font-medium text-right">Staff</th>
                <th className="px-4 py-2.5 font-medium">Check-in area</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {centers.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-600">
                      {centerTypeLabel(c.centerType)} · {c.city}
                      {c.address ? ` · ${c.address}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {c.managers.length === 0 ? (
                      <span className="text-amber-800">No manager</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {c.managers.map((m) => (
                          <li key={m.id} className="text-slate-900">
                            {m.fullName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-900">{c.staffCount}</td>
                  <td className="px-4 py-3">
                    {c.latitude != null && c.longitude != null ? (
                      <span className="text-slate-900">Within {c.radiusMeters} m</span>
                    ) : (
                      <span className="text-amber-800">Not set. Staff cannot check in.</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManaging(c)}
                        leftIcon={<Users className="w-4 h-4" />}
                      >
                        Managers
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.name}`}
                        leftIcon={<Pencil className="w-4 h-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        onClick={() => setDeleting(c)}
                        aria-label={`Delete ${c.name}`}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CenterFormModal
        isOpen={formOpen}
        center={editing}
        isSaving={saving}
        onClose={() => setFormOpen(false)}
        onSubmit={submitCenter}
      />

      <CenterManagersModal
        center={managing}
        onClose={() => setManaging(null)}
        onChanged={() => void refreshCenters()}
        onError={onError}
        onSuccess={onSuccess}
      />

      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : ''}
        size="sm"
        footer={
          deleting && deleting.staffCount > 0 ? (
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} isLoading={deleteBusy}>
                Delete center
              </Button>
            </>
          )
        }
      >
        {deleting && deleting.staffCount > 0 ? (
          <p className="text-sm text-slate-900">
            {deleting.name} still has {deleting.staffCount} active staff member{deleting.staffCount === 1 ? '' : 's'}.
            Move them to another center from the Employees page first, then delete it.
          </p>
        ) : (
          <p className="text-sm text-slate-900">
            The center will be removed from all lists. Past attendance, leave and payslip records keep the
            name {deleting?.name}. This cannot be undone.
          </p>
        )}
      </Modal>
    </section>
  );
};

// ----------------------------------------------------------------------------- Company details

const CompanyPanel: React.FC<PanelProps> = ({ onError, onSuccess }) => {
  const [settings, setSettings] = useState<CompanySettingsType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadFailed(false);
    api.settings
      .get()
      .then(setSettings)
      .catch(() => setLoadFailed(true));
  };
  useEffect(load, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      // Always send the full object so no setting is reset by omission
      setSettings(await api.settings.update(settings));
      onSuccess('Saved', 'Company details updated.');
    } catch (err: any) {
      onError('Could not save', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-center justify-between gap-3">
        <span>Could not load company details.</span>
        <Button variant="outline" size="sm" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!settings) {
    return <div className="py-8 text-center text-sm text-slate-600">Loading company details...</div>;
  }

  const set = (patch: Partial<CompanySettingsType>) => setSettings({ ...settings, ...patch });

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Company</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Brand name" value={settings.companyName} onChange={(e) => set({ companyName: e.target.value })} />
          <Input
            label="Registered company name"
            value={settings.legalEntityName}
            onChange={(e) => set({ legalEntityName: e.target.value })}
          />
          <Input label="GSTIN / PAN" value={settings.corporateTaxId} onChange={(e) => set({ corporateTaxId: e.target.value })} />
          <Input label="PF registration number" value={settings.pfRegistrationNo} onChange={(e) => set({ pfRegistrationNo: e.target.value })} />
          <Input label="ESI registration number" value={settings.esiRegistrationNo} onChange={(e) => set({ esiRegistrationNo: e.target.value })} />
          <Input label="HR contact email" type="email" value={settings.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
        </div>
        <div>
          <label htmlFor="registered-address" className="block text-sm font-medium text-slate-900 mb-1.5">
            Registered office address
          </label>
          <textarea
            id="registered-address"
            rows={2}
            value={settings.registeredAddress}
            onChange={(e) => set({ registeredAddress: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
          />
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Attendance rules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Working hours per day"
            type="number"
            min={1}
            max={24}
            value={settings.standardWorkHoursPerDay}
            onChange={(e) => set({ standardWorkHoursPerDay: Number(e.target.value) })}
          />
          <Input
            label="Working days per week"
            type="number"
            min={1}
            max={7}
            value={settings.workDaysPerWeek}
            onChange={(e) => set({ workDaysPerWeek: Number(e.target.value) })}
          />
          <Input
            label="Financial year starts in"
            value={settings.fiscalYearStartMonth}
            onChange={(e) => set({ fiscalYearStartMonth: e.target.value })}
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableGeoFencingAttendance}
            onChange={(e) => set({ enableGeoFencingAttendance: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Staff must be at their center to check in</span>
            <span className="block text-xs text-slate-600">
              Uses each center's check-in area from the Centers tab.
            </span>
          </span>
        </label>
      </section>

      <div className="pt-2">
        <Button type="submit" variant="primary" isLoading={saving}>
          Save company details
        </Button>
      </div>
    </form>
  );
};

// ----------------------------------------------------------------------------- Activity log

const ActivityPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api.audit
      .getLogs()
      .then((list) => setLogs(Array.isArray(list) ? list : []))
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (failed) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-center justify-between gap-3">
        <span>Could not load the activity log.</span>
        <Button variant="outline" size="sm" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!logs) return <div className="py-8 text-center text-sm text-slate-600">Loading activity...</div>;
  if (logs.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-600">No admin activity recorded yet.</div>;
  }

  return (
    <section className="space-y-2">
      <p className="text-sm text-slate-600">Changes made to centers, managers, payroll and settings, newest first.</p>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {logs.slice(0, 200).map((log) => (
          <li key={log.id} className="px-4 py-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{humanizeAction(log.action)}</p>
              <p className="text-sm text-slate-700">{log.details}</p>
            </div>
            <p className="text-xs text-slate-600 text-right shrink-0">
              {log.timestamp}
              <br />
              {log.actorName}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
