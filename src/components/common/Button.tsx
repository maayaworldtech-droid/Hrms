import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'danger-ghost' | 'ghost' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * The only source of button styling. Primary uses brand-600 (logo blue at a shade that keeps white
 * text readable); everything else is neutral so one primary action per area stands out.
 *
 * Sizes: xs (28px, inline table actions), sm (32px), md (40px, default), lg (44px, mobile and
 * auth forms), icon (32px square, icon-only; pass aria-label).
 */
const BASE =
  'inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap select-none cursor-pointer ' +
  'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-1 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'text-xs h-7 px-2.5 gap-1',
  sm: 'text-sm h-8 px-3 gap-1.5',
  md: 'text-sm h-10 px-4 gap-2',
  lg: 'text-sm h-11 px-5 gap-2',
  icon: 'h-8 w-8 p-0',
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand-600 text-white border border-brand-700/40 hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100',
  outline: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
  danger: 'bg-rose-600 text-white border border-rose-700/40 hover:bg-rose-700 active:bg-rose-800',
  'danger-ghost': 'bg-transparent text-rose-700 border border-transparent hover:bg-rose-50 active:bg-rose-100',
  ghost: 'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  success: 'bg-emerald-600 text-white border border-emerald-700/40 hover:bg-emerald-700 active:bg-emerald-800',
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
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    {...props}
  >
    {isLoading ? (
      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
    ) : (
      leftIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{leftIcon}</span>
    )}
    {size === 'icon' ? children : <span>{children}</span>}
    {!isLoading && rightIcon && <span className="shrink-0 inline-flex" aria-hidden="true">{rightIcon}</span>}
  </button>
);
