import { ShiftType } from '@/types';

export interface ShiftConfig {
  type: ShiftType;
  name: string;
  shortLabel: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export const SHIFT_CONFIGS: Record<ShiftType, ShiftConfig> = {
  MORNING: {
    type: 'MORNING',
    name: 'Morning Shift',
    shortLabel: 'Morning (9 AM – 1 PM)',
    timeRange: '09:00 AM – 01:00 PM',
    startTime: '09:00',
    endTime: '13:00',
    durationHours: 4,
  },
  EVENING: {
    type: 'EVENING',
    name: 'Evening Shift',
    shortLabel: 'Evening (1 PM – 9 PM)',
    timeRange: '01:00 PM – 09:00 PM',
    startTime: '13:00',
    endTime: '21:00',
    durationHours: 8,
  },
};

export const formatShiftLabel = (shift?: ShiftType | string): string => {
  if (shift === 'MORNING') return 'Morning (9:00 AM – 1:00 PM)';
  if (shift === 'EVENING') return 'Evening (1:00 PM – 9:00 PM)';
  return 'Morning (9:00 AM – 1:00 PM)';
};

export const getShiftShortLabel = (shift?: ShiftType | string): string => {
  if (shift === 'MORNING') return 'Morning (9 AM – 1 PM)';
  if (shift === 'EVENING') return 'Evening (1 PM – 9 PM)';
  return 'Morning (9 AM – 1 PM)';
};

export const getShiftDefinition = (shift?: ShiftType | string) => {
  if (shift === 'EVENING') {
    return {
      name: 'Evening Shift',
      timing: '01:00 PM – 09:00 PM',
      durationHours: 8,
    };
  }
  return {
    name: 'Morning Shift',
    timing: '09:00 AM – 01:00 PM',
    durationHours: 4,
  };
};
