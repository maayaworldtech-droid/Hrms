import React from 'react';
import { Search } from 'lucide-react';

/**
 * Small building blocks for the phone shell. Type scale: 18px title, 14px body, 12px caption.
 * Everything is a plain surface or row; no cards inside cards.
 */

export const MobileTitle: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const MobileCard: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }> = ({
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) => (
  <Tag className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`} {...rest}>
    {children}
  </Tag>
);

export const MobileSectionHeading: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
    {action}
  </div>
);

export const MobileSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}> = ({ value, onChange, placeholder, label }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      placeholder={placeholder}
      className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-900 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
    />
  </div>
);

export interface FilterOption<K extends string> {
  key: K;
  label: string;
  count?: number;
}

export function FilterPills<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div className="employee-filter-bar" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={`employee-filter-pill ${active ? 'is-active' : ''}`}
          >
            <span>{option.label}</span>
            {option.count !== undefined && <span className="pill-count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const MobileSkeleton: React.FC<{ heights?: number[] }> = ({ heights = [72, 72, 72] }) => (
  <div className="employee-skeleton-group" role="status" aria-label="Loading">
    {heights.map((height, index) => (
      <div key={index} className="employee-skeleton" style={{ height }} />
    ))}
  </div>
);

/** Label on the left, value on the right, one hairline between rows. */
export const KeyValueList: React.FC<{
  items: { label: React.ReactNode; value: React.ReactNode }[];
  className?: string;
}> = ({ items, className = '' }) => (
  <dl className={`divide-y divide-slate-100 text-sm ${className}`}>
    {items.map((item, index) => (
      <div key={index} className="flex items-start justify-between gap-4 py-2.5">
        <dt className="shrink-0 text-slate-600">{item.label}</dt>
        <dd className="min-w-0 text-right font-medium text-slate-900 break-words">{item.value}</dd>
      </div>
    ))}
  </dl>
);
