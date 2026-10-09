import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
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
  const iconBgStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const isPositive = trend ? trend.value > 0 : false;
  const isNegative = trend ? trend.value < 0 : false;

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${iconBgStyles[variant]}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h4>
        
        {(trend || subtitle) && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  isPositive
                    ? 'text-emerald-600'
                    : isNegative
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : isNegative ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
            <span className="text-slate-500">{trend?.label || subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};
