import { useEffect, useSyncExternalStore } from 'react';
import { api } from '@/services/api';
import { CompanySettings, ShiftType } from '@/types';

/**
 * Shift timings come from Settings (admin can change them). Every screen reads them from this one
 * store, so a change in Settings updates labels everywhere without hardcoded times.
 */
export interface ShiftTimes {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  lateGraceMinutes: number;
}

export const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  morningStart: '09:00',
  morningEnd: '13:00',
  eveningStart: '13:00',
  eveningEnd: '21:00',
  lateGraceMinutes: 15,
};

let times: ShiftTimes = DEFAULT_SHIFT_TIMES;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (next: ShiftTimes) => {
  times = next;
  listeners.forEach((listener) => listener());
};

export const shiftTimesFromSettings = (s: Partial<CompanySettings> | null | undefined): ShiftTimes => ({
  morningStart: s?.morningShiftStart || DEFAULT_SHIFT_TIMES.morningStart,
  morningEnd: s?.morningShiftEnd || DEFAULT_SHIFT_TIMES.morningEnd,
  eveningStart: s?.eveningShiftStart || DEFAULT_SHIFT_TIMES.eveningStart,
  eveningEnd: s?.eveningShiftEnd || DEFAULT_SHIFT_TIMES.eveningEnd,
  lateGraceMinutes: s?.lateGraceMinutes ?? DEFAULT_SHIFT_TIMES.lateGraceMinutes,
});

/** Loads shift timings from the server once (or again when forced, e.g. after saving Settings). */
export const refreshShiftTimes = (force = false): Promise<void> => {
  if (loaded && !force) return Promise.resolve();
  if (inflight) return inflight;
  inflight = api.settings
    .get()
    .then((s) => {
      loaded = true;
      publish(shiftTimesFromSettings(s));
    })
    .catch(() => {
      // Keep the defaults; labels still render
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

/** Updates the store directly from a just-saved settings object. */
export const setShiftTimesFromSettings = (s: CompanySettings) => {
  loaded = true;
  publish(shiftTimesFromSettings(s));
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Subscribe a component (layouts do this) so shift labels re-render once timings load or change.
 */
export const useShiftTimes = (): ShiftTimes => {
  const current = useSyncExternalStore(subscribe, () => times, () => times);
  useEffect(() => {
    void refreshShiftTimes();
  }, []);
  return current;
};

/** "13:30" -> "1:30 PM", "09:00" -> "9 AM" */
export const formatClock = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${suffix}` : `${hour12} ${suffix}`;
};

const minutesBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
};

export interface ShiftDefinition {
  type: ShiftType;
  /** "Morning shift" */
  name: string;
  /** "9 AM – 1 PM" */
  timing: string;
  /** "Morning (9 AM – 1 PM)" */
  label: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export const getShiftDefinition = (shift?: ShiftType | string): ShiftDefinition => {
  const evening = shift === 'EVENING';
  const start = evening ? times.eveningStart : times.morningStart;
  const end = evening ? times.eveningEnd : times.morningEnd;
  const timing = `${formatClock(start)} – ${formatClock(end)}`;
  return {
    type: evening ? 'EVENING' : 'MORNING',
    name: evening ? 'Evening shift' : 'Morning shift',
    timing,
    label: `${evening ? 'Evening' : 'Morning'} (${timing})`,
    startTime: start,
    endTime: end,
    durationHours: Math.round((minutesBetween(start, end) / 60) * 10) / 10,
  };
};

/** "Morning (9 AM – 1 PM)" */
export const getShiftLabel = (shift?: ShiftType | string): string => getShiftDefinition(shift).label;
