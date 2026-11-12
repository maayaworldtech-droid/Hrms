import { Center } from '@/types';
import { findCenter } from '@/hooks/useCenters';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface MonthRange {
  /** "2026-10" */
  key: string;
  year: number;
  /** 1-12 */
  month: number;
  /** "October" */
  name: string;
  /** "October 2026" */
  label: string;
  start: string;
  end: string;
  daysInMonth: number;
}

export const monthRange = (key: string): MonthRange => {
  const [y, m] = key.split('-').map(Number);
  const year = y || new Date().getFullYear();
  const month = m >= 1 && m <= 12 ? m : 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return {
    key: `${year}-${mm}`,
    year,
    month,
    name: MONTH_NAMES[month - 1],
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  };
};

export const previousMonthKey = (key: string): string => {
  const { year, month } = monthRange(key);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
};

/** Number of calendar days of [start, end] that fall inside the month (inclusive). */
export const daysWithinMonth = (start: string, end: string, range: MonthRange): number => {
  const from = start > range.start ? start : range.start;
  const to = (end || start) < range.end ? end || start : range.end;
  if (to < from) return 0;
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86400000) + 1;
};

/** The API returns some ids as numbers and others as strings; compare them as plain digit strings. */
export const idKey = (raw: unknown): string => String(raw ?? '').replace('emp-', '').trim();

/** Canonical center name for a stored name (handles the old short names). */
export const centerNameOf = (centers: Center[], name?: string | null): string =>
  findCenter(centers, name)?.name || (name && name.trim()) || 'No center';

export const sum = (values: number[]) => values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const titleCase = (value?: string) =>
  (value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
