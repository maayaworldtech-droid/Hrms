import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

/**
 * Status colours carry meaning (green done, amber waiting, rose problem, blue informational).
 * Categories such as leave or duty type are not statuses, so the old decorative "purple" and
 * "cyan" variants render as neutral to keep colour meaningful.
 */
const STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  error: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  info: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  purple: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  cyan: 'bg-slate-100 text-slate-700 ring-slate-500/15',
};

const DOTS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  info: 'bg-brand-500',
  neutral: 'bg-slate-400',
  purple: 'bg-slate-400',
  cyan: 'bg-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md font-medium ring-1 ring-inset select-none whitespace-nowrap ${
      STYLES[variant] || STYLES.neutral
    } ${size === 'sm' ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-xs'} ${className}`}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[variant] || DOTS.neutral}`} aria-hidden="true" />}
    <span className="truncate">{children}</span>
  </span>
);
