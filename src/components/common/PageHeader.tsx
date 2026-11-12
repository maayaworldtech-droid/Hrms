import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Buttons or filters shown on the right; the single most important one should be the primary button */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard header for admin and manager pages, so every page opens with the same title size,
 * spacing and action placement. Type scale used across the app:
 * 20px page title, 16px section title, 14px body, 12px supporting text.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className = '' }) => (
  <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div className="min-w-0">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
  </div>
);
