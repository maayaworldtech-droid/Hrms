import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

/** A standalone surface. Do not nest cards; group inside a card with dividers or spacing instead. */
export const Card: React.FC<CardProps> = ({ children, className = '', hoverable = false, ...props }) => (
  <div
    className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${
      hoverable ? 'transition-colors hover:border-slate-300 cursor-pointer' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}> = ({ title, subtitle, action, className = '', icon }) => (
  <div className={`px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 ${className}`}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 ${className}`}>
    {children}
  </div>
);
