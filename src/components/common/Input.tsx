import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#101828] mb-1.5">
            {label}
            {props.required && <span className="text-[#F04438] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-10 rounded-lg border bg-white text-sm text-[#101828] placeholder-[#667085] shadow-xs transition-colors duration-150 focus:outline-none disabled:bg-[#F7F8FA] disabled:text-[#98A2B3] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} py-2 ${
              error
                ? 'border-[#F04438] focus:border-[#F04438] focus:ring-4 focus:ring-red-500/20'
                : 'border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#3B68F5] focus:ring-4 focus:ring-[#3B68F5]/20'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#667085]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-[#B42318] font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#667085]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
