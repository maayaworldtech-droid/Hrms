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
    indigo: 'text-[#2A4FE0] bg-[#EEF4FF] border-[#BDD3FF]/50',
    emerald: 'text-[#027A48] bg-[#ECFDF3] border-[#ABEFC6]/50',
    amber: 'text-[#B54708] bg-[#FFFAEB] border-[#FEDF89]/50',
    rose: 'text-[#B42318] bg-[#FEF3F2] border-[#FECDCA]/50',
    slate: 'text-[#344054] bg-[#F0F2F5] border-[#D0D5DD]/50',
  };

  const isPositive = trend ? trend.value > 0 : false;
  const isNegative = trend ? trend.value < 0 : false;

  return (
    <div
      className={`bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs transition-all duration-150 hover:border-[#D0D5DD] hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#475467]">
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
        <h4 className="text-[32px] font-semibold tracking-tight text-[#101828] tabular-nums font-sans leading-none">
          {value}
        </h4>

        {(trend || subtitle) && (
          <div className="mt-3 flex items-center flex-wrap gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[11px] tabular-nums ${
                  isPositive
                    ? 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]/60'
                    : isNegative
                    ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]/60'
                    : 'bg-[#F0F2F5] text-[#344054] border border-[#D0D5DD]'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-[#12B76A]" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3 text-[#F04438]" />
                ) : (
                  <Minus className="w-3 h-3 text-[#667085]" />
                )}
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
              </span>
            )}
            <span className="text-xs text-[#667085] truncate">{trend?.label || subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};
