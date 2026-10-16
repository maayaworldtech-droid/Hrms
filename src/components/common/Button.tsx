import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

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
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B68F5]/20 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-[13px] h-8 px-3 gap-1.5',
    md: 'text-sm h-10 px-4 gap-2',
    lg: 'text-base h-12 px-6 gap-2.5 rounded-xl',
  };

  const variantStyles = {
    primary:
      'bg-[#2A4FE0] hover:bg-[#233FB8] active:bg-[#20388F] text-white shadow-xs border border-transparent focus-visible:border-[#2A4FE0]',
    secondary:
      'bg-white hover:bg-[#F0F2F5] active:bg-[#E4E7EC] text-[#101828] border border-[#D0D5DD] shadow-xs focus-visible:border-[#2A4FE0]',
    outline:
      'bg-white hover:bg-[#F0F2F5] text-[#344054] hover:text-[#101828] border border-[#E4E7EC] shadow-xs focus-visible:border-[#2A4FE0]',
    danger:
      'bg-[#D92D20] hover:bg-[#B42318] text-white shadow-xs border border-transparent focus-visible:ring-red-500/20',
    ghost:
      'bg-transparent hover:bg-[#F0F2F5] text-[#475467] hover:text-[#101828] active:scale-[0.98]',
    success:
      'bg-[#12B76A] hover:bg-[#027A48] text-white shadow-xs border border-transparent focus-visible:ring-emerald-500/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
