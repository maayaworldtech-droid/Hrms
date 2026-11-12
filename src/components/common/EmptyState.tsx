import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Smaller padding and type for use inside a panel or list. */
  compact?: boolean;
  /** No border or background; for use inside an existing surface such as a table body. */
  bare?: boolean;
  /** Error states use the danger tone and a destructive-looking icon well. */
  tone?: 'neutral' | 'danger';
  className?: string;
}

/** The one empty, error and "nothing to do" state for lists, tables and panels. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  bare = false,
  tone = 'neutral',
  className = '',
}) => (
  <div
    role={tone === 'danger' ? 'alert' : undefined}
    className={`flex flex-col items-center justify-center text-center ${compact ? 'p-5' : 'p-8'} ${
      bare ? '' : 'rounded-lg border border-slate-200 bg-white'
    } ${className}`}
  >
    <Icon
      className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} ${tone === 'danger' ? 'text-rose-600' : 'text-slate-500'}`}
      strokeWidth={1.5}
      aria-hidden="true"
    />
    <p className={`mt-2 font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
    {actionLabel && onAction && (
      <Button variant={tone === 'danger' ? 'outline' : 'primary'} size="sm" onClick={onAction} className="mt-4">
        {actionLabel}
      </Button>
    )}
  </div>
);
