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
    indigo: 'text-brand-600 bg-brand-50 border-brand-200/50',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200/50',
    amber: 'text-amber-700 bg-amber-50 border-amber-200/50',
    rose: 'text-rose-700 bg-rose-50 border-rose-200/50',
    slate: 'text-slate-700 bg-slate-100 border-slate-300/50',
  };

  const isPositive = trend ? trend.value > 0 : false;
  const isNegative = trend ? trend.value < 0 : false;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all duration-150 hover:border-slate-300 hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-slate-600">
          {title}
        </p>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${iconColors[variant]}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-[32px] font-semibold tracking-tight text-slate-900 tabular-nums font-sans leading-none">
          {value}
        </h4>

        {(trend || subtitle) && (
          <div className="mt-3 flex items-center flex-wrap gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs tabular-nums ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : isNegative
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                ) : (
                  <Minus className="w-3 h-3 text-slate-500" />
                )}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            )}
            <span className="text-xs text-slate-500 truncate">{trend?.label || subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};
