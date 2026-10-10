import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g. +12.5 or -3.2
    label?: string; // e.g. "vs last month"
  };
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'indigo',
  className = '',
}) => {
  const iconColors = {
    indigo: 'text-indigo-600 bg-indigo-50/70 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50/70 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50/70 border-amber-100',
    rose: 'text-rose-600 bg-rose-50/70 border-rose-100',
    slate: 'text-slate-600 bg-slate-100 border-slate-200',
  };

  const isPositive = trend ? trend.value > 0 : false;
  const isNegative = trend ? trend.value < 0 : false;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-colors hover:border-slate-300 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        {icon && (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${iconColors[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums font-sans">
          {value}
        </h4>

        {(trend || subtitle) && (
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium text-[11px] tabular-nums ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : isNegative
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3 text-rose-600" />
                ) : (
                  <Minus className="w-3 h-3 text-slate-500" />
                )}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            )}
            <span className="text-[11px] text-slate-500 truncate">{trend?.label || subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};
