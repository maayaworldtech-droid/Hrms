import React from 'react';
import { Link } from 'react-router-dom';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

interface StatTilesProps {
  children: React.ReactNode;
  /** Columns from the sm breakpoint up; phones always get two. */
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  'aria-label'?: string;
}

const COLUMNS: Record<NonNullable<StatTilesProps['columns']>, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-3 lg:grid-cols-6',
};

/**
 * One bordered strip of KPI tiles separated by hairlines. Used for dashboard summaries and for
 * clickable status filters above tables, so every page reads its numbers the same way.
 */
export const StatTiles: React.FC<StatTilesProps> = ({ children, columns = 4, className = '', ...rest }) => (
  <div
    className={`grid grid-cols-2 ${COLUMNS[columns]} gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 ${className}`}
    {...rest}
  >
    {children}
  </div>
);

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  /** Highlighted when this tile is the active filter. */
  active?: boolean;
  onClick?: () => void;
  to?: string;
  className?: string;
}

const VALUE_TONE: Record<Tone, string> = {
  neutral: 'text-slate-900',
  success: 'text-emerald-700',
  warning: 'text-amber-800',
  danger: 'text-rose-700',
  brand: 'text-brand-700',
};

export const StatTile: React.FC<StatTileProps> = ({ label, value, hint, tone = 'neutral', active, onClick, to, className = '' }) => {
  const interactive = Boolean(onClick || to);
  const base = `flex min-w-0 flex-col justify-between gap-1 px-4 py-3 text-left transition-colors ${
    active ? 'bg-brand-50' : 'bg-white'
  } ${interactive ? 'cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400/60' : ''} ${className}`;

  const body = (
    <>
      <span className={`text-sm ${active ? 'font-medium text-brand-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-xl font-semibold tabular-nums leading-tight tracking-tight ${VALUE_TONE[tone]}`}>{value}</span>
      {hint && <span className="text-xs text-slate-600 truncate">{hint}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={base}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={base}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
};
