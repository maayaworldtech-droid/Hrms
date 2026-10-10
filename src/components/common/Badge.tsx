import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'purple'
  | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, { text: string }> = {
    success: {
      text: 'text-emerald-600',
    },
    warning: {
      text: 'text-amber-600',
    },
    error: {
      text: 'text-rose-600',
    },
    info: {
      text: 'text-sky-600',
    },
    purple: {
      text: 'text-indigo-600',
    },
    cyan: {
      text: 'text-teal-600',
    },
    neutral: {
      text: 'text-slate-600',
    },
  };

  const style = variantStyles[variant] || variantStyles.neutral;
  const sizeStyles = size === 'sm' ? 'text-xs font-semibold' : 'text-xs font-bold';

  return (
    <span
      className={`inline-flex items-center tracking-normal ${style.text} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
