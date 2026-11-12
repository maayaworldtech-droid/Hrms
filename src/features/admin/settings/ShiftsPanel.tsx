import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { CompanySettings } from '@/types';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { formatClock, setShiftTimesFromSettings, shiftTimesFromSettings } from '@/utils/shiftUtils';

interface ShiftsPanelProps {
  onError: (title: string, message: string) => void;
  onSuccess: (title: string, message: string) => void;
}

interface FormState {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  lateGraceMinutes: string;
}

/** Settings > Shifts: the admin sets morning and evening shift times and when a check-in counts as late. */
export const ShiftsPanel: React.FC<ShiftsPanelProps> = ({ onError, onSuccess }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoadFailed(false);
    api.settings
      .get()
      .then((s) => {
        setSettings(s);
        const t = shiftTimesFromSettings(s);
        setForm({
          morningStart: t.morningStart,
          morningEnd: t.morningEnd,
          eveningStart: t.eveningStart,
          eveningEnd: t.eveningEnd,
          lateGraceMinutes: String(t.lateGraceMinutes),
        });
      })
      .catch(() => setLoadFailed(true));
  };
  useEffect(load, []);

  if (loadFailed) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 flex items-center justify-between gap-3">
        <span>Could not load shift timings.</span>
        <Button variant="outline" size="sm" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }
  if (!settings || !form) {
    return <div className="py-8 text-center text-sm text-slate-600">Loading shift timings...</div>;
  }

  const set = (patch: Partial<FormState>) => setForm({ ...form, ...patch });

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.morningStart || !form.morningEnd) next.morningEnd = 'Enter both times';
    else if (form.morningEnd <= form.morningStart) next.morningEnd = 'Must be after the start time';
    if (!form.eveningStart || !form.eveningEnd) next.eveningEnd = 'Enter both times';
    else if (form.eveningEnd <= form.eveningStart) next.eveningEnd = 'Must be after the start time';
    const grace = Number(form.lateGraceMinutes);
    if (!Number.isInteger(grace) || grace < 0 || grace > 120) next.lateGraceMinutes = 'Use 0 to 120 minutes';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      // Send the full settings object so no other setting is reset
      const saved = await api.settings.update({
        ...settings,
        morningShiftStart: form.morningStart,
        morningShiftEnd: form.morningEnd,
        eveningShiftStart: form.eveningStart,
        eveningShiftEnd: form.eveningEnd,
        lateGraceMinutes: Number(form.lateGraceMinutes),
      });
      setSettings(saved);
      setShiftTimesFromSettings(saved);
      onSuccess('Shift timings saved', 'New check-ins will use these timings.');
    } catch (err: any) {
      onError('Could not save shift timings', err?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const preview = (start: string, end: string) => (start && end ? `${formatClock(start)} – ${formatClock(end)}` : '');

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Shift timings</h2>
          <p className="text-sm text-slate-600">
            Used for every center. Each staff member is on either the morning or the evening shift.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
          {(
            [
              ['Morning shift', 'morningStart', 'morningEnd'],
              ['Evening shift', 'eveningStart', 'eveningEnd'],
            ] as const
          ).map(([label, startKey, endKey]) => (
            <div key={label} className="grid grid-cols-1 sm:grid-cols-[10rem_1fr_1fr] items-start gap-4 px-4 py-4">
              <div className="pt-8 sm:pt-9">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-600">{preview(form[startKey], form[endKey])}</p>
              </div>
              <Input
                label="Starts at"
                type="time"
                value={form[startKey]}
                error={errors[startKey]}
                onChange={(e) => set({ [startKey]: e.target.value } as Partial<FormState>)}
              />
              <Input
                label="Ends at"
                type="time"
                value={form[endKey]}
                error={errors[endKey]}
                onChange={(e) => set({ [endKey]: e.target.value } as Partial<FormState>)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 pt-6 border-t border-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Late check-in</h2>
        <div className="max-w-xs">
          <Input
            label="Count as late after (minutes)"
            type="number"
            min={0}
            max={120}
            value={form.lateGraceMinutes}
            error={errors.lateGraceMinutes}
            helperText={
              form.morningStart && /^\d+$/.test(form.lateGraceMinutes)
                ? `Example: morning shift staff checking in after ${formatClock(addMinutes(form.morningStart, Number(form.lateGraceMinutes)))} are marked late.`
                : undefined
            }
            onChange={(e) => set({ lateGraceMinutes: e.target.value })}
          />
        </div>
        <p className="text-sm text-slate-600">
          Changes apply to check-ins from now on. Attendance already recorded is not re-marked.
        </p>
      </section>

      <Button type="submit" variant="primary" isLoading={saving}>
        Save shift timings
      </Button>
    </form>
  );
};

const addMinutes = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
