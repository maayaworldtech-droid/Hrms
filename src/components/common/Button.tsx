import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'danger-ghost' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * The only source of button styling. Primary uses brand-600 (logo blue at a shade that keeps white
 * text readable); everything else is neutral so one primary action per area stands out.
 */
const BASE =
  'inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap select-none cursor-pointer ' +
  'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-1 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const SIZES = {
  sm: 'text-[13px] h-8 px-3 gap-1.5',
  md: 'text-sm h-10 px-4 gap-2',
  lg: 'text-sm h-11 px-5 gap-2',
};

const VARIANTS = {
  primary:
    'bg-brand-600 text-white border border-brand-700/40 shadow-xs shadow-brand-900/10 hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-slate-800 border border-slate-300 shadow-xs hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100',
  outline: 'bg-white text-slate-700 border border-slate-300 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
  danger: 'bg-rose-600 text-white border border-rose-700/40 shadow-xs hover:bg-rose-700 active:bg-rose-800',
  'danger-ghost': 'bg-transparent text-rose-700 border border-transparent hover:bg-rose-50 active:bg-rose-100',
  ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  success: 'bg-emerald-600 text-white border border-emerald-700/40 shadow-xs hover:bg-emerald-700 active:bg-emerald-800',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => (
  <button
    className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    {...props}
  >
    {isLoading ? (
      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
    ) : (
      leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>
    )}
    <span>{children}</span>
    {!isLoading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
  </button>
);
